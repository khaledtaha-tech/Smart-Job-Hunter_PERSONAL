export type ProductEdition = "personal" | "commercial";
export type CommercialTier = "basic" | "standard" | "premium";

export type EditionConfig = {
  edition: ProductEdition;
  tier: CommercialTier;
  showPlastics: boolean;
  defaultMode: "plastics" | "general";
  auth: boolean;
  displayName: string;
  buyUrl: string;
};

export type TierPolicy = {
  maxProfiles: number | null;
  maxApplications: number | null;
  maxSearchSites: number | null;
  targetCompanies: boolean;
  csvExport: boolean;
  advancedTracker: boolean;
  followUps: boolean;
  excelTransfer: boolean;
  databaseBackup: boolean;
};

const POLICIES: Record<CommercialTier, TierPolicy> = {
  basic: {
    maxProfiles: 1,
    maxApplications: 20,
    maxSearchSites: 3,
    targetCompanies: false,
    csvExport: false,
    advancedTracker: false,
    followUps: false,
    excelTransfer: false,
    databaseBackup: false,
  },
  standard: {
    maxProfiles: 3,
    maxApplications: 100,
    maxSearchSites: 5,
    targetCompanies: true,
    csvExport: true,
    advancedTracker: false,
    followUps: false,
    excelTransfer: false,
    databaseBackup: false,
  },
  premium: {
    maxProfiles: null,
    maxApplications: null,
    maxSearchSites: null,
    targetCompanies: true,
    csvExport: true,
    advancedTracker: true,
    followUps: true,
    excelTransfer: true,
    databaseBackup: true,
  },
};

export function getTierPolicy(config: EditionConfig): TierPolicy {
  if (config.edition === "personal") return POLICIES.premium;
  return POLICIES[config.tier] || POLICIES.basic;
}

export function tierLabel(config: EditionConfig): string {
  return config.edition === "personal" ? "PERSONAL" : config.tier.toUpperCase();
}

export function nextTierLabel(config: EditionConfig): string {
  if (config.edition === "personal" || config.tier === "premium") return "Premium";
  return config.tier === "basic" ? "Standard or Premium" : "Premium";
}

export function hasReachedLimit(current: number, maximum: number | null): boolean {
  return maximum !== null && current >= maximum;
}

export function formatLimit(maximum: number | null): string {
  return maximum === null ? "Unlimited" : String(maximum);
}
