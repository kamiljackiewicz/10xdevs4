-- Storage authorization uses the patient UUID: clients must never choose/reuse it.
create function public.guard_patient_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    NEW.id := gen_random_uuid();
  elsif NEW.id is distinct from OLD.id then
    raise exception 'Patient ID is immutable'
      using errcode = '42501';
  end if;
  return NEW;
end;
$$;

create trigger patients_guard_id
before insert or update on public.patients
for each row execute function public.guard_patient_id();
