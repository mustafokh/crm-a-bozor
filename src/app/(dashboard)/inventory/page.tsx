"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Car as CarIcon,
  Pencil,
  Trash2,
  Gauge,
  Fuel,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { useTranslatedEnums } from "@/lib/i18n/use-enums";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { CarForm, type CarFormData } from "@/components/inventory/car-form";
import {
  CAR_STATUS_COLOR,
  CAR_MAKES,
} from "@/lib/constants";
import { formatMoney, cn } from "@/lib/utils";

interface Car extends CarFormData {
  id: string;
  images: { url: string; isPrimary?: boolean }[];
}

// Sortable table header cell.
function SortTH({
  label,
  field,
  sort,
  order,
  onSort,
}: {
  label: string;
  field: string;
  sort: string;
  order: "asc" | "desc";
  onSort: (f: string) => void;
}) {
  const active = sort === field;
  return (
    <TH>
      <button
        onClick={() => onSort(field)}
        className={cn("flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
      >
        {label}
        {active ? (
          order === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TH>
  );
}

// Gradient pill styles for the status badge over the car image.
function statusPill(status: string): string {
  switch (status) {
    case "IN_STOCK":
      return "bg-gradient-to-r from-success/90 to-success/70 text-white";
    case "RESERVED":
      return "bg-gradient-to-r from-warning/90 to-warning/70 text-white";
    case "SOLD":
      return "bg-gradient-to-r from-zinc-600/90 to-zinc-500/70 text-white";
    case "IN_TRANSIT":
      return "bg-gradient-to-r from-primary/90 to-primary/70 text-white";
    default:
      return "bg-black/60 text-white";
  }
}

const PAGE_SIZE = 12;

export default function InventoryPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const enums = useTranslatedEnums();
  const carStatusKeys = ["IN_STOCK", "RESERVED", "SOLD", "IN_TRANSIT"];
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [make, setMake] = useState("ALL");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CarFormData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const firstRun = useRef(true);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "ALL") params.set("status", status);
    if (make !== "ALL") params.set("make", make);
    params.set("sort", sort);
    params.set("order", order);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    const res = await fetch(`/api/cars?${params.toString()}`);
    const data = await res.json();
    setCars(data.cars ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [q, status, make, sort, order, page]);

  // Reset to first page whenever filters/sort change (but not on page change).
  useEffect(() => {
    if (firstRun.current) return;
    setPage(1);
  }, [q, status, make, sort, order]);

  useEffect(() => {
    firstRun.current = false;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function toggleSort(field: string) {
    if (sort === field) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(field);
      setOrder("asc");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/cars/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || t("inventory.deleteError"), "error");
    } else {
      toast(t("inventory.deleted"));
      load();
    }
    setDeleteId(null);
  }

  return (
    <div>
      <PageHeader
        title={t("inventory.title")}
        description={t("inventory.subtitle")}
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> {t("inventory.add")}
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("inventory.search")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={make} onChange={(e) => setMake(e.target.value)} className="sm:w-44">
            <option value="ALL">{t("inventory.allMakes")}</option>
            {CAR_MAKES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44">
            <option value="ALL">{t("inventory.allStatuses")}</option>
            {carStatusKeys.map((k) => (
              <option key={k} value={k}>{enums.carStatus(k)}</option>
            ))}
          </Select>
          <Select
            value={`${sort}:${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split(":");
              setSort(s);
              setOrder(o as "asc" | "desc");
            }}
            className="sm:w-52"
          >
            <option value="createdAt:desc">{t("common.sort.newest")}</option>
            <option value="createdAt:asc">{t("common.sort.oldest")}</option>
            <option value="salePrice:desc">{t("common.sort.priceDesc")}</option>
            <option value="salePrice:asc">{t("common.sort.priceAsc")}</option>
            <option value="year:desc">{t("common.sort.yearDesc")}</option>
            <option value="year:asc">{t("common.sort.yearAsc")}</option>
            <option value="mileage:asc">{t("common.sort.mileageAsc")}</option>
            <option value="make:asc">{t("common.sort.makeAsc")}</option>
          </Select>
          <div className="flex rounded-lg border border-border p-0.5">
            <button
              onClick={() => setView("grid")}
              className={cn("flex h-9 w-9 items-center justify-center rounded-md transition-colors", view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
              title={t("inventory.viewGrid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={cn("flex h-9 w-9 items-center justify-center rounded-md transition-colors", view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
              title={t("inventory.viewTable")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : cars.length === 0 ? (
        <EmptyState
          icon={CarIcon}
          title={t("inventory.empty")}
          description={t("inventory.emptyDesc")}
          action={
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> {t("inventory.add")}
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cars.map((car, i) => {
            const img = car.images?.find((i) => i.isPrimary)?.url || car.images?.[0]?.url;
            return (
              <Card
                key={car.id}
                className="fade-up group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
                style={{ animationDelay: `${Math.min(i * 45, 400)}ms` }}
              >
                <Link href={`/inventory/${car.id}`} className="block">
                  <div className="sheen relative aspect-[4/3] overflow-hidden bg-muted">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={`${car.make} ${car.model}`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <CarIcon className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    {/* bottom gradient for legibility */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className={cn("absolute left-3 top-3 rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md", statusPill(car.status))}>
                      {enums.carStatus(car.status)}
                    </span>
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/inventory/${car.id}`}>
                        <h3 className="truncate font-display font-semibold hover:text-primary">
                          {car.make} {car.model}
                        </h3>
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {car.year} · {enums.carCondition(car.condition)}
                      </p>
                    </div>
                    <p className="tnum shrink-0 font-display font-bold text-primary">
                      {formatMoney(car.salePrice, car.currency, { compact: true })}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="tnum flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" />
                      {new Intl.NumberFormat("ru-RU").format(car.mileage)} km
                    </span>
                    {car.fuelType && (
                      <span className="flex items-center gap-1">
                        <Fuel className="h-3.5 w-3.5" />
                        {enums.fuel(car.fuelType)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-border pt-3">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(car); setFormOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" /> {t("common.edit")}
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(car.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <SortTH label={t("col.car")} field="make" sort={sort} order={order} onSort={toggleSort} />
                <SortTH label={t("col.year")} field="year" sort={sort} order={order} onSort={toggleSort} />
                <SortTH label={t("col.mileage")} field="mileage" sort={sort} order={order} onSort={toggleSort} />
                <TH>{t("col.condition")}</TH>
                <TH>{t("col.status")}</TH>
                <SortTH label={t("col.price")} field="salePrice" sort={sort} order={order} onSort={toggleSort} />
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {cars.map((car) => {
                const img = car.images?.find((i) => i.isPrimary)?.url || car.images?.[0]?.url;
                return (
                  <TR key={car.id}>
                    <TD>
                      <Link href={`/inventory/${car.id}`} className="flex items-center gap-3">
                        <div className="h-11 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center"><CarIcon className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                        </div>
                        <span className="font-medium hover:text-primary">{car.make} {car.model}</span>
                      </Link>
                    </TD>
                    <TD className="tnum text-muted-foreground">{car.year}</TD>
                    <TD className="tnum text-muted-foreground">{new Intl.NumberFormat("ru-RU").format(car.mileage)} km</TD>
                    <TD className="text-muted-foreground">{enums.carCondition(car.condition)}</TD>
                    <TD><Badge className={cn(CAR_STATUS_COLOR[car.status])}>{enums.carStatus(car.status)}</Badge></TD>
                    <TD className="tnum font-medium text-primary">{formatMoney(car.salePrice, car.currency, { compact: true })}</TD>
                    <TD>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(car); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(car.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}

      {!loading && total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("common.pagination", { total, page, totalPages })}
          </p>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" /> {t("common.previous")}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              {t("common.next")} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {formOpen && (
        <CarForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={load}
          initial={editing}
        />
      )}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={t("inventory.deleteTitle")}
        description={t("inventory.deleteDesc")}
      />
    </div>
  );
}
