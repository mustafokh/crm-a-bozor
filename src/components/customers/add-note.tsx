"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function AddNote({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [kind, setKind] = useState("NOTE");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/customers/${customerId}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind }),
    });
    setSaving(false);
    if (res.ok) {
      setText("");
      toast("Eslatma qo'shildi");
      router.refresh();
    }
  }

  return (
    <div className="flex gap-2">
      <Select value={kind} onChange={(e) => setKind(e.target.value)} className="w-32">
        <option value="NOTE">Eslatma</option>
        <option value="CALL">Qo'ng'iroq</option>
        <option value="MEETING">Uchrashuv</option>
      </Select>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Yozuv qo'shing..."
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <Button size="icon" onClick={submit} disabled={saving}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
