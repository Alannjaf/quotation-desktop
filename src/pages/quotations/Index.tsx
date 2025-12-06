import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, FileText, Download, Eye, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getQuotations, deleteQuotation, getItemTypes } from "@/lib/storage";
import type { QuotationWithItems, QuotationStatus } from "@/types/database";

const statusColors: Record<QuotationStatus, string> = {
  draft: "bg-gray-500",
  pending: "bg-yellow-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  invoiced: "bg-blue-500",
};

export default function QuotationsIndex() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL params
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [budgetFilter, setBudgetFilter] = useState<string>(searchParams.get("budget") || "all");

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (budgetFilter !== "all") params.set("budget", budgetFilter);
    setSearchParams(params, { replace: true });
  }, [search, statusFilter, budgetFilter, setSearchParams]);

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: getQuotations,
  });

  const { data: itemTypes = [] } = useQuery({
    queryKey: ['itemTypes'],
    queryFn: getItemTypes,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast({ title: "Success", description: "Quotation deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete quotation", variant: "destructive" });
    },
  });

  // Filter and sort quotations (most recent first)
  const filteredQuotations = quotations
    .filter((q) => {
      const matchesSearch = q.project_name.toLowerCase().includes(search.toLowerCase()) ||
        q.quotation_number.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      const matchesBudget = budgetFilter === "all" || q.budget_type === budgetFilter;
      return matchesSearch && matchesStatus && matchesBudget;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Calculate totals
  const calculateTotal = (q: QuotationWithItems) => {
    return q.quotation_items?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;
  };

  const handleExport = () => {
    if (!filteredQuotations.length) return;

    // Export data - quotation info once, then items below
    const exportData: (string | number)[][] = [];
    
    // Header row
    exportData.push([
      'Quotation Number', 'Project Name', 'Recipient', 'Date', 'Validity Date',
      'Status', 'Budget Type', 'Currency', 'Quotation Total', 'Vendor Name', 'Vendor Cost', 
      'Discount', 'Note'
    ]);
    
    // Items header
    const itemsHeader = [
      '', '', '', '', '', '', '', '', '',
      'Item #', 'Item Name', 'Item Type', 'Description', 'Quantity', 'Unit Price', 'Item Total'
    ];
    
    // Helper to get item type name
    const getItemTypeName = (typeId: string | null) => {
      if (!typeId) return '';
      const type = itemTypes.find(t => t.id === typeId);
      return type?.name || '';
    };
    
    filteredQuotations.forEach((q) => {
      const quotationTotal = calculateTotal(q);
      
      // Quotation row
      exportData.push([
        q.quotation_number,
        q.project_name,
        q.recipient,
        format(new Date(q.date), 'PPP'),
        format(new Date(q.validity_date), 'PPP'),
        q.status.charAt(0).toUpperCase() + q.status.slice(1),
        q.budget_type === 'ma' ? 'MA' : 'Korek',
        q.currency_type.toUpperCase(),
        quotationTotal,
        q.vendor?.name || '',
        q.vendor_cost,
        q.discount,
        q.note || ''
      ]);
      
      // Items sub-header
      if (q.quotation_items && q.quotation_items.length > 0) {
        exportData.push(itemsHeader);
        
        // Item rows
        q.quotation_items.forEach((item, index) => {
          exportData.push([
            '', '', '', '', '', '', '', '', '',
            index + 1,
            item.name,
            getItemTypeName(item.type_id),
            item.description || '',
            item.quantity,
            item.unit_price,
            item.total_price
          ]);
        });
      }
      
      // Empty row between quotations
      exportData.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quotations');
    XLSX.writeFile(wb, `quotations_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({ title: "Success", description: "Quotations exported successfully" });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
            <p className="text-muted-foreground mt-1">
              Manage your quotations here
            </p>
          </div>
          <Button onClick={() => navigate('/quotations/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quotations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {quotations.filter(q => q.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {quotations.filter(q => q.status === 'approved').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Invoiced</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {quotations.filter(q => q.status === 'invoiced').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by project name or number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                </SelectContent>
              </Select>
              <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Budget Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ma">MA</SelectItem>
                  <SelectItem value="korek_communication">Korek</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quotations Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredQuotations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No quotations found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell className="font-mono text-sm">
                        {quotation.quotation_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {quotation.project_name}
                      </TableCell>
                      <TableCell>{quotation.recipient}</TableCell>
                      <TableCell>
                        {format(new Date(quotation.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[quotation.status]}>
                          {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {quotation.budget_type === 'ma' ? 'MA' : 'Korek'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {calculateTotal(quotation).toLocaleString()} {quotation.currency_type.toUpperCase()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/quotations/${quotation.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this quotation? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(quotation.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}


