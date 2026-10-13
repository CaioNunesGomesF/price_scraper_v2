import { request } from "../../shared/api";

export type SearchSource = { id: string; name: string; domain: string; kind: "marketplace" | "retailer" | "aggregator"; description: string };
export type PartnerStore = { id: string; name: string; websiteUrl: string; description: string | null; city: string | null; state: string | null; productCount: number };
export type StoreDirectory = { searchSources: SearchSource[]; partnerStores: PartnerStore[] };
export type ProductSubmission = { title: string; productUrl: string; imageUrl: string | null; price: number; inStock: boolean };
export type StoreSubmission = { name: string; websiteUrl: string; contactEmail: string; description?: string; city?: string; state?: string; products: ProductSubmission[] };
export type StoreSubmissionResult = { storeId: string; status: "pending"; productCount: number };

export const getStoreDirectory = () => request<StoreDirectory>("/api/stores");
export const submitStore = (data: StoreSubmission) => request<StoreSubmissionResult>("/api/stores", { method: "POST", body: JSON.stringify(data) });
