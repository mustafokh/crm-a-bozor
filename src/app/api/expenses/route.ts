import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { validateExpense, hasErrors } from "@/lib/validation";

export async function GET(req: Request) {
  const auth = await requirePermission("finance");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));

  const where: Prisma.ExpenseWhereInput = {};
  if (category && category !== "ALL") where.category = category;
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
    };
  }

  const [expenses, total, sumAgg] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      include: { createdBy: { select: { name: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  return NextResponse.json({
    expenses,
    total,
    page,
    pageSize,
    totalAmount: sumAgg._sum.amount ?? 0,
  });
}

export async function POST(req: Request) {
  const auth = await requirePermission("finance");
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();

  const fields = validateExpense(body);
  if (hasErrors(fields)) {
    return NextResponse.json({ error: "Ma'lumotlarni tekshiring", fields }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      category: body.category || "OTHER",
      amount: Number(body.amount),
      currency: body.currency || "UZS",
      description: body.description || null,
      date: body.date ? new Date(body.date) : new Date(),
      createdById: auth.id,
    },
  });
  await logActivity({
    userId: auth.id,
    action: "CREATE",
    entityType: "Expense",
    entityId: expense.id,
    description: `${auth.name} xarajat qo'shdi: ${expense.description ?? expense.category}`,
  });
  return NextResponse.json({ expense });
}
