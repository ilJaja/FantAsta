"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { BrandLogo } from "@/components/brand-logo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [sessionOk, setSessionOk] = useState(false);

  // When the user arrives from the reset email, Supabase creates a recovery
  // session (via the URL hash / detectSessionInUrl). We wait for it before
  // allowing the password update.
  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase non è configurato.");
      setReady(true);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) setSessionOk(true);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) setSessionOk(true);
      setReady(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("La password deve contenere almeno 6 caratteri.");
      return;
    }
    if (password !== confirm) {
      setError("Le due password non coincidono.");
      return;
    }

    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase non è configurato.");
      setBusy(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    setMessage("Password aggiornata con successo. Verrai reindirizzato all'accesso…");
    await supabase.auth.signOut();
    setBusy(false);
    setTimeout(() => router.replace("/login?reset=1"), 1500);
  }

  return (
    <main className="auth-page">
      <div className="auth-card auth-card-wide">
        <Link href="/" className="brand"><BrandLogo /></Link>
        <div className="auth-heading">
          <span className="eyebrow">SICUREZZA ACCOUNT</span>
          <h1>Imposta una nuova password</h1>
          <p>Scegli una nuova password per il tuo account FantAsta.</p>
        </div>

        <div className="config-state ready"><ShieldCheck size={18}/><div><strong>Link sicuro Supabase</strong><span>Il link di reset è valido una sola volta e per un tempo limitato.</span></div></div>

        {!ready ? (
          <div className="form-alert success">Verifica del link in corso…</div>
        ) : !sessionOk ? (
          <>
            <div className="form-alert error">
              Link non valido o scaduto. Richiedi un nuovo link di reset dalla pagina di accesso.
            </div>
            <Link className="text-button" href="/login">Torna all'accesso</Link>
          </>
        ) : (
          <>
            <form className="auth-form" onSubmit={submit}>
              <label><span>Nuova password</span><div className="input-wrap"><LockKeyhole size={17}/><input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Almeno 6 caratteri" required /></div></label>
              <label><span>Conferma password</span><div className="input-wrap"><LockKeyhole size={17}/><input type="password" minLength={6} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Ripeti la password" required /></div></label>
              {error && <div className="form-alert error">{error}</div>}
              {message && <div className="form-alert success">{message}</div>}
              <button className="primary-btn center" disabled={busy}>{busy ? "Attendi…" : "Aggiorna password"}</button>
            </form>
            <Link className="text-button" href="/login">Annulla e torna all'accesso</Link>
          </>
        )}
      </div>
    </main>
  );
}
