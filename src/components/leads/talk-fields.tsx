"use client";

import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useI18n } from "@/components/language-provider";
import {
  CAR_COLOR_OPTIONS, CAR_MAKE_OPTIONS, LEAD_OUTCOMES, PAYMENT_TYPE,
} from "@/lib/constants";

export interface TalkFormState {
  carMake: string;
  carModel: string;
  carYear: string;
  carColor: string;
  budget: string;
  paymentType: string;
  clientWants: string;
  discussionNotes: string;
  outcome: string;
}

export const emptyTalkForm: TalkFormState = {
  carMake: "",
  carModel: "",
  carYear: "",
  carColor: "",
  budget: "",
  paymentType: "",
  clientWants: "",
  discussionNotes: "",
  outcome: "",
};

export function talkFormFromRecord(r: {
  carMake?: string | null;
  carModel?: string | null;
  carYear?: number | null;
  carColor?: string | null;
  budget?: string | null;
  paymentType?: string | null;
  clientWants?: string | null;
  discussionNotes?: string | null;
  outcome?: string | null;
}): TalkFormState {
  return {
    carMake: r.carMake ?? "",
    carModel: r.carModel ?? "",
    carYear: r.carYear ? String(r.carYear) : "",
    carColor: r.carColor ?? "",
    budget: r.budget ?? "",
    paymentType: r.paymentType ?? "",
    clientWants: r.clientWants ?? "",
    discussionNotes: r.discussionNotes ?? "",
    outcome: r.outcome ?? "",
  };
}

export function TalkFields({
  value,
  onChange,
  showOutcome = true,
}: {
  value: TalkFormState;
  onChange: (v: TalkFormState) => void;
  showOutcome?: boolean;
}) {
  const { t } = useI18n();
  const set = (patch: Partial<TalkFormState>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("leads.section.car")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>{t("common.make")}</Label>
          <Select value={value.carMake} onChange={(e) => set({ carMake: e.target.value })}>
            <option value="">{t("common.select")}</option>
            {CAR_MAKE_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t("common.model")}</Label>
          <Input
            value={value.carModel}
            onChange={(e) => set({ carModel: e.target.value })}
            placeholder="Camry, Cobalt..."
          />
        </div>
        <div>
          <Label>{t("col.year")}</Label>
          <Input
            type="number"
            value={value.carYear}
            onChange={(e) => set({ carYear: e.target.value })}
            placeholder="2022"
          />
        </div>
        <div>
          <Label>{t("leads.col.carColor")}</Label>
          <Select value={value.carColor} onChange={(e) => set({ carColor: e.target.value })}>
            <option value="">{t("common.select")}</option>
            {CAR_COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t("leads.col.budget")}</Label>
          <Input
            value={value.budget}
            onChange={(e) => set({ budget: e.target.value })}
            placeholder="$15 000"
          />
        </div>
        <div>
          <Label>{t("leads.col.payment")}</Label>
          <Select value={value.paymentType} onChange={(e) => set({ paymentType: e.target.value })}>
            <option value="">{t("common.select")}</option>
            {Object.entries(PAYMENT_TYPE).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("leads.section.talk")}
      </p>
      <div>
        <Label>{t("leads.col.clientWants")}</Label>
        <Input
          value={value.clientWants}
          onChange={(e) => set({ clientWants: e.target.value })}
          placeholder={t("leads.clientWantsHint")}
        />
      </div>
      <div>
        <Label>{t("leads.col.discussion")}</Label>
        <Textarea
          rows={4}
          value={value.discussionNotes}
          onChange={(e) => set({ discussionNotes: e.target.value })}
          placeholder={t("leads.discussionHint")}
        />
      </div>
      {showOutcome && (
        <div>
          <Label>{t("leads.col.outcome")}</Label>
          <Select value={value.outcome} onChange={(e) => set({ outcome: e.target.value })}>
            <option value="">{t("common.select")}</option>
            {LEAD_OUTCOMES.map((o) => (
              <option key={o} value={o}>{t(`enum.leadOutcome.${o}`) || o}</option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
