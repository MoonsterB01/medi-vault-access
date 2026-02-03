import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  BarChart3, Users, IndianRupee, Package, 
  Download, Loader2, TrendingUp, TrendingDown,
  Calendar, Activity
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function ReportsPage({ hospitalData }: { hospitalData: any }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [stats, setStats] = useState({
    totalPatients: 0,
    newPatients: 0,
    totalRevenue: 0,
    pendingDues: 0,
    opdVisits: 0,
    ipdAdmissions: 0,
    labOrders: 0,
    pharmacySales: 0,
  });
  const [patientsByGender, setPatientsByGender] = useState<any[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<any[]>([]);
  const [visitsByDay, setVisitsByDay] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState({
    totalItems: 0,
    lowStock: 0,
    expiringItems: 0,
    totalValue: 0,
  });

  useEffect(() => {
    fetchReports();
  }, [hospitalData, dateRange]);

  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case "week":
        return { start: startOfWeek(today), end: endOfWeek(today) };
      case "month":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "year":
        return { start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear(), 11, 31) };
      default:
        return { start: subDays(today, 30), end: today };
    }
  };

  const fetchReports = async () => {
    if (!hospitalData?.id) return;
    
    setLoading(true);
    const { start, end } = getDateRange();
    const startDate = format(start, "yyyy-MM-dd");
    const endDate = format(end, "yyyy-MM-dd");

    try {
      // Fetch patient stats
      const { data: patients, count: totalPatients } = await supabase
        .from("patients")
        .select("id, gender, created_at", { count: "exact" })
        .eq("hospital_id", hospitalData.id);

      const newPatients = patients?.filter(p => 
        new Date(p.created_at) >= start && new Date(p.created_at) <= end
      ).length || 0;

      // Gender distribution
      const genderCounts: Record<string, number> = {};
      patients?.forEach(p => {
        const gender = p.gender || "Unknown";
        genderCounts[gender] = (genderCounts[gender] || 0) + 1;
      });
      setPatientsByGender(Object.entries(genderCounts).map(([name, value]) => ({ name, value })));

      // Fetch billing stats
      const { data: billings } = await supabase
        .from("billing")
        .select("total_amount, paid_amount, balance_amount, bill_date")
        .eq("hospital_id", hospitalData.id)
        .gte("bill_date", startDate)
        .lte("bill_date", endDate);

      const totalRevenue = billings?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) || 0;
      const pendingDues = billings?.reduce((sum, b) => sum + (b.balance_amount || 0), 0) || 0;

      // Revenue by day
      const revenueMap: Record<string, number> = {};
      billings?.forEach(b => {
        const day = format(new Date(b.bill_date), "dd MMM");
        revenueMap[day] = (revenueMap[day] || 0) + (b.paid_amount || 0);
      });
      setRevenueByDay(Object.entries(revenueMap).map(([date, amount]) => ({ date, amount })).slice(-7));

      // Fetch OPD visits
      const { count: opdCount } = await supabase
        .from("opd_visits")
        .select("id", { count: "exact" })
        .eq("hospital_id", hospitalData.id)
        .gte("visit_date", startDate)
        .lte("visit_date", endDate);

      // Fetch IPD admissions
      const { count: ipdCount } = await supabase
        .from("ipd_admissions")
        .select("id", { count: "exact" })
        .eq("hospital_id", hospitalData.id)
        .gte("admission_date", startDate)
        .lte("admission_date", endDate);

      // Fetch lab orders
      const { count: labCount } = await supabase
        .from("lab_orders")
        .select("id", { count: "exact" })
        .eq("hospital_id", hospitalData.id)
        .gte("order_date", startDate)
        .lte("order_date", endDate);

      // Fetch pharmacy inventory
      const { data: inventory } = await supabase
        .from("pharmacy_inventory")
        .select("quantity, unit_price, reorder_level, expiry_date")
        .eq("hospital_id", hospitalData.id);

      const inventoryCalc = {
        totalItems: inventory?.length || 0,
        lowStock: inventory?.filter(i => (i.quantity || 0) <= (i.reorder_level || 10)).length || 0,
        expiringItems: inventory?.filter(i => {
          if (!i.expiry_date) return false;
          const expDate = new Date(i.expiry_date);
          const threeMonths = new Date();
          threeMonths.setMonth(threeMonths.getMonth() + 3);
          return expDate <= threeMonths;
        }).length || 0,
        totalValue: inventory?.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unit_price || 0)), 0) || 0,
      };

      setStats({
        totalPatients: totalPatients || 0,
        newPatients,
        totalRevenue,
        pendingDues,
        opdVisits: opdCount || 0,
        ipdAdmissions: ipdCount || 0,
        labOrders: labCount || 0,
        pharmacySales: 0,
      });

      setInventoryStats(inventoryCalc);
    } catch (error: any) {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-muted-foreground">Hospital performance insights</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Period:</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-2xl font-bold">{stats.totalPatients}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{stats.newPatients} new
                </p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{stats.pendingDues.toLocaleString()} pending
                </p>
              </div>
              <IndianRupee className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">OPD Visits</p>
                <p className="text-2xl font-bold">{stats.opdVisits}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.ipdAdmissions} IPD admissions
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lab Orders</p>
                <p className="text-2xl font-bold">{stats.labOrders}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This period
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="patients">
        <TabsList>
          <TabsTrigger value="patients">Patient Analytics</TabsTrigger>
          <TabsTrigger value="financial">Financial Reports</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patients by Gender</CardTitle>
              </CardHeader>
              <CardContent>
                {patientsByGender.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={patientsByGender}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {patientsByGender.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No patient data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visit Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">OPD Visits</p>
                      <p className="text-xl font-bold">{stats.opdVisits}</p>
                    </div>
                    <Activity className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">IPD Admissions</p>
                      <p className="text-xl font-bold">{stats.ipdAdmissions}</p>
                    </div>
                    <Calendar className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">New Patients</p>
                      <p className="text-xl font-bold">{stats.newPatients}</p>
                    </div>
                    <Users className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="mt-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value}`, "Revenue"]} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No revenue data available
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Collected</span>
                      <span className="font-medium text-green-500">₹{stats.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending Dues</span>
                      <span className="font-medium text-red-500">₹{stats.pendingDues.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-4">
                      <span className="font-medium">Total Billed</span>
                      <span className="font-bold">₹{(stats.totalRevenue + stats.pendingDues).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Collection Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center h-32">
                    <p className="text-4xl font-bold text-primary">
                      {((stats.totalRevenue / (stats.totalRevenue + stats.pendingDues)) * 100 || 0).toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Payment collection rate</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <Package className="h-8 w-8 mx-auto text-primary opacity-80 mb-2" />
                <p className="text-2xl font-bold">{inventoryStats.totalItems}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/50">
              <CardContent className="pt-6 text-center">
                <TrendingDown className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold text-yellow-500">{inventoryStats.lowStock}</p>
                <p className="text-sm text-muted-foreground">Low Stock</p>
              </CardContent>
            </Card>
            <Card className="border-red-500/50">
              <CardContent className="pt-6 text-center">
                <Calendar className="h-8 w-8 mx-auto text-red-500 mb-2" />
                <p className="text-2xl font-bold text-red-500">{inventoryStats.expiringItems}</p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <IndianRupee className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">₹{inventoryStats.totalValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Stock Value</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
