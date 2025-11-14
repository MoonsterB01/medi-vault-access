import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function LaboratoryPage({ hospitalData }: { hospitalData: any }) {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
  }, [hospitalData]);

  const fetchOrders = async () => {
    if (!hospitalData?.id) return;

    try {
      const { data, error } = await supabase
        .from('lab_orders')
        .select('*, patients(name), doctors(users(name))')
        .eq('hospital_id', hospitalData.id)
        .order('order_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error('Failed to load lab orders');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Laboratory Management</h2>
          <p className="text-muted-foreground">Manage lab tests and orders</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Lab Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Tests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.patients?.name}</TableCell>
                  <TableCell>{new Date(order.order_date).toLocaleString()}</TableCell>
                  <TableCell>{order.doctors?.users?.name || 'N/A'}</TableCell>
                  <TableCell>{Array.isArray(order.tests) ? order.tests.length : 0} tests</TableCell>
                  <TableCell>
                    <Badge variant={
                      order.status === 'completed' ? 'default' :
                      order.status === 'pending' ? 'secondary' : 'outline'
                    }>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
