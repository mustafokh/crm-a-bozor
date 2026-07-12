import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { validateCar, hasErrors } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("inventory");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const car = await prisma.car.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      priceHistory: { orderBy: { createdAt: "desc" } },
      deals: { include: { customer: true, user: true } },
    },
  });
  if (!car) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  return NextResponse.json({ car });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("inventory");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.car.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  // Validate the merged result (so partial updates are checked correctly).
  const fields = validateCar({ ...existing, ...body });
  if (hasErrors(fields)) {
    return NextResponse.json({ error: "Ma'lumotlarni tekshiring", fields }, { status: 400 });
  }

  // Track sale-price changes in history
  if (body.salePrice !== undefined && Number(body.salePrice) !== existing.salePrice) {
    await prisma.carPriceHistory.create({
      data: {
        carId: id,
        oldPrice: existing.salePrice,
        newPrice: Number(body.salePrice),
        field: "salePrice",
        changedBy: auth.name,
      },
    });
  }

  const images: string[] | undefined = Array.isArray(body.images)
    ? body.images.filter(Boolean)
    : undefined;

  try {
    const car = await prisma.car.update({
      where: { id },
      data: {
        make: body.make ?? existing.make,
        model: body.model ?? existing.model,
        year: body.year !== undefined ? Number(body.year) : existing.year,
        color: body.color ?? existing.color,
        vin: body.vin !== undefined ? body.vin?.trim() || null : existing.vin,
        bodyNumber: body.bodyNumber ?? existing.bodyNumber,
        engineVolume: body.engineVolume !== undefined ? (body.engineVolume ? Number(body.engineVolume) : null) : existing.engineVolume,
        mileage: body.mileage !== undefined ? Number(body.mileage) : existing.mileage,
        condition: body.condition ?? existing.condition,
        purchasePrice: body.purchasePrice !== undefined ? Number(body.purchasePrice) : existing.purchasePrice,
        salePrice: body.salePrice !== undefined ? Number(body.salePrice) : existing.salePrice,
        currency: body.currency ?? existing.currency,
        status: body.status ?? existing.status,
        transmission: body.transmission ?? existing.transmission,
        fuelType: body.fuelType ?? existing.fuelType,
        drivetrain: body.drivetrain ?? existing.drivetrain,
        supplier: body.supplier ?? existing.supplier,
        description: body.description ?? existing.description,
        ...(images
          ? {
              images: {
                deleteMany: {},
                create: images.map((url, i) => ({ url, isPrimary: i === 0, order: i })),
              },
            }
          : {}),
      },
      include: { images: true },
    });

    await logActivity({
      userId: auth.id,
      action: "UPDATE",
      entityType: "Car",
      entityId: car.id,
      description: `${auth.name} tahrirladi: ${car.make} ${car.model}`,
    });

    return NextResponse.json({ car });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Bu VIN-kod band", fields: { vin: "Bu VIN allaqachon mavjud" } },
        { status: 400 }
      );
    }
    throw err;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("inventory");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const car = await prisma.car.findUnique({ where: { id }, include: { deals: true } });
  if (!car) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (car.deals.length > 0) {
    return NextResponse.json(
      { error: "Bu mashina savdoga bog'langan, o'chirib bo'lmaydi" },
      { status: 400 }
    );
  }

  await prisma.car.delete({ where: { id } });
  await logActivity({
    userId: auth.id,
    action: "DELETE",
    entityType: "Car",
    entityId: id,
    description: `${auth.name} o'chirdi: ${car.make} ${car.model}`,
  });

  return NextResponse.json({ ok: true });
}
