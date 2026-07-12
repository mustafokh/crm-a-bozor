import { prisma } from "@/lib/prisma";
import { generateContractNumber } from "@/lib/utils";

export interface CreateDealInput {
  customerId: string;
  carId: string;
  sellerId: string;
  price: number;
  currency?: string;
  paymentType?: string; // CASH | CREDIT | INSTALLMENT | TRADEIN
  installmentMonths?: number | null;
  tradeInValue?: number;
  tradeInInfo?: string | null;
  extraCosts?: number;
  notes?: string | null;
}

/**
 * Single source of truth for creating a sale. Runs as one transaction:
 * deal + car→SOLD + contract + payment schedule + seller commission.
 * Used by both the Deals API and the Lead→Deal conversion.
 */
export async function createDealTransaction(input: CreateDealInput) {
  const car = await prisma.car.findUnique({ where: { id: input.carId } });
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!car || !customer) throw new DealError("Mashina yoki mijoz topilmadi");
  if (car.status === "SOLD") throw new DealError("Bu mashina allaqachon sotilgan");

  const seller = await prisma.user.findUnique({ where: { id: input.sellerId } });
  if (!seller) throw new DealError("Sotuvchi topilmadi");

  const price = Number(input.price) || car.salePrice;
  if (price <= 0) throw new DealError("Narx 0 dan katta bo'lishi kerak");

  const tradeInValue = Number(input.tradeInValue) || 0;
  const paymentType = input.paymentType || "CASH";
  const months =
    paymentType === "INSTALLMENT" ? Number(input.installmentMonths) || 12 : null;
  const extraCosts = Number(input.extraCosts) || 0;
  const currency = input.currency || car.currency;
  const profit = price - car.purchasePrice - extraCosts;
  const rate = seller.commissionRate ?? 0;

  return prisma.$transaction(async (tx) => {
    const deal = await tx.deal.create({
      data: {
        customerId: customer.id,
        carId: car.id,
        userId: seller.id,
        price,
        currency,
        paymentType,
        status: "ACTIVE",
        tradeInValue,
        tradeInInfo: input.tradeInInfo || null,
        profit,
      },
    });

    await tx.car.update({ where: { id: car.id }, data: { status: "SOLD" } });

    const contract = await tx.contract.create({
      data: {
        number: generateContractNumber(),
        dealId: deal.id,
        customerId: customer.id,
        totalAmount: price,
        currency,
        paymentType,
        status: "ACTIVE",
        installmentMonths: months,
        notes: input.notes || null,
      },
    });

    if (months) {
      const monthly = Math.round((price - tradeInValue) / months);
      for (let i = 0; i < months; i++) {
        const due = new Date();
        due.setMonth(due.getMonth() + i + 1);
        await tx.payment.create({
          data: {
            dealId: deal.id,
            contractId: contract.id,
            amount: monthly,
            currency,
            dueDate: due,
            status: "PENDING",
            method: "TRANSFER",
          },
        });
      }
    } else {
      await tx.payment.create({
        data: {
          dealId: deal.id,
          contractId: contract.id,
          amount: price - tradeInValue,
          currency,
          dueDate: new Date(),
          paidDate: new Date(),
          status: "PAID",
          method: paymentType === "CASH" ? "CASH" : "TRANSFER",
        },
      });
    }

    await tx.commission.create({
      data: {
        dealId: deal.id,
        userId: seller.id,
        rate,
        amount: Math.round((profit * rate) / 100),
        currency,
        status: "PENDING",
      },
    });

    return { deal, contract, car, customer };
  });
}

export class DealError extends Error {}
