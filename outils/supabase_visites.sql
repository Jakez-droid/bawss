-- Bawss : compteur anonyme de visiteurs (avec ou sans compte)
-- À coller une fois dans Supabase > SQL Editor > Run.
-- Chaque téléphone a un identifiant tiré au hasard ; une ligne par téléphone et par jour.

create table if not exists public.visites (
  appareil   uuid not null,
  jour       date not null,
  plateforme text,
  installee  boolean not null default false,
  compte     uuid,                 -- null = visiteur sans compte
  invite_par text,
  nb         int not null default 1,
  cree_le    timestamptz not null default now(),
  primary key (appareil, jour)
);
alter table public.visites enable row level security;
-- aucune lecture ni écriture directe : tout passe par les deux fonctions ci-dessous
revoke all on public.visites from anon, authenticated;

-- l'appli note la visite du jour (n'importe qui, sans compte)
create or replace function public.noter_visite(p_appareil uuid, p_plateforme text default null, p_installee boolean default false, p_invite_par text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.visites (appareil, jour, plateforme, installee, compte, invite_par)
  values (p_appareil, (now() at time zone 'Europe/Paris')::date, left(p_plateforme, 20), coalesce(p_installee, false), auth.uid(), left(p_invite_par, 24))
  on conflict (appareil, jour) do update set
    compte    = coalesce(excluded.compte, visites.compte),
    installee = visites.installee or excluded.installee,
    nb        = visites.nb + 1;
$$;
grant execute on function public.noter_visite(uuid, text, boolean, text) to anon, authenticated;

-- les chiffres, visibles seulement par Jakez (admin)
drop function if exists public.stats_visites();
create function public.stats_visites()
returns table (appareils bigint, semaine bigint, aujourdhui bigint, nouveaux_semaine bigint, sans_compte bigint, installes bigint)
language sql stable security definer set search_path = public as $$
  with t as (select (now() at time zone 'Europe/Paris')::date as j),
  a as (
    select appareil, min(jour) premier, max(jour) dernier, bool_or(compte is not null) a_compte, bool_or(installee) inst
    from public.visites group by appareil
  )
  select count(*),
         count(*) filter (where dernier > (select j from t) - 7),
         count(*) filter (where dernier = (select j from t)),
         count(*) filter (where premier > (select j from t) - 7),
         count(*) filter (where not a_compte),
         count(*) filter (where inst)
  from a where public.est_admin();
$$;
revoke execute on function public.stats_visites() from anon;
grant execute on function public.stats_visites() to authenticated;

-- Pour remettre à zéro le mot de passe d'un membre qui l'a oublié (remplace PSEUDO et NOUVEAU) :
-- update auth.users set encrypted_password = crypt('NOUVEAU', gen_salt('bf'))
-- where email = 'PSEUDO@bawss.app';
-- (le pseudo en minuscules, sans accents, espaces remplacés par des tirets)
