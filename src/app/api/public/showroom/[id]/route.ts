import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const car = await prisma.car.findFirst({
    where: { id, status: { in: ["IN_STOCK", "RESERVED"] } },
    select: {
      id: true,
      make: true,
      model: true,
      year: true,
      color: true,
      mileage: true,
      condition: true,
      salePrice: true,
      currency: true,
      status: true,
      transmission: true,
      fuelType: true,
      drivetrain: true,
      engineVolume: true,
      description: true,
      images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }], select: { url: true, isPrimary: true } },
    },
  });

  if (!car) {
    return NextResponse.json({ error: "Mashina topilmadi" }, { status: 404 });
  }

  return NextResponse.json(
    { car },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
