import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { createDealTransaction, DealError } from "@/lib/deal-service";

export async function GET(req: Request) {
  const auth = await requirePermission("deals");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const paymentType = searchParams.get("paymentType");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 15));

  const where: Prisma.DealWhereInput = auth.role === "MANAGER" ? { userId: auth.id } : {};
  if (status && status !== "ALL") where.status = status;
  if (paymentType && paymentType !== "ALL") where.paymentType = paymentType;
  if (q) {
    where.OR = [
      { customer: { fullName: { contains: q } } },
      { car: { make: { contains: q } } },
      { car: { model: { contains: q } } },
      { contract: { number: { contains: q } } },
    ];
  }

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { fullName: true } },
        car: { select: { make: true, model: true, year: true } },
        user: { select: { name: true } },
        contract: { select: { id: true, number: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deal.count({ where }),
  ]);
  return NextResponse.json({ deals, total, page, pageSize });
}

/**
 * Creating a deal is a transaction: it marks the car as SOLD, generates a
 * contract, a payment schedule (for installments) and the seller commission.
 */
export async function POST(req: Request) {
  const auth = await requirePermission("deals");
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();

  try {
    const result = await createDealTransaction({
      customerId: body.customerId,
      carId: body.carId,
      sellerId: body.userId || auth.id,
      price: Number(body.price),
      currency: body.currency,
      paymentType: body.paymentType,
      installmentMonths: body.installmentMonths ? Number(body.installmentMonths) : null,
      tradeInValue: Number(body.tradeInValue) || 0,
      tradeInInfo: body.tradeInInfo,
      extraCosts: Number(body.extraCosts) || 0,
      notes: body.notes,
    });

    await logActivity({
      userId: auth.id,
      action: "CREATE",
      entityType: "Deal",
      entityId: result.deal.id,
      customerId: result.customer.id,
      description: `${auth.name} savdo yaratdi: ${result.car.make} ${result.car.model} → ${result.customer.fullName}`,
    });

    return NextResponse.json({ deal: result.deal, contract: result.contract });
  } catch (err) {
    if (err instanceof DealError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
