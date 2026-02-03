import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Search, 
  Loader2, 
  ClipboardList, 
  TestTube, 
  CheckCircle, 
  Clock,
  FlaskConical,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface LabOrder {
  id: string;
  order_number: string | null;
  order_date: string;
  status: string;
  tests: any;
  notes: string | null;
  priority: string;
  sample_collected_at: string | null;
  processing_started_at: string | null;
  completed_at: string | null;
  results: any;
  patients: {
    id: string;
    name: string;
    shareable_id: string;
    gender: string;
    primary_contact: string;
  } | null;
  doctors: {
    id: string;
    doctor_id: string;
    users: { name: string };
  } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  ordered: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  sample_collected: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  processing: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  ordered: "Ordered",
  sample_collected: "Sample Collected",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function LabWorkOrderList({ hospitalData }: { hospitalData: any }) {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [resultData, setResultData] = useState<Record<string, { value: string; unit: string; normal_range: string; abnormal: boolean }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [hospitalData]);

  const fetchOrders = async () => {
    if (!hospitalData?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lab_orders")
        .select(`
          *,
          patients (id, name, shareable_id, gender, primary_contact),
          doctors (id, doctor_id, users (name))
        `)
        .eq("hospital_id", hospitalData.id)
        .order("order_date", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error("Failed to load lab orders");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.patients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.patients?.shareable_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const updateStatus = async (orderId: string, newStatus: string, additionalData: Record<string, any> = {}) => {
    try {
      const updateData: Record<string, any> = { status: newStatus, ...additionalData };
      
      if (newStatus === "sample_collected") {
        updateData.sample_collected_at = new Date().toISOString();
      } else if (newStatus === "processing") {
        updateData.processing_started_at = new Date().toISOString();
      } else if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("lab_orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
      toast.success(`Status updated to ${statusLabels[newStatus]}`);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const openResultEntry = (order: LabOrder) => {
    setSelectedOrder(order);
    
    // Initialize result data from existing results or empty
    const existingResults = order.results || {};
    const tests = Array.isArray(order.tests) ? order.tests : [];
    
    const initialResults: Record<string, { value: string; unit: string; normal_range: string; abnormal: boolean }> = {};
    tests.forEach((test: any) => {
      const testName = test.test_name || test.name || "Unknown Test";
      initialResults[testName] = existingResults[testName] || {
        value: "",
        unit: test.unit || "",
        normal_range: test.normal_range || "",
        abnormal: false,
      };
    });
    
    setResultData(initialResults);
    setIsResultDialogOpen(true);
  };

  const handleResultChange = (testName: string, field: string, value: any) => {
    setResultData((prev) => ({
      ...prev,
      [testName]: {
        ...prev[testName],
        [field]: value,
      },
    }));
  };

  const saveResults = async () => {
    if (!selectedOrder) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("lab_orders")
        .update({
          results: resultData,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;
      
      toast.success("Results saved successfully");
      setIsResultDialogOpen(false);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to save results");
    } finally {
      setSaving(false);
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
          <h2 className="text-2xl font-bold">Lab Work Orders</h2>
          <p className="text-muted-foreground">Track sample collection and processing</p>
        </div>
        <Button onClick={fetchOrders} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{orders.filter(o => o.status === "pending" || o.status === "ordered").length}</p>
                <p className="text-xs text-muted-foreground">Pending Collection</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{orders.filter(o => o.status === "sample_collected").length}</p>
                <p className="text-xs text-muted-foreground">Samples Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{orders.filter(o => o.status === "processing").length}</p>
                <p className="text-xs text-muted-foreground">In Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{orders.filter(o => o.status === "completed").length}</p>
                <p className="text-xs text-muted-foreground">Completed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, ID, or order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="sample_collected">Sample Collected</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No work orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const tests = Array.isArray(order.tests) ? order.tests : [];
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number || order.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.patients?.name}</p>
                          <p className="text-xs text-muted-foreground">{order.patients?.shareable_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tests.slice(0, 2).map((test: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {test.test_name || test.name}
                            </Badge>
                          ))}
                          {tests.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{tests.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.order_date ? format(new Date(order.order_date), "dd/MM/yyyy HH:mm") : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.priority === "urgent" ? "destructive" : "secondary"}>
                          {order.priority || "Normal"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status] || statusColors.pending}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {order.status === "pending" || order.status === "ordered" ? (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(order.id, "sample_collected")}
                          >
                            <TestTube className="h-4 w-4 mr-1" />
                            Collect Sample
                          </Button>
                        ) : order.status === "sample_collected" ? (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(order.id, "processing")}
                          >
                            <FlaskConical className="h-4 w-4 mr-1" />
                            Start Processing
                          </Button>
                        ) : order.status === "processing" ? (
                          <Button
                            size="sm"
                            onClick={() => openResultEntry(order)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Enter Results
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openResultEntry(order)}
                          >
                            View Results
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Result Entry Dialog */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder?.status === "completed" ? "View Results" : "Enter Lab Results"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">{selectedOrder.patients?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patient ID</p>
                  <p className="font-medium">{selectedOrder.patients?.shareable_id}</p>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(resultData).map(([testName, data]) => (
                  <Card key={testName}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">{testName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Result Value</Label>
                          <Input
                            value={data.value}
                            onChange={(e) => handleResultChange(testName, "value", e.target.value)}
                            placeholder="Enter value"
                            disabled={selectedOrder.status === "completed"}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Unit</Label>
                          <Input
                            value={data.unit}
                            onChange={(e) => handleResultChange(testName, "unit", e.target.value)}
                            placeholder="e.g., mg/dL"
                            disabled={selectedOrder.status === "completed"}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Normal Range</Label>
                          <Input
                            value={data.normal_range}
                            onChange={(e) => handleResultChange(testName, "normal_range", e.target.value)}
                            placeholder="e.g., 70-100"
                            disabled={selectedOrder.status === "completed"}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`abnormal-${testName}`}
                          checked={data.abnormal}
                          onChange={(e) => handleResultChange(testName, "abnormal", e.target.checked)}
                          disabled={selectedOrder.status === "completed"}
                          className="rounded"
                        />
                        <Label htmlFor={`abnormal-${testName}`} className="text-sm cursor-pointer">
                          Mark as abnormal
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>
              {selectedOrder?.status === "completed" ? "Close" : "Cancel"}
            </Button>
            {selectedOrder?.status !== "completed" && (
              <Button onClick={saveResults} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Results
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
