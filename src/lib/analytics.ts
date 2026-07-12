import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { convertCurrency } from "./utils";

async function usdRate(): Promise<number> {
  const c = await prisma.companySetting.findUnique({ where: { id: "company" } });
  return c?.usdRate ?? 12650;
}

const MONTHS_UZ = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
  "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
];

export function monthStart(offset = 0): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - offset, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sumByCurrency(
  groups: { currency: string; _sum: { amount?: number | null } }[],
  rate: number
) {
  return groups.reduce(
    (s, g) => s + convertCurrency(g._sum.amount ?? 0, g.currency, "USD", rate),
    0
  );
}

function sumProfitByCurrency(
  groups: { currency: string; _sum: { profit?: number | null } }[],
  rate: number
) {
  return groups.reduce(
    (s, g) => s + convertCurrency(g._sum.profit ?? 0, g.currency, "USD", rate),
    0
  );
}

/** Sales count + revenue + profit for last N months. */
export async function monthlySalesSeries(months = 6) {
  const deals = await prisma.deal.findMany({
    where: { createdAt: { gte: monthStart(months - 1) } },
    select: { createdAt: true, price: true, profit: true },
  });

  const buckets: Record<string, { sales: number; revenue: number; profit: number }> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = monthStart(i);
    buckets[`${d.getFullYear()}-${d.getMonth()}`] = { sales: 0, revenue: 0, profit: 0 };
  }
  for (const deal of deals) {
    const key = `${deal.createdAt.getFullYear()}-${deal.createdAt.getMonth()}`;
    if (buckets[key]) {
      buckets[key].sales += 1;
      buckets[key].revenue += deal.price;
      buckets[key].profit += deal.profit;
    }
  }
  return Object.keys(buckets).map((k) => {
    const [, m] = k.split("-").map(Number);
    return { name: MONTHS_UZ[m], ...buckets[k] };
  });
}

/** Top-selling brands by number of deals (SQL aggregate — no full table load). */
export async function topBrands(limit = 6) {
  const rows = await prisma.$queryRaw<Array<{ make: string; cnt: bigint }>>(
    Prisma.sql`
      SELECT c.make AS make, COUNT(*) AS cnt
      FROM Deal d
      INNER JOIN Car c ON d.carId = c.id
      GROUP BY c.make
      ORDER BY cnt DESC
      LIMIT ${limit}
    `
  );
  return rows.map((r) => ({ name: r.make, value: Number(r.cnt) }));
}

/** Aggregate dashboard KPIs. */
export async function dashboardStats() {
  const startOfMonth = monthStart(0);
  const [
    carsInStock,
    activeLeads,
    monthAgg,
    totalCustomers,
    incomingCount,
  ] = await Promise.all([
    prisma.car.count({ where: { status: "IN_STOCK" } }),
    prisma.lead.count({ where: { status: { notIn: ["WON", "LOST"] } } }),
    prisma.deal.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _count: true,
      _sum: { price: true, profit: true },
    }),
    prisma.customer.count(),
    prisma.incomingCar.count({ where: { status: { not: "ARRIVED" } } }),
  ]);

  return {
    carsInStock,
    activeLeads,
    monthSales: monthAgg._count,
    monthRevenue: monthAgg._sum.price ?? 0,
    monthProfit: monthAgg._sum.profit ?? 0,
    totalCustomers,
    incomingCount,
  };
}

