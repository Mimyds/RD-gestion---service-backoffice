// Issuing company settings, edited by the manager in « Réglages » and stored in public.users.
export type CompanySettings = {
  name: string;
  address: string;
  email: string;
  phone: string;
  letterCity: string;
  bankDetails: string;
  legalMentions: string;
  footer: string;
};

export const SETTINGS_LIMITS: Record<keyof CompanySettings, number> = {
  name: 200,
  address: 500,
  email: 200,
  phone: 50,
  letterCity: 100,
  bankDetails: 2000,
  legalMentions: 5000,
  footer: 1000,
};

// Fallback values used until the account's settings are loaded or when a field is empty in the database.
export const DEFAULT_COMPANY: CompanySettings = {
  name: "RD GESTION & SERVICES",
  address: "9 impasse Gizeh - 69220 BELLEVILLE EN BEAUJOLAIS",
  email: "remy.desroses@gmail.com",
  phone: "+33(0) 787 330 553",
  letterCity: "Belleville-en-Beaujolais",
  bankDetails: `Banque : BANQUE POPULAIRE
Titulaire du compte : M DESROSES - CALTON
Coordonnées bancaires : BP AURA BELLEVILLE
IBAN : FR76 1680 7004 0081 9324 3019 097
Code BIC : CCBPFRPPGRE
Chèque : RD GESTION & SERVICES - M DESROSES RÉMY, 9 impasse Gizeh - 69220 Belleville en Beaujolais`,
  legalMentions: `TVA non applicable - article 293 B du CGI
Nos factures sont payables au comptant, sans escompte. Le client, donneur d'ordre, qu'il agisse en son nom personnel ou comme mandataire d'un tiers, reste, en tout état de cause, personnellement redevable du coût de la prestation commandée et facturée.
Pénalité de retard : 3 fois le taux d'intérêt légal (loi 92-1442 du 31/12/1992, et loi 2001-420 du 15/05/2001). Indemnité forfaitaire pour frais de recouvrement : 40 €.`,
  footer: `RD GESTION & SERVICES - SASU au capital de 150 € - Siège social : 9 impasse Gizeh - 69220 BELLEVILLE EN BEAUJOLAIS - 899 050 553 R.C.S
VILLEFRANCHE - TARARE`,
};

export const companyDetails = (settings: Pick<CompanySettings, "email" | "phone">) => [settings.email, settings.phone].filter(Boolean).join("\n");
