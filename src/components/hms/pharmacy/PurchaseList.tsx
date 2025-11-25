import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Edit, Trash2, MoreHorizontal, Download } from "lucide-react";
import { format } from "date-fns";

interface Supplier {
  id: string;
  supplier_name: string;
  gstin: string;
}

interface PurchaseRecord {
  id: string;
  purchase_number: string;
  purchase_date: string;
  invoice_number: string;
  invoice_date: string;
  net_amount: number;
  bill_status: string;
  refund_status: string;
  payment_status: string;
  paid_amount: number;
  items: any;
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  discount_amount: number;
  notes: string | null;
  supplier: {
    id: string;
    supplier_name: string;
    gstin: string;
    contact_person: string;
    phone: string;
  };
}

export default function PurchaseList({ hospitalData }: { hospitalData: any }) {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const { toast } = useToast();

  // Filter states
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    supplierId: "all",
    purchaseNumber: "",
  });

  useEffect(() => {
    fetchSuppliers();
    fetchPurchases();
  }, [hospitalData?.id]);

  useEffect(() => {
    applyFilters();
  }, [filters, purchases]);

  const fetchSuppliers = async () => {
    if (!hospitalData?.id) return;

    try {
      const { data, error } = await supabase
        .from("pharmacy_suppliers")
        .select("id, supplier_name, gstin")
        .eq("hospital_id", hospitalData.id)
        .eq("is_active", true)
        .order("supplier_name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchPurchases = async () => {
    if (!hospitalData?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pharmacy_purchases")
        .select(`
          *,
          supplier:pharmacy_suppliers (
            id,
            supplier_name,
            gstin,
            contact_person,
            phone
          )
        `)
        .eq("hospital_id", hospitalData.id)
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
      setFilteredPurchases(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...purchases];

    if (filters.fromDate) {
      filtered = filtered.filter(
        (purchase) =>
          new Date(purchase.purchase_date) >= new Date(filters.fromDate)
      );
    }

    if (filters.toDate) {
      filtered = filtered.filter(
        (purchase) =>
          new Date(purchase.purchase_date) <= new Date(filters.toDate)
      );
    }

    if (filters.supplierId && filters.supplierId !== "all") {
      filtered = filtered.filter(
        (purchase) => purchase.supplier.id === filters.supplierId
      );
    }

    if (filters.purchaseNumber) {
      filtered = filtered.filter((purchase) =>
        purchase.purchase_number
          .toLowerCase()
          .includes(filters.purchaseNumber.toLowerCase())
      );
    }

    setFilteredPurchases(filtered);
    setCurrentPage(1);
  };

  const handleGenerate = () => {
    applyFilters();
    toast({
      title: "Filters Applied",
      description: `Found ${filteredPurchases.length} purchase records`,
    });
  };

  const handleClear = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      supplierId: "all",
      purchaseNumber: "",
    });
    setFilteredPurchases(purchases);
    setCurrentPage(1);
  };

  const handleView = (purchase: PurchaseRecord) => {
    setSelectedPurchase(purchase);
    setViewDialogOpen(true);
  };

  const handleExportCSV = () => {
    const headers = [
      "S.No.",
      "Purchase No.",
      "Purchase Date",
      "Bill No.",
      "Bill Date",
      "GSTIN",
      "Supplier Name",
      "Net Amount",
      "Bill Status",
      "Refund Status",
      "Payment Status",
    ];

    const rows = filteredPurchases.map((purchase, index) => [
      index + 1,
      purchase.purchase_number,
      format(new Date(purchase.purchase_date), "dd/MM/yyyy"),
      purchase.invoice_number,
      format(new Date(purchase.invoice_date), "dd/MM/yyyy"),
      purchase.supplier.gstin || "-",
      purchase.supplier.supplier_name,
      purchase.net_amount,
      purchase.bill_status,
      purchase.refund_status,
      purchase.payment_status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-list-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Purchase list exported successfully",
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPurchases = filteredPurchases.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Purchase List Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) =>
                  setFilters({ ...filters, fromDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) =>
                  setFilters({ ...filters, toDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Select
                value={filters.supplierId}
                onValueChange={(value) =>
                  setFilters({ ...filters, supplierId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search Purchase Number</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={filters.purchaseNumber}
                  onChange={(e) =>
                    setFilters({ ...filters, purchaseNumber: e.target.value })
                  }
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
            <Button onClick={handleGenerate}>Generate</Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredPurchases.length)} of{" "}
              {filteredPurchases.length} records
            </div>
            <div className="flex items-center gap-2">
              <Label>Rows per page:</Label>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No.</TableHead>
                  <TableHead>Purchase No.</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Bill Date</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Bill Status</TableHead>
                  <TableHead>Refund Status</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : currentPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No purchase records found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentPurchases.map((purchase, index) => (
                    <TableRow key={purchase.id}>
                      <TableCell>{startIndex + index + 1}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {purchase.purchase_number}
                      </TableCell>
                      <TableCell>
                        {format(new Date(purchase.purchase_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{purchase.invoice_number}</TableCell>
                      <TableCell>
                        {format(new Date(purchase.invoice_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {purchase.supplier.gstin || "-"}
                      </TableCell>
                      <TableCell>{purchase.supplier.supplier_name}</TableCell>
                      <TableCell className="font-semibold">
                        ₹{purchase.net_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            purchase.bill_status === "completed"
                              ? "bg-green-100 text-green-800"
                              : purchase.bill_status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {purchase.bill_status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            purchase.refund_status === "none"
                              ? "bg-gray-100 text-gray-800"
                              : purchase.refund_status === "partial"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {purchase.refund_status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            purchase.payment_status === "paid"
                              ? "bg-green-100 text-green-800"
                              : purchase.payment_status === "partial"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {purchase.payment_status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleView(purchase)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Purchase Details - {selectedPurchase?.purchase_number}
            </DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Supplier Name</Label>
                  <p className="font-medium">
                    {selectedPurchase.supplier.supplier_name}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">GSTIN</Label>
                  <p className="font-mono text-sm">
                    {selectedPurchase.supplier.gstin || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Contact Person</Label>
                  <p className="font-medium">
                    {selectedPurchase.supplier.contact_person || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">
                    {selectedPurchase.supplier.phone || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Purchase Date</Label>
                  <p className="font-medium">
                    {format(
                      new Date(selectedPurchase.purchase_date),
                      "dd/MM/yyyy"
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Invoice Number</Label>
                  <p className="font-medium">{selectedPurchase.invoice_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Invoice Date</Label>
                  <p className="font-medium">
                    {format(
                      new Date(selectedPurchase.invoice_date),
                      "dd/MM/yyyy"
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Status</Label>
                  <p className="font-medium capitalize">
                    {selectedPurchase.payment_status}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-lg font-semibold mb-2 block">
                  Purchased Items
                </Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedPurchase.items || []).map(
                      (item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.medicine_name}</TableCell>
                          <TableCell>{item.batch_number}</TableCell>
                          <TableCell>
                            {item.expiry_date
                              ? format(new Date(item.expiry_date), "MM/yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{item.unit_price}</TableCell>
                          <TableCell>
                            ₹{(item.quantity * item.unit_price).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{selectedPurchase.subtotal.toFixed(2)}</span>
                </div>
                {selectedPurchase.cgst_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>CGST:</span>
                    <span>₹{selectedPurchase.cgst_amount.toFixed(2)}</span>
                  </div>
                )}
                {selectedPurchase.sgst_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>SGST:</span>
                    <span>₹{selectedPurchase.sgst_amount.toFixed(2)}</span>
                  </div>
                )}
                {selectedPurchase.igst_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>IGST:</span>
                    <span>₹{selectedPurchase.igst_amount.toFixed(2)}</span>
                  </div>
                )}
                {selectedPurchase.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-₹{selectedPurchase.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg">
                  <span>Net Amount:</span>
                  <span>₹{selectedPurchase.net_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid Amount:</span>
                  <span>₹{selectedPurchase.paid_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Balance:</span>
                  <span>
                    ₹
                    {(
                      selectedPurchase.net_amount - selectedPurchase.paid_amount
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedPurchase.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1">{selectedPurchase.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
