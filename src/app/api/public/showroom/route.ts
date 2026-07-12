import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PUBLIC_STATUSES = ["IN_STOCK", "RESERVED"] as const;

/** Public car catalog for Instagram / showroom link. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const make = searchParams.get("make");

  const cars = await prisma.car.findMany({
    where: {
      status: { in: [...PUBLIC_STATUSES] },
      ...(make && make !== "ALL" ? { make } : {}),
      ...(q
        ? {
            OR: [
              { make: { contains: q } },
              { model: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
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
      images: {
        orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
        take: 5,
        select: { url: true, isPrimary: true },
      },
    },
  });

  const makes = await prisma.car.findMany({
    where: { status: { in: [...PUBLIC_STATUSES] } },
    distinct: ["make"],
    select: { make: true },
    orderBy: { make: "asc" },
  });

  return NextResponse.json(
    { cars, makes: makes.map((m) => m.make) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
