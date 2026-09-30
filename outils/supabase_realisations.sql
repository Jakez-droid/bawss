-- Bawss : « Je l'ai faite ! » (photos des potes, likes, signalements)
-- À coller en une fois dans Supabase > SQL Editor > New query, puis Run.

create table if not exists public.realisations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pseudo text not null default '',
  recette text not null,
  photo text not null,
  mot text check (char_length(mot) <= 140),
  note smallint check (note between 1 and 3),
  signale boolean not null default false,
  cree_le timestamptz not null default now()
);
create index if not exists realisations_recette on public.realisations (recette, cree_le desc);
create index if not exists realisations_date on public.realisations (cree_le desc);

create table if not exists public.likes (
  realisation uuid not null references public.realisations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (realisation, user_id)
);

-- le pseudo est recopié depuis le profil au moment de publier (personne ne peut en mettre un autre)
create or replace function public.realisation_pseudo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.pseudo := coalesce((select pseudo from public.profils where id = auth.uid()), 'Anonyme');
  new.signale := false;
  new.cree_le := now();
  return new;
end $$;
drop trigger if exists realisation_pseudo on public.realisations;
create trigger realisation_pseudo before insert on public.realisations
  for each row execute function public.realisation_pseudo();

-- signaler une photo (n'importe quel membre), sans pouvoir modifier le reste
create or replace function public.signaler(r uuid) returns void
language sql security definer set search_path = public as $$
  update public.realisations set signale = true where id = r and auth.uid() is not null;
$$;

alter table public.realisations enable row level security;
alter table public.likes enable row level security;

drop policy if exists "voir les realisations" on public.realisations;
create policy "voir les realisations" on public.realisations for select to authenticated using (true);
drop policy if exists "publier sa realisation" on public.realisations;
create policy "publier sa realisation" on public.realisations for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "supprimer sa realisation" on public.realisations;
create policy "supprimer sa realisation" on public.realisations for delete to authenticated using (user_id = auth.uid() or public.est_admin());

drop policy if exists "voir les likes" on public.likes;
create policy "voir les likes" on public.likes for select to authenticated using (true);
drop policy if exists "liker" on public.likes;
create policy "liker" on public.likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "deliker" on public.likes;
create policy "deliker" on public.likes for delete to authenticated using (user_id = auth.uid());

revoke all on public.realisations, public.likes from anon;
grant select, insert, delete on public.realisations to authenticated;
grant select, insert, delete on public.likes to authenticated;
grant execute on function public.signaler(uuid) to authenticated;

-- l'espace photos (privé : seuls les membres connectés peuvent voir les photos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('realisations', 'realisations', false, 3145728, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "bawss voir les photos" on storage.objects;
create policy "bawss voir les photos" on storage.objects for select to authenticated
  using (bucket_id = 'realisations');
drop policy if exists "bawss envoyer sa photo" on storage.objects;
create policy "bawss envoyer sa photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'realisations' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "bawss supprimer sa photo" on storage.objects;
create policy "bawss supprimer sa photo" on storage.objects for delete to authenticated
  using (bucket_id = 'realisations' and ((storage.foldername(name))[1] = auth.uid()::text or public.est_admin()));
