import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// Lightweight lookups used to populate form selects (sellers, customers, cars).
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const [sellers, customers, cars] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, role: { in: ["MANAGER", "ADMIN"] } },
      select: { id: true, name: true, role: true, commissionRate: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      select: { id: true, fullName: true, phone: true },
      orderBy: { fullName: "asc" },
      take: 500,
    }),
    prisma.car.findMany({
      where: { status: { in: ["IN_STOCK", "RESERVED"] } },
      select: { id: true, make: true, model: true, year: true, salePrice: true, currency: true, purchasePrice: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return NextResponse.json(
    { sellers, customers, cars },
    { headers: { "Cache-Control": "private, max-age=60" } }
  );
}
