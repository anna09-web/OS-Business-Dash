import { Coins, GraduationCap, Package, Rocket, Sparkles, type LucideIcon } from "lucide-react";

import type { BusinessAreaSlug, Database } from "@/types/database";

export type BusinessArea = Database["public"]["Tables"]["business_areas"]["Row"];

export interface BusinessAreaMeta {
  icon: LucideIcon;
  tagline: string;
  unlockDescription: string;
}

export const BUSINESS_AREA_META: Record<BusinessAreaSlug, BusinessAreaMeta> = {
  dropshipping: {
    icon: Package,
    tagline: "Stores, Produkte, Skalierung.",
    unlockDescription: "Von Anfang an freigeschaltet — der aktuelle Fokus.",
  },
  crypto_trading: {
    icon: Coins,
    tagline: "Passives Einkommen aus Crypto & Trading.",
    unlockDescription: "Schaltet automatisch frei am 17. September 2027.",
  },
  personal_brand: {
    icon: Sparkles,
    tagline: "Reichweite und Personenmarke aufbauen.",
    unlockDescription:
      "Wird freigeschaltet, sobald ein oder mehrere erfolgreiche Dropshipping-Stores stehen.",
  },
  courses: {
    icon: GraduationCap,
    tagline: "Wissen verpacken und Kurse verkaufen.",
    unlockDescription:
      "Wird freigeschaltet, sobald ein oder mehrere erfolgreiche Dropshipping-Stores stehen.",
  },
  startup: {
    icon: Rocket,
    tagline: "Das nächste große Ding gründen.",
    unlockDescription:
      "Wird freigeschaltet, sobald ein oder mehrere erfolgreiche Dropshipping-Stores stehen.",
  },
};

/** A date-based unlock (e.g. the Crypto & Trading age gate) always wins over `locked`, once reached. */
export function isAreaUnlocked(area: BusinessArea, now: Date = new Date()): boolean {
  if (!area.locked) return true;
  if (area.unlock_at && now >= new Date(area.unlock_at)) return true;
  return false;
}

/** Date-gated areas (Crypto & Trading) unlock on a fixed clock, never early — no manual override. */
export function isManuallyUnlockable(area: BusinessArea): boolean {
  return area.locked && area.unlock_at === null;
}
