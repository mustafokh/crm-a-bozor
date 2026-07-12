import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";

export async function GET() {
  const auth = await requirePermission("incoming");
  if (auth instanceof NextResponse) return auth;

  const items = await prisma.incomingCar.findMany({
    orderBy: [{ status: "asc" }, { expectedDate: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requirePermission("incoming");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const item = await prisma.incomingCar.create({
    data: {
      make: body.make,
      model: body.model,
      year: Number(body.year),
      supplier: body.supplier || null,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
      status: body.status || "ORDERED",
      cost: Number(body.cost) || 0,
      currency: body.currency || "USD",
      notes: body.notes || null,
    },
  });
  await logActivity({
    userId: auth.id,
    action: "CREATE",
    entityType: "IncomingCar",
    entityId: item.id,
    description: `${auth.name} yangi kelayotgan mashina qo'shdi: ${item.make} ${item.model}`,
  });
  return NextResponse.json({ item });
}
