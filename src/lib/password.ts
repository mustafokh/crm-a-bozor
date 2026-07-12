import bcrypt from "bcryptjs";

// Kept separate from auth.ts because bcryptjs is Node-only (not edge-safe).
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
