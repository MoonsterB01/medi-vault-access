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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Download, 
  Printer, 
  Eye, 
  MoreHorizontal
} from "lucide-react";
import { format } from "date-fns";

interface BillingRecord {
  id: string;
  bill_number: string;
  bill_date: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string;
  invoice_items: any;
  notes: string | null;
  patient: {
    id: string;
    shareable_id: string;
    name: string;
    primary_contact: string;
  };
}

export default function LabBillingHistory({ hospitalData }: { hospitalData: any }) {
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [filteredBills, setFilteredBills] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedBill, setSelectedBill] = useState<BillingRecord | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const { toast } = useToast();

  // Filter states
  const [filters, setFilters] = useState({
    patientName: "",
    fromDate: "",
    toDate: "",
    billNumber: "",
  });

  useEffect(() => {
    fetchBills();
  }, [hospitalData?.id]);

  useEffect(() => {
    applyFilters();
  }, [filters, bills]);

  const fetchBills = async () => {
    if (!hospitalData?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("billing")
        .select(`
          *,
          patient:patients (
            id,
            shareable_id,
            name,
            primary_contact
          )
        `)
        .eq("hospital_id", hospitalData.id)
        .like("bill_number", "LAB-BILL%")
        .order("bill_date", { ascending: false });

      if (error) throw error;
      setBills(data || []);
      setFilteredBills(data || []);
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
    let filtered = [...bills];

    if (filters.patientName) {
      filtered = filtered.filter((bill) =>
        bill.patient.name.toLowerCase().includes(filters.patientName.toLowerCase())
      );
    }

    if (filters.fromDate) {
      filtered = filtered.filter(
        (bill) => new Date(bill.bill_date) >= new Date(filters.fromDate)
      );
    }

    if (filters.toDate) {
      filtered = filtered.filter(
        (bill) => new Date(bill.bill_date) <= new Date(filters.toDate)
      );
    }

    if (filters.billNumber) {
      filtered = filtered.filter((bill) =>
        bill.bill_number.toLowerCase().includes(filters.billNumber.toLowerCase())
      );
    }

    setFilteredBills(filtered);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      patientName: "",
      fromDate: "",
      toDate: "",
      billNumber: "",
    });
  };

  const calculateTaxAmount = (items: any[] = []) => {
    return items.reduce((total, item) => {
      const price = parseFloat(item.price || 0);
      const cgst = parseFloat(item.cgst || 0);
      const sgst = parseFloat(item.sgst || 0);
      const discount = parseFloat(item.discount || 0);
      
      let itemPrice = price;
      if (item.discount_type === "percentage") {
        itemPrice -= (price * discount) / 100;
      } else {
        itemPrice -= discount;
      }
      
      return total + (itemPrice * (cgst + sgst)) / 100;
    }, 0);
  };

  const calculateDiscountAmount = (items: any[] = []) => {
    return items.reduce((total, item) => {
      const price = parseFloat(item.price || 0);
      const discount = parseFloat(item.discount || 0);
      
      if (item.discount_type === "percentage") {
        return total + (price * discount) / 100;
      }
      return total + discount;
    }, 0);
  };

  const handleExportCSV = () => {
    const headers = [
      "S.No.",
      "Bill No.",
      "Date",
      "Bill Amount",
      "Discount Amount",
      "Tax Amount",
      "Total Amount",
      "Remaining/Waived Off",
      "Paid Amount",
      "Status",
    ];

    const rows = filteredBills.map((bill, index) => {
      const taxAmount = calculateTaxAmount(bill.invoice_items);
      const discountAmount = calculateDiscountAmount(bill.invoice_items);
      return [
        index + 1,
        bill.bill_number,
        format(new Date(bill.bill_date), "dd/MM/yyyy"),
        bill.total_amount,
        discountAmount.toFixed(2),
        taxAmount.toFixed(2),
        bill.total_amount,
        bill.balance_amount,
        bill.paid_amount,
        bill.payment_status,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lab-billing-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Lab billing history exported successfully",
    });
  };

  const handlePrint = (bill: BillingRecord) => {
    window.print();
    toast({
      title: "Print",
      description: `Printing bill ${bill.bill_number}`,
    });
  };

  const handleView = (bill: BillingRecord) => {
    setSelectedBill(bill);
    setViewDialogOpen(true);
  };

  // Pagination
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBills = filteredBills.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Lab Billing History</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Patient Name</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={filters.patientName}
                  onChange={(e) =>
                    setFilters({ ...filters, patientName: e.target.value })
                  }
                  className="pl-8"
                />
              </div>
            </div>

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
              <Label>Bill Number</Label>
              <Input
                placeholder="Search by bill no..."
                value={filters.billNumber}
                onChange={(e) =>
                  setFilters({ ...filters, billNumber: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredBills.length)} of {filteredBills.length} records
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
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Bill Amount</TableHead>
                  <TableHead>Discount Amount</TableHead>
                  <TableHead>Tax Amount</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Remaining/Waived Off</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : currentBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No billing records found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentBills.map((bill, index) => {
                    const taxAmount = calculateTaxAmount(bill.invoice_items);
                    const discountAmount = calculateDiscountAmount(bill.invoice_items);
                    return (
                      <TableRow key={bill.id}>
                        <TableCell>{startIndex + index + 1}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {bill.bill_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(bill.bill_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>₹{bill.total_amount.toFixed(2)}</TableCell>
                        <TableCell>₹{discountAmount.toFixed(2)}</TableCell>
                        <TableCell>₹{taxAmount.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">₹{bill.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <div>
                            <div>₹{bill.balance_amount.toFixed(2)}</div>
                            {bill.notes?.includes("waived") && (
                              <div className="text-xs text-muted-foreground">
                                (Waived)
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>₹{bill.paid_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              bill.payment_status === "paid"
                                ? "bg-green-100 text-green-800"
                                : bill.payment_status === "partial"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {bill.payment_status}
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
                              <DropdownMenuItem onClick={() => handleView(bill)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrint(bill)}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bill Details - {selectedBill?.bill_number}</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patient Name</Label>
                  <p className="font-medium">{selectedBill.patient.name}</p>
                </div>
                <div>
                  <Label>Date</Label>
                  <p className="font-medium">{format(new Date(selectedBill.bill_date), "dd/MM/yyyy")}</p>
                </div>
              </div>
              <div>
                <Label>Lab Tests</Label>
                <div className="mt-2 space-y-2">
                  {selectedBill.invoice_items?.map((item: any, index: number) => (
                    <div key={index} className="p-2 border rounded">
                      <div className="font-medium">{item.test_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Code: {item.test_code} | Price: ₹{item.price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>Total Amount</Label>
                  <p className="font-bold text-lg">₹{selectedBill.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p className="font-medium capitalize">{selectedBill.payment_status}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
