export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE === "phase-production-server"
  ) {
    const { assertSecurityEnv } = await import("@/lib/security/env");
    assertSecurityEnv();

    // Cube ACR Drive watcher (Whisper en → POST /api/calls). No laptop.
    try {
      const { startAcrPoller } = await import("@/lib/acr/sync");
      startAcrPoller();
    } catch (e) {
      console.error("[acr-sync] failed to start:", e);
    }
  }
}
