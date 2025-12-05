// Local JSON file storage service
// This provides a similar API to Supabase for easy migration
// Uses Electron IPC when available, falls back to localStorage for browser/dev mode

import type {
  Quotation,
  QuotationItemRecord,
  Vendor,
  Recipient,
  Category,
  ItemType,
  ExchangeRate,
  Settings,
  QuotationWithItems,
  ExportData,
  VendorDocument,
  DocumentType,
} from "@/types/database";

type DataFile =
  | "quotations.json"
  | "quotation_items.json"
  | "vendors.json"
  | "recipients.json"
  | "categories.json"
  | "item_types.json"
  | "exchange_rates.json"
  | "settings.json"
  | "vendor_documents.json";

// Check if Electron API is available
function hasElectronAPI(): boolean {
  return (
    typeof window !== "undefined" && typeof window.electronAPI !== "undefined"
  );
}

// LocalStorage key prefix
const STORAGE_PREFIX = "quotation_desktop_";

// Generic read function - uses Electron IPC or localStorage fallback
async function readData<T>(filename: DataFile): Promise<T[]> {
  try {
    if (hasElectronAPI()) {
      const data = await window.electronAPI.readData(filename);
      return data as T[];
    } else {
      // Fallback to localStorage for browser/dev mode
      const key = STORAGE_PREFIX + filename;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored) as T[];
      }
      return [];
    }
  } catch (error) {
    console.error("Error reading data:", error);
    return [];
  }
}

// Generic write function - uses Electron IPC or localStorage fallback
async function writeData<T>(filename: DataFile, data: T[]): Promise<boolean> {
  try {
    if (hasElectronAPI()) {
      const result = await window.electronAPI.writeData(filename, data);
      return result.success;
    } else {
      // Fallback to localStorage for browser/dev mode
      const key = STORAGE_PREFIX + filename;
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    }
  } catch (error) {
    console.error("Error writing data:", error);
    return false;
  }
}

// Generate UUID
function generateId(): string {
  return crypto.randomUUID();
}

// Get current timestamp
function now(): string {
  return new Date().toISOString();
}

// ============ Quotations ============

export async function getQuotations(): Promise<QuotationWithItems[]> {
  const quotations = await readData<Quotation>("quotations.json");
  const items = await readData<QuotationItemRecord>("quotation_items.json");
  const vendors = await readData<Vendor>("vendors.json");
  const documents = await readData<VendorDocument>("vendor_documents.json");

  return quotations.map((q) => ({
    ...q,
    quotation_items: items.filter((i) => i.quotation_id === q.id),
    vendor: vendors.find((v) => v.id === q.vendor_id) || null,
    vendor_documents: documents.filter((d) => d.quotation_id === q.id),
  }));
}

export async function getQuotation(
  id: string
): Promise<QuotationWithItems | null> {
  const quotations = await getQuotations();
  return quotations.find((q) => q.id === id) || null;
}

export async function createQuotation(
  quotation: Omit<Quotation, "id" | "created_at" | "updated_at">,
  items: Omit<
    QuotationItemRecord,
    "id" | "quotation_id" | "created_at" | "updated_at"
  >[]
): Promise<Quotation | null> {
  const quotations = await readData<Quotation>("quotations.json");
  const existingItems = await readData<QuotationItemRecord>(
    "quotation_items.json"
  );

  const newQuotation: Quotation = {
    ...quotation,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  };

  const newItems: QuotationItemRecord[] = items.map((item) => ({
    ...item,
    id: generateId(),
    quotation_id: newQuotation.id,
    created_at: now(),
    updated_at: now(),
  }));

  quotations.push(newQuotation);
  await writeData("quotations.json", quotations);

  existingItems.push(...newItems);
  await writeData("quotation_items.json", existingItems);

  return newQuotation;
}

export async function updateQuotation(
  id: string,
  updates: Partial<Omit<Quotation, "id" | "created_at">>,
  items?: Omit<
    QuotationItemRecord,
    "id" | "quotation_id" | "created_at" | "updated_at"
  >[]
): Promise<Quotation | null> {
  const quotations = await readData<Quotation>("quotations.json");
  const index = quotations.findIndex((q) => q.id === id);

  if (index === -1) return null;

  quotations[index] = {
    ...quotations[index],
    ...updates,
    updated_at: now(),
  };

  await writeData("quotations.json", quotations);

  // Update items if provided
  if (items) {
    const existingItems = await readData<QuotationItemRecord>(
      "quotation_items.json"
    );
    // Remove old items for this quotation
    const filteredItems = existingItems.filter((i) => i.quotation_id !== id);
    // Add new items
    const newItems: QuotationItemRecord[] = items.map((item) => ({
      ...item,
      id: generateId(),
      quotation_id: id,
      created_at: now(),
      updated_at: now(),
    }));
    filteredItems.push(...newItems);
    await writeData("quotation_items.json", filteredItems);
  }

  return quotations[index];
}

