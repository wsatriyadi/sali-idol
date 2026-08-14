"""Device ID stabil per mesin (untuk aturan 1 device = 1 vote)."""
import hashlib
import subprocess
import uuid


def _windows_machine_guid():
    """Baca MachineGuid dari registry Windows (stabil selama OS tak di-reinstall)."""
    try:
        import winreg

        key = winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Cryptography",
            0,
            winreg.KEY_READ | winreg.KEY_WOW64_64KEY,
        )
        val, _ = winreg.QueryValueEx(key, "MachineGuid")
        winreg.CloseKey(key)
        return val
    except Exception:
        return None


def get_device_hash():
    """SHA-256 dari identitas mesin. Prioritas MachineGuid, fallback MAC address."""
    ident = _windows_machine_guid()
    if not ident:
        # fallback: MAC address
        ident = str(uuid.getnode())
    return hashlib.sha256(ident.encode("utf-8")).hexdigest()
