create table public.patients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id)
);

alter table public.patients enable row level security;

create policy "Patients are selectable by their owner"
on public.patients
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Patients are insertable by their owner"
on public.patients
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Patients are updateable by their owner"
on public.patients
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Patients are deletable by their owner"
on public.patients
for delete
to authenticated
using ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public)
values ('patient-documents', 'patient-documents', false);

create policy "Patient document objects are selectable by their owner"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'patient-documents'
  and array_length(storage.foldername(name), 1) = 1
  and exists (
    select 1
    from public.patients
    where patients.id::text = (storage.foldername(name))[1]
      and patients.owner_id = (select auth.uid())
  )
);

create policy "Patient document objects are insertable by their owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'patient-documents'
  and array_length(storage.foldername(name), 1) = 1
  and exists (
    select 1
    from public.patients
    where patients.id::text = (storage.foldername(name))[1]
      and patients.owner_id = (select auth.uid())
  )
);

create policy "Patient document objects are updateable by their owner"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'patient-documents'
  and array_length(storage.foldername(name), 1) = 1
  and exists (
    select 1
    from public.patients
    where patients.id::text = (storage.foldername(name))[1]
      and patients.owner_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'patient-documents'
  and array_length(storage.foldername(name), 1) = 1
  and exists (
    select 1
    from public.patients
    where patients.id::text = (storage.foldername(name))[1]
      and patients.owner_id = (select auth.uid())
  )
);

create policy "Patient document objects are deletable by their owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'patient-documents'
  and array_length(storage.foldername(name), 1) = 1
  and exists (
    select 1
    from public.patients
    where patients.id::text = (storage.foldername(name))[1]
      and patients.owner_id = (select auth.uid())
  )
);
