import Link from "next/link";
import { Car } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
        <Car className="h-7 w-7 text-primary-foreground" />
      </div>
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-muted-foreground">Sahifa topilmadi</p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Bosh sahifaga qaytish
      </Link>
    </div>
  );
}
