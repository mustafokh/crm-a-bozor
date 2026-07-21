"use client";

import { useRef, useState } from "react";
import { Upload, X, Star, Loader2, Link2, ImagePlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/components/language-provider";
import {
  carConditionLabel,
  carStatusLabel,
  transmissionEnumLabel,
  fuelTypeLabel,
  drivetrainLabel,
} from "@/lib/i18n/labels";
import { validateCar, hasErrors, type Errors } from "@/lib/validation";
import { cn } from "@/lib/utils";
import {
  CAR_MAKES,
  CAR_CONDITION,
  CAR_STATUS,
  TRANSMISSION,
  FUEL_TYPE,
  DRIVETRAIN,
} from "@/lib/constants";

export interface CarFormData {
  id?: string;
  make: string;
  model: string;
  year: number;
  color?: string | null;
  vin?: string | null;
  bodyNumber?: string | null;
  engineVolume?: number | null;
  mileage: number;
  condition: string;
  purchasePrice: number;
  salePrice: number;
  currency: string;
  status: string;
  transmission?: string | null;
  fuelType?: string | null;
  drivetrain?: string | null;
  supplier?: string | null;
  description?: string | null;
  images?: { url: string }[];
}

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-destructive">{msg}</p>;
}

export function CarForm({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: CarFormData | null;
}) {
  const { toast } = useToast();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [showUrl, setShowUrl] = useState(false);
  const [images, setImages] = useState<string[]>(
    initial?.images?.map((i) => i.url).filter(Boolean) ?? []
  );
  const [form, setForm] = useState<CarFormData>(
    initial ?? {
      make: "Chevrolet",
      model: "",
      year: new Date().getFullYear(),
      mileage: 0,
      condition: "USED",
      purchasePrice: 0,
      salePrice: 0,
      currency: "USD",
      status: "IN_STOCK",
    }
  );

  const set = (k: keyof CarFormData, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const invalid = (k: string) => (errors[k] ? "border-destructive focus-visible:ring-destructive" : "");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("file", f));
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || t("inventory.form.uploadError"), "error");
      } else {
        setImages((prev) => [...prev, ...data.urls]);
        toast(t("inventory.form.uploadSuccess", { count: String(data.urls.length) }));
      }
    } catch {
      toast(t("inventory.form.uploadError"), "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function makePrimary(i: number) {
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(i, 1);
      next.unshift(item);
      return next;
    });
  }

  async function submit() {
    const errs = validateCar(form);
    if (hasErrors(errs)) {
      setErrors(errs);
      toast(t("common.fixErrors"), "error");
      return;
    }
    setSaving(true);
    const payload = { ...form, images: images.filter((u) => u.trim()) };
    const res = await fetch(initial?.id ? `/api/cars/${initial.id}` : "/api/cars", {
      method: initial?.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      if (d.fields) setErrors(d.fields);
      toast(d.error || t("common.error"), "error");
      return;
    }
    toast(initial?.id ? t("inventory.updated") : t("inventory.saved"));
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? t("inventory.edit") : t("inventory.add")}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={submit} disabled={saving || uploading}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>{t("common.make")} *</Label>
          <Select value={form.make} onChange={(e) => set("make", e.target.value)} className={invalid("make")}>
            {CAR_MAKES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
          <ErrText msg={errors.make} />
        </div>
        <div>
          <Label>{t("common.model")} *</Label>
          <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder={t("inventory.form.modelPlaceholder")} className={invalid("model")} />
          <ErrText msg={errors.model} />
        </div>
        <div>
          <Label>{t("col.year")} *</Label>
          <Input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} className={invalid("year")} />
          <ErrText msg={errors.year} />
        </div>
        <div>
          <Label>{t("public.showroom.color")}</Label>
          <Input value={form.color ?? ""} onChange={(e) => set("color", e.target.value)} placeholder={t("inventory.form.colorPlaceholder")} />
        </div>
        <div>
          <Label>{t("inventory.form.vin")}</Label>
          <Input value={form.vin ?? ""} onChange={(e) => set("vin", e.target.value)} className={invalid("vin")} placeholder={t("inventory.form.optional")} />
          <ErrText msg={errors.vin} />
        </div>
        <div>
          <Label>{t("inventoryDetail.bodyNumber")}</Label>
          <Input value={form.bodyNumber ?? ""} onChange={(e) => set("bodyNumber", e.target.value)} />
        </div>
        <div>
          <Label>{t("inventory.form.engineVolume")}</Label>
          <Input type="number" step="0.1" value={form.engineVolume ?? ""} onChange={(e) => set("engineVolume", e.target.value)} placeholder="2.0" className={invalid("engineVolume")} />
          <ErrText msg={errors.engineVolume} />
        </div>
        <div>
          <Label>{t("col.mileage")} (km)</Label>
          <Input type="number" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} className={invalid("mileage")} />
          <ErrText msg={errors.mileage} />
        </div>
        <div>
          <Label>{t("col.condition")}</Label>
          <Select value={form.condition} onChange={(e) => set("condition", e.target.value)}>
            {Object.keys(CAR_CONDITION).map((k) => (
              <option key={k} value={k}>{carConditionLabel(t, k)}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t("col.status")}</Label>
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            {Object.keys(CAR_STATUS).map((k) => (
              <option key={k} value={k}>{carStatusLabel(t, k)}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t("public.showroom.transmission")}</Label>
          <Select value={form.transmission ?? ""} onChange={(e) => set("transmission", e.target.value)}>
            <option value="">—</option>
            {Object.keys(TRANSMISSION).map((k) => (
              <option key={k} value={k}>{transmissionEnumLabel(t, k)}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t("public.showroom.fuel")}</Label>
          <Select value={form.fuelType ?? ""} onChange={(e) => set("fuelType", e.target.value)}>
            <option value="">—</option>
            {Object.keys(FUEL_TYPE).map((k) => (
              <option key={k} value={k}>{fuelTypeLabel(t, k)}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t("inventoryDetail.drivetrain")}</Label>
          <Select value={form.drivetrain ?? ""} onChange={(e) => set("drivetrain", e.target.value)}>
            <option value="">—</option>
            {Object.keys(DRIVETRAIN).map((k) => (
              <option key={k} value={k}>{drivetrainLabel(t, k)}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t("inventory.form.currency")}</Label>
          <Select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
            <option value="USD">{t("settings.currencyUsd")}</option>
            <option value="UZS">{t("settings.currencyUzs")}</option>
          </Select>
        </div>
        <div>
          <Label>{t("deals.purchasePrice")} *</Label>
          <Input type="number" value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} className={invalid("purchasePrice")} />
          <ErrText msg={errors.purchasePrice} />
        </div>
        <div>
          <Label>{t("deals.salePrice")} *</Label>
          <Input type="number" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} className={invalid("salePrice")} />
          <ErrText msg={errors.salePrice} />
        </div>
        <div className="sm:col-span-2">
          <Label>{t("col.supplier")}</Label>
          <Input value={form.supplier ?? ""} onChange={(e) => set("supplier", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>{t("common.description")}</Label>
          <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </div>

        {/* Images: real upload + optional URL */}
        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="mb-0">{t("inventory.form.images")}</Label>
            <button
              type="button"
              onClick={() => setShowUrl((s) => !s)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Link2 className="h-3.5 w-3.5" /> {showUrl ? t("inventory.form.hideUrl") : t("inventory.form.showUrl")}
            </button>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border py-6 text-center transition-colors hover:border-primary/50 hover:bg-accent/40"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
            <p className="mt-2 text-sm font-medium">{t("inventory.form.uploadClick")}</p>
            <p className="text-xs text-muted-foreground">{t("inventory.form.uploadFormats")}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {showUrl && (
            <div className="mt-2 flex gap-2">
              <Input
                id="url-input"
                placeholder={t("inventory.form.urlPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (v) {
                      setImages((prev) => [...prev, v]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <Button
                variant="outline"
                size="icon"
                type="button"
                onClick={() => {
                  const el = document.getElementById("url-input") as HTMLInputElement;
                  if (el?.value.trim()) {
                    setImages((prev) => [...prev, el.value.trim()]);
                    el.value = "";
                  }
                }}
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {images.map((url, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[9px] font-medium text-primary-foreground">
                      <Star className="h-2.5 w-2.5 fill-current" /> {t("inventory.form.primaryPhoto")}
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {i !== 0 && (
                      <button type="button" onClick={() => makePrimary(i)} title={t("inventory.form.makePrimary")} className="rounded bg-white/20 p-1 text-white hover:bg-white/30">
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => setImages(images.filter((_, idx) => idx !== i))} title={t("common.delete")} className="rounded bg-white/20 p-1 text-white hover:bg-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
