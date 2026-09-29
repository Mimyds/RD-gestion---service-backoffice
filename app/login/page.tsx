"use client";
import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
export default function Login() {
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [showPassword, setShowPassword] = useState(false), [mode, setMode] = useState<"login"|"signup"|"forgot">("login"), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password/callback`,
      });
      setBusy(false);
      setMessage(error
        ? error.message
        : "Si un compte correspond à cette adresse, un lien de réinitialisation vient d’être envoyé.");
      return;
    }
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === "login" || result.data.session) {
      window.location.assign("/");
    } else {
      setMessage("Consultez votre boîte e-mail pour confirmer votre compte.");
    }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <Card className="w-full max-w-[420px] gap-0 overflow-hidden border-border p-0 shadow-xl">
        <CardHeader className="gap-2 px-8 pt-8 pb-0">
          <Image className="mb-7 h-auto w-[260px] max-w-full" src="/rd-logo.png" alt="RD Gestion & Services" width={260} height={51} priority />
          <CardTitle><h1 className="m-0 text-[32px] font-medium text-foreground">{mode === "login" ? "Connexion" : mode === "signup" ? "Créer un compte" : "Mot de passe oublié"}</h1></CardTitle>
          <CardDescription className="text-base">{mode === "forgot" ? "Recevez un lien pour choisir un nouveau mot de passe." : "Accédez à votre espace de facturation."}</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pt-7 pb-3">
          <form onSubmit={submit}>
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="email">Adresse e-mail</FieldLabel>
                <Input className="h-11" id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
              {mode !== "forgot" && <Field>
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <InputGroup className="h-11">
                    <InputGroupInput id="password" type={showPassword ? "text" : "password"} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton size="icon-sm" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                        {showPassword ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {mode === "login" && <Button className="h-auto self-end p-0 text-[13px]" type="button" variant="link" onClick={() => { setMode("forgot"); setMessage(""); }}>Mot de passe oublié ?</Button>}
                </Field>}
              <Button className="h-11 w-full text-base" type="submit" size="lg" disabled={busy}>{busy ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : mode === "signup" ? "Créer le compte" : "Envoyer le lien"}</Button>
            </FieldGroup>
          </form>
          {message && <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p>}
        </CardContent>
        <CardFooter className="px-8 pb-7">
          <Button className="px-1" type="button" variant="link" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Créer un compte" : "Retour à la connexion"}</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
