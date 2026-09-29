create table public.timeline_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  event_date date not null check (event_date >= date '0001-01-01' and event_date <= date '9999-12-31'),
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index timeline_notes_patient_timeline_idx
  on public.timeline_notes (patient_id, event_date desc, created_at desc, id desc);

create function public.guard_timeline_note()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  birth_date date;
begin
  if TG_OP = 'INSERT' then
    new.id := gen_random_uuid();
    new.created_at := clock_timestamp();
  else
    if new.id is distinct from old.id or new.patient_id is distinct from old.patient_id or new.created_at is distinct from old.created_at then
      raise exception 'Timeline note identity is immutable' using errcode = '42501';
    end if;
  end if;
  new.body := btrim(replace(replace(new.body, E'\r\n', E'\n'), E'\r', E'\n'), E' \t\n\r\f\013');
  if char_length(new.body) not between 1 and 5000 then
    raise exception 'Timeline note body must contain 1 to 5000 characters' using errcode = '23514';
  end if;
  select p.date_of_birth into birth_date from public.patients p where p.id = new.patient_id;
  if birth_date is null then
    raise exception 'Patient birth date is required' using errcode = '23514';
  end if;
  if new.event_date < birth_date then
    raise exception 'Timeline note cannot predate birth date' using errcode = '23514';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create trigger timeline_notes_guard
before insert or update on public.timeline_notes
for each row execute function public.guard_timeline_note();

alter table public.timeline_notes enable row level security;

create policy "Timeline notes are selectable by patient owner" on public.timeline_notes for select to authenticated
using (exists (select 1 from public.patients p where p.id = patient_id and p.owner_id = (select auth.uid())));
create policy "Timeline notes are insertable by patient owner" on public.timeline_notes for insert to authenticated
with check (exists (select 1 from public.patients p where p.id = patient_id and p.owner_id = (select auth.uid())));
create policy "Timeline notes are updateable by patient owner" on public.timeline_notes for update to authenticated
using (exists (select 1 from public.patients p where p.id = patient_id and p.owner_id = (select auth.uid())))
with check (exists (select 1 from public.patients p where p.id = patient_id and p.owner_id = (select auth.uid())));
create policy "Timeline notes are deletable by patient owner" on public.timeline_notes for delete to authenticated
using (exists (select 1 from public.patients p where p.id = patient_id and p.owner_id = (select auth.uid())));
