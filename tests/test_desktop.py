import sys, unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import desktop

class DesktopTests(unittest.TestCase):
    def test_profiles_are_separate_and_stable(self):
        chrome=desktop.browser_profile('chrome.exe')
        self.assertEqual(chrome,desktop.browser_profile('chrome.exe'))
        self.assertNotEqual(chrome,desktop.browser_profile('msedge.exe'))
        self.assertNotEqual(chrome,desktop.browser_profile('other/chrome.exe'))
        self.assertNotIn('window-profile',chrome.parts)

    def test_old_chrome_cannot_shadow_current_installation(self):
        versions={'old/chrome.exe':(63,0),'new/chrome.exe':(152,0),'msedge.exe':(152,0)}
        with patch.object(desktop.sys,'platform','win32'), patch.object(Path,'is_file',return_value=True), patch.object(desktop,'browser_version',side_effect=lambda p:versions[p]):
            self.assertEqual(desktop.choose_browser(list(versions)),'new/chrome.exe')
            self.assertIsNone(desktop.choose_browser(['old/chrome.exe']))

if __name__=='__main__':unittest.main()
