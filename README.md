# RD Facturation — Next.js + Supabase

Projet autonome Next.js App Router (TypeScript), avec Supabase Auth, Postgres et des règles RLS par utilisateur. Le formulaire et l'aperçu imprimable reprennent les rubriques du modèle fourni par RD Gestion & Services. Le logo PNG fourni est inclus dans `public/rd-logo.png`.

## Mise en route

1. Créer un projet Supabase.
2. Appliquer, dans l’ordre, les migrations du dossier `supabase/migrations`. Sur une base déjà initialisée, appliquer uniquement les nouvelles migrations non encore exécutées.
3. Copier `.env.example` vers `.env.local`, puis remplacer l'URL et la clé **publishable** par les valeurs de votre projet (Project Settings → API Keys). Ne jamais utiliser une clé secrète ou `service_role` dans `NEXT_PUBLIC_*`.
4. Dans Supabase Auth → URL Configuration, régler l'URL du site sur `http://localhost:3001` et ajouter `http://localhost:3001/**` aux URL de redirection. Ajouter également `https://votre-domaine/auth/callback` lors du déploiement. Cette URL sert à la confirmation de compte et à la réinitialisation du mot de passe.
5. Pour que les messages de récupération arrivent de façon fiable en production, configurer un serveur SMTP dans Supabase Auth → SMTP Settings, puis personnaliser au besoin le modèle « Reset password ». Sans SMTP personnalisé, les limites et restrictions du service d’e-mail de démonstration Supabase s’appliquent.
6. Exécuter `npm install`, puis `npm run dev`. Ouvrir `http://localhost:3001`.

L'inscription e-mail et mot de passe peut exiger une confirmation par e-mail selon la configuration Auth. Un compte ne voit que ses propres factures. Les données ne sont pas reliées à l'ancien Site : aucune migration des factures existantes n'a été effectuée.

## Contenu

- Connexion, création de compte et réinitialisation du mot de passe via Supabase Auth, session SSR rafraîchie par `proxy.ts`.
- Liste, recherche et filtres de factures ; création, modification, suppression et statuts.
- Émetteur, client, suivi par, objet, période, lignes, taxes, échéance, coordonnées bancaires et mentions libres.
- Aperçu avec logo, mise en page imprimable A4 et export PDF par « Imprimer / PDF » du navigateur.
- Postgres avec RLS sur les utilisateurs, clients, factures et courriers (`user_id`), et numéro de facture unique par utilisateur.
- Clients en colonnes structurées ; contenu flexible des factures et courriers dans `payload` JSONB.
- Un modèle de facture et un modèle de courrier par utilisateur, enregistrés dans `public.users`.

## Vérifications

`npm run typecheck` et `npm run build` passent. Dans l'environnement de création, le build a nécessité un contournement local d'une anomalie de `process.memoryUsage()` du runtime ; ce fichier de contournement n'est pas nécessaire au projet et n'est pas inclus. Le parcours avec une base Supabase réelle doit encore être testé après configuration des clés.

## Points à valider avant d'émettre des factures

Le modèle source juxtapose « TVA non applicable » et une ligne « TVA 20 % ». La nouvelle interface ne choisit pas de régime fiscal à votre place : les taux, mentions, séquence de numérotation, conditions de règlement et informations de l'entreprise doivent être vérifiés selon votre situation. L'envoi automatique d'e-mails et la migration de l'ancien Site ne sont pas inclus.

## Pour poursuivre dans Codex

Décompresser ce dossier, l'ouvrir comme projet dans Codex ou le placer dans votre dépôt Git, puis ajouter `.env.local` localement. Aucun identifiant Supabase réel n'est stocké dans l'archive.
