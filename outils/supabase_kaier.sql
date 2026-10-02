-- Kaier : suivi anonyme de la diffusion du cahier de recettes public.
-- À coller en une fois dans Supabase > SQL Editor > New query, puis Run.
-- Avant de lancer : remplace CHANGE-MOI (tout en bas) par le code secret de ta page de stats.
--
-- Ce qui est enregistré : un identifiant au hasard par téléphone, qui l'a envoyé (l'identifiant du parrain),
-- ce qu'il fait (visite, recette ouverte, partage, « je l'ai faite »…). Aucun nom, aucun mail, aucune adresse IP.

create table if not exists public.kaier_events (
  id bigint generated always as identity primary key,
  v text not null check (char_length(v) between 4 and 24),
  de text check (char_length(de) <= 24),
  type text not null check (type in ('visite','recette','partage','cuisine','faite','courses','favori','installe','hasard','recherche')),
  recette text check (char_length(recette) <= 80),
  canal text check (char_length(canal) <= 40),
  plateforme text check (char_length(plateforme) <= 12),
  appli boolean,
  nouveau boolean,
  cree_le timestamptz not null default now()
);
create index if not exists kaier_events_v on public.kaier_events (v, id);
create index if not exists kaier_events_date on public.kaier_events (cree_le desc);
create index if not exists kaier_events_type on public.kaier_events (type, recette);

-- tout le monde peut écrire un événement, personne ne peut les relire directement
alter table public.kaier_events enable row level security;
drop policy if exists "kaier ecrire" on public.kaier_events;
create policy "kaier ecrire" on public.kaier_events for insert to anon, authenticated with check (true);
revoke all on public.kaier_events from anon, authenticated;
grant insert (v, de, type, recette, canal, plateforme, appli, nouveau) on public.kaier_events to anon, authenticated;

-- le code de la page de stats
create table if not exists public.kaier_reglages (cle text primary key, valeur text not null);
alter table public.kaier_reglages enable row level security;
revoke all on public.kaier_reglages from anon, authenticated;

-- compteur public « déjà faite N fois » affiché sur les recettes
create or replace function public.kaier_compteurs() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_object_agg(recette, n), '{}'::json) from (
    select recette, count(distinct v) n from kaier_events
    where type = 'faite' and recette is not null and v <> 'jakez' group by recette
  ) t;
$$;
revoke all on function public.kaier_compteurs() from public;
grant execute on function public.kaier_compteurs() to anon, authenticated;

-- toutes les stats, seulement avec le bon code
create or replace function public.kaier_stats(code text) returns json
language plpgsql stable security definer set search_path = public as $$
declare res json;
begin
  if code is null or code <> (select valeur from kaier_reglages where cle = 'code') then
    perform pg_sleep(1);
    raise exception 'code incorrect';
  end if;

  with recursive ev as (select * from kaier_events where v <> 'jakez'),
  pers as (  -- une ligne par personne : son parrain (premier connu), sa première venue, son téléphone
    select v,
      (array_agg(de order by id) filter (where de is not null))[1] as parrain,
      min(cree_le) as arrive_le,
      (array_agg(plateforme order by id))[1] as plateforme,
      bool_or(type = 'installe' or appli) as appli
    from ev group by v
  ),
  arbre as (  -- génération 1 = reçu le lien de Jakez, 2 = d'un pote de Jakez, etc.
    select p.v, p.parrain, 1 as gen from pers p where p.parrain = 'jakez'
    union all
    select p.v, p.parrain, a.gen + 1 from pers p join arbre a on p.parrain = a.v where a.gen < 30
  ),
  noeuds as (
    select p.v, p.parrain, p.arrive_le, p.plateforme, p.appli,
      coalesce((select min(gen) from arbre a where a.v = p.v), 0) as gen
    from pers p
  ),
  descendants as (
    select n.v, (with recursive d as (select v from pers where parrain = n.v union all select p.v from pers p join d on p.parrain = d.v) select count(*) from d) as nb
    from noeuds n
  )
  select json_build_object(
    'personnes', (select count(*) from pers),
    'nouveaux_7j', (select count(*) from pers where arrive_le > now() - interval '7 days'),
    'actifs_7j', (select count(distinct v) from ev where cree_le > now() - interval '7 days'),
    'via_lien', (select count(*) from pers where parrain is not null),
    'partages', (select count(*) from ev where type = 'partage'),
    'faites', (select count(*) from ev where type = 'faite'),
    'installes', (select count(*) from pers where appli),
    'gen_max', (select coalesce(max(gen), 0) from noeuds),
    'par_jour', (select coalesce(json_agg(j order by j.jour), '[]') from (
        select to_char(d::date, 'YYYY-MM-DD') jour,
          (select count(*) from pers where arrive_le::date = d::date) nouveaux,
          (select count(distinct v) from ev where cree_le::date = d::date) actifs
        from generate_series(now() - interval '29 days', now(), interval '1 day') d) j),
    'generations', (select coalesce(json_agg(g order by g.gen), '[]') from (select gen, count(*) n from noeuds group by gen) g),
    'noeuds', (select coalesce(json_agg(json_build_object('v', n.v, 'p', n.parrain, 'g', n.gen, 't', n.arrive_le, 'pl', n.plateforme, 'd', d.nb) order by n.arrive_le), '[]')
               from (select * from noeuds order by arrive_le desc limit 3000) n join descendants d using (v)),
    'recettes', (select coalesce(json_agg(r order by r.vues desc), '[]') from (
        select recette,
          count(distinct v) filter (where type = 'recette') vues,
          count(distinct v) filter (where type = 'cuisine') cuisinees,
          count(distinct v) filter (where type = 'faite') faites,
          count(*) filter (where type = 'partage') partages,
          count(distinct v) filter (where type = 'favori') favoris
        from ev where recette is not null group by recette) r),
    'canaux', (select coalesce(json_object_agg(canal, n), '{}') from (select coalesce(canal, '?') canal, count(*) n from ev where type = 'partage' group by 1) c),
    'plateformes', (select coalesce(json_object_agg(plateforme, n), '{}') from (select coalesce(plateforme, '?') plateforme, count(*) n from pers group by 1) c),
    'recherches', (select coalesce(json_agg(s order by s.n desc), '[]') from (select canal terme, count(*) n from ev where type = 'recherche' and canal is not null group by canal order by count(*) desc limit 30) s)
  ) into res;
  return res;
end $$;
revoke all on function public.kaier_stats(text) from public;
grant execute on function public.kaier_stats(text) to anon, authenticated;

-- ⬇️ ton code secret pour la page de stats (remplace CHANGE-MOI, garde les apostrophes)
insert into public.kaier_reglages (cle, valeur) values ('code', 'CHANGE-MOI')
on conflict (cle) do update set valeur = excluded.valeur;
