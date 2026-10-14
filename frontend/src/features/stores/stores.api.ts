import { request } from "../../shared/api";

export type SearchSource = { id: string; name: string; domain: string; kind: "marketplace" | "retailer" | "aggregator"; description: string };
export type PartnerStore = { id: string; name: string; websiteUrl: string; description: string | null; city: string | null; state: string | null; priority: number; productCount: number };
export type StoreDirectory = { searchSources: SearchSource[]; partnerStores: PartnerStore[] };
export type ProductSubmission = { title: string; productUrl: string; imageUrl: string | null; price: number; inStock: boolean };
export type StoreSubmission = { name: string; websiteUrl: string; contactEmail: string; description?: string; city?: string; state?: string; products: ProductSubmission[] };
export type StoreSubmissionResult = { storeId: string; status: "pending" | "approved"; productCount: number };
export type CatalogProduct = { id: string; storeId: string; storeName: string; storeWebsite: string; title: string; productUrl: string; imageUrl: string | null; price: number; inStock: boolean; createdAt: string };

export const getStoreDirectory = () => request<StoreDirectory>("/api/stores");
export const getCatalog = () => request<CatalogProduct[]>("/api/stores/catalog");
export const submitStore = (data: StoreSubmission) => request<StoreSubmissionResult>("/api/stores", { method: "POST", body: JSON.stringify(data) });
