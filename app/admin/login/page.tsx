"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="card" style={{ width: "min(420px, 92vw)", margin: "80px auto" }}>
        <h1>Admin Login</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Enter the admin password to update estimator settings.
        </p>
        <form onSubmit={onSubmit} className="grid" style={{ marginTop: 16 }}>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button disabled={busy}>{busy ? "Signing in..." : "Sign In"}</button>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}
