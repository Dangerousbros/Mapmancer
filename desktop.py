"""Open Mapmancer in a desktop app window, with browser fallback."""
from pathlib import Path
import hashlib, os, shutil, subprocess, sys, threading, webbrowser
from server import Handler, ThreadingHTTPServer, JOBS

def browser_version(path):
    """Read executable metadata without starting a browser or parsing shell output."""
    if sys.platform!='win32':return (0,)
    import ctypes
    from ctypes import wintypes
    version=ctypes.windll.version
    size=version.GetFileVersionInfoSizeW(str(path),None)
    if not size:return (0,)
    data=ctypes.create_string_buffer(size)
    if not version.GetFileVersionInfoW(str(path),0,size,data):return (0,)
    pointer=ctypes.c_void_p();length=wintypes.UINT()
    if not version.VerQueryValueW(data,'\\',ctypes.byref(pointer),ctypes.byref(length)):return (0,)
    words=ctypes.cast(pointer,ctypes.POINTER(wintypes.DWORD))
    return (words[2]>>16,words[2]&65535,words[3]>>16,words[3]&65535)

def browser_profile(browser):
    # Chromium profiles are not portable between Edge, Chrome or installations.
    # Never reopen the shared profile used by the original 1.0 launcher.
    executable=os.path.normcase(str(Path(browser).resolve()))
    identity=hashlib.sha256(executable.encode()).hexdigest()[:16]
    return Path.home()/'.mapmancer'/'profiles'/identity

def choose_browser(candidates):
    candidates=list(dict.fromkeys(p for p in candidates if p and Path(p).is_file()))
    if sys.platform=='win32':
        candidates=[p for p in candidates if browser_version(p)[0]>=110]
        candidates.sort(key=lambda p:(browser_version(p)[0], 'msedge' not in p.lower(), browser_version(p)),reverse=True)
    return next(iter(candidates),None)

def main():
    try:
        server=ThreadingHTTPServer(('127.0.0.1',8767),Handler)
    except OSError:
        # A still-open app must not prevent a second launcher from starting.
        server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    url=f'http://127.0.0.1:{server.server_port}'
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    candidates=[shutil.which(n) for n in ('google-chrome','chrome','chromium','chromium-browser','msedge')]
    if sys.platform=='win32':
        for root in ('PROGRAMFILES(X86)','PROGRAMFILES','LOCALAPPDATA'):
            for suffix in ('Google/Chrome/Application/chrome.exe','Microsoft/Edge/Application/msedge.exe'):
                candidates.append(str(Path(os.environ.get(root,''))/suffix))
    # Old 32-bit installations can coexist with a current 64-bit browser.
    # Prefer the newest Chromium major, then Chrome to avoid Edge sign-in UI.
    browser=choose_browser(candidates)
    try:
        if browser:
            profile=browser_profile(browser)
            # Give simultaneous windows independent profiles and process lifetimes.
            if server.server_port != 8767:
                profile=profile/('instance-'+str(server.server_port))
            subprocess.run([browser,'--app='+url,'--user-data-dir='+str(profile),'--no-first-run','--no-default-browser-check','--disable-sync','--disable-background-mode','--window-size=1600,1000'],check=False)
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
