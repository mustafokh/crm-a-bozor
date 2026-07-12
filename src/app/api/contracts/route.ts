import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";

export async function GET(req: Request) {
  const auth = await requirePermission("contracts");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 15));

  const where: Prisma.ContractWhereInput = {};
  if (status && status !== "ALL") where.status = status;
  if (q) {
    where.OR = [
      { number: { contains: q } },
      { customer: { fullName: { contains: q } } },
      { deal: { car: { make: { contains: q } } } },
      { deal: { car: { model: { contains: q } } } },
    ];
  }

  const [contracts, total, activeCount] = await Promise.all([
    prisma.contract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { fullName: true } },
        deal: {
          include: {
            car: { select: { make: true, model: true, year: true } },
            user: { select: { name: true } },
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contract.count({ where }),
    prisma.contract.count({ where: { ...where, status: "ACTIVE" } }),
  ]);

  const contractIds = contracts.map((c) => c.id);
  const paidGroups =
    contractIds.length > 0
      ? await prisma.payment.groupBy({
          by: ["contractId"],
          where: { contractId: { in: contractIds }, status: "PAID" },
          _sum: { amount: true },
        })
      : [];
  const paidMap = Object.fromEntries(
    paidGroups.map((g) => [g.contractId, g._sum.amount ?? 0])
  );

  const rows = contracts.map((c) => ({
    ...c,
    paidAmount: paidMap[c.id] ?? 0,
    remaining: c.totalAmount - (paidMap[c.id] ?? 0),
  }));

  return NextResponse.json({ contracts: rows, total, page, pageSize, activeCount });
}
