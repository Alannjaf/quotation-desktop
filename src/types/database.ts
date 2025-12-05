// Database types for local storage - mirrors the Supabase schema

export type BudgetType = "korek_communication" | "ma";
export type CurrencyType = "usd" | "iqd";
export type QuotationStatus = "draft" | "pending" | "rejected" | "approved" | "invoiced";

export interface Category {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ItemType {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Recipient {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ExchangeRate {
  id: string;
  rate: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: string;
  company_address: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationItemRecord {
  id: string;
  quotation_id: string;
  name: string;
  description: string | null;
  quantity: number;
  type_id: string | null;
  category_id: string | null;
  unit_price: number;
  price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  project_name: string;
  date: string;
  validity_date: string;
  budget_type: BudgetType;
  recipient: string;
  currency_type: CurrencyType;
  vendor_id: string | null;
  vendor_cost: number;
  vendor_currency_type: CurrencyType;
  discount: number;
  note: string | null;
  description: string | null;
  status: QuotationStatus;
  created_at: string;
  updated_at: string;
}

export type DocumentType = "quotation" | "invoice" | "other";

export interface VendorDocument {
  id: string;
  quotation_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  document_type: DocumentType;
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface QuotationWithItems extends Quotation {
  quotation_items: QuotationItemRecord[];
  vendor?: Vendor | null;
  vendor_documents?: VendorDocument[];
}

// Import/Export data structure
export interface ExportData {
  quotations: Quotation[];
  quotation_items: QuotationItemRecord[];
  vendors: Vendor[];
  recipients: Recipient[];
  categories: Category[];
  item_types: ItemType[];
  exchange_rates: ExchangeRate[];
  settings: Settings[];
  vendor_documents?: VendorDocument[];
  exported_at: string;
  version: string;
}


