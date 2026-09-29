-- Cloud-only probe of the deployed function; no real users, patients or objects.
begin;
create temporary table patient_id_probe (
  id uuid primary key default gen_random_uuid(),
  label text
) on commit drop;
create trigger probe_guard_id before insert or update on patient_id_probe
for each row execute function public.guard_patient_id();

do $$
declare
  supplied uuid := gen_random_uuid();
  original uuid;
  replacement uuid;
begin
  insert into patient_id_probe(id, label) values (supplied, 'synthetic') returning id into original;
  assert original <> supplied, 'Client-supplied ID must be replaced';
  update patient_id_probe set label = 'edited' where id = original;
  assert exists(select 1 from patient_id_probe where id = original and label = 'edited'),
    'Ordinary updates must preserve identity';
  begin
    update patient_id_probe set id = supplied where id = original;
    raise exception 'ID mutation was accepted';
  exception when insufficient_privilege then null;
  end;
  delete from patient_id_probe where id = original;
  insert into patient_id_probe(id, label) values (original, 'replacement') returning id into replacement;
  assert replacement <> original, 'Retired ID must not be reclaimed';
end;
$$;
rollback;
select 'PASS: supplied IDs replaced, updates immutable, retired IDs not reclaimed' as result;
