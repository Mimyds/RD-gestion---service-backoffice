-- Official contact details from the supplied invoice model.
alter table public.users
  alter column issuer_details set default E'remy.desroses@gmail.com\n+33(0) 787 330 553';

update public.users
set issuer_details = E'remy.desroses@gmail.com\n+33(0) 787 330 553';
