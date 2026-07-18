export async function register() {
  // Node-only: edge bundle is excluded via next.config webpack alias.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { startAcrFromInstrumentation } = await import("./instrumentation.node");
    await startAcrFromInstrumentation();
  } catch (e) {
    console.error("[acr-sync] failed to start:", e);
  }
}
