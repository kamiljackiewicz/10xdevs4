import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { TextEncoder } from "node:util";

for (const name of ["SUPABASE_URL", "SUPABASE_KEY", "SUPABASE_TEST_SERVICE_ROLE_KEY"]) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_TEST_SERVICE_ROLE_KEY, options);
const runId = randomUUID();
const password = `PatientAccess-${randomUUID()}!`;
const profile = { first_name: "Test", last_name: "Synthetic", date_of_birth: "2000-01-01", sex: "female" };
const edited = { first_name: "Updated", last_name: "Fixture", date_of_birth: "2001-02-03", sex: "male" };
const columns = "id,owner_id,first_name,last_name,date_of_birth,sex,created_at,updated_at";
const users = [];
const paths = new Set();
let stage = "setup";
let owner;
let patientId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function matches(row, expected) {
  return row && Object.entries(expected).every(([key, value]) => row[key] === value);
}
async function identity(label) {
  const email = `patient-access-${label}-${runId}@example.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert(!error && data.user, "Temporary user creation failed");
  users.push(data.user.id);
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, options);
  const login = await client.auth.signInWithPassword({ email, password });
  assert(!login.error, "Temporary user login failed");
  return { id: data.user.id, client };
}
async function read(client, id) {
  const result = await client.from("patients").select(columns).eq("id", id).single();
  assert(!result.error && result.data, "Owner profile read failed");
  return result.data;
}

try {
  owner = await identity("owner");
  const other = await identity("other");
  stage = "owner create/read/edit and uniqueness";
  const suppliedId = randomUUID();
  const created = await owner.client
    .from("patients")
    .insert({ ...profile, id: suppliedId })
    .select(columns)
    .single();
  assert(!created.error && created.data, "Owner create failed");
  const patient = created.data;
  patientId = patient.id;
  assert(patient.id !== suppliedId, "Client-supplied patient ID was accepted");
  assert(matches(await read(owner.client, patient.id), { ...profile, owner_id: owner.id }), "Create did not persist");
  const update = await owner.client.from("patients").update(edited).eq("id", patient.id);
  assert(!update.error, "Owner edit failed");
  const persisted = await read(owner.client, patient.id);
  assert(
    matches(persisted, { ...edited, id: patient.id, owner_id: owner.id, created_at: patient.created_at }),
    "Edit did not persist identity and values",
  );
  assert(Date.parse(persisted.updated_at) > Date.parse(patient.updated_at), "Edit did not advance timestamp");
  const idMutation = await owner.client.from("patients").update({ id: randomUUID() }).eq("id", patient.id);
  assert(idMutation.error?.code === "42501", "Patient ID mutation must fail with 42501");
  assert(matches(await read(owner.client, patient.id), persisted), "Denied ID mutation changed the profile");
  const duplicate = await owner.client.from("patients").insert(profile);
  assert(duplicate.error?.code === "23505", "Duplicate owner must fail with 23505");

  stage = "cross-user profile isolation";
  const hidden = await other.client.from("patients").select(columns).eq("id", patient.id);
  assert(!hidden.error && hidden.data?.length === 0, "Non-owner read was not hidden");
  const foreignInsert = await other.client.from("patients").insert({ ...profile, owner_id: owner.id });
  assert(foreignInsert.error?.code === "42501", "Foreign owner insert must fail with 42501");
  const foreignUpdate = await other.client.from("patients").update(profile).eq("id", patient.id).select("id");
  assert(!foreignUpdate.error && foreignUpdate.data?.length === 0, "Non-owner update was not hidden");
  const transfer = await owner.client
    .from("patients")
    .update({ ...edited, owner_id: other.id })
    .eq("id", patient.id);
  assert(transfer.error?.code === "42501", "Ownership transfer must fail with 42501");
  const foreignDelete = await other.client.from("patients").delete().eq("id", patient.id).select("id");
  assert(!foreignDelete.error && foreignDelete.data?.length === 0, "Non-owner delete was not hidden");
  assert(matches(await read(owner.client, patient.id), persisted), "Denied writes changed persisted profile");
  const otherPatient = await other.client.from("patients").insert(profile).select(columns).single();
  assert(
    !otherPatient.error && matches(otherPatient.data, { ...profile, owner_id: other.id }),
    "Second identity could not create its own profile",
  );

  stage = "private Storage isolation";
  const objectPath = `${patient.id}/access-${runId}.txt`;
  const forbiddenPath = `${patient.id}/forbidden-${runId}.txt`;
  // Track before requests: a response can be lost after a successful mutation.
  paths.add(objectPath);
  paths.add(forbiddenPath);
  const content = new TextEncoder().encode("synthetic patient access contract test");
  const storage = owner.client.storage.from("patient-documents");
  const foreignStorage = other.client.storage.from("patient-documents");
  assert(!(await storage.upload(objectPath, content, { contentType: "text/plain" })).error, "Owner upload failed");
  const download = await storage.download(objectPath);
  assert(!download.error && download.data, "Owner download failed");
  const updatedContent = new TextEncoder().encode("updated synthetic document");
  assert(
    !(await storage.upload(objectPath, updatedContent, { contentType: "text/plain", upsert: true })).error,
    "Owner replace failed",
  );
  const updated = await storage.download(objectPath);
  assert(
    !updated.error && updated.data && (await updated.data.text()) === "updated synthetic document",
    "Owner replacement did not persist content",
  );
  assert((await foreignStorage.download(objectPath)).error, "Non-owner download succeeded");
  assert(
    (await foreignStorage.upload(forbiddenPath, content, { contentType: "text/plain" })).error,
    "Non-owner upload succeeded",
  );
  const attackContent = new TextEncoder().encode("unauthorized replacement");
  assert((await foreignStorage.update(objectPath, attackContent)).error, "Non-owner update succeeded");
  assert(
    (await foreignStorage.upload(objectPath, attackContent, { upsert: true })).error,
    "Non-owner overwrite succeeded",
  );
  const unchanged = await storage.download(objectPath);
  assert(
    !unchanged.error && unchanged.data && (await unchanged.data.text()) === "updated synthetic document",
    "Denied overwrite changed document content",
  );
  await foreignStorage.remove([objectPath]);
  const retained = await storage.download(objectPath);
  assert(!retained.error && retained.data, "Non-owner deleted document");
  assert(!(await storage.remove([objectPath])).error, "Owner document delete failed");
  const remaining = await storage.list(patient.id, { search: `access-${runId}.txt` });
  assert(!remaining.error && remaining.data?.length === 0, "Owner document delete did not persist");

  stage = "retired patient namespace cannot be reclaimed";
  // Remove objects first: this regression must not deliberately strand Cloud files.
  const retired = await owner.client.from("patients").delete().eq("id", patient.id).select("id");
  assert(!retired.error && retired.data?.length === 1, "Owner retirement failed");
  patientId = undefined;
  const cleared = await other.client.from("patients").delete().eq("id", otherPatient.data.id).select("id");
  assert(!cleared.error && cleared.data?.length === 1, "Second fixture retirement failed");
  const reclaimed = await other.client
    .from("patients")
    .insert({ ...profile, id: patient.id })
    .select(columns)
    .single();
  assert(!reclaimed.error && reclaimed.data, "Replacement profile creation failed");
  assert(reclaimed.data.id !== patient.id, "Other user reclaimed a retired Storage namespace");
  const oldRoot = await other.client.from("patients").select("id").eq("id", patient.id);
  assert(!oldRoot.error && oldRoot.data?.length === 0, "Retired namespace resolved to another owner");
  console.log("PASS  Server-assigned immutable patient IDs and retired namespace isolation");
  console.log("PASS  Cloud profile persistence, ownership, uniqueness and private Storage isolation");
} catch {
  console.error(`FAIL  Cloud test: ${stage}`);
  process.exitCode = 1;
} finally {
  // Admin is used only for scoped fixture cleanup, never policy assertions.
  // Retain all roots/users if Storage cleanup cannot be verified.
  let safeToDeleteRoots = true;
  for (const path of paths) {
    try {
      const removal = await admin.storage.from("patient-documents").remove([path]);
      assert(!removal.error, "Object cleanup failed");
      const [folder, filename] = path.split("/");
      const remaining = await admin.storage.from("patient-documents").list(folder, { search: filename });
      assert(
        !remaining.error && !remaining.data.some((object) => object.name === filename),
        "Object cleanup not verified",
      );
    } catch {
      safeToDeleteRoots = false;
      process.exitCode = 1;
      console.error(`CLEANUP FAILED  retained synthetic users=${users.join(",")} object=${path}`);
    }
  }
  if (safeToDeleteRoots) {
    if (owner && patientId) {
      try {
        const deletion = await owner.client.from("patients").delete().eq("id", patientId).select("id");
        assert(!deletion.error && deletion.data?.length === 1, "Owner patient delete failed");
      } catch {
        process.exitCode = 1;
        console.error("FAIL  owner patient deletion");
      }
    }
    for (const id of users) {
      try {
        const deletion = await admin.from("patients").delete().eq("owner_id", id);
        assert(!deletion.error, "Patient cleanup failed");
        const remaining = await admin.from("patients").select("id").eq("owner_id", id);
        assert(!remaining.error && remaining.data?.length === 0, "Patient cleanup not verified");
        const userDeletion = await admin.auth.admin.deleteUser(id);
        assert(!userDeletion.error, "User cleanup failed");
      } catch {
        process.exitCode = 1;
        console.error(`CLEANUP FAILED  synthetic user=${id}`);
      }
    }
  }
}
