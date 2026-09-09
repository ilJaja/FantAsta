"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/leagues");
  }, [loading, user, router]);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("confirmed")) {
      setMessage("Email confermata. Ora puoi accedere.");
    }
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase non è configurato.");
      setBusy(false);
      return;
    }

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split("@")[0] },
          emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
        },
      });
      if (signUpError) setError(signUpError.message);
      else if (data.session) router.replace("/leagues");
      else setMessage("Account creato. Controlla la tua email e conferma l'indirizzo, poi accedi.");
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) setError(loginError.message);
      else router.replace("/leagues");
    }
    setBusy(false);
  }

  return (
    <main className="auth-page">
      <div className="auth-card auth-card-wide">
        <Link href="/" className="brand"><BrandLogo /></Link>
        <div className="auth-heading">
          <span className="eyebrow">IL TUO FANTACALCIO, PIÙ INTELLIGENTE</span>
          <h1>{mode === "login" ? "Bentornato" : "Crea il tuo account"}</h1>
          <p>{mode === "login" ? "Accedi a leghe, asta, rosa, formazione e analisi da un unico centro di comando." : "Registrati per creare leghe, importare RAMERA e gestire la stagione con FantAsta."}</p>
        </div>

        <div className="config-state ready"><ShieldCheck size={18}/><div><strong>Account protetto da Supabase</strong><span>Dati separati per utente e per lega.</span></div></div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && <label><span>Nome</span><div className="input-wrap"><UserRound size={17}/><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Jason" required /></div></label>}
          <label><span>Email</span><div className="input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nome@email.it" required /></div></label>
          <label><span>Password</span><div className="input-wrap"><LockKeyhole size={17}/><input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Almeno 6 caratteri" required /></div></label>
          {error && <div className="form-alert error">{error}</div>}
          {message && <div className="form-alert success">{message}</div>}
          <button className="primary-btn center" disabled={busy}>{busy ? "Attendi…" : mode === "login" ? "Accedi" : "Crea account"}</button>
        </form>

        <button className="text-button" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>
          {mode === "login" ? "Non hai un account? Crea account" : "Hai già un account? Accedi"}
        </button>
      </div>
    </main>
  );
}
