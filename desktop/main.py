"""SALI IDOL — Aplikasi Voting Desktop (tkinter).
Meniru UX web: list peserta -> pilih -> input nama+WhatsApp -> kode undian.
Aturan 1 device = 1 vote (device hash dari MachineGuid)."""
import io
import threading
import tkinter as tk
from tkinter import font as tkfont

from PIL import Image, ImageTk

import api

# ── Tema (samakan look web) ────────────────────────────────────
BG = "#0c0a17"      # night-950
CARD = "#1e1b2e"    # night-800
CARD2 = "#141222"   # night-900
PINK = "#db2777"    # brand-600
PINK2 = "#be185d"   # brand-700
PINK_LT = "#f472b6" # brand-400
TEXT = "#ffffff"
MUTED = "#8b8b9e"
GREEN = "#22c55e"

GRID_COLS = 5     # kolom grid → 10 peserta = 2 baris (5 atas, 5 bawah)
ROW_WEIGHTS = (50, 50)   # 2 baris peserta, masing-masing 50% tinggi


def fit_contain(img, mw, mh):
    """Resize agar muat penuh dalam mw x mh (tanpa crop, jaga rasio)."""
    mw, mh = max(1, int(mw)), max(1, int(mh))
    w, h = img.size
    scale = min(mw / w, mh / h)
    return img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("SALI IDOL — Voting")
        self.configure(bg=BG)
        self.geometry("900x720")
        self.minsize(720, 600)

        self.event_title = "SALI IDOL"
        self.header_url = None
        self.header_orig = None      # PIL image banner (cache)
        self.contestants = []
        self._img_refs = {}          # cegah GC gambar
        self._cards = []             # kartu peserta (untuk resize)
        self._resize_job = None
        self.grid_frame = None
        self.banner = None

        self.f_title = tkfont.Font(family="Segoe UI", size=22, weight="bold")
        self.f_h = tkfont.Font(family="Segoe UI", size=15, weight="bold")
        self.f_n = tkfont.Font(family="Segoe UI", size=11)
        self.f_s = tkfont.Font(family="Segoe UI", size=9)
        self.f_card = tkfont.Font(family="Segoe UI", size=10, weight="bold")
        self.f_card_s = tkfont.Font(family="Segoe UI", size=8)
        self.f_code = tkfont.Font(family="Consolas", size=40, weight="bold")

        # Placeholder abu (sebelum foto termuat)
        self._ph = ImageTk.PhotoImage(Image.new("RGB", (160, 120), (26, 24, 40)))

        self.container = tk.Frame(self, bg=BG)
        self.container.pack(fill="both", expand=True)

        self.show_loading("Memuat…")
        threading.Thread(target=self._bootstrap, daemon=True).start()

    # ── util frame ─────────────────────────────────────────────
    def _clear(self):
        for w in self.container.winfo_children():
            w.destroy()

    def show_loading(self, text):
        self._clear()
        tk.Label(self.container, text="🎤", font=("Segoe UI", 48), bg=BG, fg=PINK).pack(pady=(220, 10))
        tk.Label(self.container, text=text, font=self.f_h, bg=BG, fg=MUTED).pack()

    def show_error(self, msg):
        self._clear()
        tk.Label(self.container, text="⚠️", font=("Segoe UI", 44), bg=BG, fg="#f59e0b").pack(pady=(200, 10))
        tk.Label(self.container, text=msg, font=self.f_n, bg=BG, fg=TEXT, wraplength=600, justify="center").pack(pady=6)
        self._btn(self.container, "Coba Lagi", self._retry).pack(pady=16)

    def show_closed(self):
        self._clear()
        self._header()
        box = tk.Frame(self.container, bg=BG)
        box.pack(expand=True)
        tk.Label(box, text="⏰", font=("Segoe UI", 44), bg=BG, fg="#f87171").pack(pady=(120, 10))
        tk.Label(box, text="Periode voting telah berakhir.", font=self.f_h, bg=BG, fg=TEXT).pack()

    # ── bootstrap / retry ──────────────────────────────────────
    def _retry(self):
        self.show_loading("Memuat…")
        threading.Thread(target=self._bootstrap, daemon=True).start()

    def _bootstrap(self):
        # Mode kiosk: 1 device dipakai banyak orang. Selalu tampil list.
        # Batas 1 vote ditegakkan per nomor WhatsApp di server.
        try:
            settings = api.get_settings()
            contestants = api.get_contestants()
        except Exception as e:
            self.after(0, lambda: self.show_error(f"Tidak dapat terhubung ke server.\n{e}"))
            return
        self.event_title = settings.get("eventTitle", "SALI IDOL")
        self.header_url = settings.get("headerUrl")
        self.contestants = contestants
        voting_open = settings.get("votingOpen", True)

        if not voting_open:
            self.after(0, self.show_closed)
        else:
            self.after(0, self.show_list)

    # ── widget helpers ─────────────────────────────────────────
    def _btn(self, parent, text, cmd, bg=PINK, fg=TEXT, width=None):
        b = tk.Button(
            parent, text=text, command=cmd, bg=bg, fg=fg, activebackground=PINK2,
            activeforeground=TEXT, relief="flat", font=self.f_h, cursor="hand2",
            bd=0, padx=20, pady=10, highlightthickness=0,
        )
        if width:
            b.configure(width=width)
        return b

    def _header(self):
        h = tk.Frame(self.container, bg=CARD2)
        h.pack(fill="x")
        tk.Label(h, text=self.event_title, font=self.f_title, bg=CARD2, fg=TEXT).pack(pady=(14, 2))
        tk.Label(h, text="Pilih penyanyi favoritmu", font=self.f_s, bg=CARD2, fg=MUTED).pack(pady=(0, 12))

    # ── banner ─────────────────────────────────────────────────
    def _render_banner(self):
        if self.banner is None or not self.banner.winfo_exists():
            return
        bw, bh = self.banner.winfo_width(), self.banner.winfo_height()
        if bw < 20 or bh < 20:
            self.after(100, self._render_banner)
            return
        if self.header_url and self.header_orig is not None:
            # Contain → banner utuh dalam ruang 40%, tak terpotong
            photo = ImageTk.PhotoImage(fit_contain(self.header_orig, bw - 4, bh - 4))
            self._img_refs["banner"] = photo
            self.banner.configure(image=photo, text="")
        else:
            self.banner.configure(image="", text=self.event_title, font=self.f_title, fg=TEXT)
            if self.header_url and self.header_orig is None:
                threading.Thread(target=self._load_banner, daemon=True).start()

    def _load_banner(self):
        try:
            data = api.download_image(self.header_url)
            self.header_orig = Image.open(io.BytesIO(data)).convert("RGB")
            self.after(0, self._render_banner)
        except Exception:
            pass

    # ── gambar kartu (responsif) ───────────────────────────────
    def _download_card_img(self, entry, url):
        try:
            data = api.download_image(url)
            entry["orig"] = Image.open(io.BytesIO(data)).convert("RGB")
            self.after(0, lambda: self._render_card(entry))
        except Exception:
            pass

    def _render_card(self, entry):
        if entry.get("orig") is None:
            return
        t = entry["thumb"]
        card = entry["card"]
        if not t.winfo_exists():
            return
        w, h = t.winfo_width(), t.winfo_height()
        if w < 10 or h < 10:
            self.after(80, lambda: self._render_card(entry))
            return
        # Contain → seluruh foto tampil, tak terpotong
        photo = ImageTk.PhotoImage(fit_contain(entry["orig"], w - 6, h - 6))
        self._img_refs[id(t)] = photo
        t.configure(image=photo)

    def _resize_cards(self):
        self._resize_job = None
        for entry in self._cards:
            if not entry["card"].winfo_exists():
                continue
            cw = entry["card"].winfo_width()
            if cw > 20:
                for lbl in entry["info"].winfo_children():
                    lbl.configure(wraplength=cw - 16)
            self._render_card(entry)
        self._render_banner()

    def _on_resize(self, e):
        if e.widget is not self:
            return
        if self._resize_job:
            self.after_cancel(self._resize_job)
        self._resize_job = self.after(140, self._resize_cards)

    # ── layar list peserta ─────────────────────────────────────
    def show_list(self):
        self._clear()
        self._cards = []

        self.banner = None

        gf = tk.Frame(self.container, bg=BG)
        gf.pack(fill="both", expand=True)
        self.grid_frame = gf

        cols = GRID_COLS
        # 2 baris peserta 50/50
        for r, w in enumerate(ROW_WEIGHTS):
            gf.grid_rowconfigure(r, weight=w, uniform="row")
        for i in range(cols):
            gf.grid_columnconfigure(i, weight=1, uniform="col")

        if not self.contestants:
            tk.Label(gf, text="Belum ada peserta.", font=self.f_n, bg=BG, fg=MUTED).grid(
                row=0, column=0, columnspan=cols, pady=40)
            self.bind("<Configure>", self._on_resize)
            return

        for idx, c in enumerate(self.contestants):
            self._make_card(gf, c, idx // cols, idx % cols)

        self.bind("<Configure>", self._on_resize)
        self.after(150, self._resize_cards)

    def _make_card(self, parent, c, r, col):
        card = tk.Frame(parent, bg=CARD, cursor="hand2",
                        highlightbackground="#2a2740", highlightthickness=1)
        card.grid(row=r, column=col, padx=5, pady=5, sticky="nsew")

        info = tk.Frame(card, bg=CARD)
        info.pack(side="bottom", fill="x", padx=8, pady=(4, 6))
        tk.Label(info, text=f"#{c['noUrut']} {c['nama']}", font=self.f_card, bg=CARD, fg=TEXT,
                 anchor="w", justify="left", wraplength=180).pack(fill="x")
        tk.Label(info, text=f"{c['laguWajib']} - {c['laguBebas']}", font=self.f_card_s,
                 bg=CARD, fg=PINK_LT, anchor="w", wraplength=180).pack(fill="x")
        tk.Label(info, text=c["asalSkpd"], font=self.f_card_s, bg=CARD, fg=MUTED,
                 anchor="w", wraplength=180).pack(fill="x")

        # Area foto (contain — fit ruang, tak terpotong)
        thumb = tk.Label(card, image=self._ph, bg=CARD2, bd=0)
        thumb.pack(side="top", fill="both", expand=True)

        entry = {"card": card, "thumb": thumb, "info": info, "orig": None}
        self._cards.append(entry)

        for w in [card, thumb, info] + list(info.winfo_children()):
            w.bind("<Button-1>", lambda e, cc=c: self.open_vote(cc))

        if c.get("fotoUrl"):
            threading.Thread(target=self._download_card_img, args=(entry, c["fotoUrl"]),
                             daemon=True).start()

    # ── popup vote ─────────────────────────────────────────────
    def open_vote(self, c):
        top = tk.Toplevel(self)
        top.title("Konfirmasi Vote")
        top.configure(bg=CARD)
        top.geometry("380x460")
        top.transient(self)
        top.grab_set()
        top.resizable(False, False)

        tk.Label(top, text=f"Peserta #{c['noUrut']}", font=self.f_s, bg=CARD, fg=MUTED).pack(pady=(18, 0))
        tk.Label(top, text=c["nama"], font=self.f_title, bg=CARD, fg=TEXT).pack()
        tk.Label(top, text=c["laguBebas"], font=self.f_s, bg=CARD, fg=PINK_LT).pack(pady=(0, 12))

        tk.Label(top, text="Nama Anda", font=self.f_s, bg=CARD, fg=MUTED, anchor="w").pack(fill="x", padx=24)
        name_e = tk.Entry(top, font=self.f_n, bg=CARD2, fg=TEXT, insertbackground=TEXT, relief="flat", bd=8)
        name_e.pack(fill="x", padx=24, pady=(2, 10))

        tk.Label(top, text="Nomor WhatsApp", font=self.f_s, bg=CARD, fg=MUTED, anchor="w").pack(fill="x", padx=24)
        wa_e = tk.Entry(top, font=self.f_n, bg=CARD2, fg=TEXT, insertbackground=TEXT, relief="flat", bd=8)
        wa_e.pack(fill="x", padx=24, pady=(2, 10))

        tk.Label(top, text=f"Yakin vote peserta {c['nama']}?", font=self.f_n, bg=CARD, fg=TEXT, wraplength=320).pack(pady=6)
        err = tk.Label(top, text="", font=self.f_s, bg=CARD, fg="#f87171", wraplength=320)
        err.pack()

        row = tk.Frame(top, bg=CARD)
        row.pack(side="bottom", fill="x", padx=24, pady=18)

        def do_submit():
            name = name_e.get().strip()
            wa = "".join(ch for ch in wa_e.get() if ch.isdigit())
            if not name:
                err.configure(text="Nama wajib diisi")
                return
            if len(wa) < 9:
                err.configure(text="Nomor WhatsApp tidak valid")
                return
            btn_yes.configure(state="disabled", text="Memproses…")
            btn_no.configure(state="disabled")

            def worker():
                try:
                    data = api.submit_vote(c["id"], name, wa)
                except api.ApiError as e:
                    self.after(0, lambda: (err.configure(text=str(e)), btn_yes.configure(state="normal", text="Ya, Vote!"), btn_no.configure(state="normal")))
                    return
                except Exception:
                    self.after(0, lambda: (err.configure(text="Kesalahan jaringan"), btn_yes.configure(state="normal", text="Ya, Vote!"), btn_no.configure(state="normal")))
                    return
                self.after(0, lambda: (top.destroy(), self.show_code_popup(data["kodeUndian"], name, c)))

            threading.Thread(target=worker, daemon=True).start()

        btn_no = self._btn(row, "Batal", top.destroy, bg=CARD2, fg=MUTED)
        btn_no.pack(side="left", expand=True, fill="x", padx=(0, 5))
        btn_yes = self._btn(row, "Ya, Vote!", do_submit)
        btn_yes.pack(side="left", expand=True, fill="x", padx=(5, 0))
        name_e.focus_set()

    # ── popup kode undian (tutup → kembali ke list) ────────────
    def show_code_popup(self, kode, voter_name, contestant):
        top = tk.Toplevel(self)
        top.title("Kode Undian")
        top.configure(bg=BG)
        top.geometry("420x460")
        top.transient(self)
        top.grab_set()
        top.resizable(False, False)

        tk.Label(top, text="✅", font=("Segoe UI", 38), bg=BG, fg=GREEN).pack(pady=(24, 4))
        greet = f"Terima kasih, {voter_name}!" if voter_name else "Terima kasih!"
        tk.Label(top, text=greet, font=self.f_title, bg=BG, fg=TEXT).pack()
        tk.Label(top, text="Suara Anda direkam. Simpan / catat kode undian ini.",
                 font=self.f_s, bg=BG, fg=MUTED, wraplength=360).pack(pady=(2, 14))

        code_box = tk.Frame(top, bg=PINK)
        code_box.pack(pady=2)
        tk.Label(code_box, text="KODE UNDIAN", font=self.f_s, bg=PINK, fg="#ffd9ec").pack(pady=(10, 0), padx=36)
        tk.Label(code_box, text=kode, font=self.f_code, bg=PINK, fg=TEXT).pack(pady=(2, 12), padx=36)

        tk.Label(top, text=f"Pilihan: #{contestant['noUrut']} {contestant['nama']}",
                 font=self.f_n, bg=BG, fg="#b8b8c8", wraplength=360).pack(pady=(16, 0))

        self._btn(top, "Tutup", top.destroy).pack(side="bottom", fill="x", padx=36, pady=20)


if __name__ == "__main__":
    App().mainloop()
