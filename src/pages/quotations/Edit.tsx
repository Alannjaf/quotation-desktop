import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  getQuotation,
  updateQuotation,
  createVendor,
  createRecipient,
  getVendors,
  getRecipients,
  getItemTypes,
} from "@/lib/storage";
import type { BudgetType, CurrencyType, QuotationStatus } from "@/types/database";

interface QuotationItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  type_id: string | null;
  unit_price: number;
  price: number;
  total_price: number;
}

export default function EditQuotation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [projectName, setProjectName] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [validityDate, setValidityDate] = useState<Date>(new Date());
  const [budgetType, setBudgetType] = useState<BudgetType>("ma");
  const [recipient, setRecipient] = useState("");
  const [currencyType, setCurrencyType] = useState<CurrencyType>("usd");
  const [vendorName, setVendorName] = useState("");
  const [vendorCost, setVendorCost] = useState(0);
  const [vendorCurrencyType, setVendorCurrencyType] = useState<CurrencyType>("usd");
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<QuotationStatus>("draft");
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch quotation
  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => getQuotation(id!),
    enabled: !!id,
  });

  // Fetch lookup data
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: getVendors,
  });

  const { data: recipients = [] } = useQuery({
    queryKey: ['recipients'],
    queryFn: getRecipients,
  });

  const { data: itemTypes = [] } = useQuery({
    queryKey: ['itemTypes'],
    queryFn: getItemTypes,
  });

  // Load quotation data
  useEffect(() => {
    if (quotation && !isLoaded) {
      setProjectName(quotation.project_name);
      setDate(new Date(quotation.date));
      setValidityDate(new Date(quotation.validity_date));
      setBudgetType(quotation.budget_type);
      setRecipient(quotation.recipient);
      setCurrencyType(quotation.currency_type);
      setVendorName(quotation.vendor?.name || "");
      setVendorCost(quotation.vendor_cost);
      setVendorCurrencyType(quotation.vendor_currency_type);
      setDiscount(quotation.discount);
      setNote(quotation.note || "");
      setStatus(quotation.status);
      setItems(quotation.quotation_items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        type_id: item.type_id,
        unit_price: item.unit_price,
        price: item.price,
        total_price: item.total_price,
      })));
      setIsLoaded(true);
    }
  }, [quotation, isLoaded]);

  // Add item
  const addItem = () => {
    const newItem: QuotationItem = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      quantity: 1,
      type_id: null,
      unit_price: 0,
      price: 0,
      total_price: 0,
    };
    setItems([...items, newItem]);
  };

  // Update item
  const updateItem = (itemId: string, field: keyof QuotationItem, value: unknown) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      
      const updated = { ...item, [field]: value };
      
      if (field === 'quantity' || field === 'unit_price') {
        updated.price = updated.quantity * updated.unit_price;
        updated.total_price = updated.price;
      }
      
      return updated;
    }));
  };

  // Remove item
  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  // Calculate total
  const total = items.reduce((sum, item) => sum + item.total_price, 0);
  const discountAmount = (total * discount) / 100;
  const finalTotal = total - discountAmount;

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      toast({ title: "Error", description: "Project name is required", variant: "destructive" });
      return;
    }
    
    if (items.length === 0) {
      toast({ title: "Error", description: "Add at least one item", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create vendor if new
      let vendorId: string | null = null;
      if (vendorName.trim()) {
        const vendor = await createVendor(vendorName);
        vendorId = vendor.id;
      }

      // Create recipient if new
      if (recipient.trim()) {
        const existingRecipient = recipients.find(r => r.name.toLowerCase() === recipient.toLowerCase());
        if (!existingRecipient) {
          await createRecipient(recipient);
        }
      }

      // Update quotation
      await updateQuotation(
        id!,
        {
          project_name: projectName,
          date: date.toISOString(),
          validity_date: validityDate.toISOString(),
          budget_type: budgetType,
          recipient: recipient,
          currency_type: currencyType,
          vendor_id: vendorId,
          vendor_cost: vendorCost,
          vendor_currency_type: vendorCurrencyType,
          discount: discount,
          note: note || null,
          status: status,
        },
        items.map(item => ({
          name: item.name,
          description: item.description || null,
          quantity: item.quantity,
          type_id: item.type_id,
          category_id: null,
          unit_price: item.unit_price,
          price: item.price,
          total_price: item.total_price,
        }))
      );

      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      toast({ title: "Success", description: "Quotation updated successfully" });
      navigate('/quotations');
    } catch (error) {
      toast({ title: "Error", description: "Failed to update quotation", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!quotation) {
    return (
      <AppLayout>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold">Quotation not found</h1>
          <Button onClick={() => navigate('/quotations')} className="mt-4">
            Back to Quotations
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Edit Quotation</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as QuotationStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="invoiced">Invoiced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Recipient</Label>
                <Input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter recipient"
                  list="recipients-list"
                />
                <datalist id="recipients-list">
                  {recipients.map((r) => (
                    <option key={r.id} value={r.name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Validity Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !validityDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validityDate ? format(validityDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={validityDate}
                      onSelect={(d) => d && setValidityDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Budget Type</Label>
                <Select value={budgetType} onValueChange={(v) => setBudgetType(v as BudgetType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ma">MA</SelectItem>
                    <SelectItem value="korek_communication">Korek Communication</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currencyType} onValueChange={(v) => setCurrencyType(v as CurrencyType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD</SelectItem>
                    <SelectItem value="iqd">IQD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Vendor Info */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Enter vendor name"
                  list="vendors-list"
                />
                <datalist id="vendors-list">
                  {vendors.map((v) => (
                    <option key={v.id} value={v.name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label>Vendor Cost</Label>
                <Input
                  type="number"
                  value={vendorCost}
                  onChange={(e) => setVendorCost(Number(e.target.value))}
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <Label>Vendor Currency</Label>
                <Select value={vendorCurrencyType} onValueChange={(v) => setVendorCurrencyType(v as CurrencyType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD</SelectItem>
                    <SelectItem value="iqd">IQD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items added yet. Click "Add Item" to start.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-32">Unit Price</TableHead>
                      <TableHead className="w-32 text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            placeholder="Item name"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.type_id || ""}
                            onValueChange={(v) => updateItem(item.id, 'type_id', v || null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {itemTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                            min={1}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(item.id, 'unit_price', Number(e.target.value))}
                            min={0}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.total_price.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {items.length > 0 && (
                <div className="mt-4 flex flex-col items-end gap-2 border-t pt-4">
                  <div className="flex items-center gap-4">
                    <Label>Discount (%)</Label>
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-24"
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Subtotal: {total.toLocaleString()} {currencyType.toUpperCase()}
                  </div>
                  {discount > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Discount: -{discountAmount.toLocaleString()} {currencyType.toUpperCase()}
                    </div>
                  )}
                  <div className="text-lg font-bold">
                    Total: {finalTotal.toLocaleString()} {currencyType.toUpperCase()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any additional notes..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/quotations')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Quotation'
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}


