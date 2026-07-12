import { cookies } from "next/headers";
import { getT, isLocale, LOCALE_COOKIE, type Locale } from "./index";

export async function getServerLocale(): Promise<Locale> {
  const jar = await cookies();
  const val = jar.get(LOCALE_COOKIE)?.value;
  return isLocale(val) ? val : "uz";
}

export async function getServerT() {
  const locale = await getServerLocale();
  return { locale, t: getT(locale) };
}
