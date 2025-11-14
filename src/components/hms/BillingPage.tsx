import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";

export default function BillingPage({ hospitalData }: { hospitalData: any }) {
  const [bills, setBills] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchBills();
  }, [hospitalData]);

  const fetchBills = async () => {
    if (!hospitalData?.id) return;

    try {
      const { data, error } = await supabase
        .from('billing')
        .select('*, patients(name)')
        .eq('hospital_id', hospitalData.id)
        .order('bill_date', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error: any) {
      toast.error('Failed to load bills');
    }
  };

  const filteredBills = bills.filter(bill =>
    bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.patients?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Billing Management</h2>
          <p className="text-muted-foreground">Manage patient bills and payments</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Bill
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by bill number or patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill Number</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{bill.bill_number}</TableCell>
                  <TableCell>{bill.patients?.name}</TableCell>
                  <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                  <TableCell>₹{bill.total_amount}</TableCell>
                  <TableCell>₹{bill.paid_amount}</TableCell>
                  <TableCell>₹{bill.balance_amount}</TableCell>
                  <TableCell>
                    <Badge variant={bill.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {bill.payment_status}
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
