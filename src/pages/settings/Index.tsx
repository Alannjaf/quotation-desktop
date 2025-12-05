import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { 
  Upload, 
  Download, 
  Save, 
  Loader2, 
  Plus, 
  Trash2, 
  Building, 
  DollarSign,
  Database,
  AlertTriangle,
  Image,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getSettings,
  updateSettings,
  getExchangeRates,
  createExchangeRate,
  getVendors,
  createVendor,
  deleteVendor,
  getRecipients,
  createRecipient,
  deleteRecipient,
  getItemTypes,
  createItemType,
  exportAllData,
  importData,
} from "@/lib/storage";
import type { ExportData } from "@/types/database";

export default function SettingsIndex() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Settings state
  const [companyAddress, setCompanyAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Exchange rate state
  const [newRate, setNewRate] = useState("");
  const [newRateDate, setNewRateDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isAddingRate, setIsAddingRate] = useState(false);

  // Item type state
  const [newItemType, setNewItemType] = useState("");

  // Vendor state
  const [newVendor, setNewVendor] = useState("");

  // Recipient state
  const [newRecipient, setNewRecipient] = useState("");

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const { data: exchangeRates = [] } = useQuery({
    queryKey: ['exchangeRates'],
    queryFn: getExchangeRates,
  });

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

  // Load settings into state when fetched
  useEffect(() => {
    if (settings) {
      setCompanyAddress(settings.company_address || "");
      setLogoUrl(settings.logo_url || "");
      // Load logo preview if there's a logo URL
      if (settings.logo_url) {
        // If it's a file path and Electron is available, load the image
        if (window.electronAPI?.loadImage && !settings.logo_url.startsWith('data:')) {
          window.electronAPI.loadImage(settings.logo_url).then((data) => {
            if (data) {
              setLogoPreview(data);
            }
          });
        } else {
          // It's already a data URL or base64
          setLogoPreview(settings.logo_url);
        }
      }
    }
  }, [settings]);

  // Handle logo upload
  const handleLogoUpload = async () => {
    setIsUploadingLogo(true);
    try {
      // Check if Electron API is available
      if (window.electronAPI?.openImageDialog) {
        const result = await window.electronAPI.openImageDialog();
        if (result) {
          // Save the image and get the file path
          const saveResult = await window.electronAPI.saveImage(result.data, `company-logo-${Date.now()}.png`);
          if (saveResult.success && saveResult.path) {
            setLogoUrl(saveResult.path);
            setLogoPreview(result.data);
            toast({ title: "Success", description: "Logo uploaded successfully" });
          }
        }
      } else {
        // Fallback for browser - use file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              setLogoUrl(dataUrl);
              setLogoPreview(dataUrl);
              toast({ title: "Success", description: "Logo uploaded successfully" });
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload logo", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setLogoUrl("");
    setLogoPreview(null);
  };

  // Save settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateSettings({
        company_address: companyAddress || null,
        logo_url: logoUrl || null,
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: "Success", description: "Settings saved successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Add exchange rate
  const handleAddRate = async () => {
    if (!newRate || !newRateDate) return;
    
    setIsAddingRate(true);
    try {
      await createExchangeRate(parseFloat(newRate), newRateDate);
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
      queryClient.invalidateQueries({ queryKey: ['latestExchangeRate'] });
      setNewRate("");
      toast({ title: "Success", description: "Exchange rate added successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add exchange rate", variant: "destructive" });
    } finally {
      setIsAddingRate(false);
    }
  };

  // Add item type
  const handleAddItemType = async () => {
    if (!newItemType.trim()) return;
    
    try {
      await createItemType(newItemType);
      queryClient.invalidateQueries({ queryKey: ['itemTypes'] });
      setNewItemType("");
      toast({ title: "Success", description: "Item type added successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add item type", variant: "destructive" });
    }
  };

  // Add vendor
  const handleAddVendor = async () => {
    if (!newVendor.trim()) return;
    
    try {
      await createVendor(newVendor);
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setNewVendor("");
      toast({ title: "Success", description: "Vendor added successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add vendor", variant: "destructive" });
    }
  };

  // Delete vendor
  const deleteVendorMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({ title: "Success", description: "Vendor deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete vendor", variant: "destructive" });
    },
  });

  // Add recipient
  const handleAddRecipient = async () => {
    if (!newRecipient.trim()) return;
    
    try {
      await createRecipient(newRecipient);
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      setNewRecipient("");
      toast({ title: "Success", description: "Recipient added successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add recipient", variant: "destructive" });
    }
  };

  // Delete recipient
  const deleteRecipientMutation = useMutation({
    mutationFn: deleteRecipient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      toast({ title: "Success", description: "Recipient deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete recipient", variant: "destructive" });
    },
  });

  // Export data
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      
      if (window.electronAPI) {
        const result = await window.electronAPI.saveFileDialog(
          data,
          `quotation-backup-${format(new Date(), "yyyy-MM-dd")}.json`
        );
        if (result.success) {
          toast({ title: "Success", description: `Data exported to ${result.path}` });
        }
      } else {
        // Fallback for browser
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quotation-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Success", description: "Data exported successfully" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to export data", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // Import data
  const handleImport = async () => {
    setIsImporting(true);
    try {
      let data: ExportData | null = null;

      if (window.electronAPI) {
        data = await window.electronAPI.openFileDialog() as ExportData | null;
      } else {
        // Fallback for browser
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        const fileData = await new Promise<ExportData | null>((resolve) => {
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
              resolve(null);
              return;
            }
            const text = await file.text();
            resolve(JSON.parse(text));
          };
          input.click();
        });
        data = fileData;
      }

      if (!data) {
        setIsImporting(false);
        return;
      }

      const result = await importData(data);
      
      if (result.success) {
        queryClient.invalidateQueries();
        toast({ title: "Success", description: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to import data", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your application settings and data
          </p>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="company">
              <Building className="h-4 w-4 mr-2" />
              Company
            </TabsTrigger>
            <TabsTrigger value="exchange">
              <DollarSign className="h-4 w-4 mr-2" />
              Exchange Rate
            </TabsTrigger>
            <TabsTrigger value="data">
              <Database className="h-4 w-4 mr-2" />
              Data
            </TabsTrigger>
            <TabsTrigger value="manage">
              Manage
            </TabsTrigger>
          </TabsList>

          {/* Company Settings */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Company Settings</CardTitle>
                <CardDescription>
                  Configure your company information for quotations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Company Logo */}
                <div className="space-y-3">
                  <Label>Company Logo</Label>
                  <div className="flex items-start gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Company Logo"
                          className="h-24 w-auto max-w-[200px] object-contain border rounded-lg p-2 bg-white"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={handleRemoveLogo}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-24 w-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        onClick={handleLogoUpload}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Logo
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Recommended: PNG or JPG, max 500KB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Company Address */}
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Company Address</Label>
                  <Textarea
                    id="companyAddress"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Enter your company address..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                  {isSavingSettings ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exchange Rate */}
          <TabsContent value="exchange">
            <Card>
              <CardHeader>
                <CardTitle>Exchange Rates</CardTitle>
                <CardDescription>
                  Manage USD to IQD exchange rates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4 items-end">
                  <div className="space-y-2 flex-1">
                    <Label>Rate (1 USD = ? IQD)</Label>
                    <Input
                      type="number"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      placeholder="1470"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newRateDate}
                      onChange={(e) => setNewRateDate(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAddRate} disabled={isAddingRate || !newRate}>
                    {isAddingRate ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {exchangeRates.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Rate (IQD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exchangeRates
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10)
                        .map((rate) => (
                          <TableRow key={rate.id}>
                            <TableCell>{format(new Date(rate.date), "PPP")}</TableCell>
                            <TableCell className="text-right font-mono">
                              {rate.rate.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Import/Export */}
          <TabsContent value="data">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Import Data</CardTitle>
                  <CardDescription>
                    Import data from a backup file or from the web app's Supabase export
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={isImporting}>
                          {isImporting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Import Data
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            <AlertTriangle className="h-5 w-5 text-destructive inline mr-2" />
                            Import Data
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will replace ALL existing data with the imported data. 
                            This action cannot be undone. Make sure to export your current data first if needed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleImport}>
                            Continue Import
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <span className="text-sm text-muted-foreground">
                      Select a JSON file exported from this app or the web app
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Export Data</CardTitle>
                  <CardDescription>
                    Export all your data to a JSON file for backup
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExport} disabled={isExporting}>
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export All Data
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Manage Vendors, Recipients & Item Types */}
          <TabsContent value="manage">
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Vendors */}
                <Card>
                  <CardHeader>
                    <CardTitle>Vendors</CardTitle>
                    <CardDescription>
                      Manage vendor list (auto-saved when creating quotations)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newVendor}
                        onChange={(e) => setNewVendor(e.target.value)}
                        placeholder="Add new vendor..."
                        onKeyDown={(e) => e.key === 'Enter' && handleAddVendor()}
                      />
                      <Button onClick={handleAddVendor} disabled={!newVendor.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {vendors.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No vendors yet. Add some above or they will be created automatically when you create quotations.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {vendors.map((vendor) => (
                          <div key={vendor.id} className="flex items-center justify-between p-2 border rounded">
                            <span>{vendor.name}</span>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{vendor.name}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteVendorMutation.mutate(vendor.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recipients */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recipients</CardTitle>
                    <CardDescription>
                      Manage recipient list (auto-saved when creating quotations)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        placeholder="Add new recipient..."
                        onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
                      />
                      <Button onClick={handleAddRecipient} disabled={!newRecipient.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {recipients.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No recipients yet. Add some above or they will be created automatically when you create quotations.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {recipients.map((recipient) => (
                          <div key={recipient.id} className="flex items-center justify-between p-2 border rounded">
                            <span>{recipient.name}</span>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Recipient</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{recipient.name}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteRecipientMutation.mutate(recipient.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Item Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Item Types</CardTitle>
                  <CardDescription>
                    Manage quotation item types
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 max-w-md">
                    <Input
                      value={newItemType}
                      onChange={(e) => setNewItemType(e.target.value)}
                      placeholder="Add new item type..."
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItemType()}
                    />
                    <Button onClick={handleAddItemType} disabled={!newItemType.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {itemTypes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No item types yet. Add some above.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {itemTypes.map((type) => (
                        <div key={type.id} className="flex items-center gap-2 px-3 py-1 border rounded-full bg-muted">
                          <span className="text-sm">{type.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}


