"use client";

import { FormEvent, useState } from "react";

export function AdminLoginClient() {
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error("Invalid");
      }
      window.location.assign("/admin");
    } catch {
      setStatus("error");
      setMessage("Invalid secret.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1 text-left">
        <label htmlFor="admin-secret" className="text-sm font-medium text-slate-700">
          Admin secret
        </label>
        <input
          id="admin-secret"
          type="password"
          autoComplete="current-password"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          required
        />
      </div>
      {message && (
        <p className="text-sm text-rose-600">{message}</p>
      )}
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
