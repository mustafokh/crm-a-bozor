import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { validateExpense, hasErrors } from "@/lib/validation";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const merged = { ...existing, ...body, date: body.date ?? existing.date.toISOString() };
  const fields = validateExpense(merged);
  if (hasErrors(fields)) {
    return NextResponse.json({ error: "Ma'lumotlarni tekshiring", fields }, { status: 400 });
  }

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      category: body.category ?? existing.category,
      amount: body.amount !== undefined ? Number(body.amount) : existing.amount,
      currency: body.currency ?? existing.currency,
      description: body.description !== undefined ? body.description || null : existing.description,
      date: body.date ? new Date(body.date) : existing.date,
    },
  });
  await logActivity({
    userId: auth.id,
    action: "UPDATE",
    entityType: "Expense",
    entityId: expense.id,
    description: `${auth.name} xarajatni tahrirladi: ${expense.description ?? expense.category}`,
  });
  return NextResponse.json({ expense });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  await prisma.expense.delete({ where: { id } });
  await logActivity({
    userId: auth.id,
    action: "DELETE",
    entityType: "Expense",
    entityId: id,
    description: `${auth.name} xarajatni o'chirdi`,
  });
  return NextResponse.json({ ok: true });
}
