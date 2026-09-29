-- This application manages a single issuing company.
alter table public.users
  alter column issuer set default 'RD GESTION & SERVICES',
  alter column issuer_address set default '9 impasse Gizeh - 69220 BELLEVILLE EN BEAUJOLAIS';

update public.users
set issuer = 'RD GESTION & SERVICES',
    issuer_address = '9 impasse Gizeh - 69220 BELLEVILLE EN BEAUJOLAIS';
