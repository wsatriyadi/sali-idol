"""Konfigurasi API_BASE. Prioritas config.ini di samping exe, fallback konstanta."""
import configparser
import os
import sys

# Default — ganti setelah tahu URL Cloudflare Pages, atau override via config.ini
DEFAULT_API_BASE = "https://saliidol.pages.dev"


def _base_dir():
    # Saat dibundel PyInstaller, file di samping exe
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def get_api_base():
    ini = os.path.join(_base_dir(), "config.ini")
    if os.path.exists(ini):
        cp = configparser.ConfigParser()
        try:
            cp.read(ini, encoding="utf-8")
            val = cp.get("app", "api_base", fallback="").strip()
            if val:
                return val.rstrip("/")
        except Exception:
            pass
    return DEFAULT_API_BASE.rstrip("/")
