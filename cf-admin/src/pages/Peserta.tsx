import { useEffect, useState } from "react";
import { apiGet, apiForm } from "../api";

type Peserta = {
  id: number;
  noUrut: number;
  nama: string;
  laguWajib: string;
  laguBebas: string;
  asalSkpd: string;
  fotoUrl: string | null;
  isActive: boolean;
  votes: number;
};

const EMPTY = { noUrut: "", nama: "", laguWajib: "", laguBebas: "", asalSkpd: "" };

export default function PesertaPage() {
  const [list, setList] = useState<Peserta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setList(await apiGet("/api/admin/contestants"));
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditId(null);
    setForm(EMPTY);
    setFoto(null);
    setPreview(null);
    setError(null);
    setModal(true);
  }
  function openEdit(p: Peserta) {
    setEditId(p.id);
    setForm({ noUrut: p.noUrut, nama: p.nama, laguWajib: p.laguWajib, laguBebas: p.laguBebas, asalSkpd: p.asalSkpd });
    setFoto(null);
    setPreview(p.fotoUrl);
    setError(null);
    setModal(true);
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFoto(f);
    if (f) setPreview(URL.createObjectURL(f));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.append("nama", form.nama);
    fd.append("noUrut", String(form.noUrut));
    fd.append("laguWajib", form.laguWajib);
    fd.append("laguBebas", form.laguBebas);
    fd.append("asalSkpd", form.asalSkpd);
    if (foto) fd.append("foto", foto);
    const url = editId ? `/api/admin/contestants/${editId}` : "/api/admin/contestants";
    const { ok, data } = await apiForm(url, editId ? "PATCH" : "POST", fd);
    if (!ok) {
      setError(data.error || "Gagal menyimpan");
      setSaving(false);
      return;
    }
    setModal(false);
    setSaving(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Hapus peserta ini? Semua vote terkait juga terhapus.")) return;
    await apiForm(`/api/admin/contestants/${id}`, "DELETE", new FormData());
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Peserta</h1>
          <p className="text-sm text-white/50">{list.length} peserta terdaftar</p>
        </div>
        <button onClick={openAdd} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold shadow-lg shadow-brand-600/30 active:scale-95">
          + Tambah Peserta
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-night-800 ring-1 ring-white/5 scrollbar-thin">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-white/40">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Lagu Wajib</th>
              <th className="px-4 py-3">Lagu Bebas</th>
              <th className="px-4 py-3">Asal SKPD</th>
              <th className="px-4 py-3">No Urut</th>
              <th className="px-4 py-3">Vote</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-white/40">Memuat…</td></tr>
            )}
            {!loading && list.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-white/40">Belum ada peserta.</td></tr>
            )}
            {list.map((p, i) => (
              <tr key={p.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white/50">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="h-11 w-11 overflow-hidden rounded-lg bg-night-950">
                    {p.fotoUrl ? <img src={p.fotoUrl} alt={p.nama} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-white/20">🎤</div>}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold">{p.nama}</td>
                <td className="px-4 py-3 text-white/70">{p.laguWajib}</td>
                <td className="px-4 py-3 text-white/70">{p.laguBebas}</td>
                <td className="px-4 py-3 text-white/70">{p.asalSkpd}</td>
                <td className="px-4 py-3">{p.noUrut}</td>
                <td className="px-4 py-3 font-bold text-brand-400">{p.votes}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">Edit</button>
                    <button onClick={() => remove(p.id)} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-md animate-pop-in overflow-y-auto rounded-3xl bg-night-800 p-6 ring-1 ring-white/10 scrollbar-thin">
            <h2 className="mb-4 text-lg font-black">{editId ? "Edit Peserta" : "Tambah Peserta"}</h2>
            <div className="mb-4 flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-night-950">
                {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl text-white/20">🎤</div>}
              </div>
              <label className="cursor-pointer rounded-xl bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
                Unggah Foto
                <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              </label>
            </div>
            {[
              { k: "nama", label: "Nama", type: "text" },
              { k: "noUrut", label: "No Urut Tampil", type: "number" },
              { k: "laguWajib", label: "Lagu Wajib", type: "text" },
              { k: "laguBebas", label: "Lagu Bebas", type: "text" },
              { k: "asalSkpd", label: "Asal SKPD", type: "text" },
            ].map((f) => (
              <div key={f.k} className="mb-3">
                <label className="mb-1 block text-sm text-white/70">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.k]}
                  onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                  className="w-full rounded-xl bg-night-900 px-4 py-2.5 outline-none ring-1 ring-white/10 focus:ring-brand-500"
                />
              </div>
            ))}
            {error && <p className="mb-3 text-center text-sm text-red-400">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setModal(false)} disabled={saving} className="flex-1 rounded-xl bg-white/5 py-3 font-semibold text-white/70 ring-1 ring-white/10">Batal</button>
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-brand-600 py-3 font-bold disabled:opacity-60">{saving ? "Menyimpan…" : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
