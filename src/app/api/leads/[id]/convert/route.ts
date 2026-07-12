import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { createDealTransaction, DealError } from "@/lib/deal-service";

/**
 * Converts a WON lead into a real sale:
 * 1) finds an existing customer by phone or creates one from the lead,
 * 2) runs the standard deal transaction (car→SOLD, contract, payments, commission),
 * 3) marks the lead as WON and links it to the customer.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("deals");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json();

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lid topilmadi" }, { status: 404 });

  const carId = body.carId || lead.interestedCarId;
  if (!carId) {
    return NextResponse.json(
      { error: "Mashinani tanlang", fields: { carId: "Sotiladigan mashinani tanlang" } },
      { status: 400 }
    );
  }

  // Reuse an existing customer with the same phone, otherwise create one.
  const digits = lead.phone.replace(/\D/g, "");
  let customer =
    (lead.customerId && (await prisma.customer.findUnique({ where: { id: lead.customerId } }))) ||
    (await prisma.customer.findFirst({ where: { phone: { contains: digits.slice(-9) } } }));
  if (!customer) {
    customer = await prisma.customer.create({
      data: { fullName: lead.fullName, phone: lead.phone, notes: lead.notes || null },
    });
  }

  try {
    const result = await createDealTransaction({
      customerId: customer.id,
      carId,
      sellerId: lead.assignedToId || auth.id,
      price: Number(body.price) || 0,
      paymentType: body.paymentType,
      installmentMonths: body.installmentMonths ? Number(body.installmentMonths) : null,
      notes: body.notes || `Lid konversiyasi: ${lead.fullName}`,
    });

    await prisma.lead.update({
      where: { id },
      data: { status: "WON", customerId: customer.id },
    });

    await logActivity({
      userId: auth.id,
      action: "CONVERT",
      entityType: "Lead",
      entityId: id,
      customerId: customer.id,
      description: `${auth.name} lidni savdoga aylantirdi: ${lead.fullName} → ${result.car.make} ${result.car.model}`,
    });

    return NextResponse.json({
      deal: result.deal,
      contract: result.contract,
      customerId: customer.id,
    });
  } catch (err) {
    if (err instanceof DealError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
