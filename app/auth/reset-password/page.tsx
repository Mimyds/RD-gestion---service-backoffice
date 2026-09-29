"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

export default function ResetPasswordPage() {
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
      setMessage(error.message);
      return;
    }
    setMessage("Votre mot de passe a été modifié. Redirection en cours…");
    window.setTimeout(() => window.location.assign("/"), 900);
  }

  return (
    <main className="login-page">
      <Card className="login-card">
        <CardHeader>
          <Image className="login-logo" src="/rd-logo.png" alt="RD Gestion & Services" width={260} height={51} priority />
          <CardTitle><h1>Nouveau mot de passe</h1></CardTitle>
          <CardDescription>Choisissez un nouveau mot de passe pour votre compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="new-password">Nouveau mot de passe</FieldLabel>
                <InputGroup>
                  <InputGroupInput id="new-password" type={showPassword ? "text" : "password"} required minLength={6} autoComplete="new-password" disabled={!ready || busy} value={password} onChange={(event) => setPassword(event.target.value)} />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton size="icon-sm" aria-label={showPassword ? "Masquer les mots de passe" : "Afficher les mots de passe"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>
                      {showPassword ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="password-confirmation">Confirmer le mot de passe</FieldLabel>
                <InputGroup>
                  <InputGroupInput id="password-confirmation" type={showPassword ? "text" : "password"} required minLength={6} autoComplete="new-password" disabled={!ready || busy} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
                </InputGroup>
              </Field>
              <Button type="submit" size="lg" disabled={!ready || busy}>{busy ? "Modification…" : "Modifier le mot de passe"}</Button>
            </FieldGroup>
          </form>
          {message && <p role="status" className="login-message">{message}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
