"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Tasdiqlaysizmi?",
  description = "Bu amalni ortga qaytarib bo'lmaydi.",
  confirmText = "Ha, davom etish",
  loading = false,
  destructive = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  loading?: boolean;
  destructive?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Bekor qilish
            </Button>
            <Button
              variant={destructive ? "destructive" : "primary"}
              size="sm"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "Bajarilmoqda..." : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
