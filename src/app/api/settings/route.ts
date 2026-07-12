import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";

export async function GET() {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;
  const settings = await prisma.companySetting.findUnique({ where: { id: "company" } });
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();

  const settings = await prisma.companySetting.upsert({
    where: { id: "company" },
    update: {
      name: body.name,
      address: body.address || null,
      phone: body.phone || null,
      email: body.email || null,
      logo: body.logo || null,
      usdRate: Number(body.usdRate) || 12650,
      defaultCurrency: body.defaultCurrency || "USD",
      contractTemplate: body.contractTemplate || null,
    },
    create: {
      id: "company",
      name: body.name || "MKUS Avtosalon",
      usdRate: Number(body.usdRate) || 12650,
    },
  });
  return NextResponse.json({ settings });
}
