import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Loader2 } from "lucide-react";

export default function InventoryView({ hospitalData }: { hospitalData: any }) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, [hospitalData]);

  const fetchInventory = async () => {
    if (!hospitalData?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pharmacy_inventory')
        .select('*')
        .eq('hospital_id', hospitalData.id)
        .order('medicine_name', { ascending: true });

      if (error) throw error;
      setInventory(data || []);
    } catch (error: any) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.generic_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-muted-foreground">View and manage medicine stock</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Medicine
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine Name</TableHead>
                <TableHead>Generic Name</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.medicine_name}</TableCell>
                  <TableCell>{item.generic_name}</TableCell>
                  <TableCell>{item.batch_number}</TableCell>
                  <TableCell>{item.expiry_date}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>₹{item.unit_price}</TableCell>
                  <TableCell>
                    <Badge variant={item.quantity <= item.reorder_level ? 'destructive' : 'default'}>
                      {item.quantity <= item.reorder_level ? 'Low Stock' : 'In Stock'}
                    </Badge>
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
