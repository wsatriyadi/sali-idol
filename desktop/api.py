"""Klien HTTP ke API Cloudflare."""
import requests

from config import get_api_base

TIMEOUT = 20


class ApiError(Exception):
    pass


def _url(path):
    return get_api_base() + path


def get_settings():
    r = requests.get(_url("/api/settings/public"), timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def get_contestants():
    r = requests.get(_url("/api/contestants"), timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def submit_vote(contestant_id, voter_name, voter_whatsapp):
    r = requests.post(
        _url("/api/vote"),
        json={
            "contestantId": contestant_id,
            "voterName": voter_name,
            "voterWhatsapp": voter_whatsapp,
        },
        timeout=TIMEOUT,
    )
    data = {}
    try:
        data = r.json()
    except Exception:
        pass
    if r.status_code >= 400:
        raise ApiError(data.get("error", f"Gagal (HTTP {r.status_code})"))
    return data


def download_image(url):
    """Unduh bytes gambar (url relatif → prepend API base)."""
    if url.startswith("/"):
        url = get_api_base() + url
    r = requests.get(url, timeout=TIMEOUT)
    r.raise_for_status()
    return r.content
