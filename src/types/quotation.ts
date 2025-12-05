// Enums
export type BudgetType = "ma" | "korek_communication";
export type FilterBudgetType = BudgetType | "all";
export type CurrencyType = "usd" | "iqd";
export type QuotationStatus = "draft" | "pending" | "rejected" | "approved" | "invoiced";
export type FilterQuotationStatus = QuotationStatus | "all";

// Item Types
export interface QuotationItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  type_id: string | null;
  unit_price: number;
  price: number;
  total_price: number;
}

// Filter Types
export interface QuotationFilters {
  projectName: string;
  budgetType: FilterBudgetType | null;
  status: FilterQuotationStatus | null;
  startDate?: Date;
  endDate?: Date;
  createdBy?: string | null;
}

// Form Types
export interface QuotationFormData {
  projectName: string;
  date: Date;
  validityDate: Date;
  budgetType: BudgetType;
  recipient: string;
  currencyType: CurrencyType;
  vendorName: string;
  vendorCost: number;
  vendorCurrencyType: CurrencyType;
  items: QuotationItem[];
  discount: number;
  note: string;
}


