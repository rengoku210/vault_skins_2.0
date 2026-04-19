export type ListingType = "rent" | "sell" | "both";
export type ListingStatus = "pending" | "approved" | "rejected" | "sold" | "archived";
export type TransactionType = "rent" | "buy";
export type TransactionStatus = "pending" | "verifying" | "completed" | "failed";

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  listing_type: ListingType;
  status: ListingStatus;
  rent_hourly_price: number | null;
  rent_daily_price: number | null;
  buy_price: number | null;
  rank: string | null;
  region: string | null;
  agents_owned: number | null;
  skins_count: number | null;
  inventory_value: number | null;
  cover_image_url: string | null;
  contact_method: string | null;
  contact_handle: string | null;
  riot_id: string | null;
  riot_region: string | null;
  recovery_email: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListingSkin {
  id: string;
  listing_id: string;
  skin_uuid: string;
  skin_name: string;
  weapon_uuid: string | null;
  weapon_name: string | null;
  display_icon: string | null;
  preview_video: string | null;
  content_tier_uuid: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  transaction_type: TransactionType;
  status: TransactionStatus;
  mock_txn_id: string;
  rent_hours: number | null;
  credentials_released: boolean;
  credentials_released_at: string | null;
  expires_at: string | null;
  handoff_notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  riot_id: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const RANKS = [
  "Iron", "Bronze", "Silver", "Gold", "Platinum",
  "Diamond", "Ascendant", "Immortal", "Radiant",
];

export const REGIONS = ["NA", "EU", "AP", "KR", "BR", "LATAM"];

/** Tier-based estimated INR value used for auto inventory calculation. */
export const TIER_INR: Record<string, { name: string; value: number }> = {
  "e046854e-406c-37f4-6607-19a9ba8426fc": { name: "Ultra",     value: 6500 },
  "12683d76-48d7-84a3-4e09-6985794f0445": { name: "Exclusive", value: 5350 },
  "60bca009-4182-7998-dee7-b8a2558dc369": { name: "Premium",   value: 2675 },
  "0cebb8be-46d7-c12a-d306-e9907bfc5a25": { name: "Deluxe",    value: 1275 },
  "12683d76-48d7-84a3-4e09-6985794f0444": { name: "Select",    value: 875  },
};

export function estimateInventoryValue(skins: { content_tier_uuid: string | null }[]): number {
  return skins.reduce((sum, s) => sum + (s.content_tier_uuid ? TIER_INR[s.content_tier_uuid]?.value ?? 600 : 600), 0);
}
