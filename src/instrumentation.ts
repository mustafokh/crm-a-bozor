export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE === "phase-production-server"
  ) {
    const { assertSecurityEnv } = await import("@/lib/security/env");
    assertSecurityEnv();
  }
}
