/**
 * Node-only ACR boot (must not be imported from Edge).
 */
export async function startAcrFromInstrumentation() {
  const { assertSecurityEnv } = await import("@/lib/security/env");
  assertSecurityEnv();
  const { startAcrPoller } = await import("@/lib/acr/sync");
  startAcrPoller();
}