/** Finance summary — aggregated by currency, normalised to USD. */
export async function financeSummary() {
  const rate = await usdRate();
  const startOfMonth = monthStart(0);

  const [
    paidAll,
    paidMonth,
    expensesAll,
    expensesMonth,
    profitAll,
    pendingComm,
    expensesByCat,
  ] = await Promise.all([
    prisma.payment.groupBy({
      by: ["currency"],
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ["currency"],
      where: { status: "PAID", paidDate: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["currency"],
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["currency"],
      where: { date: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.deal.groupBy({
      by: ["currency"],
      _sum: { profit: true },
    }),
    prisma.commission.groupBy({
      by: ["currency"],
      where: { status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["category", "currency"],
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = sumByCurrency(paidAll, rate);
  const totalExpenses = sumByCurrency(expensesAll, rate);
  const grossProfit = sumProfitByCurrency(profitAll, rate);
  const pendingCommissions = sumByCurrency(pendingComm, rate);

  const byCategory: Record<string, number> = {};
  for (const e of expensesByCat) {
    byCategory[e.category] =
      (byCategory[e.category] || 0) +
      convertCurrency(e._sum.amount ?? 0, e.currency, "USD", rate);
  }

  return {
    rate,
    totalIncome,
    totalExpenses,
    grossProfit,
    netProfit: grossProfit - totalExpenses,
    pendingCommissions,
    monthIncome: sumByCurrency(paidMonth, rate),
    monthExpenses: sumByCurrency(expensesMonth, rate),
    byCategory,
  };
}

/** Per-seller KPIs via groupBy — avoids loading all nested relations. */
export async function employeeKpis() {
  const rate = await usdRate();
  const toUsd = (a: number, c: string) => convertCurrency(a, c, "USD", rate);

  const [users, dealGroups, leadGroups, commGroups] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["MANAGER", "ADMIN"] } },
      select: { id: true, name: true, email: true, role: true, commissionRate: true },
      orderBy: { name: "asc" },
    }),
    prisma.deal.groupBy({
      by: ["userId", "currency"],
      _sum: { price: true, profit: true },
      _count: true,
    }),
    prisma.lead.groupBy({
      by: ["assignedToId", "status"],
      _count: true,
    }),
    prisma.commission.groupBy({
      by: ["userId", "currency"],
      _sum: { amount: true },
    }),
  ]);

  const rows = users.map((s) => {
    const deals = dealGroups.filter((d) => d.userId === s.id);
    const leads = leadGroups.filter((l) => l.assignedToId === s.id);
    const comms = commGroups.filter((c) => c.userId === s.id);

    const leadCount = leads.reduce((sum, l) => sum + l._count, 0);
    const wonLeads = leads
      .filter((l) => l.status === "WON")
      .reduce((sum, l) => sum + l._count, 0);
    const dealCount = deals.reduce((sum, d) => sum + d._count, 0);
    const revenue = deals.reduce(
      (sum, d) => sum + toUsd(d._sum.price ?? 0, d.currency),
      0
    );
    const profit = deals.reduce(
      (sum, d) => sum + toUsd(d._sum.profit ?? 0, d.currency),
      0
    );
    const commissionTotal = comms.reduce(
      (sum, c) => sum + toUsd(c._sum.amount ?? 0, c.currency),
      0
    );
    const conversion = leadCount ? Math.round((dealCount / leadCount) * 100) : 0;

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      commissionRate: s.commissionRate,
      leadCount,
      wonLeads,
      dealCount,
      revenue,
      profit,
      commissionTotal,
      conversion,
    };
  });

  return rows.sort((a, b) => b.revenue - a.revenue);
}

/** Monthly income vs expenses series (USD) — date-filtered queries only. */
export async function monthlyFinanceSeries(months = 6) {
  const rate = await usdRate();
  const toUsd = (a: number, c: string) => convertCurrency(a, c, "USD", rate);
  const since = monthStart(months - 1);

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PAID", paidDate: { gte: since } },
      select: { amount: true, currency: true, paidDate: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: since } },
      select: { amount: true, currency: true, date: true },
    }),
  ]);

  const buckets: Record<string, { income: number; expense: number }> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = monthStart(i);
    buckets[`${d.getFullYear()}-${d.getMonth()}`] = { income: 0, expense: 0 };
  }
  for (const p of payments) {
    if (!p.paidDate) continue;
    const key = `${p.paidDate.getFullYear()}-${p.paidDate.getMonth()}`;
    if (buckets[key]) buckets[key].income += toUsd(p.amount, p.currency);
  }
  for (const e of expenses) {
    const key = `${e.date.getFullYear()}-${e.date.getMonth()}`;
    if (buckets[key]) buckets[key].expense += toUsd(e.amount, e.currency);
  }
  return Object.keys(buckets).map((k) => {
    const [, m] = k.split("-").map(Number);
    return {
      name: MONTHS_UZ[m],
      income: Math.round(buckets[k].income),
      expense: Math.round(buckets[k].expense),
    };
  });
}
