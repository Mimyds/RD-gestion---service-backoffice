"use client";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
export default function Login() {
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [showPassword, setShowPassword] = useState(false), [mode, setMode] = useState<"login"|"forgot">("login"), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);

  useEffect(() => {
    const queryError = new URLSearchParams(window.location.search).get("error");
    if (queryError === "invitation") setMessage("Ce lien d’invitation est invalide ou a expiré. Demandez une nouvelle invitation.");
    else if (queryError === "recovery") setMessage("Ce lien de réinitialisation est invalide ou a expiré.");
    else if (queryError === "confirmation") setMessage("Ce lien de confirmation est invalide ou a expiré.");

    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (fragment.get("type") !== "invite") return;

    createClient().auth.getSession().then(({ data, error }) => {
      if (!error && data.session) {
        window.location.replace("/auth/reset-password?flow=invite");
      } else {
        setMessage("Ce lien d’invitation est invalide ou a expiré. Demandez une nouvelle invitation.");
      }
    });
  }, []);
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
        ? "La demande n’a pas pu être traitée. Réessayez dans quelques instants."
        : "Si un compte correspond à cette adresse, un lien de réinitialisation vient d’être envoyé.");
      return;
    }
    const result = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setMessage("Adresse e-mail ou mot de passe incorrect.");
    } else {
      window.location.assign("/factures");
    }
  }
  return (
    <AuthShell
      title={mode === "login" ? "Connexion" : "Mot de passe oublié"}
      description={mode === "forgot" ? "Recevez un lien sécurisé pour choisir un nouveau mot de passe." : "Accédez à votre espace de gestion."}
      footer={mode === "forgot"
        ? <Button className="px-0" type="button" variant="link" onClick={() => { setMode("login"); setMessage(""); }}>Retour à la connexion</Button>
        : <p className="text-sm text-muted-foreground">Accès réservé aux utilisateurs invités.</p>}
    >
      <form method="post" onSubmit={submit}>
        <FieldGroup className="gap-6">
          <Field>
            <FieldLabel htmlFor="email">Adresse e-mail</FieldLabel>
            <Input className="h-12 rounded-xl px-4" id="email" type="email" required autoComplete="email" placeholder="nom@entreprise.fr" value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
          {mode !== "forgot" && <Field>
            <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
            <InputGroup className="h-12 rounded-xl">
              <InputGroupInput id="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-sm" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <Button className="h-auto self-end p-0 text-sm" type="button" variant="link" onClick={() => { setMode("forgot"); setMessage(""); }}>Mot de passe oublié ?</Button>
          </Field>}
          <Button className="h-12 w-full text-base shadow-[0_12px_26px_rgba(254,118,63,0.22)]" type="submit" size="lg" disabled={busy}>{busy ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : "Envoyer le lien"}</Button>
        </FieldGroup>
      </form>
      {message ? <p role="status" className="mt-5 rounded-xl bg-secondary px-4 py-3 text-sm leading-6 text-secondary-foreground">{message}</p> : null}
    </AuthShell>
  );
}
