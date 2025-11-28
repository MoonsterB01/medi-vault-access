import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Camera } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LabTestItem {
  id: string;
  test_id: string;
  test_name: string;
  test_code: string;
  price: number;
  discount: number;
  discount_type: "percentage" | "amount";
  cgst: number;
  sgst: number;
  total: number;
}

interface Patient {
  id: string;
  name: string;
  shareable_id: string;
  gender: string;
  primary_contact: string;
}

interface Doctor {
  id: string;
  user_id: string;
  doctor_id: string;
  users: {
    name: string;
  };
}

export default function LabBilling({ hospitalData }: { hospitalData: any }) {
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [billingDate, setBillingDate] = useState<Date>(new Date());
  const [labTests, setLabTests] = useState<any[]>([]);
  const [items, setItems] = useState<LabTestItem[]>([
    {
      id: crypto.randomUUID(),
      test_id: "",
      test_name: "",
      test_code: "",
      price: 0,
      discount: 0,
      discount_type: "percentage",
      cgst: 0,
      sgst: 0,
      total: 0,
    },
  ]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paidAmount, setPaidAmount] = useState(0);
  const [waiveOff, setWaiveOff] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDoctors();
    fetchLabTests();
  }, [hospitalData]);

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from("doctors")
      .select("id, user_id, doctor_id, users(name)")
      .in("hospital_affiliations", [hospitalData.id]);
    if (data) setDoctors(data as Doctor[]);
  };

  const fetchLabTests = async () => {
    const { data } = await supabase
      .from("lab_tests")
      .select("*")
      .eq("hospital_id", hospitalData.id)
      .order("test_name");
    if (data) setLabTests(data);
  };

  const searchPatients = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("hospital_id", hospitalData.id)
      .or(`name.ilike.%${query}%,shareable_id.ilike.%${query}%,primary_contact.ilike.%${query}%`)
      .limit(10);

    if (data) setSearchResults(data);
  };

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchResults([]);
    setPatientSearch("");
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        test_id: "",
        test_name: "",
        test_code: "",
        price: 0,
        discount: 0,
        discount_type: "percentage",
        cgst: 0,
        sgst: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // Auto-populate from test selection
          if (field === "test_id") {
            const test = labTests.find((t) => t.id === value);
            if (test) {
              updated.test_name = test.test_name;
              updated.test_code = test.test_code || "";
              updated.price = test.price || 0;
            }
          }

          // Calculate total
          const price = updated.price || 0;
          const discount = updated.discount || 0;
          const cgst = updated.cgst || 0;
          const sgst = updated.sgst || 0;

          let itemTotal = price;
          
          if (updated.discount_type === "percentage") {
            itemTotal -= (itemTotal * discount) / 100;
          } else {
            itemTotal -= discount;
          }

          itemTotal += (itemTotal * cgst) / 100;
          itemTotal += (itemTotal * sgst) / 100;

          updated.total = parseFloat(itemTotal.toFixed(2));

          return updated;
        }
        return item;
      })
    );
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.price || 0), 0);

    const totalDiscount = items.reduce((sum, item) => {
      const price = item.price || 0;
      if (item.discount_type === "percentage") {
        return sum + (price * (item.discount || 0)) / 100;
      }
      return sum + (item.discount || 0);
    }, 0);

    const afterDiscount = subtotal - totalDiscount;

    const totalCGST = items.reduce((sum, item) => {
      const price = item.price || 0;
      const afterItemDiscount = item.discount_type === "percentage"
        ? price - (price * (item.discount || 0)) / 100
        : price - (item.discount || 0);
      return sum + (afterItemDiscount * (item.cgst || 0)) / 100;
    }, 0);

    const totalSGST = items.reduce((sum, item) => {
      const price = item.price || 0;
      const afterItemDiscount = item.discount_type === "percentage"
        ? price - (price * (item.discount || 0)) / 100
        : price - (item.discount || 0);
      return sum + (afterItemDiscount * (item.sgst || 0)) / 100;
    }, 0);

    const grandTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      totalCGST: parseFloat(totalCGST.toFixed(2)),
      totalSGST: parseFloat(totalSGST.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2)),
      remainingAmount: parseFloat((grandTotal - paidAmount).toFixed(2)),
    };
  };

  const totals = calculateTotals();

  const handleGenerateBill = async () => {
    if (!selectedPatient) {
      toast({ title: "Error", description: "Please select a patient", variant: "destructive" });
      return;
    }

    if (items.length === 0 || !items.some(item => item.test_id)) {
      toast({ title: "Error", description: "Please add at least one lab test", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // Generate bill number
      const billNumber = `LAB-BILL-${Date.now().toString().slice(-8)}`;

      // Create billing record
      const billingRecord = {
        bill_number: billNumber,
        bill_date: billingDate.toISOString(),
        patient_id: selectedPatient.id,
        hospital_id: hospitalData.id,
        total_amount: totals.grandTotal,
        paid_amount: paidAmount,
        balance_amount: waiveOff ? 0 : totals.remainingAmount,
        payment_method: paymentMode,
        payment_status: (totals.remainingAmount <= 0 || waiveOff ? "paid" : "partial") as string,
        invoice_items: items.filter(item => item.test_id) as any,
        notes: selectedDoctor ? `Prescribed by: ${doctors.find(d => d.id === selectedDoctor)?.users.name}` : null,
      };

      const { data: billingData, error: billingError } = await supabase
        .from("billing")
        .insert(billingRecord)
        .select()
        .single();

      if (billingError) throw billingError;

      toast({
        title: "Success",
        description: `Bill ${billNumber} created successfully`,
      });

      // Reset form
      setSelectedPatient(null);
      setSelectedDoctor("");
      setItems([
        {
          id: crypto.randomUUID(),
          test_id: "",
          test_name: "",
          test_code: "",
          price: 0,
          discount: 0,
          discount_type: "percentage",
          cgst: 0,
          sgst: 0,
          total: 0,
        },
      ]);
      setPaidAmount(0);
      setWaiveOff(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Lab Billing</h2>

      {/* Patient Search Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-card">
        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-3 gap-2 items-center">
                <Label>Patient Name</Label>
                <div className="col-span-2 relative">
                  <Input
                    placeholder="Search patient..."
                    value={selectedPatient?.name || patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      searchPatients(e.target.value);
                    }}
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                      {searchResults.map((patient) => (
                        <button
                          key={patient.id}
                          className="w-full px-4 py-2 text-left hover:bg-accent"
                          onClick={() => selectPatient(patient)}
                        >
                          <div className="font-medium">{patient.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {patient.shareable_id} • {patient.primary_contact}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <Label>Gender</Label>
                <Input className="col-span-2" value={selectedPatient?.gender || ""} readOnly />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <Label>Billing Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("col-span-2 justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(billingDate, "dd-MM-yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={billingDate} onSelect={(date) => date && setBillingDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <Label>Patient ID</Label>
            <Input className="col-span-2" value={selectedPatient?.shareable_id || ""} readOnly />
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <Label>Mobile No.</Label>
            <Input className="col-span-2" value={selectedPatient?.primary_contact || ""} readOnly />
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <Label>Select Doctor</Label>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="col-span-2">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.users.name} ({doctor.doctor_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-2">
            <Button className="w-full" size="lg">
              SEARCH PATIENT
            </Button>
          </div>
        </div>
      </div>

      {/* Lab Test Items Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
          <h3 className="text-lg font-semibold">Lab Test Billing</h3>
          <div className="text-lg font-semibold">All Amount in ( INR )</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="p-2 text-left">Test Name</th>
                <th className="p-2 text-left">Test Code</th>
                <th className="p-2 text-left">Price</th>
                <th className="p-2 text-left">Discount</th>
                <th className="p-2 text-left">CGST</th>
                <th className="p-2 text-left">SGST</th>
                <th className="p-2 text-left">Total</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-2">
                    <Select value={item.test_id} onValueChange={(value) => updateItem(item.id, "test_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Test" />
                      </SelectTrigger>
                      <SelectContent>
                        {labTests.map((test) => (
                          <SelectItem key={test.id} value={test.id}>
                            {test.test_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Input value={item.test_code} readOnly className="bg-muted" />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        value={item.discount}
                        onChange={(e) => updateItem(item.id, "discount", parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                      <Select
                        value={item.discount_type}
                        onValueChange={(value) => updateItem(item.id, "discount_type", value)}
                      >
                        <SelectTrigger className="w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="amount">₹</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.cgst}
                      onChange={(e) => updateItem(item.id, "cgst", parseFloat(e.target.value) || 0)}
                      className="w-20"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.sgst}
                      onChange={(e) => updateItem(item.id, "sgst", parseFloat(e.target.value) || 0)}
                      className="w-20"
                    />
                  </td>
                  <td className="p-2">
                    <Input value={item.total.toFixed(2)} readOnly className="bg-muted font-medium" />
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-muted/50">
          <Button onClick={addItem} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add More Test
          </Button>
        </div>
      </div>

      {/* Payment Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold">Payment Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="netbanking">Net Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paid Amount</Label>
              <Input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="waiveOff"
              checked={waiveOff}
              onChange={(e) => setWaiveOff(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="waiveOff">Waive Off Remaining Amount</Label>
          </div>
        </div>

        <div className="space-y-2 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold mb-4">Bill Summary</h3>
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-destructive">
            <span>Discount:</span>
            <span className="font-medium">-₹{totals.totalDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>CGST:</span>
            <span className="font-medium">₹{totals.totalCGST.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>SGST:</span>
            <span className="font-medium">₹{totals.totalSGST.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between text-lg font-bold">
            <span>Grand Total:</span>
            <span>₹{totals.grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Remaining:</span>
            <span className="font-medium">₹{totals.remainingAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" size="lg">
          Cancel
        </Button>
        <Button onClick={handleGenerateBill} disabled={isLoading} size="lg">
          {isLoading ? "Processing..." : "Generate Bill"}
        </Button>
      </div>
    </div>
  );
}
