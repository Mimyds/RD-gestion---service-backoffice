-- Store the single default invoice template for existing and future users.
-- Application documents keep their own snapshot in invoices.payload.
alter table public.users
  alter column invoice_template set default jsonb_build_object(
    'bankDetails', E'Banque : BANQUE POPULAIRE\nTitulaire du compte : M DESROSES - CALTON\nCoordonnées bancaires : BP AURA BELLEVILLE\nIBAN : FR76 1680 7004 0081 9324 3019 097\nCode BIC : CCBPFRPPGRE\nChèque : RD GESTION & SERVICES - M DESROSES RÉMY, 9 impasse Gizeh - 69220 Belleville en Beaujolais',
    'legalMentions', E'TVA non applicable - article 293 B du CGI\nNos factures sont payables au comptant, sans escompte. Le client, donneur d''ordre, qu''il agisse en son nom personnel ou comme mandataire d''un tiers, reste, en tout état de cause, personnellement redevable du coût de la prestation commandée et facturée.\nPénalité de retard : 3 fois le taux d''intérêt légal (loi 92-1442 du 31/12/1992, et loi 2001-420 du 15/05/2001). Indemnité forfaitaire pour frais de recouvrement : 40 €.',
    'footer', E'RD GESTION & SERVICES - SASU au capital de 150 € - Siège social : 9 impasse Gizeh - 69220 BELLEVILLE EN BEAUJOLAIS - 899 050 553 R.C.S\nVILLEFRANCHE - TARARE'
  );

update public.users
set invoice_template = jsonb_build_object(
  'bankDetails', E'Banque : BANQUE POPULAIRE\nTitulaire du compte : M DESROSES - CALTON\nCoordonnées bancaires : BP AURA BELLEVILLE\nIBAN : FR76 1680 7004 0081 9324 3019 097\nCode BIC : CCBPFRPPGRE\nChèque : RD GESTION & SERVICES - M DESROSES RÉMY, 9 impasse Gizeh - 69220 Belleville en Beaujolais',
  'legalMentions', E'TVA non applicable - article 293 B du CGI\nNos factures sont payables au comptant, sans escompte. Le client, donneur d''ordre, qu''il agisse en son nom personnel ou comme mandataire d''un tiers, reste, en tout état de cause, personnellement redevable du coût de la prestation commandée et facturée.\nPénalité de retard : 3 fois le taux d''intérêt légal (loi 92-1442 du 31/12/1992, et loi 2001-420 du 15/05/2001). Indemnité forfaitaire pour frais de recouvrement : 40 €.',
  'footer', E'RD GESTION & SERVICES - SASU au capital de 150 € - Siège social : 9 impasse Gizeh - 69220 BELLEVILLE EN BEAUJOLAIS - 899 050 553 R.C.S\nVILLEFRANCHE - TARARE'
) || invoice_template;
