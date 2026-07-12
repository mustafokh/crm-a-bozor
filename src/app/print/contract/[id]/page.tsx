import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AutoPrint } from "@/components/contracts/auto-print";
import { PAYMENT_TYPE } from "@/lib/constants";
import { formatMoney, formatDate } from "@/lib/utils";

export default async function ContractPrint({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contract, company] = await Promise.all([
    prisma.contract.findUnique({
      where: { id },
      include: {
        customer: true,
        payments: { orderBy: { dueDate: "asc" } },
        deal: { include: { car: true, user: true } },
      },
    }),
    prisma.companySetting.findUnique({ where: { id: "company" } }),
  ]);
  if (!contract) notFound();

  const car = contract.deal.car;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#111", background: "#fff", minHeight: "100vh" }}>
      <AutoPrint />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #111", paddingBottom: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22 }}>{company?.name ?? "MKUS Avtosalon"}</h1>
              <p style={{ margin: "4px 0", fontSize: 12, color: "#555" }}>{company?.address}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#555" }}>{company?.phone} · {company?.email}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>SOTUV SHARTNOMASI</h2>
              <p style={{ margin: "4px 0", fontSize: 13 }}>№ {contract.number}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#555" }}>{formatDate(contract.signedAt)}</p>
            </div>
          </div>

          <p style={{ fontSize: 13, lineHeight: 1.6, marginTop: 20 }}>
            Ushbu shartnoma <b>{contract.customer.fullName}</b> (bundan keyin — «Xaridor», tel: {contract.customer.phone}
            {contract.customer.passportSeries ? `, pasport: ${contract.customer.passportSeries}` : ""}) va{" "}
            <b>{company?.name ?? "MKUS Avtosalon"}</b> (bundan keyin — «Sotuvchi») o'rtasida quyidagi mazmunda tuzildi.
          </p>

          <h3 style={{ fontSize: 14, marginTop: 20 }}>1. Shartnoma predmeti</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {[
                ["Avtomobil", `${car.make} ${car.model}`],
                ["Ishlab chiqarilgan yili", String(car.year)],
                ["Rangi", car.color ?? "—"],
                ["VIN-kod", car.vin ?? "—"],
                ["Kuzov raqami", car.bodyNumber ?? "—"],
                ["Probeg", `${car.mileage} km`],
                ["To'lov turi", PAYMENT_TYPE[contract.paymentType]],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ border: "1px solid #ddd", padding: "8px 10px", background: "#f7f7f7", width: 200 }}>{k}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px 10px" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: 14, marginTop: 20 }}>2. Shartnoma summasi</h3>
          <p style={{ fontSize: 15 }}>
            Umumiy qiymati: <b>{formatMoney(contract.totalAmount, contract.currency)}</b>
            {contract.installmentMonths ? ` (${contract.installmentMonths} oy bo'lib to'lash)` : ""}
          </p>

          {contract.payments.length > 1 && (
            <>
              <h3 style={{ fontSize: 14, marginTop: 20 }}>3. To'lov jadvali</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f7f7f7" }}>
                    <th style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "left" }}>#</th>
                    <th style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "left" }}>Muddat</th>
                    <th style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "left" }}>Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.payments.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ border: "1px solid #ddd", padding: "6px 8px" }}>{i + 1}</td>
                      <td style={{ border: "1px solid #ddd", padding: "6px 8px" }}>{formatDate(p.dueDate)}</td>
                      <td style={{ border: "1px solid #ddd", padding: "6px 8px" }}>{formatMoney(p.amount, p.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 60, fontSize: 13 }}>
            <div>
              <p style={{ borderTop: "1px solid #111", paddingTop: 6, width: 200 }}>Sotuvchi: {contract.deal.user.name}</p>
            </div>
            <div>
              <p style={{ borderTop: "1px solid #111", paddingTop: 6, width: 200 }}>Xaridor: {contract.customer.fullName}</p>
            </div>
          </div>
      </div>
    </div>
  );
}
