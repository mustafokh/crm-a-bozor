"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ contractId }: { contractId: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.open(`/print/contract/${contractId}`, "_blank")}
    >
      <Printer className="h-4 w-4" /> PDF / Chop etish
    </Button>
  );
}
