import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireAuth } from "@/lib/api-auth";
import { validateImageMagic } from "@/lib/security/file-magic";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Accepts multipart/form-data with one or more `file` fields, stores them under
// /public/uploads and returns the public URLs.
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const formData = await req.formData();
  const files = formData.getAll("file").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Fayl tanlanmadi" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const urls: string[] = [];
  for (const file of files) {
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: `Faqat rasm (JPG, PNG, WEBP, GIF) yuklash mumkin` },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fayl hajmi 5 MB dan oshmasligi kerak" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateImageMagic(buffer, file.type)) {
      return NextResponse.json(
        { error: "Fayl turi noto'g'ri yoki buzilgan" },
        { status: 400 }
      );
    }
    const name = `${crypto.randomUUID()}.${EXT[file.type]}`;
    await writeFile(path.join(uploadDir, name), buffer);
    urls.push(`/uploads/${name}`);
  }

  return NextResponse.json({ urls });
}
