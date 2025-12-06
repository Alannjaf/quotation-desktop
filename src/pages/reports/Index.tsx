import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, parse } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { CalendarIcon, FileDown, BarChart3, PieChartIcon, Package, Eye } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getQuotations, getItemTypes } from "@/lib/storage";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Colors for charts
const COLORS = [
  "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#6366f1", "#14b8a6", "#84cc16", "#f97316",
];

export default function ReportsIndex() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from URL params or defaults
  const [startDate, setStartDate] = useState<Date>(() => {
    const param = searchParams.get("start");
    return param ? parse(param, 'yyyy-MM-dd', new Date()) : startOfMonth(new Date());
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const param = searchParams.get("end");
    return param ? parse(param, 'yyyy-MM-dd', new Date()) : endOfMonth(new Date());
  });
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [selectedItemType, setSelectedItemType] = useState<string>(searchParams.get("type") || "all");

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("start", format(startDate, 'yyyy-MM-dd'));
    params.set("end", format(endDate, 'yyyy-MM-dd'));
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (selectedItemType !== "all") params.set("type", selectedItemType);
    setSearchParams(params, { replace: true });
  }, [startDate, endDate, statusFilter, selectedItemType, setSearchParams]);

  const { data: quotations = [] } = useQuery({
    queryKey: ['quotations'],
    queryFn: getQuotations,
  });

  const { data: itemTypes = [] } = useQuery({
    queryKey: ['itemTypes'],
    queryFn: getItemTypes,
  });

  // Filter quotations by date range and status
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const quotationDate = parseISO(q.date);
      const inDateRange = isWithinInterval(quotationDate, { start: startDate, end: endDate });
      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      return inDateRange && matchesStatus;
    });
  }, [quotations, startDate, endDate, statusFilter]);

  // Calculate report data by item type
  const reportData = useMemo(() => {
    const typeStats: Record<string, {
      typeName: string;
      quantity: number;
      totalAmount: number;
      quotationCount: number;
    }> = {};

    // Initialize with all item types
    itemTypes.forEach((type) => {
      typeStats[type.id] = {
        typeName: type.name,
        quantity: 0,
        totalAmount: 0,
        quotationCount: 0,
      };
    });

    // Add "No Type" category
    typeStats['no_type'] = {
      typeName: 'No Type',
      quantity: 0,
      totalAmount: 0,
      quotationCount: 0,
    };

    // Calculate stats from filtered quotations
    const quotationsWithType = new Set<string>();
    
    filteredQuotations.forEach((q) => {
      q.quotation_items?.forEach((item) => {
        const typeId = item.type_id || 'no_type';
        
        if (!typeStats[typeId]) {
          typeStats[typeId] = {
            typeName: 'Unknown',
            quantity: 0,
            totalAmount: 0,
            quotationCount: 0,
          };
        }
        
        typeStats[typeId].quantity += item.quantity;
        typeStats[typeId].totalAmount += item.total_price;
        
        // Track unique quotations per type
        const key = `${q.id}-${typeId}`;
        if (!quotationsWithType.has(key)) {
          quotationsWithType.add(key);
          typeStats[typeId].quotationCount += 1;
        }
      });
    });

    // Convert to array and filter out empty types
    return Object.entries(typeStats)
      .filter(([_, stats]) => stats.quantity > 0 || stats.totalAmount > 0)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredQuotations, itemTypes]);

  // Calculate totals
  const totals = useMemo(() => {
    return reportData.reduce(
      (acc, row) => ({
        quantity: acc.quantity + row.quantity,
        totalAmount: acc.totalAmount + row.totalAmount,
        quotationCount: acc.quotationCount + row.quotationCount,
      }),
      { quantity: 0, totalAmount: 0, quotationCount: 0 }
    );
  }, [reportData]);

  // Detailed report for selected item type
  const itemTypeDetail = useMemo(() => {
    if (selectedItemType === "all") return [];
    
    const details: {
      quotationId: string;
      quotationNumber: string;
      projectName: string;
      recipient: string;
      date: string;
      status: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[] = [];

    filteredQuotations.forEach((q) => {
      q.quotation_items?.forEach((item) => {
        const typeId = item.type_id || 'no_type';
        if (typeId === selectedItemType) {
          details.push({
            quotationId: q.id,
            quotationNumber: q.quotation_number,
            projectName: q.project_name,
            recipient: q.recipient,
            date: q.date,
            status: q.status,
            itemName: item.name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
          });
        }
      });
    });

    return details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredQuotations, selectedItemType]);

  // Get selected item type name
  const selectedTypeName = useMemo(() => {
    if (selectedItemType === "all") return "All Types";
    if (selectedItemType === "no_type") return "No Type";
    const type = itemTypes.find(t => t.id === selectedItemType);
    return type?.name || "Unknown";
  }, [selectedItemType, itemTypes]);

  // Calculate selected type totals
  const selectedTypeTotals = useMemo(() => {
    return itemTypeDetail.reduce(
      (acc, row) => ({
        quantity: acc.quantity + row.quantity,
        totalAmount: acc.totalAmount + row.totalPrice,
      }),
      { quantity: 0, totalAmount: 0 }
    );
  }, [itemTypeDetail]);

  // Chart data for selected item type (grouped by project)
  const selectedTypeChartData = useMemo(() => {
    if (selectedItemType === "all") return [];
    
    const projectStats: Record<string, {
      projectName: string;
      quantity: number;
      totalAmount: number;
    }> = {};

    itemTypeDetail.forEach((item) => {
      if (!projectStats[item.quotationId]) {
        projectStats[item.quotationId] = {
          projectName: item.projectName.length > 20 
            ? item.projectName.substring(0, 20) + '...' 
            : item.projectName,
          quantity: 0,
          totalAmount: 0,
        };
      }
      projectStats[item.quotationId].quantity += item.quantity;
      projectStats[item.quotationId].totalAmount += item.totalPrice;
    });

    return Object.values(projectStats).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [selectedItemType, itemTypeDetail]);

  // Export report
  const handleExport = () => {
    if (!reportData.length) return;

    const exportData = [
      ['Item Types Report'],
      [`Date Range: ${format(startDate, 'PPP')} - ${format(endDate, 'PPP')}`],
      [`Status: ${statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`],
      [],
      ['Item Type', 'Quantity', 'Total Amount (IQD)', 'Quotations Count'],
      ...reportData.map((row) => [
        row.typeName,
        row.quantity,
        row.totalAmount,
        row.quotationCount,
      ]),
      [],
      ['TOTAL', totals.quantity, totals.totalAmount, totals.quotationCount],
    ];

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Item Types Report');
    XLSX.writeFile(wb, `item_types_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({ title: "Success", description: "Report exported successfully" });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground mt-1">
              View reports by item types
            </p>
          </div>
          <Button onClick={handleExport} disabled={!reportData.length}>
            <FileDown className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Date Range & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-[200px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => d && setStartDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-[200px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => d && setEndDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
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
              </div>

              {/* Item Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Item Type Detail</label>
                <Select value={selectedItemType} onValueChange={setSelectedItemType}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select item type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types (Overview)</SelectItem>
                    <SelectItem value="no_type">No Type</SelectItem>
                    {itemTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {selectedItemType === "all" ? "Total Quotations" : "Quotations with Item"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedItemType === "all" ? filteredQuotations.length : itemTypeDetail.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedItemType === "all" ? "In selected date range" : `Containing ${selectedTypeName}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedItemType === "all" ? totals.quantity.toLocaleString() : selectedTypeTotals.quantity.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedItemType === "all" ? "Across all types" : selectedTypeName}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedItemType === "all" ? totals.totalAmount.toLocaleString() : selectedTypeTotals.totalAmount.toLocaleString()} IQD
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedItemType === "all" ? "Sum of all items" : selectedTypeName}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {(selectedItemType === "all" ? reportData.length > 0 : selectedTypeChartData.length > 0) && (
          <div className="grid gap-6 md:grid-cols-2">
            {selectedItemType === "all" ? (
              /* Overview Charts */
              <>
                {/* Bar Chart - Total Amount by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Amount by Item Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div style={{ height: Math.max(300, reportData.length * 35) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={reportData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            type="number" 
                            tickFormatter={(value) => value.toLocaleString()}
                            className="text-xs"
                            scale="log"
                            domain={[1, 'auto']}
                          />
                          <YAxis 
                            type="category" 
                            dataKey="typeName" 
                            width={100}
                            className="text-xs"
                          />
                          <Tooltip 
                            formatter={(value: number) => [value.toLocaleString() + ' IQD', 'Amount']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="totalAmount" fill="#8b5cf6" radius={[0, 4, 4, 0]} minPointSize={5} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Pie Chart - Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      Distribution by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ typeName, percent }) => 
                              percent > 0.03 ? `${(percent * 100).toFixed(0)}%` : ''
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="totalAmount"
                            nameKey="typeName"
                          >
                            {reportData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [value.toLocaleString() + ' IQD', 'Amount']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Quantity Bar Chart */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Quantity by Item Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={reportData}
                          margin={{ top: 5, right: 30, left: 40, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="typeName" 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                            className="text-xs"
                          />
                          <YAxis 
                            className="text-xs" 
                            scale="log"
                            domain={[1, 'auto']}
                            allowDataOverflow
                            tickFormatter={(value) => value.toLocaleString()}
                          />
                          <Tooltip 
                            formatter={(value: number) => [value.toLocaleString(), 'Quantity']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="quantity" fill="#06b6d4" radius={[4, 4, 0, 0]} minPointSize={5} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Selected Item Type Charts */
              <>
                {/* Bar Chart - Amount by Project */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {selectedTypeName} - Amount by Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div style={{ height: Math.max(300, selectedTypeChartData.length * 40) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={selectedTypeChartData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            type="number" 
                            tickFormatter={(value) => value.toLocaleString()}
                            className="text-xs"
                          />
                          <YAxis 
                            type="category" 
                            dataKey="projectName" 
                            width={110}
                            className="text-xs"
                          />
                          <Tooltip 
                            formatter={(value: number) => [value.toLocaleString() + ' IQD', 'Amount']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="totalAmount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Pie Chart - Distribution by Project */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      {selectedTypeName} - Distribution by Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={selectedTypeChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ percent }) => 
                              percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="totalAmount"
                            nameKey="projectName"
                          >
                            {selectedTypeChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [value.toLocaleString() + ' IQD', 'Amount']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Quantity Bar Chart by Project */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {selectedTypeName} - Quantity by Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={selectedTypeChartData}
                          margin={{ top: 5, right: 30, left: 40, bottom: 80 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="projectName" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={0}
                            className="text-xs"
                          />
                          <YAxis 
                            className="text-xs"
                            tickFormatter={(value) => value.toLocaleString()}
                          />
                          <Tooltip 
                            formatter={(value: number) => [value.toLocaleString(), 'Quantity']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="quantity" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Report Table - Shows overview or detail based on selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedItemType === "all" ? (
                <>
                  <BarChart3 className="h-5 w-5" />
                  Item Types Report
                </>
              ) : (
                <>
                  <Package className="h-5 w-5" />
                  {selectedTypeName} - Detailed Report
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedItemType === "all" ? (
              /* Overview Table */
              reportData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No data found for the selected date range</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Quotations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((row) => (
                      <TableRow 
                        key={row.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedItemType(row.id)}
                      >
                        <TableCell className="font-medium">{row.typeName}</TableCell>
                        <TableCell className="text-right">{row.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">
                          {row.totalAmount.toLocaleString()} IQD
                        </TableCell>
                        <TableCell className="text-right">{row.quotationCount}</TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">{totals.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">
                        {totals.totalAmount.toLocaleString()} IQD
                      </TableCell>
                      <TableCell className="text-right">{totals.quotationCount}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )
            ) : (
              /* Detailed Report for Selected Type */
              itemTypeDetail.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No items found for this type in the selected date range</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quotation #</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemTypeDetail.map((row, index) => (
                      <TableRow key={`${row.quotationId}-${index}`}>
                        <TableCell className="font-mono text-sm">{row.quotationNumber}</TableCell>
                        <TableCell className="font-medium">{row.projectName}</TableCell>
                        <TableCell>{row.recipient}</TableCell>
                        <TableCell>{format(parseISO(row.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              row.status === 'invoiced' ? 'bg-blue-500' :
                              row.status === 'approved' ? 'bg-green-500' :
                              row.status === 'pending' ? 'bg-yellow-500' :
                              row.status === 'rejected' ? 'bg-red-500' :
                              'bg-gray-500'
                            }
                          >
                            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.itemName}</TableCell>
                        <TableCell className="text-right">{row.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{row.unitPrice.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{row.totalPrice.toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/quotations/${row.quotationId}`)}
                            title="View Quotation"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={6}>TOTAL</TableCell>
                      <TableCell className="text-right">{selectedTypeTotals.quantity.toLocaleString()}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-mono">{selectedTypeTotals.totalAmount.toLocaleString()}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

