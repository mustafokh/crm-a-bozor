import "dotenv/config";

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} env majburiy`);
  return v;
}

export const config = {
  crmApiUrl: (process.env.CRM_API_URL || "https://mkus-crm-fed7cd.azurewebsites.net").replace(
    /\/$/,
    ""
  ),
  crmApiKey: required("CRM_API_KEY"),
  authDir: process.env.AUTH_DIR?.trim() || "./auth_info",
  port: Number(process.env.PORT || 8080),
  host: process.env.HOST?.trim() || "0.0.0.0",
  ignoreGroups: (process.env.IGNORE_GROUPS ?? "true").toLowerCase() !== "false",
  textOnly: (process.env.TEXT_ONLY ?? "false").toLowerCase() === "true",
};
