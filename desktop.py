"""Open Mapmancer in a desktop app window, with browser fallback."""
from pathlib import Path
import os, shutil, subprocess, sys, threading, webbrowser
from server import Handler, ThreadingHTTPServer, JOBS

def main():
    server=ThreadingHTTPServer(('127.0.0.1',8767),Handler)
    url=f'http://127.0.0.1:{server.server_port}'
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    candidates=[shutil.which(n) for n in ('google-chrome','chrome','chromium','chromium-browser','msedge')]
    if sys.platform=='win32':
        for root in ('PROGRAMFILES(X86)','PROGRAMFILES','LOCALAPPDATA'):
            for suffix in ('Google/Chrome/Application/chrome.exe','Microsoft/Edge/Application/msedge.exe'):
                candidates.append(str(Path(os.environ.get(root,''))/suffix))
    candidates.sort(key=lambda p: 'msedge' in (p or '').lower())
    browser=next((p for p in candidates if p and Path(p).is_file()),None)
    try:
        if browser:
            profile=Path.home()/'.mapmancer'/'window-profile'
            subprocess.run([browser,'--app='+url,'--user-data-dir='+str(profile),'--no-first-run','--no-default-browser-check','--disable-sync','--window-size=1600,1000'],check=False)
        else:
            webbrowser.open(url)
            print('Mapmancer is open in your browser. Close this launcher to stop it.')
            thread.join()
    except KeyboardInterrupt:pass
    finally:
        server.shutdown()
        for job in JOBS.values():
            if job['proc'].poll() is None:job['proc'].kill()
if __name__=='__main__':main()
