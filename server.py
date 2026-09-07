"""Local-only map editor and native-size VP9 exporter. Python standard library only."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse, json, os, re, shutil, struct, subprocess, sys, threading, uuid, webbrowser
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
EXPORTS = ROOT / 'Exports'
DEMO = ROOT / 'Examples' / 'Little World.mapfx'
JOBS = {}
LOCK = threading.Lock()
FF = os.environ.get('MAP_FX_FFMPEG') or shutil.which('ffmpeg') or (str(ROOT/'ffmpeg.exe') if (ROOT/'ffmpeg.exe').is_file() else None)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(ROOT/'web'), **kw)
    def log_message(self, fmt, *a):
        if sys.stderr is not None and '/frame' not in str(a): super().log_message(fmt, *a)
    def send_json(self, data, code=200):
        body=json.dumps(data).encode(); self.send_response(code)
        self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/api/status': return self.send_json({'encoder':bool(FF),'demo':DEMO.is_file(),'exports':str(EXPORTS)})
        if path=='/api/demo' and DEMO.is_file(): return self.send_file(DEMO,'application/json')
        if path.startswith('/api/example/'):
            name=path.rsplit('/',1)[-1];examples={'little-world':'Little World.mapfx','kraken-depths':'Kraken Depths - Living Depths.mapfx','cut-the-grapples':'Cut The Grapples.mapfx'}
            file=ROOT/'Examples'/examples.get(name,'')
            if name not in examples or not file.is_file():return self.send_error(404)
            return self.send_file(file,'application/json')
        if path.startswith('/api/download/'):
            job=JOBS.get(path.split('/')[-1])
            if not job or not job.get('done'): return self.send_error(404)
            return self.send_file(job['output'],'video/webm',True)
        return super().do_GET()
    def send_file(self,path,mime,download=False):
        self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(path.stat().st_size))
        if download:self.send_header('Content-Disposition',f'attachment; filename="{path.name}"')
        self.end_headers()
        with path.open('rb') as f: shutil.copyfileobj(f,self.wfile)
    def do_POST(self):
        # Block cross-origin access to the local encoder and require an application header.
        origin=self.headers.get('Origin')
        if self.headers.get('X-Map-FX')!='studio' or (origin and urlparse(origin).netloc!=self.headers.get('Host')):
            return self.send_json({'error':'Local editor requests only.'},403)
        job=None
        try:
            size=int(self.headers.get('Content-Length','0'))
            if size<1 or size>160*1024*1024: raise ValueError('Request too large or empty.')
            data=self.rfile.read(size);path=urlparse(self.path).path
            if path=='/api/export/start':
                if not FF: raise ValueError('FFmpeg was not found. Put ffmpeg.exe beside Start Mapmancer.vbs and restart.')
                spec=json.loads(data);w=int(spec['width']);h=int(spec['height']);fps=int(spec['fps']);frames=int(spec['frames'])
                if not(1<=w<=16384 and 1<=h<=16384 and w*h<=100_000_000 and fps in [15,20,24,30] and 1<=frames<=900):raise ValueError('Unsupported export dimensions or duration.')
                with LOCK:
                    if any(not j.get('done') and not j.get('cancelled') for j in JOBS.values()):raise ValueError('An export is already running. Cancel it or wait for completion.')
                    EXPORTS.mkdir(exist_ok=True);ident=uuid.uuid4().hex
                    name=re.sub(r'[^\w .-]','',str(spec.get('name','Animated map')))[:100].strip(' .') or 'Animated map'
                    output=EXPORTS/f'{name} - {ident[:6]}.webm';log=EXPORTS/f'.{ident}.log'
                    crf={'high':4,'balanced':12,'maximum':0}.get(spec.get('quality'),4)
                    cmd=[FF,'-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',str(fps),'-vcodec','png','-i','-','-an','-c:v','libvpx-vp9','-pix_fmt','yuv420p' if w%2==0 and h%2==0 else 'yuv444p','-crf',str(crf),'-b:v','0','-deadline','good','-cpu-used','3','-row-mt','1','-tile-columns','2','-threads','8','-g',str(frames),str(output)]
                    err=log.open('wb');proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=err,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
                    JOBS[ident]={'proc':proc,'output':output,'log':log,'err':err,'w':w,'h':h,'frames':frames,'count':0,'lock':threading.Lock(),'cancel_lock':threading.Lock()}
                return self.send_json({'id':ident})
            parts=path.split('/');ident=parts[3] if len(parts)>3 else '';job=JOBS.get(ident)
            if not job:raise ValueError('Export session not found.')
            if path.endswith('/cancel'):
                with job['cancel_lock']:
                    if job.get('cancelled'):return self.send_json({'cancelled':True})
                    if job.get('done'):return self.send_json({'cancelled':False})
                    job['cancelled']=True
                    if job['proc'].poll() is None:job['proc'].kill();job['proc'].wait()
                    job['err'].close();job['output'].unlink(missing_ok=True);job['log'].unlink(missing_ok=True)
                return self.send_json({'cancelled':True})
            with job['lock']:
                if job.get('cancelled'):return self.send_json({'cancelled':True})
                if job.get('done'):raise ValueError('Export session is closed.')
                if path.endswith('/frame'):
                    if data[:8]!=b'\x89PNG\r\n\x1a\n' or struct.unpack('>II',data[16:24])!=(job['w'],job['h']):raise ValueError('Frame dimensions do not match the original map.')
                    if job['count']>=job['frames']:raise ValueError('Too many frames.')
                    job['proc'].stdin.write(data);job['proc'].stdin.flush();job['count']+=1
                    return self.send_json({'frame':job['count']})
                if path.endswith('/finish'):
                    if job['count']!=job['frames']:raise ValueError('Export is incomplete.')
                    job['proc'].stdin.close();code=job['proc'].wait(timeout=600);job['err'].close()
                    if code:raise ValueError(job['log'].read_text(errors='replace')[-1000:])
                    job['done']=True;job['log'].unlink(missing_ok=True)
                    return self.send_json({'url':'/api/download/'+ident,'size':job['output'].stat().st_size,'path':str(job['output'])})
                raise ValueError('Unknown request.')
        except Exception as exc:
            if job and job.get('cancelled'):return self.send_json({'cancelled':True})
            self.send_json({'error':str(exc)},400)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--port',type=int,default=8765);ap.add_argument('--no-open',action='store_true');args=ap.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    if not args.no_open:threading.Timer(.6,lambda:webbrowser.open(f'http://127.0.0.1:{args.port}')).start()
    print(f'Mapmancer: http://127.0.0.1:{args.port}',flush=True)
    try:server.serve_forever()
    finally:
        for job in JOBS.values():
            if job['proc'].poll() is None:job['proc'].kill()
