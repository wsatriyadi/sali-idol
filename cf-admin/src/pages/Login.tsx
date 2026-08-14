import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiJson } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { ok, data } = await apiJson("/api/admin/login", "POST", { username, password });
    if (!ok) {
      setError(data.error || "Login gagal");
      setLoading(false);
      return;
    }
    navigate("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-night-950 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-night-800 p-7 shadow-2xl ring-1 ring-white/10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl">🎤</div>
          <h1 className="text-xl font-black text-white">SALI IDOL</h1>
          <p className="text-sm text-white/50">Panel Admin</p>
        </div>

        <label className="mb-1 block text-sm text-white/70">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className="mb-4 w-full rounded-xl bg-night-900 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-brand-500"
        />
        <label className="mb-1 block text-sm text-white/70">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-5 w-full rounded-xl bg-night-900 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-brand-500"
        />
        {error && <p className="mb-4 text-center text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white shadow-lg shadow-brand-600/30 active:scale-95 disabled:opacity-60"
        >
          {loading ? "Masuk…" : "Masuk"}
        </button>
      </form>
    </main>
  );
}
