"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const invitation = searchParams.get("flow") === "invite";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
      if (!data.session) setMessage("Ce lien est invalide ou a expiré. Demandez un nouveau lien depuis la page de connexion.");
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage("Le mot de passe n’a pas pu être modifié. Vérifiez qu’il respecte les règles de sécurité.");
      return;
    }
    await supabase.auth.signOut({ scope: "global" });
    setMessage(invitation ? "Votre mot de passe a été créé. Vous allez pouvoir vous connecter…" : "Votre mot de passe a été modifié. Reconnexion requise…");
    window.setTimeout(() => window.location.assign("/login"), 900);
  }

  return (
    <AuthShell
      title={invitation ? "Créer votre mot de passe" : "Nouveau mot de passe"}
      description={invitation ? "Finalisez votre invitation en choisissant le mot de passe de votre compte." : "Choisissez un nouveau mot de passe sécurisé pour votre compte."}
    >
      <form method="post" onSubmit={submit}>
        <FieldGroup className="gap-6">
          <Field data-disabled={!ready || busy}>
            <FieldLabel htmlFor="new-password">Nouveau mot de passe</FieldLabel>
            <InputGroup className="h-12 rounded-xl">
              <InputGroupInput id="new-password" type={showPassword ? "text" : "password"} required minLength={10} autoComplete="new-password" disabled={!ready || busy} value={password} onChange={(event) => setPassword(event.target.value)} />
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-sm" aria-label={showPassword ? "Masquer les mots de passe" : "Afficher les mots de passe"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field data-disabled={!ready || busy}>
            <FieldLabel htmlFor="password-confirmation">Confirmer le mot de passe</FieldLabel>
            <InputGroup className="h-12 rounded-xl">
              <InputGroupInput id="password-confirmation" type={showPassword ? "text" : "password"} required minLength={10} autoComplete="new-password" disabled={!ready || busy} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </InputGroup>
          </Field>
          <Button className="h-12 w-full text-base shadow-[0_12px_26px_rgba(254,118,63,0.22)]" type="submit" size="lg" disabled={!ready || busy}>{busy ? "Enregistrement…" : invitation ? "Créer mon mot de passe" : "Modifier le mot de passe"}</Button>
        </FieldGroup>
      </form>
      {message ? <p role="status" className="mt-5 rounded-xl bg-secondary px-4 py-3 text-sm leading-6 text-secondary-foreground">{message}</p> : null}
    </AuthShell>
  );
}
