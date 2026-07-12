import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";

const MAX_ROWS = 500;
const DEFAULT_PAGE_SIZE = 100;

export async function GET(req: Request) {
  const auth = await requirePermission("reports");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "sales";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    MAX_ROWS,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE)
  );

  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }
  const hasRange = from || to;
  const dealWhere = hasRange ? { createdAt: dateFilter } : {};

  if (type === "sales") {
    const [deals, total, agg] = await Promise.all([
      prisma.deal.findMany({
        where: dealWhere,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: { select: { fullName: true } },
          car: { select: { make: true, model: true, year: true } },
          user: { select: { name: true } },
        },
      }),
      prisma.deal.count({ where: dealWhere }),
      prisma.deal.aggregate({
        where: dealWhere,
        _count: true,
        _sum: { price: true, profit: true },
      }),
    ]);
    const rows = deals.map((d) => ({
      Sana: d.createdAt.toISOString().slice(0, 10),
      Mashina: `${d.car.make} ${d.car.model} ${d.car.year}`,
      Mijoz: d.customer.fullName,
      Sotuvchi: d.user.name,
      Tolov: d.paymentType,
      Narx: d.price,
      Foyda: d.profit,
      Valyuta: d.currency,
    }));
    return NextResponse.json({
      rows,
      total,
      page,
      pageSize,
      totals: {
        count: agg._count,
        revenue: agg._sum.price ?? 0,
        profit: agg._sum.profit ?? 0,
      },
    });
  }

  if (type === "finance") {
    const expenseWhere = hasRange ? { date: dateFilter } : {};
    const paymentWhere = {
      status: "PAID" as const,
      ...(hasRange ? { paidDate: dateFilter } : {}),
    };

    const [expenses, total, incomeAgg, expenseAgg] = await Promise.all([
      prisma.expense.findMany({
        where: expenseWhere,
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.expense.count({ where: expenseWhere }),
      prisma.payment.aggregate({
        where: paymentWhere,
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
      }),
    ]);

    const rows = expenses.map((e) => ({
      Sana: e.date.toISOString().slice(0, 10),
      Kategoriya: e.category,
      Tavsif: e.description ?? "",
      Summa: e.amount,
      Valyuta: e.currency,
    }));
    return NextResponse.json({
      rows,
      total,
      page,
      pageSize,
      totals: {
        income: incomeAgg._sum.amount ?? 0,
        expenses: expenseAgg._sum.amount ?? 0,
      },
    });
  }

  if (type === "employees") {
    const users = await prisma.user.findMany({
      where: { role: { in: ["MANAGER", "ADMIN"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const [dealGroups, leadGroups] = await Promise.all([
      prisma.deal.groupBy({
        by: ["userId"],
        where: dealWhere,
        _count: true,
        _sum: { price: true, profit: true },
      }),
      prisma.lead.groupBy({
        by: ["assignedToId"],
        _count: true,
      }),
    ]);

    const dealMap = Object.fromEntries(dealGroups.map((d) => [d.userId, d]));
    const leadMap = Object.fromEntries(
      leadGroups.map((l) => [l.assignedToId ?? "", l._count])
    );

    const allRows = users.map((u) => ({
      Xodim: u.name,
      Lidlar: leadMap[u.id] ?? 0,
      Savdolar: dealMap[u.id]?._count ?? 0,
      Tushum: dealMap[u.id]?._sum.price ?? 0,
      Foyda: dealMap[u.id]?._sum.profit ?? 0,
    }));

    const rows = allRows.slice((page - 1) * pageSize, page * pageSize);
    return NextResponse.json({
      rows,
      total: allRows.length,
      page,
      pageSize,
      totals: { count: allRows.length },
    });
  }

  return NextResponse.json({ rows: [], totals: {}, total: 0, page, pageSize });
}
