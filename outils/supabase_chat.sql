-- Bawss : « Écris au Bawss » (messages privés entre chaque membre et Jakez)
-- À coller en une fois dans Supabase > SQL Editor > New query, puis Run.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,   -- le membre de la conversation
  de_admin boolean not null default false,                                -- true = réponse de Jakez
  texte text not null check (char_length(texte) between 1 and 2000),
  recette text,
  lu boolean not null default false,
  alerte boolean not null default false,                                  -- mail d'alerte déjà envoyé à Jakez
  cree_le timestamptz not null default now()
);
alter table public.messages add column if not exists alerte boolean not null default false;
create index if not exists messages_fil on public.messages (user_id, cree_le);

-- un membre écrit toujours dans sa propre conversation ; Jakez répond dans celle du membre
create or replace function public.message_auteur() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.est_admin() and new.user_id is not null and new.user_id <> auth.uid() then
    new.de_admin := true;
  else
    new.user_id := auth.uid();
    new.de_admin := false;
  end if;
  new.lu := false;
  new.alerte := false;
  new.cree_le := now();
  return new;
end $$;
drop trigger if exists message_auteur on public.messages;
create trigger message_auteur before insert on public.messages
  for each row execute function public.message_auteur();

alter table public.messages enable row level security;
drop policy if exists "lire ses messages" on public.messages;
create policy "lire ses messages" on public.messages for select to authenticated
  using (user_id = auth.uid() or public.est_admin());
drop policy if exists "envoyer un message" on public.messages;
create policy "envoyer un message" on public.messages for insert to authenticated
  with check (user_id = auth.uid() or public.est_admin());
drop policy if exists "marquer comme lu" on public.messages;
create policy "marquer comme lu" on public.messages for update to authenticated
  using (user_id = auth.uid() or public.est_admin()) with check (user_id = auth.uid() or public.est_admin());

revoke all on public.messages from anon;
grant select, insert on public.messages to authenticated;
grant update (lu) on public.messages to authenticated;

-- messages en direct
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
