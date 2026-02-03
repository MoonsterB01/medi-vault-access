import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Loader2, Pencil, Trash2, AlertTriangle } from "lucide-react";
import AddMedicineDialog from "./AddMedicineDialog";
import { format } from "date-fns";

interface Medicine {
  id: string;
  medicine_name: string;
  generic_name: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  quantity: number | null;
  unit_price: number | null;
  reorder_level: number | null;
  manufacturer: string | null;
}

export default function InventoryView({ hospitalData }: { hospitalData: any }) {
  const [inventory, setInventory] = useState<Medicine[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

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
    item.generic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.batch_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = inventory.filter(item => 
    (item.quantity || 0) <= (item.reorder_level || 10)
  ).length;

  const expiringCount = inventory.filter(item => {
    if (!item.expiry_date) return false;
    const expiryDate = new Date(item.expiry_date);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expiryDate <= threeMonthsFromNow;
  }).length;

  const handleEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingMedicine(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this medicine?")) return;

    try {
      const { error } = await supabase
        .from('pharmacy_inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Medicine deleted successfully');
      fetchInventory();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete medicine');
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
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-muted-foreground">View and manage medicine stock</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Medicine
        </Button>
      </div>

      {/* Alert Cards */}
      {(lowStockCount > 0 || expiringCount > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {lowStockCount > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium text-yellow-600 dark:text-yellow-400">Low Stock Alert</p>
                    <p className="text-sm text-muted-foreground">{lowStockCount} items below reorder level</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {expiringCount > 0 && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-600 dark:text-red-400">Expiry Alert</p>
                    <p className="text-sm text-muted-foreground">{expiringCount} items expiring within 3 months</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No medicines found" : "No medicines in inventory"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => {
                  const isLowStock = (item.quantity || 0) <= (item.reorder_level || 10);
                  const isExpiring = item.expiry_date && new Date(item.expiry_date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.medicine_name}</TableCell>
                      <TableCell>{item.generic_name || "-"}</TableCell>
                      <TableCell>{item.batch_number || "-"}</TableCell>
                      <TableCell>
                        {item.expiry_date ? (
                          <span className={isExpiring ? "text-red-500" : ""}>
                            {format(new Date(item.expiry_date), "MMM yyyy")}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{item.quantity ?? 0}</TableCell>
                      <TableCell>₹{item.unit_price ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={isLowStock ? 'destructive' : 'default'}>
                          {isLowStock ? 'Low Stock' : 'In Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddMedicineDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        hospitalId={hospitalData.id}
        onSuccess={fetchInventory}
        editingMedicine={editingMedicine}
      />
    </div>
  );
}
