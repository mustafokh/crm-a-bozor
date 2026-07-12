import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const company = await prisma.companySetting.findUnique({ where: { id: "company" } });
  return NextResponse.json({
    name: company?.name ?? "MKUS",
    phone: company?.phone ?? null,
    address: company?.address ?? null,
    email: company?.email ?? null,
  });
}
