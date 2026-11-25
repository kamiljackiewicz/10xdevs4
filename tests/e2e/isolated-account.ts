import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { test as base, expect } from "@playwright/test";

// Provisioning/cleanup runs in Node only; the browser never receives admin credentials.
export const test = base.extend<{ identityToken: string }>({
  identityToken: async ({ baseURL }, provide, testInfo) => {
    if (!baseURL) throw new Error("E2E baseURL is required");
    const token = `r4-${randomUUID()}`;
    testInfo.annotations.push({ type: "test-data", description: token });
    await provide(token);
  },
  storageState: async ({ playwright, baseURL, identityToken }, provide) => {
    if (!baseURL) throw new Error("E2E baseURL is required");
    const env = parseEnv(readFileSync(".dev.vars", "utf8"));
    const url = env.SUPABASE_URL;
    const key = env.SUPABASE_TEST_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_TEST_SERVICE_ROLE_KEY in ignored .dev.vars");
    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const email = `${identityToken}@example.com`;
    const password = `E2e-${randomUUID()}!`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error, "temporary account creation").toBeNull();
    const ownerId = created.data.user?.id;
    if (!ownerId) throw new Error("Temporary account returned no id");
    const request = await playwright.request.newContext({ baseURL });
    try {
      // Real app auth and cookies, without repeating UI login in each spec.
      const login = await request.post("/api/auth/signin", {
        headers: { Origin: new URL(baseURL).origin },
        form: { email, password },
      });
      await expect(login).toBeOK();
      expect(new URL(login.url()).pathname).toBe("/");
      await provide(await request.storageState());
    } finally {
      const patients = await admin.from("patients").select("id").eq("owner_id", ownerId);
      // Delete even if the lookup failed; never remove another test's identity or data.
      const deleted = await admin.auth.admin.deleteUser(ownerId);
      await request.dispose();
      expect(deleted.error, "temporary account cleanup").toBeNull();
      expect(patients.error, "cleanup profile lookup").toBeNull();
      const remaining = await admin.from("patients").select("id").eq("owner_id", ownerId);
      expect(remaining.error).toBeNull();
      expect(remaining.data, "no patient left after cleanup").toEqual([]);
      const patientIds = (patients.data ?? []).map((patient: { id: string }) => patient.id);
      if (patientIds.length) {
        const notes = await admin.from("timeline_notes").select("id").in("patient_id", patientIds);
        expect(notes.error).toBeNull();
        expect(notes.data, "no notes left after cleanup").toEqual([]);
      }
    }
  },
});

export { expect };
