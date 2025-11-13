import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, DollarSign, ClipboardList, Users, Calendar, TrendingUp, Download, Printer } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HospitalDashboardProps {
  user?: any;
}

// Mock data
const mockConsultants = [
  { id: "doc_001", name: "Dr. Amit Sharma", avatarUrl: null, revenue: 37500, appointments: 12 },
  { id: "doc_002", name: "Dr. Priya Verma", avatarUrl: null, revenue: 42000, appointments: 15 },
  { id: "doc_003", name: "Dr. Rajesh Kumar", avatarUrl: null, revenue: 28500, appointments: 9 },
  { id: "doc_004", name: "Dr. Anita Desai", avatarUrl: null, revenue: 51000, appointments: 18 },
];

const mockAppointmentsData = [
  { date: "Nov 1", count: 12 },
  { date: "Nov 2", count: 18 },
  { date: "Nov 3", count: 15 },
  { date: "Nov 4", count: 22 },
  { date: "Nov 5", count: 19 },
  { date: "Nov 6", count: 25 },
  { date: "Nov 7", count: 21 },
  { date: "Nov 8", count: 28 },
  { date: "Nov 9", count: 24 },
  { date: "Nov 10", count: 30 },
  { date: "Nov 11", count: 26 },
  { date: "Nov 12", count: 32 },
  { date: "Nov 13", count: 29 },
];

export default function HospitalDashboard({ user }: HospitalDashboardProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [timeRange, setTimeRange] = useState("week");
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="p-4 md:p-6 space-y-6 mv-header">
      {/* Header with Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hospital Dashboard</h1>
          <p className="text-muted-foreground">Monitor appointments, consultants, and operations</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients, doctors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Consultant Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Top Consultants</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockConsultants.map((consultant) => (
            <Card key={consultant.id} className="mv-consultant-card hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {consultant.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{consultant.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">Consultant</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-semibold">₹{consultant.revenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Appointments</span>
                  <Badge variant="secondary">{consultant.appointments}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mv-stats">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending</span>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Received</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">5</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Treatment Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Ongoing</span>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">2</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Complete</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">3</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">20</div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-muted-foreground">Old: 12</span>
              <span className="text-muted-foreground">New: 8</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">54</div>
            <div className="flex items-center gap-2 mt-2 text-sm text-green-600 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span>+12% from last week</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments Chart and Report Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments Chart */}
        <Card className="lg:col-span-2 mv-appointments-chart">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Appointments Overview</CardTitle>
              <Select value={timeRange} onValueChange={setTimeRange}>
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
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockAppointmentsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Report Panel */}
        <Card className="mv-report-panel">
          <CardHeader>
            <CardTitle className="text-base">Appointment Report</CardTitle>
            <CardDescription>Generate custom reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Doctor</label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  {mockConsultants.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 pt-2">
              <Button className="w-full" variant="default">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <Button className="w-full" variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Table */}
      <Card className="mv-metrics-table">
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
          <CardDescription>Performance indicators for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Avg Waiting Time</span>
              </div>
              <div className="text-2xl font-bold">4m 0s</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Avg Engaged Time</span>
              </div>
              <div className="text-2xl font-bold">15m 0s</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ClipboardList className="h-4 w-4" />
                <span className="text-xs">Avg Time/Patient</span>
              </div>
              <div className="text-2xl font-bold">19m 0s</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Missed Appointments</span>
              </div>
              <div className="text-2xl font-bold">1</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Cancelled</span>
              </div>
              <div className="text-2xl font-bold">0</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}