/** Open redirect hujumlaridan himoya — faqat ichki yo'llarga ruxsat. */
export function safeRedirectPath(from: string | null | undefined, fallback = "/dashboard"): string {
  if (!from) return fallback;
  const path = from.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }
  if (path.includes("@")) return fallback;
  return path;
}
