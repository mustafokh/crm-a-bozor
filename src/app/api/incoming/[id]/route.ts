import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("incoming");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.incomingCar.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  // When it ARRIVES, auto-create a car in the inventory (once).
  let createdCarId = existing.carId;
  if (body.status === "ARRIVED" && !existing.carId) {
    const car = await prisma.car.create({
      data: {
        make: existing.make,
        model: existing.model,
        year: existing.year,
        purchasePrice: existing.cost,
        salePrice: Math.round(existing.cost * 1.12),
        currency: existing.currency,
        status: "IN_STOCK",
        condition: "NEW",
        supplier: existing.supplier,
        arrivedAt: new Date(),
      },
    });
    createdCarId = car.id;
    await logActivity({
      userId: auth.id,
      action: "CREATE",
      entityType: "Car",
      entityId: car.id,
      description: `${existing.make} ${existing.model} omborga tushdi va inventarga qo'shildi`,
    });
  }

  const item = await prisma.incomingCar.update({
    where: { id },
    data: {
      make: body.make ?? existing.make,
      model: body.model ?? existing.model,
      year: body.year !== undefined ? Number(body.year) : existing.year,
      supplier: body.supplier ?? existing.supplier,
      expectedDate:
        body.expectedDate !== undefined
          ? body.expectedDate
            ? new Date(body.expectedDate)
            : null
          : existing.expectedDate,
      status: body.status ?? existing.status,
      customsCleared: body.customsCleared ?? existing.customsCleared,
      shippingDone: body.shippingDone ?? existing.shippingDone,
      cost: body.cost !== undefined ? Number(body.cost) : existing.cost,
      currency: body.currency ?? existing.currency,
      notes: body.notes ?? existing.notes,
      carId: createdCarId,
    },
  });

  return NextResponse.json({ item });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("incoming");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  await prisma.incomingCar.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
