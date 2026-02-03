import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Loader2, FileText, Eye, Download } from "lucide-react";
import { format } from "date-fns";

interface LabOrder {
  id: string;
  order_number: string | null;
  order_date: string;
  status: string;
  tests: any;
  results: any;
  completed_at: string | null;
  patients: {
    id: string;
    name: string;
    shareable_id: string;
  } | null;
  doctors: {
    id: string;
    users: { name: string };
  } | null;
}

export default function LabHistory({ hospitalData }: { hospitalData: any }) {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchCompletedOrders();
  }, [hospitalData]);

  const fetchCompletedOrders = async () => {
    if (!hospitalData?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lab_orders")
        .select(`
          *,
          patients (id, name, shareable_id),
          doctors (id, users (name))
        `)
        .eq("hospital_id", hospitalData.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error("Failed to load lab history");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) =>
    order.patients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.patients?.shareable_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const viewResults = (order: LabOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
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
      <div>
        <h2 className="text-2xl font-bold">Lab History</h2>
        <p className="text-muted-foreground">View completed lab test results</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name, ID, or order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? "No results found" : "No completed lab tests yet"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Completed Date</TableHead>
                  <TableHead>Doctor</TableHead>
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
                        {order.completed_at ? format(new Date(order.completed_at), "dd/MM/yyyy HH:mm") : "-"}
                      </TableCell>
                      <TableCell>
                        {order.doctors?.users?.name || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => viewResults(order)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Results
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Results View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab Test Results</DialogTitle>
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
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="font-medium">{selectedOrder.order_number || selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="font-medium">
                    {selectedOrder.completed_at ? format(new Date(selectedOrder.completed_at), "dd/MM/yyyy HH:mm") : "-"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Test Results</h4>
                {selectedOrder.results && Object.keys(selectedOrder.results).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test Name</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Normal Range</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(selectedOrder.results).map(([testName, result]: [string, any]) => (
                        <TableRow key={testName}>
                          <TableCell className="font-medium">{testName}</TableCell>
                          <TableCell className={result.abnormal ? "text-red-500 font-semibold" : ""}>
                            {result.value}
                          </TableCell>
                          <TableCell>{result.unit || "-"}</TableCell>
                          <TableCell>{result.normal_range || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={result.abnormal ? "destructive" : "default"}>
                              {result.abnormal ? "Abnormal" : "Normal"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No results recorded</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