export async function deleteQuotation(id: string): Promise<boolean> {
  const quotations = await readData<Quotation>("quotations.json");
  const filtered = quotations.filter((q) => q.id !== id);

  if (filtered.length === quotations.length) return false;

  await writeData("quotations.json", filtered);

  // Also delete associated items
  const items = await readData<QuotationItemRecord>("quotation_items.json");
  const filteredItems = items.filter((i) => i.quotation_id !== id);
  await writeData("quotation_items.json", filteredItems);

  return true;
}

// ============ Vendors ============

export async function getVendors(): Promise<Vendor[]> {
  return readData<Vendor>("vendors.json");
}

export async function createVendor(name: string): Promise<Vendor> {
  const vendors = await readData<Vendor>("vendors.json");

  // Check if vendor already exists
  const existing = vendors.find(
    (v) => v.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing;

  const newVendor: Vendor = {
    id: generateId(),
    name,
    created_at: now(),
    updated_at: now(),
  };

  vendors.push(newVendor);
  await writeData("vendors.json", vendors);

  return newVendor;
}

export async function deleteVendor(id: string): Promise<boolean> {
  const vendors = await readData<Vendor>("vendors.json");
  const filtered = vendors.filter((v) => v.id !== id);

  if (filtered.length === vendors.length) return false;

  await writeData("vendors.json", filtered);
  return true;
}

// ============ Recipients ============

export async function getRecipients(): Promise<Recipient[]> {
  return readData<Recipient>("recipients.json");
}

export async function createRecipient(name: string): Promise<Recipient> {
  const recipients = await readData<Recipient>("recipients.json");

  // Check if recipient already exists
  const existing = recipients.find(
    (r) => r.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing;

  const newRecipient: Recipient = {
    id: generateId(),
    name,
    created_at: now(),
    updated_at: now(),
  };

  recipients.push(newRecipient);
  await writeData("recipients.json", recipients);

  return newRecipient;
}

export async function deleteRecipient(id: string): Promise<boolean> {
  const recipients = await readData<Recipient>("recipients.json");
  const filtered = recipients.filter((r) => r.id !== id);

  if (filtered.length === recipients.length) return false;

  await writeData("recipients.json", filtered);
  return true;
}

// ============ Categories ============

export async function getCategories(): Promise<Category[]> {
  return readData<Category>("categories.json");
}

export async function createCategory(name: string): Promise<Category> {
  const categories = await readData<Category>("categories.json");

  const existing = categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing;

  const newCategory: Category = {
    id: generateId(),
    name,
    created_at: now(),
    updated_at: now(),
  };

  categories.push(newCategory);
  await writeData("categories.json", categories);

  return newCategory;
}

// ============ Item Types ============

export async function getItemTypes(): Promise<ItemType[]> {
  return readData<ItemType>("item_types.json");
}

export async function createItemType(name: string): Promise<ItemType> {
  const itemTypes = await readData<ItemType>("item_types.json");

  const existing = itemTypes.find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing;

  const newItemType: ItemType = {
    id: generateId(),
    name,
    created_at: now(),
    updated_at: now(),
  };

  itemTypes.push(newItemType);
  await writeData("item_types.json", itemTypes);

  return newItemType;
}

// ============ Exchange Rates ============

export async function getExchangeRates(): Promise<ExchangeRate[]> {
  return readData<ExchangeRate>("exchange_rates.json");
}

export async function getLatestExchangeRate(): Promise<ExchangeRate | null> {
  const rates = await getExchangeRates();
  if (rates.length === 0) return null;

  // Sort by date descending and return the first one
  rates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return rates[0];
}

export async function createExchangeRate(
  rate: number,
  date: string
): Promise<ExchangeRate> {
  const rates = await readData<ExchangeRate>("exchange_rates.json");

  const newRate: ExchangeRate = {
    id: generateId(),
    rate,
    date,
    created_at: now(),
    updated_at: now(),
  };

  rates.push(newRate);
  await writeData("exchange_rates.json", rates);

  return newRate;
}

// ============ Settings ============

export async function getSettings(): Promise<Settings | null> {
  const settings = await readData<Settings>("settings.json");
  return settings[0] || null;
}

export async function updateSettings(
  updates: Partial<Settings>
): Promise<Settings> {
  const settings = await readData<Settings>("settings.json");

  if (settings.length === 0) {
    const newSettings: Settings = {
      id: generateId(),
      company_address: updates.company_address || null,
      logo_url: updates.logo_url || null,
      created_at: now(),
      updated_at: now(),
    };
    await writeData("settings.json", [newSettings]);
    return newSettings;
  }

  settings[0] = {
    ...settings[0],
    ...updates,
    updated_at: now(),
  };

  await writeData("settings.json", settings);
  return settings[0];
}

// ============ Import/Export ============

export async function exportAllData(): Promise<ExportData> {
  const [
    quotations,
    quotation_items,
    vendors,
    recipients,
    categories,
    item_types,
    exchange_rates,
    settings,
  ] = await Promise.all([
    readData<Quotation>("quotations.json"),
    readData<QuotationItemRecord>("quotation_items.json"),
    readData<Vendor>("vendors.json"),
    readData<Recipient>("recipients.json"),
    readData<Category>("categories.json"),
    readData<ItemType>("item_types.json"),
    readData<ExchangeRate>("exchange_rates.json"),
    readData<Settings>("settings.json"),
  ]);

  return {
    quotations,
    quotation_items,
    vendors,
    recipients,
    categories,
    item_types,
    exchange_rates,
    settings,
    exported_at: now(),
    version: "1.0.0",
  };
}

export async function importData(
  data: ExportData
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate data structure
    if (
      !data.quotations ||
      !data.quotation_items ||
      !data.vendors ||
      !data.recipients ||
      !data.categories ||
      !data.item_types ||
      !data.exchange_rates
    ) {
      return { success: false, message: "Invalid data format" };
    }

    // Write all data
    await Promise.all([
      writeData("quotations.json", data.quotations),
      writeData("quotation_items.json", data.quotation_items),
      writeData("vendors.json", data.vendors),
      writeData("recipients.json", data.recipients),
      writeData("categories.json", data.categories),
      writeData("item_types.json", data.item_types),
      writeData("exchange_rates.json", data.exchange_rates),
      writeData("settings.json", data.settings || []),
    ]);

    return { success: true, message: "Data imported successfully" };
  } catch (error) {
    return { success: false, message: `Import failed: ${error}` };
  }
}

// ============ Quotation Number Generation ============

export async function generateQuotationNumber(): Promise<string> {
  const quotations = await readData<Quotation>("quotations.json");
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;

  // Find the highest number for this year
  const yearQuotations = quotations.filter((q) =>
    q.quotation_number.startsWith(prefix)
  );
  let maxNum = 0;

  yearQuotations.forEach((q) => {
    const numStr = q.quotation_number.replace(prefix, "");
    const num = parseInt(numStr, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  });

  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
}

// ============ Vendor Documents ============

export async function getVendorDocuments(
  quotationId: string
): Promise<VendorDocument[]> {
  const documents = await readData<VendorDocument>("vendor_documents.json");
  return documents.filter((d) => d.quotation_id === quotationId);
}

export async function addVendorDocument(
  quotationId: string,
  fileName: string,
  filePath: string,
  fileSize: number,
  fileType: string,
  documentType: DocumentType = "quotation"
): Promise<VendorDocument> {
  const documents = await readData<VendorDocument>("vendor_documents.json");

  const newDocument: VendorDocument = {
    id: generateId(),
    quotation_id: quotationId,
    file_name: fileName,
    file_path: filePath,
    file_size: fileSize,
    file_type: fileType,
    document_type: documentType,
    created_at: now(),
    updated_at: now(),
  };

  documents.push(newDocument);
  await writeData("vendor_documents.json", documents);

  return newDocument;
}

export async function deleteVendorDocument(id: string): Promise<boolean> {
  const documents = await readData<VendorDocument>("vendor_documents.json");
  const filtered = documents.filter((d) => d.id !== id);

  if (filtered.length === documents.length) return false;

  await writeData("vendor_documents.json", filtered);
  return true;
}
