-- Bawss : statistiques détaillées (anonymes, par appareil)
-- À coller une fois dans Supabase > SQL Editor > Run (après supabase_visites.sql, déjà fait).
-- Une ligne par geste : recette ouverte, lue jusqu'au bout, cuisinée, favori, courses, partage, recherche…
-- Aucun mail, aucun nom : seulement l'identifiant tiré au hasard de chaque appareil.

create table if not exists public.evenements (
  id       bigint generated always as identity primary key,
  appareil uuid not null,
  quand    timestamptz not null default now(),
  type     text not null,
  recette  text,
  detail   text,
  nb       int,
  compte   uuid
);
create index if not exists evenements_type_recette on public.evenements (type, recette);
create index if not exists evenements_appareil_quand on public.evenements (appareil, quand);
alter table public.evenements enable row level security;
revoke all on public.evenements from anon, authenticated;

-- l'appli note un geste (n'importe qui, avec ou sans compte)
create or replace function public.noter_evt(p_appareil uuid, p_type text, p_recette text default null, p_detail text default null, p_nb int default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_appareil is null or p_type not in ('vue','bout','cuisine','fini','fav','panier','partage','entree','recherche','boss','invite','intro') then return; end if;
  -- garde-fou : au-delà de 600 gestes par appareil et par jour, on n'enregistre plus
  if (select count(*) from public.evenements where appareil = p_appareil and quand > now() - interval '1 day') >= 600 then return; end if;
  insert into public.evenements (appareil, type, recette, detail, nb, compte)
  values (p_appareil, p_type, left(p_recette, 80), left(lower(trim(p_detail)), 40), p_nb, auth.uid());
end $$;
grant execute on function public.noter_evt(uuid, text, text, text, int) to anon, authenticated;

-- tous les chiffres d'un coup, visibles seulement par Jakez (admin) ; p_jours = 7, 30… ou null pour « depuis le début »
drop function if exists public.stats_detail(int);
create function public.stats_detail(p_jours int default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  depuis timestamptz := case when p_jours is null then '-infinity'::timestamptz else now() - make_interval(days => p_jours) end;
  j0 date := (now() at time zone 'Europe/Paris')::date;
  d0 date := case when p_jours is null then '1900-01-01'::date else (now() at time zone 'Europe/Paris')::date - p_jours end;
  res jsonb;
begin
  if not public.est_admin() then return null; end if;
  with e as (select * from public.evenements where quand > depuis)
  select jsonb_build_object(
    'recettes', coalesce((select jsonb_agg(x) from (
        select recette,
          count(*) filter (where type = 'vue') as ouvertures,
          count(distinct appareil) filter (where type = 'vue') as lecteurs,
          count(distinct appareil) filter (where type = 'bout') as bout,
          count(distinct appareil) filter (where type = 'cuisine') as cuisine,
          count(distinct appareil) filter (where type = 'fini') as fini,
          count(distinct appareil) filter (where type = 'fav') as fav,
          count(distinct appareil) filter (where type = 'panier') as panier,
          count(*) filter (where type = 'partage') as partages,
          count(distinct appareil) filter (where type = 'entree') as entrees
        from e where recette is not null group by recette) x), '[]'::jsonb),
    'recherches', coalesce((select jsonb_agg(x) from (
        select detail as terme, count(distinct appareil) as n, min(nb) = 0 as vide
        from e where type = 'recherche' and detail is not null
        group by detail order by count(distinct appareil) desc, detail limit 40) x), '[]'::jsonb),
    'heures', coalesce((select jsonb_object_agg(h, n) from (
        select extract(hour from quand at time zone 'Europe/Paris')::int as h, count(*) as n
        from e where type = 'vue' group by 1) x), '{}'::jsonb),
    'jours', coalesce((select jsonb_object_agg(d, n) from (
        select extract(isodow from quand at time zone 'Europe/Paris')::int as d, count(*) as n
        from e where type = 'vue' group by 1) x), '{}'::jsonb),
    'gestes', (select jsonb_build_object(
        'boss', count(*) filter (where type = 'boss'),
        'invite', count(*) filter (where type = 'invite'),
        'partages', count(*) filter (where type = 'partage'),
        'intro_entiere', count(*) filter (where type = 'intro' and detail = 'entiere'),
        'intro_coupee', count(*) filter (where type = 'intro' and detail = 'coupee'),
        'intro_sans', count(*) filter (where type = 'intro' and detail = 'sans'),
        'recherches', count(*) filter (where type = 'recherche')) from e),
    'inviteurs', coalesce((select jsonb_agg(x) from (
        select invite_par as pseudo, count(distinct appareil) as appareils,
               count(distinct appareil) filter (where compte is not null) as avec_compte
        from public.visites where invite_par is not null and jour > d0
        group by invite_par order by 2 desc limit 20) x), '[]'::jsonb),
    'par_jour', coalesce((select jsonb_object_agg(jour, n) from (
        select jour, count(*) as n from public.visites where jour > j0 - 30 group by jour) x), '{}'::jsonb),
    'retour', (select jsonb_build_object(
        'appareils', count(*),
        'revenus', count(*) filter (where nbj >= 2),
        'fideles', count(*) filter (where nbj >= 4),
        'eligibles_7j', count(*) filter (where premier <= j0 - 7),
        'revenus_7j', count(*) filter (where premier <= j0 - 7 and revenu7))
      from (select appareil, min(jour) premier, count(distinct jour) nbj,
                   bool_or(jour > first_jour and jour <= first_jour + 7) revenu7
            from (select appareil, jour, min(jour) over (partition by appareil) first_jour from public.visites) v
            group by appareil) a)
  ) into res;
  return res;
end $$;
revoke execute on function public.stats_detail(int) from anon;
grant execute on function public.stats_detail(int) to authenticated;
