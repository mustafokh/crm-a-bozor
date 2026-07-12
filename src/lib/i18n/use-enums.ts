"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/language-provider";

/** Translated enum labels for client components (replaces hardcoded constants maps). */
export function useTranslatedEnums() {
  const { t } = useI18n();

  return useMemo(
    () => ({
      carStatus: (k: string) => t(`enum.carStatus.${k}`) || k,
      carCondition: (k: string) => t(`enum.carCondition.${k}`) || k,
      transmission: (k: string) => t(`enum.transmission.${k}`) || k,
      fuel: (k: string) => t(`enum.fuel.${k}`) || k,
      drivetrain: (k: string) => t(`enum.drivetrain.${k}`) || k,
      incomingStatus: (k: string) => t(`enum.incomingStatus.${k}`) || k,
      leadSource: (k: string) => t(`enum.leadSource.${k}`) || k,
      leadStatus: (k: string) => t(`enum.leadStatus.${k}`) || k,
      paymentType: (k: string) => t(`enum.paymentType.${k}`) || k,
      dealStatus: (k: string) => t(`enum.dealStatus.${k}`) || k,
      contractStatus: (k: string) => t(`enum.contractStatus.${k}`) || k,
      paymentStatus: (k: string) => t(`enum.paymentStatus.${k}`) || k,
      expenseCategory: (k: string) => t(`enum.expenseCategory.${k}`) || k,
      role: (k: string) => t(`enum.role.${k}`) || k,
      /** Build a full Record for Select options */
      map: (prefix: string, keys: string[]) =>
        Object.fromEntries(keys.map((k) => [k, t(`${prefix}.${k}`)])),
    }),
    [t]
  );
}

/** Hook returning a map of all lead statuses (for Kanban columns). */
export function useLeadStatusMap() {
  const { t } = useI18n();
  const keys = ["NEW", "ACTIVE", "CLOSED"];
  return useMemo(
    () => Object.fromEntries(keys.map((k) => [k, t(`enum.leadStatus.${k}`)])),
    [t]
  );
}
