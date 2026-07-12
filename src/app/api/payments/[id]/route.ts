import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, logActivity } from "@/lib/api-auth";

// Mark an installment payment as paid / pending.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json();

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      status: body.status,
      paidDate: body.status === "PAID" ? new Date() : null,
    },
  });

  // If all payments are paid, complete the deal + contract.
  if (payment.dealId && body.status === "PAID") {
    const remaining = await prisma.payment.count({
      where: { dealId: payment.dealId, status: { not: "PAID" } },
    });
    if (remaining === 0) {
      await prisma.deal.update({ where: { id: payment.dealId }, data: { status: "COMPLETED" } });
      await prisma.contract.updateMany({ where: { dealId: payment.dealId }, data: { status: "COMPLETED" } });
    }
  }

  await logActivity({
    userId: auth.id,
    action: "UPDATE",
    entityType: "Payment",
    entityId: id,
    description: `To'lov ${body.status === "PAID" ? "to'landi deb belgilandi" : "yangilandi"}`,
  });
  return NextResponse.json({ payment });
}
