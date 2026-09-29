import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { TextEncoder } from "node:util";

const requiredVariables = ["SUPABASE_URL", "SUPABASE_KEY", "SUPABASE_TEST_SERVICE_ROLE_KEY"];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);
if (missingVariables.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVariables.join(", ")}`);
}

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_KEY;
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const password = `PatientAccess-${randomUUID()}!`;
const ownerEmail = `patient-access-owner-${runId}@example.invalid`;
const otherEmail = `patient-access-other-${runId}@example.invalid`;
const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const createdUserIds = [];
let ownerClient;
let otherClient;
let patientId;
let objectPath;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function createConfirmedUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Could not create a temporary test user: ${getErrorMessage(error)}`);
  }
  createdUserIds.push(data.user.id);
}

async function signIn(email) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Temporary test user could not sign in: ${getErrorMessage(error)}`);
  return client;
}

async function deleteObjectIfPresent() {
  if (!ownerClient || !objectPath) return;
  const { error } = await ownerClient.storage.from("patient-documents").remove([objectPath]);
  if (error && !/not found/i.test(getErrorMessage(error))) {
    throw new Error(`Could not clean up the temporary Storage object: ${getErrorMessage(error)}`);
  }
}

async function deletePatientIfPresent() {
  if (!ownerClient || !patientId) return;
  const { error } = await ownerClient.from("patients").delete().eq("id", patientId);
  if (error) throw new Error(`Could not clean up the temporary patient: ${getErrorMessage(error)}`);
}

async function deleteTemporaryUsers() {
  const failures = [];
  for (const id of createdUserIds.reverse()) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) failures.push(getErrorMessage(error));
  }
  if (failures.length > 0) {
    throw new Error(`Could not clean up temporary test users: ${failures.join("; ")}`);
  }
}

let testFailure;
try {
  await createConfirmedUser(ownerEmail);
  await createConfirmedUser(otherEmail);
  ownerClient = await signIn(ownerEmail);
  otherClient = await signIn(otherEmail);

  const { data: patient, error: createPatientError } = await ownerClient
    .from("patients")
    .insert({})
    .select("id")
    .single();
  if (createPatientError || !patient) {
    throw new Error(`Owner could not create a patient: ${getErrorMessage(createPatientError)}`);
  }
  patientId = patient.id;

  const { data: ownPatients, error: ownReadError } = await ownerClient
    .from("patients")
    .select("id")
    .eq("id", patientId);
  assert(!ownReadError && ownPatients?.length === 1, "Owner could not read their patient");

  const { error: ownUpdateError } = await ownerClient
    .from("patients")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", patientId);
  assert(!ownUpdateError, `Owner could not update their patient: ${getErrorMessage(ownUpdateError)}`);

  const { data: otherPatients, error: otherReadError } = await otherClient
    .from("patients")
    .select("id")
    .eq("id", patientId);
  assert(!otherReadError && otherPatients?.length === 0, "Non-owner could read a patient");

  const { error: otherInsertError } = await otherClient.from("patients").insert({ owner_id: createdUserIds[0] });
  assert(otherInsertError, "Non-owner could create a patient for another user");

  const { data: otherUpdate, error: otherUpdateError } = await otherClient
    .from("patients")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", patientId)
    .select("id");
  assert(!otherUpdateError && otherUpdate?.length === 0, "Non-owner could update a patient");

  objectPath = `${patientId}/access-${runId}.txt`;
  const content = new TextEncoder().encode("patient access contract test");
  const { error: ownerUploadError } = await ownerClient.storage
    .from("patient-documents")
    .upload(objectPath, content, { contentType: "text/plain" });
  assert(!ownerUploadError, `Owner could not upload a document: ${getErrorMessage(ownerUploadError)}`);

  const { data: ownerDownload, error: ownerDownloadError } = await ownerClient.storage
    .from("patient-documents")
    .download(objectPath);
  assert(!ownerDownloadError && ownerDownload, "Owner could not download their document");

  const { error: ownerReplaceError } = await ownerClient.storage
    .from("patient-documents")
    .upload(objectPath, content, { contentType: "text/plain", upsert: true });
  assert(!ownerReplaceError, `Owner could not replace their document: ${getErrorMessage(ownerReplaceError)}`);

  const { error: otherDownloadError } = await otherClient.storage.from("patient-documents").download(objectPath);
  assert(otherDownloadError, "Non-owner could download a document");

  const { error: otherUploadError } = await otherClient.storage
    .from("patient-documents")
    .upload(`${patientId}/forbidden-${runId}.txt`, content, { contentType: "text/plain" });
  assert(otherUploadError, "Non-owner could upload into another patient's folder");

  await otherClient.storage.from("patient-documents").remove([objectPath]);
  const { data: documentAfterOtherDelete, error: documentAfterOtherDeleteError } = await ownerClient.storage
    .from("patient-documents")
    .download(objectPath);
  assert(!documentAfterOtherDeleteError && documentAfterOtherDelete, "Non-owner could delete a document");

  const { error: ownerDeleteObjectError } = await ownerClient.storage.from("patient-documents").remove([objectPath]);
  assert(!ownerDeleteObjectError, `Owner could not delete their document: ${getErrorMessage(ownerDeleteObjectError)}`);
  objectPath = undefined;

  const { error: ownerDeletePatientError } = await ownerClient.from("patients").delete().eq("id", patientId);
  assert(!ownerDeletePatientError, `Owner could not delete their patient: ${getErrorMessage(ownerDeletePatientError)}`);
  patientId = undefined;

  console.log("PASS  Cloud patient-data ownership and Storage isolation");
} catch (error) {
  testFailure = error;
} finally {
  const cleanupFailures = [];
  for (const cleanup of [deleteObjectIfPresent, deletePatientIfPresent, deleteTemporaryUsers]) {
    try {
      await cleanup();
    } catch (error) {
      cleanupFailures.push(getErrorMessage(error));
    }
  }
  if (cleanupFailures.length > 0) {
    console.error(`CLEANUP FAILED  ${cleanupFailures.join(" | ")}`);
    process.exitCode = 1;
  }
  if (testFailure) {
    console.error(`FAIL  ${getErrorMessage(testFailure)}`);
    process.exitCode = 1;
  }
}
