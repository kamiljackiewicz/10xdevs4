-- Keep legacy ownership roots intact; every future write must complete the profile.
alter table public.patients
  add column first_name text,
  add column date_of_birth date,
  add column sex text;

alter table public.patients
  add constraint patients_complete_profile_check check (
    first_name is not null
    and char_length(first_name) between 1 and 100
    and first_name = btrim(first_name, E' \t\n\r\f\v')
    and first_name !~ '^[[:space:]]*$'
    and date_of_birth is not null
    and date_of_birth >= date '0001-01-01'
    and date_of_birth <= (now() at time zone 'UTC')::date
    and sex is not null
    and sex in ('female', 'male')
  ) not valid;

create function public.set_patient_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create trigger patients_set_updated_at
before update on public.patients
for each row execute function public.set_patient_updated_at();

-- Required surname, preserving legacy profiles until their next write.
alter table public.patients add column last_name text;

alter table public.patients
  add constraint patients_last_name_check check (
    last_name is not null
    and char_length(last_name) between 1 and 100
    and last_name = btrim(last_name, E' \t\n\r\f\013')
    and last_name !~ '^[[:space:]]*$'
  ) not valid;
