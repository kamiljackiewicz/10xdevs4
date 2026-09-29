-- Run with: npx supabase db query --linked --file supabase/tests/patient_profile_contract.sql
-- Exercise the deployed constraint/trigger on a temporary copy, never patient data.
begin;

create temporary table profile_contract_probe
  (like public.patients including defaults) on commit drop;

do $$
declare
  legacy_id uuid := gen_random_uuid();
  check_definition text;
  surname_definition text;
  invalid_profile record;
  invalid_surname text;
begin
  select pg_get_constraintdef(oid) into strict check_definition
  from pg_constraint
  where conrelid = 'public.patients'::regclass
    and conname = 'patients_complete_profile_check'
    and not convalidated;

  select pg_get_constraintdef(oid) into strict surname_definition
  from pg_constraint
  where conrelid = 'public.patients'::regclass
    and conname = 'patients_last_name_check'
    and not convalidated;

  -- Simulate an existing root before adding the actual deployed NOT VALID check.
  insert into profile_contract_probe (id, owner_id, updated_at)
  values (legacy_id, gen_random_uuid(), '2000-01-01T00:00:00Z');
  execute 'alter table profile_contract_probe add constraint profile_probe_check ' || check_definition;
  execute 'alter table profile_contract_probe add constraint surname_probe_check ' || surname_definition;
  assert (select first_name is null from profile_contract_probe where id = legacy_id),
    'Legacy roots must survive without fabricated profile fields';

  create trigger profile_probe_updated_at before update on profile_contract_probe
    for each row execute function public.set_patient_updated_at();

  begin
    update profile_contract_probe set first_name = 'Incomplete' where id = legacy_id;
    raise exception 'An incomplete legacy update was accepted';
  exception when check_violation then null;
  end;

  update profile_contract_probe
  set first_name = 'Synthetic', last_name = 'Test', date_of_birth = '2000-02-29', sex = 'female'
  where id = legacy_id;
  assert (select count(*) = 1 from profile_contract_probe), 'Completion must not add another root';
  assert (select first_name = 'Synthetic' and last_name = 'Test' and updated_at > '2000-01-01T00:00:00Z'
    from profile_contract_probe where id = legacy_id), 'Completion must preserve ID and update timestamp';

  for invalid_profile in
    select * from (values
      (null::text, date '2000-01-01', 'female'::text),
      ('', date '2000-01-01', 'female'),
      ('   ', date '2000-01-01', 'female'),
      (E'\t\n', date '2000-01-01', 'female'),
      (' Synthetic ', date '2000-01-01', 'female'),
      (repeat('a', 101), date '2000-01-01', 'female'),
      ('Synthetic', null, 'female'),
      ('Synthetic', (now() at time zone 'UTC')::date + 1, 'female'),
      ('Synthetic', date 'infinity', 'female'),
      ('Synthetic', date '2000-01-01', null),
      ('Synthetic', date '2000-01-01', 'other')
    ) as cases(first_name, date_of_birth, sex)
  loop
    begin
      insert into profile_contract_probe (owner_id, first_name, last_name, date_of_birth, sex)
      values (gen_random_uuid(), invalid_profile.first_name, 'Test', invalid_profile.date_of_birth, invalid_profile.sex);
      raise exception 'Invalid profile was accepted';
    exception when check_violation then null;
    end;
  end loop;

  foreach invalid_surname in array array[null, '', '   ', E'\t\n', ' Test ', repeat('a', 101)] loop
    begin
      insert into profile_contract_probe (owner_id, first_name, last_name, date_of_birth, sex)
      values (gen_random_uuid(), 'Synthetic', invalid_surname, date '2000-01-01', 'male');
      raise exception 'Invalid surname was accepted';
    exception when check_violation then null;
    end;
  end loop;

  insert into profile_contract_probe (owner_id, first_name, last_name, date_of_birth, sex)
  values (gen_random_uuid(), repeat('a', 100), repeat('b', 100), (now() at time zone 'UTC')::date, 'male');
end;
$$;

rollback;
select 'PASS: deployed profile constraint, legacy completion and timestamp trigger' as result;
