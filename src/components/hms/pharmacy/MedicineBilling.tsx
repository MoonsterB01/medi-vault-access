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

interface MedicineItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  stock: number;
  quantity: number;
  mrp_rate: number;
  price: number;
  discount: number;
  discount_type: "percentage" | "amount";
  uom: string;
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

export default function MedicineBilling({ hospitalData }: { hospitalData: any }) {
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [billingDate, setBillingDate] = useState<Date>(new Date());
  const [medicines, setMedicines] = useState<any[]>([]);
  const [items, setItems] = useState<MedicineItem[]>([
    {
      id: crypto.randomUUID(),
      medicine_id: "",
      medicine_name: "",
      batch_number: "",
      expiry_date: "",
      stock: 0,
      quantity: 0,
      mrp_rate: 0,
      price: 0,
      discount: 0,
      discount_type: "percentage",
      uom: "No.",
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
    fetchMedicines();
  }, [hospitalData]);

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from("doctors")
      .select("id, user_id, doctor_id, users(name)")
      .in("hospital_affiliations", [hospitalData.id]);
    if (data) setDoctors(data as Doctor[]);
  };

  const fetchMedicines = async () => {
    const { data } = await supabase
      .from("pharmacy_inventory")
      .select("*")
      .eq("hospital_id", hospitalData.id)
      .gt("quantity", 0)
      .order("medicine_name");
    if (data) setMedicines(data);
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
        medicine_id: "",
        medicine_name: "",
        batch_number: "",
        expiry_date: "",
        stock: 0,
        quantity: 0,
        mrp_rate: 0,
        price: 0,
        discount: 0,
        discount_type: "percentage",
        uom: "No.",
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

          // Auto-populate from medicine selection
          if (field === "medicine_id") {
            const medicine = medicines.find((m) => m.id === value);
            if (medicine) {
              updated.medicine_name = medicine.medicine_name;
              updated.batch_number = medicine.batch_number || "";
              updated.expiry_date = medicine.expiry_date || "";
              updated.stock = medicine.quantity || 0;
              updated.mrp_rate = medicine.unit_price || 0;
              updated.price = medicine.unit_price || 0;
              updated.uom = "No.";
            }
          }

          // Calculate total
          const quantity = updated.quantity || 0;
          const price = updated.price || 0;
          const discount = updated.discount || 0;
          const cgst = updated.cgst || 0;
          const sgst = updated.sgst || 0;

          let itemTotal = quantity * price;
          
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
    const subtotal = items.reduce((sum, item) => {
      const itemPrice = (item.quantity || 0) * (item.price || 0);
      return sum + itemPrice;
    }, 0);

    const totalDiscount = items.reduce((sum, item) => {
      const itemPrice = (item.quantity || 0) * (item.price || 0);
      if (item.discount_type === "percentage") {
        return sum + (itemPrice * (item.discount || 0)) / 100;
      }
      return sum + (item.discount || 0);
    }, 0);

    const afterDiscount = subtotal - totalDiscount;

    const totalCGST = items.reduce((sum, item) => {
      const itemPrice = (item.quantity || 0) * (item.price || 0);
      const afterItemDiscount = item.discount_type === "percentage"
        ? itemPrice - (itemPrice * (item.discount || 0)) / 100
        : itemPrice - (item.discount || 0);
      return sum + (afterItemDiscount * (item.cgst || 0)) / 100;
    }, 0);

    const totalSGST = items.reduce((sum, item) => {
      const itemPrice = (item.quantity || 0) * (item.price || 0);
      const afterItemDiscount = item.discount_type === "percentage"
        ? itemPrice - (itemPrice * (item.discount || 0)) / 100
        : itemPrice - (item.discount || 0);
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

  const handleDispense = async () => {
    if (!selectedPatient) {
      toast({ title: "Error", description: "Please select a patient", variant: "destructive" });
      return;
    }

    if (items.length === 0 || !items.some(item => item.quantity > 0)) {
      toast({ title: "Error", description: "Please add at least one medicine", variant: "destructive" });
      return;
    }

    // Validate stock
    const insufficientStock = items.find(item => item.quantity > item.stock);
    if (insufficientStock) {
      toast({
        title: "Error",
        description: `Insufficient stock for ${insufficientStock.medicine_name}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Generate bill number
      const billNumber = `BILL-${Date.now().toString().slice(-8)}`;

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
        invoice_items: items.filter(item => item.quantity > 0) as any,
        notes: selectedDoctor ? `Prescribed by: ${doctors.find(d => d.id === selectedDoctor)?.users.name}` : null,
      };

      const { data: billingData, error: billingError } = await supabase
        .from("billing")
        .insert(billingRecord)
        .select()
        .single();

      if (billingError) throw billingError;

      // Create pharmacy dispensation record
      const dispensationRecord = {
        patient_id: selectedPatient.id,
        hospital_id: hospitalData.id,
        prescribed_by: selectedDoctor || null,
        dispensed_date: billingDate.toISOString(),
        medicines: items.filter(item => item.quantity > 0) as any,
        total_amount: totals.grandTotal,
        notes: `Bill No: ${billNumber}`,
      };

      const { error: dispensationError } = await supabase
        .from("pharmacy_dispensations")
        .insert(dispensationRecord);

      if (dispensationError) throw dispensationError;

      // Update inventory quantities
      for (const item of items.filter(item => item.quantity > 0)) {
        const { error: inventoryError } = await supabase
          .from("pharmacy_inventory")
          .update({
            quantity: item.stock - item.quantity,
          })
          .eq("id", item.medicine_id);

        if (inventoryError) throw inventoryError;
      }

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
          medicine_id: "",
          medicine_name: "",
          batch_number: "",
          expiry_date: "",
          stock: 0,
          quantity: 0,
          mrp_rate: 0,
          price: 0,
          discount: 0,
          discount_type: "percentage",
          uom: "No.",
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
      <h2 className="text-2xl font-bold">Medicine Billing</h2>

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

      {/* Medicine Items Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
          <h3 className="text-lg font-semibold">Medicine Billing</h3>
          <div className="text-lg font-semibold">All Amount in ( INR )</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="p-2 text-left">Medicine Name</th>
                <th className="p-2 text-left">Batch No.</th>
                <th className="p-2 text-left">Expiry</th>
                <th className="p-2 text-left">Stock</th>
                <th className="p-2 text-left">Prescribe Qty.</th>
                <th className="p-2 text-left">MRP Rate</th>
                <th className="p-2 text-left">Price</th>
                <th className="p-2 text-left">Discount</th>
                <th className="p-2 text-left">UOM</th>
                <th className="p-2 text-left">CGST</th>
                <th className="p-2 text-left">SGST</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-2">
                    <Select value={item.medicine_id} onValueChange={(value) => updateItem(item.id, "medicine_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Billable Item" />
                      </SelectTrigger>
                      <SelectContent>
                        {medicines.map((medicine) => (
                          <SelectItem key={medicine.id} value={medicine.id}>
                            {medicine.medicine_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Input value={item.batch_number} readOnly />
                  </td>
                  <td className="p-2">
                    <Input value={item.expiry_date ? format(new Date(item.expiry_date), "dd/MM/yyyy") : ""} readOnly />
                  </td>
                  <td className="p-2">
                    <Input value={item.stock} readOnly />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.quantity || ""}
                      onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                      min="0"
                      max={item.stock}
                    />
                  </td>
                  <td className="p-2">
                    <Input value={item.mrp_rate.toFixed(2)} readOnly />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.price || ""}
                      onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        value={item.discount || ""}
                        onChange={(e) => updateItem(item.id, "discount", parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-20"
                      />
                      <Select value={item.discount_type} onValueChange={(value) => updateItem(item.id, "discount_type", value)}>
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
                    <Input value={item.uom} readOnly />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.cgst || ""}
                      onChange={(e) => updateItem(item.id, "cgst", parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.sgst || ""}
                      onChange={(e) => updateItem(item.id, "sgst", parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted font-semibold">
              <tr>
                <td colSpan={4} className="p-2">Total Amount</td>
                <td className="p-2">{items.reduce((sum, item) => sum + (item.quantity || 0), 0)}</td>
                <td className="p-2">{totals.subtotal.toFixed(2)}</td>
                <td className="p-2">{totals.subtotal.toFixed(2)}</td>
                <td className="p-2">{totals.totalDiscount.toFixed(2)}</td>
                <td className="p-2"></td>
                <td className="p-2">{totals.totalCGST.toFixed(2)}</td>
                <td className="p-2">{totals.totalSGST.toFixed(2)}</td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-4">
          <Button onClick={addItem} variant="default" className="gap-2">
            <Plus className="h-4 w-4" />
            ADD MORE ITEMS
          </Button>
        </div>
      </div>

      {/* Payment Details */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold">Payment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Select Payment Mode</Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="net_banking">Net Banking</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Total Discount</Label>
            <Input value={totals.totalDiscount.toFixed(2)} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Payable Amount</Label>
            <Input
              type="number"
              value={paidAmount || ""}
              onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <Label>Remaining Amount /-</Label>
            <Input value={totals.remainingAmount.toFixed(2)} readOnly className="w-40" />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="waiveOff"
              checked={waiveOff}
              onChange={(e) => setWaiveOff(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="waiveOff">Mark As Waived Off</Label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
          CANCEL
        </Button>
        <Button size="lg" onClick={handleDispense} disabled={isLoading}>
          {isLoading ? "PROCESSING..." : "DISPENSE"}
        </Button>
      </div>
    </div>
  );
}
