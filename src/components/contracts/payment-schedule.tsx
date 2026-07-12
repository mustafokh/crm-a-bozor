"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PAYMENT_STATUS, PAYMENT_STATUS_COLOR } from "@/lib/constants";
import { formatMoney, formatDate, cn } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  dueDate?: string | null;
  paidDate?: string | null;
  status: string;
}

export function PaymentSchedule({ payments: initial }: { payments: Payment[] }) {
  const { toast } = useToast();
  const [payments, setPayments] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(p: Payment) {
    setBusy(p.id);
    const next = p.status === "PAID" ? "PENDING" : "PAID";
    await fetch(`/api/payments/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(null);
    setPayments((prev) =>
      prev.map((item) =>
        item.id === p.id
          ? { ...item, status: next, paidDate: next === "PAID" ? new Date().toISOString() : null }
          : item
      )
    );
    toast(next === "PAID" ? "To'lov qabul qilindi" : "To'lov bekor qilindi");
  }

  const paid = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">To'langan: {formatMoney(paid, payments[0]?.currency)}</span>
        <span className="font-medium">Jami: {formatMoney(total, payments[0]?.currency)}</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-success" style={{ width: `${total ? (paid / total) * 100 : 0}%` }} />
      </div>
      <Table>
        <THead>
          <TR><TH>#</TH><TH>Muddat</TH><TH>Summa</TH><TH>To'langan sana</TH><TH>Status</TH><TH></TH></TR>
        </THead>
        <TBody>
          {payments.map((p, i) => (
            <TR key={p.id}>
              <TD>{i + 1}</TD>
              <TD>{formatDate(p.dueDate)}</TD>
              <TD className="font-medium">{formatMoney(p.amount, p.currency)}</TD>
              <TD className="text-muted-foreground">{p.paidDate ? formatDate(p.paidDate) : "—"}</TD>
              <TD><Badge className={cn(PAYMENT_STATUS_COLOR[p.status])}>{PAYMENT_STATUS[p.status]}</Badge></TD>
              <TD>
                <Button variant="ghost" size="sm" disabled={busy === p.id} onClick={() => toggle(p)}>
                  {p.status === "PAID" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />}
                  {p.status === "PAID" ? "Bekor" : "To'landi"}
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
