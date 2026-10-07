-- Bawss : demandes de recettes (avec ou sans compte)
-- À coller une fois dans Supabase > SQL Editor > Run (après supabase_visites.sql et supabase_stats.sql, déjà faits).
-- Une ligne par demande : le plat demandé, une précision facultative, le pseudo si la personne a un compte.

create table if not exists public.demandes (
  id        bigint generated always as identity primary key,
  appareil  uuid not null,
  quand     timestamptz not null default now(),
  terme     text not null,
  detail    text,
  compte    uuid,
  pseudo    text,
  faite     boolean not null default false
);
alter table public.demandes enable row level security;
revoke all on public.demandes from anon, authenticated;

-- n'importe qui envoie une demande (10 par appareil et par jour au plus)
create or replace function public.demander_recette(p_appareil uuid, p_terme text, p_precision text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_appareil is null or length(trim(coalesce(p_terme, ''))) < 2 then return false; end if;
  if (select count(*) from public.demandes where appareil = p_appareil and quand > now() - interval '1 day') >= 10 then return false; end if;
  insert into public.demandes (appareil, terme, detail, compte, pseudo)
  values (p_appareil, left(trim(p_terme), 60), nullif(left(trim(coalesce(p_precision, '')), 200), ''), auth.uid(),
          (select pseudo from public.profils where id = auth.uid()));
  return true;
end $$;
grant execute on function public.demander_recette(uuid, text, text) to anon, authenticated;

-- la liste, pour Jakez seulement
drop function if exists public.demandes_liste();
create function public.demandes_liste()
returns table (id bigint, quand timestamptz, terme text, detail text, pseudo text, appareil uuid, faite boolean)
language sql stable security definer set search_path = public as $$
  select d.id, d.quand, d.terme, d.detail, d.pseudo, d.appareil, d.faite
  from public.demandes d where public.est_admin() order by d.quand desc limit 500;
$$;
revoke execute on function public.demandes_liste() from anon;
grant execute on function public.demandes_liste() to authenticated;

-- « C'est fait » : archive les demandes d'un même plat (la liste de leurs numéros)
drop function if exists public.demande_faite(text);
create or replace function public.demande_faite(p_ids bigint[])
returns void language sql security definer set search_path = public as $$
  update public.demandes set faite = true where public.est_admin() and id = any(p_ids);
$$;
revoke execute on function public.demande_faite(bigint[]) from anon;
grant execute on function public.demande_faite(bigint[]) to authenticated;
