import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, DollarSign, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getQuotations, getVendors, getLatestExchangeRate } from "@/lib/storage";

export default function Index() {
  const navigate = useNavigate();

  const { data: exchangeRateData } = useQuery({
    queryKey: ['latestExchangeRate'],
    queryFn: getLatestExchangeRate,
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ['quotations'],
    queryFn: getQuotations,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: getVendors,
  });

  const exchangeRate = exchangeRateData?.rate || 1;

  // Calculate stats
  const invoicedQuotations = quotations.filter(q => q.status === 'invoiced');
  const totalProfit = invoicedQuotations.reduce((sum, quote) => {
    const itemsTotal = quote.quotation_items?.reduce((itemSum, item) => itemSum + Number(item.total_price), 0) || 0;
    
    // Apply discount (now stored as amount, not percentage)
    const finalTotal = itemsTotal - Number(quote.discount);
    
    const vendorCostInIQD = quote.vendor_currency_type === 'usd' 
      ? Number(quote.vendor_cost) * exchangeRate 
      : Number(quote.vendor_cost);
    
    const finalTotalInIQD = quote.currency_type === 'usd' 
      ? finalTotal * exchangeRate 
      : finalTotal;

    return sum + (finalTotalInIQD - vendorCostInIQD);
  }, 0);

  const approvedQuotes = quotations.filter(q => q.status === 'approved' || q.status === 'invoiced').length;
  const totalQuotes = quotations.length;
  const conversionRate = totalQuotes ? ((approvedQuotes / totalQuotes) * 100).toFixed(1) : '0';

  const dashboardStats = [
    {
      title: "Total Quotations",
      value: quotations.length.toString(),
      icon: FileText,
      description: "Active quotations in the system",
    },
    {
      title: "Active Vendors",
      value: vendors.length.toString(),
      icon: Users,
      description: "Vendors in the system",
    },
    {
      title: "Total Profit",
      value: `${totalProfit.toLocaleString()} IQD`,
      icon: DollarSign,
      description: "Net profit from invoiced quotations",
    },
    {
      title: "Approval Rate",
      value: `${conversionRate}%`,
      icon: Activity,
      description: "Quotations approved or invoiced vs total",
    },
  ];

  const handleCreateQuotation = () => {
    navigate("/quotations/new");
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your quotation management system
          </p>
        </div>
        <Button onClick={handleCreateQuotation}>Create New Quotation</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}


