-- Boards
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  title text not null default 'Untitled board',
  visibility text not null default 'private',
  created_at timestamptz not null default now()
);

-- Members
create table if not exists public.board_members (
  board_id uuid references public.boards(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  primary key (board_id, user_id)
);

-- Items
create table if not exists public.board_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  type text not null check (type in ('memo','image')),
  x numeric not null default 0,
  y numeric not null default 0,
  width numeric,
  height numeric,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audit events
create table if not exists public.board_events (
  id bigserial primary key,
  board_id uuid not null,
  item_id uuid not null,
  actor uuid not null,
  event_type text not null,
  snapshot jsonb not null,
  occurred_at timestamptz not null default now()
);

-- Updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists trg_touch_updated_at on public.board_items;
create trigger trg_touch_updated_at
before update on public.board_items
for each row execute function public.touch_updated_at();

-- Event logging
create or replace function public.log_board_item_event()
returns trigger language plpgsql as $$
declare v_event text;
begin
  if tg_op = 'INSERT' then
    v_event := 'item_created';
    insert into public.board_events(board_id,item_id,actor,event_type,snapshot)
    values (new.board_id, new.id, new.created_by, v_event, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    if (new.x, new.y) is distinct from (old.x, old.y)
       and to_jsonb(new) - 'updated_at' - 'x' - 'y' = to_jsonb(old) - 'updated_at' - 'x' - 'y'
    then
      v_event := 'item_moved';
    else
      v_event := 'item_updated';
    end if;
    insert into public.board_events(board_id,item_id,actor,event_type,snapshot)
    values (new.board_id, new.id, new.created_by, v_event, to_jsonb(new));
    return new;
  end if;
  return null;
end; $$;

drop trigger if exists trg_log_board_item_event_ins on public.board_items;
drop trigger if exists trg_log_board_item_event_upd on public.board_items;

create trigger trg_log_board_item_event_ins
after insert on public.board_items
for each row execute function public.log_board_item_event();

create trigger trg_log_board_item_event_upd
after update on public.board_items
for each row execute function public.log_board_item_event();

-- Realtime publication
alter publication supabase_realtime add table public.board_items;

-- RLS
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.board_items enable row level security;
alter table public.board_events enable row level security;

-- Policies
create policy "boards: members or owner can read"
on public.boards for select
using (
  auth.uid() = owner_id
  or exists (select 1 from public.board_members m where m.board_id = boards.id and m.user_id = auth.uid())
);

create policy "boards: only owner updates"
on public.boards for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "board_members: members can read"
on public.board_members for select
using (exists (select 1 from public.boards b where b.id = board_members.board_id and (b.owner_id = auth.uid() or exists (select 1 from public.board_members m where m.board_id = b.id and m.user_id = auth.uid()))));

create policy "board_items: members read"
on public.board_items for select
using (
  exists (select 1 from public.boards b
          left join public.board_members m on m.board_id = b.id and m.user_id = auth.uid()
          where b.id = board_items.board_id
            and (b.owner_id = auth.uid() or m.user_id is not null))
);

create policy "board_items: editors/owner insert"
on public.board_items for insert
with check (
  exists (select 1 from public.boards b
          left join public.board_members m on m.board_id = b.id and m.user_id = auth.uid()
          where b.id = board_items.board_id
            and (b.owner_id = auth.uid() or (m.user_id is not null and m.role in ('owner','editor'))))
);

create policy "board_items: editors/owner update"
on public.board_items for update
using (
  exists (select 1 from public.boards b
          left join public.board_members m on m.board_id = b.id and m.user_id = auth.uid()
          where b.id = board_items.board_id
            and (b.owner_id = auth.uid() or (m.user_id is not null and m.role in ('owner','editor'))))
)
with check (
  exists (select 1 from public.boards b
          left join public.board_members m on m.board_id = b.id and m.user_id = auth.uid()
          where b.id = board_items.board_id
            and (b.owner_id = auth.uid() or (m.user_id is not null and m.role in ('owner','editor'))))
);

create policy "board_events: members read"
on public.board_events for select
using (
  exists (select 1 from public.boards b
          left join public.board_members m on m.board_id = b.id and m.user_id = auth.uid()
          where b.id = board_events.board_id
            and (b.owner_id = auth.uid() or m.user_id is not null))
);


