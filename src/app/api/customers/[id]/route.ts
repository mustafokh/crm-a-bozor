import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { validateCustomer, hasErrors } from "@/lib/validation";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("customers");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const fields = validateCustomer({ ...existing, ...body });
  if (hasErrors(fields)) {
    return NextResponse.json({ error: "Ma'lumotlarni tekshiring", fields }, { status: 400 });
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      fullName: body.fullName?.trim() ?? existing.fullName,
      phone: body.phone?.trim() ?? existing.phone,
      email: body.email !== undefined ? body.email?.trim() || null : existing.email,
      passportSeries:
        body.passportSeries !== undefined ? body.passportSeries?.trim() || null : existing.passportSeries,
      address: body.address !== undefined ? body.address || null : existing.address,
      isVip: body.isVip !== undefined ? !!body.isVip : existing.isVip,
      notes: body.notes !== undefined ? body.notes || null : existing.notes,
    },
  });
  await logActivity({
    userId: auth.id,
    action: "UPDATE",
    entityType: "Customer",
    entityId: customer.id,
    customerId: customer.id,
    description: `${auth.name} mijozni tahrirladi: ${customer.fullName}`,
  });
  return NextResponse.json({ customer });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("customers");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const c = await prisma.customer.findUnique({
    where: { id },
    include: { _count: { select: { deals: true } } },
  });
  if (!c) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (c._count.deals > 0) {
    return NextResponse.json({ error: "Mijozda savdolar mavjud, o'chirib bo'lmaydi" }, { status: 400 });
  }
  await prisma.customer.delete({ where: { id } });
  await logActivity({
    userId: auth.id,
    action: "DELETE",
    entityType: "Customer",
    entityId: id,
    description: `${auth.name} mijozni o'chirdi: ${c.fullName}`,
  });
  return NextResponse.json({ ok: true });
}
