import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Edit, FileDown, Loader2, Upload, FileText, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getQuotation, updateQuotation, getSettings, addVendorDocument, deleteVendorDocument } from "@/lib/storage";
import type { QuotationStatus } from "@/types/database";

const statusColors: Record<QuotationStatus, string> = {
  draft: "bg-gray-500",
  pending: "bg-yellow-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  invoiced: "bg-blue-500",
};

export default function ViewQuotation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => getQuotation(id!),
    enabled: !!id,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: QuotationStatus) => updateQuotation(id!, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast({ title: "Success", description: "Status updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  // Upload vendor document
  const handleUploadDocument = async () => {
    if (!id) return;
    setIsUploadingDoc(true);

    try {
      if (window.electronAPI?.openDocumentDialog) {
        const fileInfo = await window.electronAPI.openDocumentDialog();
        if (fileInfo) {
          // Save file to app storage
          const saveResult = await window.electronAPI.saveDocument(
            fileInfo.path,
            id,
            fileInfo.name
          );
          
          if (saveResult.success && saveResult.path) {
            // Add to database
            await addVendorDocument(
              id,
              fileInfo.name,
              saveResult.path,
              fileInfo.size,
              fileInfo.type,
              "quotation"
            );
            
            queryClient.invalidateQueries({ queryKey: ['quotation', id] });
            toast({ title: "Success", description: "Document uploaded successfully" });
          }
        }
      } else {
        // Browser fallback - just show message
        toast({ title: "Info", description: "Document upload requires the desktop app" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Open document
  const handleOpenDocument = async (filePath: string) => {
    if (window.electronAPI?.openDocument) {
      await window.electronAPI.openDocument(filePath);
    }
  };

  // Delete document
  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const doc = quotation?.vendor_documents?.find(d => d.id === docId);
      if (doc && window.electronAPI?.deleteDocumentFile) {
        await window.electronAPI.deleteDocumentFile(doc.file_path);
      }
      return deleteVendorDocument(docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      toast({ title: "Success", description: "Document deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    },
  });

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Calculate totals
  const subtotal = quotation?.quotation_items?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;
  const discountAmount = (subtotal * (quotation?.discount || 0)) / 100;
  const total = subtotal - discountAmount;

  // Generate PDF
  const generatePDF = async () => {
    if (!quotation) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let headerStartY = 15;

    // Company Logo (top left)
    if (settings?.logo_url) {
      try {
        let logoData = settings.logo_url;
        
        // If it's a file path and Electron is available, load the image
        if (window.electronAPI?.loadImage && !settings.logo_url.startsWith('data:')) {
          const loaded = await window.electronAPI.loadImage(settings.logo_url);
          if (loaded) {
            logoData = loaded;
          }
        }
        
        // Add logo to PDF
        if (logoData.startsWith('data:')) {
          doc.addImage(logoData, 'PNG', 14, 10, 40, 20);
          headerStartY = 35;
        }
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
      }
    }

    // Header - "QUOTATION" title
    doc.setFontSize(20);
    doc.text("QUOTATION", pageWidth / 2, headerStartY, { align: "center" });

    // Quotation details (left side)
    const detailsStartY = headerStartY + 15;
    doc.setFontSize(12);
    doc.text(`Quotation #: ${quotation.quotation_number}`, 14, detailsStartY);
    doc.text(`Date: ${format(new Date(quotation.date), "PPP")}`, 14, detailsStartY + 8);
    doc.text(`Valid Until: ${format(new Date(quotation.validity_date), "PPP")}`, 14, detailsStartY + 16);

    // Recipient (right side)
    doc.text(`To: ${quotation.recipient}`, pageWidth - 80, detailsStartY);
    doc.text(`Project: ${quotation.project_name}`, pageWidth - 80, detailsStartY + 8);

    // Items table
    const tableData = quotation.quotation_items.map((item, index) => [
      index + 1,
      item.name,
      item.quantity,
      `${item.unit_price.toLocaleString()} ${quotation.currency_type.toUpperCase()}`,
      `${item.total_price.toLocaleString()} ${quotation.currency_type.toUpperCase()}`,
    ]);

    const tableStartY = detailsStartY + 30;
    autoTable(doc, {
      startY: tableStartY,
      head: [["#", "Description", "Qty", "Unit Price", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [128, 90, 213] },
    });

    // Totals
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Subtotal: ${subtotal.toLocaleString()} ${quotation.currency_type.toUpperCase()}`, pageWidth - 60, finalY);
    
    let contentEndY = finalY + 10;
    if (quotation.discount > 0) {
      doc.text(`Discount (${quotation.discount}%): -${discountAmount.toLocaleString()} ${quotation.currency_type.toUpperCase()}`, pageWidth - 60, finalY + 8);
      doc.setFontSize(14);
      doc.text(`Total: ${total.toLocaleString()} ${quotation.currency_type.toUpperCase()}`, pageWidth - 60, finalY + 18);
      contentEndY = finalY + 28;
    } else {
      doc.setFontSize(14);
      doc.text(`Total: ${total.toLocaleString()} ${quotation.currency_type.toUpperCase()}`, pageWidth - 60, finalY + 8);
      contentEndY = finalY + 18;
    }

    // Notes
    if (quotation.note) {
      doc.setFontSize(10);
      doc.text("Notes:", 14, contentEndY + 10);
      doc.text(quotation.note, 14, contentEndY + 18);
      contentEndY = contentEndY + 28;
    }

    // Company Address (bottom left)
    if (settings?.company_address) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const addressLines = settings.company_address.split('\n');
      const addressStartY = pageHeight - 20 - (addressLines.length * 5);
      addressLines.forEach((line, index) => {
        doc.text(line, 14, addressStartY + (index * 5));
      });
      doc.setTextColor(0, 0, 0); // Reset to black
    }

    // Save PDF
    doc.save(`${quotation.quotation_number}.pdf`);
    toast({ title: "Success", description: "PDF generated successfully" });
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
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/quotations')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{quotation.quotation_number}</h1>
              <p className="text-muted-foreground">{quotation.project_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={quotation.status}
              onValueChange={(v) => updateStatusMutation.mutate(v as QuotationStatus)}
            >
              <SelectTrigger className="w-[140px]">
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
            <Button variant="outline" onClick={generatePDF}>
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={() => navigate(`/quotations/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Details */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quotation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={statusColors[quotation.status]}>
                  {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{format(new Date(quotation.date), "PPP")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid Until</span>
                <span>{format(new Date(quotation.validity_date), "PPP")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget Type</span>
                <Badge variant="outline">
                  {quotation.budget_type === 'ma' ? 'MA' : 'Korek'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span>{quotation.currency_type.toUpperCase()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendor & Recipient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient</span>
                <span>{quotation.recipient || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendor</span>
                <span>{quotation.vendor?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendor Cost</span>
                <span>
                  {quotation.vendor_cost.toLocaleString()} {quotation.vendor_currency_type.toUpperCase()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotation.quotation_items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right font-mono">
                      {item.unit_price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.total_price.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 flex flex-col items-end gap-2 border-t pt-4">
              <div className="flex justify-between w-64">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  {subtotal.toLocaleString()} {quotation.currency_type.toUpperCase()}
                </span>
              </div>
              {quotation.discount > 0 && (
                <div className="flex justify-between w-64">
                  <span className="text-muted-foreground">Discount ({quotation.discount}%)</span>
                  <span className="font-mono text-destructive">
                    -{discountAmount.toLocaleString()} {quotation.currency_type.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex justify-between w-64 text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span className="font-mono">
                  {total.toLocaleString()} {quotation.currency_type.toUpperCase()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {quotation.note && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{quotation.note}</p>
            </CardContent>
          </Card>
        )}

        {/* Vendor Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Vendor Documents</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUploadDocument}
              disabled={isUploadingDoc}
            >
              {isUploadingDoc ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {!quotation.vendor_documents || quotation.vendor_documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No vendor documents uploaded yet</p>
                <p className="text-sm">Upload quotations, invoices, or other documents from your vendor</p>
              </div>
            ) : (
              <div className="space-y-2">
                {quotation.vendor_documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(doc.file_size)} • {doc.file_type.toUpperCase()} • {format(new Date(doc.created_at), "PPP")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDocument(doc.file_path)}
                        title="Open document"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete document">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{doc.file_name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteDocMutation.mutate(doc.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}


