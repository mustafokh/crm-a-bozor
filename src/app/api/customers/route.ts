import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { validateCustomer, hasErrors } from "@/lib/validation";

const SORTABLE = ["createdAt", "fullName"] as const;

export async function GET(req: Request) {
  const auth = await requirePermission("customers");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const vip = searchParams.get("vip");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 15));
  const sortParam = searchParams.get("sort") || "createdAt";
  const sort = (SORTABLE as readonly string[]).includes(sortParam) ? sortParam : "createdAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const where: Prisma.CustomerWhereInput = {};
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
    ];
  }
  if (vip === "1") where.isVip = true;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { [sort]: order },
      include: { _count: { select: { deals: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, pageSize });
}

export async function POST(req: Request) {
  const auth = await requirePermission("customers");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const fields = validateCustomer(body);
  if (hasErrors(fields)) {
    return NextResponse.json({ error: "Ma'lumotlarni tekshiring", fields }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      fullName: body.fullName.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
      passportSeries: body.passportSeries?.trim() || null,
      address: body.address || null,
      isVip: !!body.isVip,
      notes: body.notes || null,
    },
  });
  await logActivity({
    userId: auth.id,
    action: "CREATE",
    entityType: "Customer",
    entityId: customer.id,
    customerId: customer.id,
    description: `${auth.name} yangi mijoz qo'shdi: ${customer.fullName}`,
  });
  return NextResponse.json({ customer });
}
