import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Keyword-based placeholder car images (reliable, no auth required).
const carImg = (make: string, i: number) =>
  `https://loremflickr.com/640/480/${encodeURIComponent(make.toLowerCase())},car/all?lock=${i}`;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysAhead(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data (respect FK order)
  await prisma.activityLog.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.carImage.deleteMany();
  await prisma.carPriceHistory.deleteMany();
  await prisma.incomingCar.deleteMany();
  await prisma.car.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.user.deleteMany();
  await prisma.companySetting.deleteMany();

  // ── Company settings ──
  await prisma.companySetting.create({
    data: {
      id: "company",
      name: "A-BOZOR Avtosalon",
      address: "Toshkent sh., Yunusobod tumani, Amir Temur ko'chasi 108",
      phone: "+998 71 200 20 20",
      email: "info@abozor.uz",
      usdRate: 12650,
      defaultCurrency: "USD",
      contractTemplate:
        "Ushbu shartnoma {{customer}} (bundan keyin 'Xaridor') va A-BOZOR Avtosalon (bundan keyin 'Sotuvchi') o'rtasida tuzildi.",
    },
  });

  // ── Users (4 roles) ──
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      name: "Sardor Rahimov",
      email: "admin@abozor.uz",
      passwordHash,
      role: "ADMIN",
      phone: "+998 90 111 11 11",
      commissionRate: 0,
    },
  });
  const manager1 = await prisma.user.create({
    data: {
      name: "Jasur Karimov",
      email: "manager@abozor.uz",
      passwordHash,
      role: "MANAGER",
      phone: "+998 90 222 22 22",
      commissionRate: 2.5,
    },
  });
  const manager2 = await prisma.user.create({
    data: {
      name: "Dilnoza Yusupova",
      email: "manager2@abozor.uz",
      passwordHash,
      role: "MANAGER",
      phone: "+998 90 333 33 33",
      commissionRate: 2,
    },
  });
  const accountant = await prisma.user.create({
    data: {
      name: "Nodira Alimova",
      email: "buxgalter@abozor.uz",
      passwordHash,
      role: "ACCOUNTANT",
      phone: "+998 90 444 44 44",
      commissionRate: 0,
    },
  });
  await prisma.user.create({
    data: {
      name: "Bekzod Tursunov",
      email: "ombor@abozor.uz",
      passwordHash,
      role: "WAREHOUSE",
      phone: "+998 90 555 55 55",
      commissionRate: 0,
    },
  });
  const managers = [manager1, manager2];

  // ── Customers ──
  const customerData = [
    { fullName: "Aziz Abdullayev", phone: "+998 91 100 10 01", isVip: true, address: "Toshkent, Chilonzor 12" },
    { fullName: "Malika Ismoilova", phone: "+998 91 100 10 02", address: "Toshkent, Sergeli 5" },
    { fullName: "Rustam Xolmatov", phone: "+998 91 100 10 03", isVip: true, address: "Samarqand sh." },
    { fullName: "Gulnora Sattarova", phone: "+998 91 100 10 04", address: "Toshkent, Yakkasaroy" },
    { fullName: "Otabek Nazarov", phone: "+998 91 100 10 05", address: "Andijon sh." },
    { fullName: "Shaxnoza Yo'ldosheva", phone: "+998 91 100 10 06", address: "Toshkent, Mirzo Ulug'bek" },
    { fullName: "Farrux Qodirov", phone: "+998 91 100 10 07", address: "Buxoro sh." },
    { fullName: "Nigora Rasulova", phone: "+998 91 100 10 08", isVip: true, address: "Toshkent, Yunusobod" },
    { fullName: "Sanjar Umarov", phone: "+998 91 100 10 09", address: "Namangan sh." },
    { fullName: "Kamola Ergasheva", phone: "+998 91 100 10 10", address: "Toshkent, Olmazor" },
  ];
  const customers = [];
  for (const c of customerData) {
    customers.push(
      await prisma.customer.create({
        data: {
          ...c,
          email: `${c.fullName.split(" ")[0].toLowerCase()}@mail.uz`,
          passportSeries: `AA ${rand(1000000, 9999999)}`,
          notes: c.isVip ? "Doimiy mijoz, VIP xizmat ko'rsatiladi." : undefined,
          createdAt: daysAgo(rand(5, 120)),
        },
      })
    );
  }

  // ── Cars ──
  const carModels = [
    { make: "Chevrolet", model: "Malibu 2", year: 2023, buy: 24000, sell: 27500, fuel: "PETROL", trans: "AUTOMATIC" },
    { make: "Chevrolet", model: "Tracker", year: 2024, buy: 18000, sell: 20500, fuel: "PETROL", trans: "CVT" },
    { make: "Toyota", model: "Camry 70", year: 2022, buy: 33000, sell: 37000, fuel: "PETROL", trans: "AUTOMATIC" },
    { make: "Toyota", model: "Corolla", year: 2023, buy: 25000, sell: 28000, fuel: "HYBRID", trans: "CVT" },
    { make: "Kia", model: "K5", year: 2023, buy: 29000, sell: 32500, fuel: "PETROL", trans: "AUTOMATIC" },
    { make: "Hyundai", model: "Sonata", year: 2022, buy: 27000, sell: 30000, fuel: "PETROL", trans: "AUTOMATIC" },
    { make: "BYD", model: "Song Plus", year: 2024, buy: 31000, sell: 35500, fuel: "ELECTRIC", trans: "AUTOMATIC" },
    { make: "BYD", model: "Chazor", year: 2024, buy: 22000, sell: 25000, fuel: "HYBRID", trans: "AUTOMATIC" },
    { make: "BMW", model: "X5", year: 2021, buy: 58000, sell: 66000, fuel: "PETROL", trans: "AUTOMATIC" },
    { make: "Mercedes-Benz", model: "E200", year: 2022, buy: 62000, sell: 71000, fuel: "PETROL", trans: "AUTOMATIC" },
    { make: "Lexus", model: "RX 350", year: 2023, buy: 75000, sell: 85000, fuel: "PETROL", trans: "AUTOMATIC" },
    { make: "Chevrolet", model: "Onix", year: 2024, buy: 15000, sell: 17200, fuel: "PETROL", trans: "AUTOMATIC" },
    { make: "Zeekr", model: "001", year: 2024, buy: 48000, sell: 55000, fuel: "ELECTRIC", trans: "AUTOMATIC" },
    { make: "Nissan", model: "X-Trail", year: 2022, buy: 30000, sell: 34000, fuel: "PETROL", trans: "CVT" },
  ];
  const colors = ["Oq", "Qora", "Kulrang", "Kumush", "Ko'k", "Qizil"];
  const statuses = ["IN_STOCK", "IN_STOCK", "IN_STOCK", "RESERVED", "SOLD"];

  const cars = [];
  let imgIdx = 1;
  for (let i = 0; i < carModels.length; i++) {
    const m = carModels[i];
    const status = i < 8 ? "IN_STOCK" : pick(statuses);
    const car = await prisma.car.create({
      data: {
        make: m.make,
        model: m.model,
        year: m.year,
        color: pick(colors),
        vin: `VIN${rand(10000000, 99999999)}${i}`,
        bodyNumber: `KUZ-${rand(100000, 999999)}`,
        engineVolume: pick([1.4, 1.5, 1.6, 2.0, 2.5, 3.0]),
        mileage: m.year >= 2024 ? rand(0, 5000) : rand(10000, 80000),
        condition: m.year >= 2024 ? "NEW" : "USED",
        purchasePrice: m.buy,
        salePrice: m.sell,
        currency: "USD",
        status,
        transmission: m.trans,
        fuelType: m.fuel,
        drivetrain: pick(["FWD", "AWD"]),
        supplier: pick(["Xitoy import", "Koreya import", "Mahalliy diler", "Auktion (Gruziya)"]),
        description: `${m.make} ${m.model} ${m.year} — toza holat, to'liq hujjatlari bilan.`,
        arrivedAt: daysAgo(rand(3, 90)),
        createdAt: daysAgo(rand(3, 90)),
        images: {
          create: [
            { url: carImg(m.make, imgIdx++), isPrimary: true, order: 0 },
            { url: carImg(m.make, imgIdx++), order: 1 },
            { url: carImg(m.model, imgIdx++), order: 2 },
          ],
        },
      },
    });
    cars.push(car);
  }

  // ── Incoming cars (logistics) ──
  const incomingData = [
    { make: "Toyota", model: "Land Cruiser 300", year: 2024, status: "IN_TRANSIT", cost: 92000 },
    { make: "Kia", model: "Sportage", year: 2024, status: "CUSTOMS", cost: 28000, customsCleared: false },
    { make: "BYD", model: "Han", year: 2024, status: "ORDERED", cost: 40000 },
    { make: "Chevrolet", model: "Equinox", year: 2024, status: "IN_TRANSIT", cost: 26000 },
    { make: "Hyundai", model: "Tucson", year: 2024, status: "ORDERED", cost: 31000 },
  ];
  for (const inc of incomingData) {
    await prisma.incomingCar.create({
      data: {
        make: inc.make,
        model: inc.model,
        year: inc.year,
        supplier: pick(["Xitoy import", "Koreya import", "OAE import"]),
        expectedDate: daysAhead(rand(5, 45)),
        status: inc.status,
        customsCleared: inc.status === "CUSTOMS" ? false : inc.status === "ARRIVED",
        shippingDone: inc.status !== "ORDERED",
        cost: inc.cost,
        currency: "USD",
        notes: "Hujjatlar tayyorlanmoqda.",
      },
    });
  }

  // ── Leads (pipeline) ──
  const leadNames = [
    "Alisher Toshpo'latov", "Dilfuza Karimova", "Sherzod Mamatov", "Zarina Islomova",
    "Bobur Rasulov", "Feruza Ochilova", "Ulug'bek Sodiqov", "Madina Ergasheva",
    "Javohir Yusupov", "Sevara Nabiyeva", "Doniyor Aliyev", "Kamron Tojiboyev",
    "Nilufar Sattarova", "Aziza Rahmonova", "Timur Bekmurodov",
  ];
  const sources = ["WEBSITE", "INSTAGRAM", "TELEGRAM", "CALL", "REFERRAL", "OTHER"];
  const leadStatuses = ["NEW", "NEW", "CONTACTED", "CONTACTED", "NEGOTIATION", "CONTRACT", "WON", "LOST"];
  for (let i = 0; i < leadNames.length; i++) {
    const status = pick(leadStatuses);
    await prisma.lead.create({
      data: {
        fullName: leadNames[i],
        phone: `+998 93 ${rand(100, 999)} ${rand(10, 99)} ${rand(10, 99)}`,
        source: pick(sources),
        status,
        interestedCarId: Math.random() > 0.4 ? pick(cars).id : null,
        assignedToId: pick(managers).id,
        notes: pick([
          "Kredit imkoniyatini so'radi.",
          "Trade-in qilmoqchi.",
          "Narxni muhokama qilyapti.",
          "Ertaga qayta qo'ng'iroq.",
          "",
        ]),
        followUpAt: Math.random() > 0.5 ? daysAhead(rand(1, 7)) : null,
        order: i,
        createdAt: daysAgo(rand(0, 30)),
      },
    });
  }

  // ── Deals + Contracts + Payments + Commissions ──
  const soldCars = cars.filter((c) => c.status === "SOLD");
  // Ensure at least a few sold deals even if random gave none
  const dealCars = soldCars.length >= 4 ? soldCars : cars.slice(0, 5);
  let contractNo = 1000;
  for (let i = 0; i < dealCars.length; i++) {
    const car = dealCars[i];
    const seller = pick(managers);
    const customer = pick(customers);
    const paymentType = pick(["CASH", "CASH", "INSTALLMENT", "CREDIT", "TRADEIN"]);
    const price = car.salePrice;
    const tradeInValue = paymentType === "TRADEIN" ? rand(8000, 15000) : 0;
    const profit = price - car.purchasePrice - rand(200, 800); // minus small expenses
    const createdAt = daysAgo(rand(1, 60));

    // mark car sold
    await prisma.car.update({ where: { id: car.id }, data: { status: "SOLD" } });

    const deal = await prisma.deal.create({
      data: {
        customerId: customer.id,
        carId: car.id,
        userId: seller.id,
        price,
        currency: "USD",
        paymentType,
        status: pick(["COMPLETED", "ACTIVE"]),
        tradeInValue,
        tradeInInfo: paymentType === "TRADEIN" ? "Eski Nexia 3, 2019" : null,
        profit,
        createdAt,
      },
    });

    const months = paymentType === "INSTALLMENT" ? pick([6, 12, 18]) : null;
    const contract = await prisma.contract.create({
      data: {
        number: `A-2026-${contractNo++}`,
        dealId: deal.id,
        customerId: customer.id,
        totalAmount: price,
        currency: "USD",
        paymentType,
        status: "ACTIVE",
        installmentMonths: months,
        signedAt: createdAt,
        createdAt,
      },
    });

    // Payment schedule
    if (months) {
      const monthly = Math.round((price - tradeInValue) / months);
      for (let mIdx = 0; mIdx < months; mIdx++) {
        await prisma.payment.create({
          data: {
            dealId: deal.id,
            contractId: contract.id,
            amount: monthly,
            currency: "USD",
            dueDate: daysAhead(mIdx * 30 - 30),
            paidDate: mIdx < 2 ? daysAgo(rand(1, 20)) : null,
            status: mIdx < 2 ? "PAID" : "PENDING",
            method: "TRANSFER",
          },
        });
      }
    } else {
      await prisma.payment.create({
        data: {
          dealId: deal.id,
          contractId: contract.id,
          amount: price - tradeInValue,
          currency: "USD",
          dueDate: createdAt,
          paidDate: createdAt,
          status: "PAID",
          method: paymentType === "CASH" ? "CASH" : "TRANSFER",
        },
      });
    }

    // Commission
    const rate = seller.commissionRate;
    await prisma.commission.create({
      data: {
        dealId: deal.id,
        userId: seller.id,
        rate,
        amount: Math.round((profit * rate) / 100),
        currency: "USD",
        status: pick(["PENDING", "PAID"]),
        createdAt,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: seller.id,
        action: "CREATE",
        entityType: "Deal",
        entityId: deal.id,
        customerId: customer.id,
        description: `${seller.name} yangi savdo yaratdi: ${car.make} ${car.model} — ${customer.fullName}`,
        createdAt,
      },
    });
  }

  // ── Expenses ──
  const expenseData = [
    { category: "RENT", amount: 25000000, description: "Ofis va maydon ijarasi (oylik)" },
    { category: "SALARY", amount: 45000000, description: "Xodimlar oyligi" },
    { category: "MARKETING", amount: 8000000, description: "Instagram va Google reklama" },
    { category: "MARKETING", amount: 3500000, description: "Bannerlar va bosma reklama" },
    { category: "LOGISTICS", amount: 12000000, description: "Mashinalarni tashish xarajati" },
    { category: "OTHER", amount: 2000000, description: "Kommunal to'lovlar" },
    { category: "OTHER", amount: 1500000, description: "Ofis jihozlari" },
  ];
  for (const e of expenseData) {
    await prisma.expense.create({
      data: {
        category: e.category,
        amount: e.amount,
        currency: "UZS",
        description: e.description,
        date: daysAgo(rand(1, 28)),
        createdById: accountant.id,
      },
    });
  }

  // ── A few extra activity logs ──
  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      action: "CREATE",
      entityType: "Car",
      description: `${admin.name} omborga yangi mashina qo'shdi`,
      createdAt: daysAgo(1),
    },
  });
  await prisma.activityLog.create({
    data: {
      userId: manager1.id,
      action: "CREATE",
      entityType: "Lead",
      description: `${manager1.name} yangi lid qo'shdi (Instagram)`,
      createdAt: daysAgo(0),
    },
  });

  console.log("✅ Seed complete!");
  console.log("   Users:", await prisma.user.count());
  console.log("   Cars:", await prisma.car.count());
  console.log("   Customers:", await prisma.customer.count());
  console.log("   Leads:", await prisma.lead.count());
  console.log("   Deals:", await prisma.deal.count());
  console.log("\n   Login: admin@abozor.uz / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
