import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { validateCar, hasErrors } from "@/lib/validation";

const SORTABLE = ["createdAt", "salePrice", "year", "mileage", "make"] as const;

export async function GET(req: Request) {
  const auth = await requirePermission("inventory");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const make = searchParams.get("make");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(searchParams.get("pageSize")) || 12));
  const sortParam = searchParams.get("sort") || "createdAt";
  const sort = (SORTABLE as readonly string[]).includes(sortParam) ? sortParam : "createdAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const where: Prisma.CarWhereInput = {};
  if (status && status !== "ALL") where.status = status;
  if (make && make !== "ALL") where.make = make;
  if (minPrice || maxPrice) {
    where.salePrice = {
      ...(minPrice ? { gte: Number(minPrice) } : {}),
      ...(maxPrice ? { lte: Number(maxPrice) } : {}),
    };
  }
  if (q) {
    where.OR = [
      { make: { contains: q } },
      { model: { contains: q } },
      { vin: { contains: q } },
    ];
  }

  const [cars, total] = await Promise.all([
    prisma.car.findMany({
      where,
      include: {
        images: {
          orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
          take: 1,
        },
      },
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.car.count({ where }),
  ]);

  return NextResponse.json({ cars, total, page, pageSize });
}

export async function POST(req: Request) {
  const auth = await requirePermission("inventory");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();

  const fields = validateCar(body);
  if (hasErrors(fields)) {
    return NextResponse.json({ error: "Ma'lumotlarni tekshiring", fields }, { status: 400 });
  }

  const images: string[] = Array.isArray(body.images) ? body.images.filter(Boolean) : [];

  try {
    const car = await prisma.car.create({
      data: {
        make: body.make,
        model: body.model,
        year: Number(body.year),
        color: body.color || null,
        vin: body.vin?.trim() || null,
        bodyNumber: body.bodyNumber || null,
        engineVolume: body.engineVolume ? Number(body.engineVolume) : null,
        mileage: Number(body.mileage) || 0,
        condition: body.condition || "USED",
        purchasePrice: Number(body.purchasePrice) || 0,
        salePrice: Number(body.salePrice) || 0,
        currency: body.currency || "USD",
        status: body.status || "IN_STOCK",
        transmission: body.transmission || null,
        fuelType: body.fuelType || null,
        drivetrain: body.drivetrain || null,
        supplier: body.supplier || null,
        description: body.description || null,
        images: {
          create: images.map((url, i) => ({ url, isPrimary: i === 0, order: i })),
        },
      },
      include: { images: true },
    });

    await logActivity({
      userId: auth.id,
      action: "CREATE",
      entityType: "Car",
      entityId: car.id,
      description: `${auth.name} omborga qo'shdi: ${car.make} ${car.model} (${car.year})`,
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
