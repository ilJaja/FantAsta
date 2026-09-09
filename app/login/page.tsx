"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
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
    if (search.get("confirmed")) setMessage("Email confermata. Ora puoi accedere.");
  }, [search]);

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
        <Link href="/" className="brand"><span className="brandMark">FA</span><span>FantAsta</span></Link>
        <span className="eyebrow">ACCOUNT</span>
        <h1>{mode === "login" ? "Accedi a FantAsta" : "Crea il tuo account"}</h1>
        <p>{mode === "login" ? "Entra nelle tue leghe e ritrova asta, rosa e formazione su ogni dispositivo." : "Registrati per creare leghe, importare RAMERA e invitare gli amici."}</p>

        <div className="config-state ready"><ShieldCheck size={18}/><div><strong>Supabase collegato</strong><span>Account e dati sono separati per utente e lega.</span></div></div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && <label><span>Nome</span><div className="input-wrap"><UserRound size={17}/><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Jason" required /></div></label>}
          <label><span>Email</span><div className="input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nome@email.it" required /></div></label>
          <label><span>Password</span><div className="input-wrap"><LockKeyhole size={17}/><input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Almeno 6 caratteri" required /></div></label>
          {error && <div className="form-alert error">{error}</div>}
          {message && <div className="form-alert success">{message}</div>}
          <button className="primary-btn center" disabled={busy}>{busy ? "Attendi…" : mode === "login" ? "Accedi" : "Crea account"}</button>
        </form>

        <button className="text-button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>
          {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
        </button>
      </div>
    </main>
  );
}
