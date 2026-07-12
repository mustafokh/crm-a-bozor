"use client";

import { useRef, useState } from "react";
import { Upload, X, Star, Loader2, Link2, ImagePlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
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
        toast(data.error || "Yuklashda xatolik", "error");
      } else {
        setImages((prev) => [...prev, ...data.urls]);
        toast(`${data.urls.length} ta rasm yuklandi`);
      }
    } catch {
      toast("Yuklashda xatolik", "error");
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
      toast("Formadagi xatolarni tuzating", "error");
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
      toast(d.error || "Xatolik", "error");
      return;
    }
    toast(initial?.id ? "Mashina yangilandi" : "Mashina qo'shildi");
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? "Mashinani tahrirlash" : "Yangi mashina qo'shish"}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Bekor qilish
          </Button>
          <Button size="sm" onClick={submit} disabled={saving || uploading}>
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Marka *</Label>
          <Select value={form.make} onChange={(e) => set("make", e.target.value)} className={invalid("make")}>
            {CAR_MAKES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
          <ErrText msg={errors.make} />
        </div>
        <div>
          <Label>Model *</Label>
          <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Masalan: Camry 70" className={invalid("model")} />
          <ErrText msg={errors.model} />
        </div>
        <div>
          <Label>Yil *</Label>
          <Input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} className={invalid("year")} />
          <ErrText msg={errors.year} />
        </div>
        <div>
          <Label>Rang</Label>
          <Input value={form.color ?? ""} onChange={(e) => set("color", e.target.value)} placeholder="Oq" />
        </div>
        <div>
          <Label>VIN-kod</Label>
          <Input value={form.vin ?? ""} onChange={(e) => set("vin", e.target.value)} className={invalid("vin")} placeholder="ixtiyoriy" />
          <ErrText msg={errors.vin} />
        </div>
        <div>
          <Label>Kuzov raqami</Label>
          <Input value={form.bodyNumber ?? ""} onChange={(e) => set("bodyNumber", e.target.value)} />
        </div>
        <div>
          <Label>Dvigatel hajmi (L)</Label>
          <Input type="number" step="0.1" value={form.engineVolume ?? ""} onChange={(e) => set("engineVolume", e.target.value)} placeholder="2.0" className={invalid("engineVolume")} />
          <ErrText msg={errors.engineVolume} />
        </div>
        <div>
          <Label>Probeg (km)</Label>
          <Input type="number" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} className={invalid("mileage")} />
          <ErrText msg={errors.mileage} />
        </div>
        <div>
          <Label>Holati</Label>
          <Select value={form.condition} onChange={(e) => set("condition", e.target.value)}>
            {Object.entries(CAR_CONDITION).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            {Object.entries(CAR_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Transmissiya</Label>
          <Select value={form.transmission ?? ""} onChange={(e) => set("transmission", e.target.value)}>
            <option value="">—</option>
            {Object.entries(TRANSMISSION).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Yoqilg'i</Label>
          <Select value={form.fuelType ?? ""} onChange={(e) => set("fuelType", e.target.value)}>
            <option value="">—</option>
            {Object.entries(FUEL_TYPE).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Tortish tizimi</Label>
          <Select value={form.drivetrain ?? ""} onChange={(e) => set("drivetrain", e.target.value)}>
            <option value="">—</option>
            {Object.entries(DRIVETRAIN).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Valyuta</Label>
          <Select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
            <option value="USD">USD ($)</option>
            <option value="UZS">UZS (so'm)</option>
          </Select>
        </div>
        <div>
          <Label>Sotib olingan narx *</Label>
          <Input type="number" value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} className={invalid("purchasePrice")} />
          <ErrText msg={errors.purchasePrice} />
        </div>
        <div>
          <Label>Sotish narxi *</Label>
          <Input type="number" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} className={invalid("salePrice")} />
          <ErrText msg={errors.salePrice} />
        </div>
        <div className="sm:col-span-2">
          <Label>Yetkazib beruvchi</Label>
          <Input value={form.supplier ?? ""} onChange={(e) => set("supplier", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Tavsif</Label>
          <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </div>

        {/* Images: real upload + optional URL */}
        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="mb-0">Rasmlar</Label>
            <button
              type="button"
              onClick={() => setShowUrl((s) => !s)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Link2 className="h-3.5 w-3.5" /> {showUrl ? "URL yashirish" : "URL orqali qo'shish"}
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
            <p className="mt-2 text-sm font-medium">Rasm yuklash uchun bosing</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · maks. 5 MB</p>
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
                placeholder="https://... rasm havolasi"
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
                      <Star className="h-2.5 w-2.5 fill-current" /> Asosiy
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {i !== 0 && (
                      <button type="button" onClick={() => makePrimary(i)} title="Asosiy qilish" className="rounded bg-white/20 p-1 text-white hover:bg-white/30">
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => setImages(images.filter((_, idx) => idx !== i))} title="O'chirish" className="rounded bg-white/20 p-1 text-white hover:bg-destructive">
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
