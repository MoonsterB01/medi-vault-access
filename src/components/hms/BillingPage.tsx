import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Search, Trash2, Calendar } from "lucide-react";

interface BillItem {
  id: string;
  particular: string;
  quantity: number;
  cost: number;
  discount: number;
  discountType: 'percent' | 'amount';
  tax: number;
  totalAmount: number;
}

export default function BillingPage({ hospitalData }: { hospitalData: any }) {
  const [bills, setBills] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  
  // New Bill Form State
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [billingDate, setBillingDate] = useState(new Date().toISOString().split('T')[0]);
  const [billingHead, setBillingHead] = useState("OPD");
  const [billingPackage, setBillingPackage] = useState("");
  const [category, setCategory] = useState("CASH");
  const [billItems, setBillItems] = useState<BillItem[]>([{
    id: '1',
    particular: '',
    quantity: 1,
    cost: 0,
    discount: 0,
    discountType: 'percent',
    tax: 0,
    totalAmount: 0
  }]);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [payableAmount, setPayableAmount] = useState(0);
  const [waivedOff, setWaivedOff] = useState(false);

  useEffect(() => {
    if (hospitalData?.id) {
      fetchBills();
      fetchPatients();
    }
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

  const fetchPatients = async () => {
    if (!hospitalData?.id) return;
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('hospital_id', hospitalData.id);
      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      toast.error('Failed to load patients');
    }
  };

  const calculateItemTotal = (item: BillItem) => {
    const subtotal = item.quantity * item.cost;
    const discountAmount = item.discountType === 'percent' 
      ? (subtotal * item.discount) / 100 
      : item.discount;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * item.tax) / 100;
    return afterDiscount + taxAmount;
  };

  const updateBillItem = (id: string, field: keyof BillItem, value: any) => {
    setBillItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        updated.totalAmount = calculateItemTotal(updated);
        return updated;
      }
      return item;
    }));
  };

  const addMoreItems = () => {
    setBillItems([...billItems, {
      id: Date.now().toString(),
      particular: '',
      quantity: 1,
      cost: 0,
      discount: 0,
      discountType: 'percent',
      tax: 0,
      totalAmount: 0
    }]);
  };

  const removeItem = (id: string) => {
    if (billItems.length > 1) {
      setBillItems(billItems.filter(item => item.id !== id));
    }
  };

  const calculateTotals = () => {
    const subtotal = billItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
    const totalDiscountAmt = billItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.cost;
      return sum + (item.discountType === 'percent' ? (itemSubtotal * item.discount) / 100 : item.discount);
    }, 0);
    const totalTax = billItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.cost;
      const itemDiscount = item.discountType === 'percent' ? (itemSubtotal * item.discount) / 100 : item.discount;
      return sum + ((itemSubtotal - itemDiscount) * item.tax) / 100;
    }, 0);
    const grandTotal = billItems.reduce((sum, item) => sum + item.totalAmount, 0);
    
    return { subtotal, totalDiscountAmt, totalTax, grandTotal };
  };

  const totals = calculateTotals();

  const handleSaveBill = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    
    try {
      const billNumber = `BILL-${Date.now()}`;
      const { error } = await supabase
        .from('billing')
        .insert([{
          hospital_id: hospitalData.id,
          patient_id: selectedPatient.id,
          bill_number: billNumber,
          bill_date: billingDate,
          total_amount: totals.grandTotal,
          paid_amount: payableAmount,
          balance_amount: totals.grandTotal - payableAmount,
          payment_status: totals.grandTotal === payableAmount ? 'paid' : 'partial',
          payment_method: paymentMode,
          invoice_items: billItems as any,
          notes: `Billing Head: ${billingHead}, Category: ${category}`
        }]);
      
      if (error) throw error;
      toast.success('Bill saved successfully');
      fetchBills();
      resetForm();
    } catch (error: any) {
      toast.error('Failed to save bill');
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setPatientSearch("");
    setBillItems([{
      id: '1',
      particular: '',
      quantity: 1,
      cost: 0,
      discount: 0,
      discountType: 'percent',
      tax: 0,
      totalAmount: 0
    }]);
    setPayableAmount(0);
    setWaivedOff(false);
  };

  const filteredBills = bills.filter(bill =>
    bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.patients?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.shareable_id?.toLowerCase().includes(patientSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl font-bold">Billing Management</h2>
        <p className="text-muted-foreground">Create and manage patient bills</p>
      </div>

      <Tabs defaultValue="new" className="w-full">
        <TabsList>
          <TabsTrigger value="new">New Bill</TabsTrigger>
          <TabsTrigger value="all">All Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          {/* Patient Info Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Photo Upload */}
                <div className="lg:col-span-1">
                  <div className="w-24 h-24 border-2 border-primary rounded-lg flex items-center justify-center bg-muted">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                </div>

                {/* Left Column - Patient Details */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label className="font-semibold">Patient Name</Label>
                    <span className="text-muted-foreground">:</span>
                    <div className="col-span-2">
                      <Input 
                        value={selectedPatient?.name || ''}
                        placeholder="Select patient first"
                        disabled
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label className="font-semibold">Gender</Label>
                    <span className="text-muted-foreground">:</span>
                    <div className="col-span-2">
                      <Input 
                        value={selectedPatient?.gender || ''}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label className="font-semibold">Billing Date</Label>
                    <span className="text-muted-foreground">:</span>
                    <div className="col-span-2 relative">
                      <Input 
                        type="date"
                        value={billingDate}
                        onChange={(e) => setBillingDate(e.target.value)}
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Right Column - Patient Details */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label className="font-semibold">Patient ID</Label>
                    <span className="text-muted-foreground">:</span>
                    <div className="col-span-2">
                      <Input 
                        value={selectedPatient?.shareable_id || ''}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label className="font-semibold">Mobile No</Label>
                    <span className="text-muted-foreground">:</span>
                    <div className="col-span-2">
                      <Input 
                        value={selectedPatient?.primary_contact || ''}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label className="font-semibold">Visits</Label>
                    <span className="text-muted-foreground">:</span>
                    <div className="col-span-2">
                      <Input value="0" disabled />
                    </div>
                  </div>
                </div>

                {/* Search Button */}
                <div className="lg:col-span-2 flex items-start">
                  <Select value={selectedPatient?.id || ''} onValueChange={(value) => {
                    const patient = patients.find(p => p.id === value);
                    setSelectedPatient(patient);
                  }}>
                    <SelectTrigger className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <SelectValue placeholder="SEARCH PATIENT" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search by name or ID..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          className="mb-2"
                        />
                      </div>
                      {filteredPatients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name} - {patient.shareable_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Configuration */}
          <Card className="border-2 border-primary">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="font-semibold mb-2 block">Billing Head</Label>
                  <Select value={billingHead} onValueChange={setBillingHead}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPD">OPD</SelectItem>
                      <SelectItem value="IPD">IPD</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-semibold mb-2 block">Select Package</Label>
                  <Select value={billingPackage} onValueChange={setBillingPackage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Billing Package" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Package</SelectItem>
                      <SelectItem value="premium">Premium Package</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="font-semibold mb-2 block">Select Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">CASH</SelectItem>
                      <SelectItem value="INSURANCE">INSURANCE</SelectItem>
                      <SelectItem value="CARD">CARD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="text-right text-primary font-semibold">
                All Amount in ( INR )
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    <TableHead className="text-primary-foreground">Particulars</TableHead>
                    <TableHead className="text-primary-foreground">Qty</TableHead>
                    <TableHead className="text-primary-foreground">Cost</TableHead>
                    <TableHead className="text-primary-foreground">Discount</TableHead>
                    <TableHead className="text-primary-foreground">Tax</TableHead>
                    <TableHead className="text-primary-foreground">Total Amount</TableHead>
                    <TableHead className="text-primary-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Select value={item.particular} onValueChange={(value) => updateBillItem(item.id, 'particular', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Billable Item" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consultation">Consultation</SelectItem>
                            <SelectItem value="medicine">Medicine</SelectItem>
                            <SelectItem value="lab_test">Lab Test</SelectItem>
                            <SelectItem value="procedure">Procedure</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={item.quantity}
                          onChange={(e) => updateBillItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={item.cost}
                          onChange={(e) => updateBillItem(item.id, 'cost', parseFloat(e.target.value) || 0)}
                          placeholder="00"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Input 
                            type="number" 
                            value={item.discount}
                            onChange={(e) => updateBillItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                            placeholder="00.0"
                            className="w-20"
                          />
                          <Select value={item.discountType} onValueChange={(value: 'percent' | 'amount') => updateBillItem(item.id, 'discountType', value)}>
                            <SelectTrigger className="w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="amount">₹</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="self-center">{item.discountType === 'percent' ? `${((item.quantity * item.cost * item.discount) / 100).toFixed(2)}` : item.discount.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={item.tax.toString()} onValueChange={(value) => updateBillItem(item.id, 'tax', parseFloat(value))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Tax" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="12">12%</SelectItem>
                            <SelectItem value="18">18%</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {item.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          disabled={billItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="p-4">
                <Button onClick={addMoreItems} className="bg-primary text-primary-foreground">
                  ADD MORE ITEMS
                </Button>
              </div>

              {/* Total Amount Row */}
              <div className="border-t">
                <div className="grid grid-cols-7 gap-4 p-4 bg-muted/30">
                  <div className="col-span-2 text-right font-semibold">Total Amount</div>
                  <div className="text-center font-semibold">{totals.subtotal.toFixed(2)}</div>
                  <div className="text-center font-semibold">{totals.totalDiscountAmt.toFixed(2)}</div>
                  <div className="text-center font-semibold">{totals.totalTax.toFixed(2)}</div>
                  <div className="text-center font-semibold">{totals.grandTotal.toFixed(2)}</div>
                  <div></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold text-primary">Payment Details</h3>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label className="font-semibold mb-2 block">Select Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-semibold mb-2 block">Total Discount</Label>
                  <Input 
                    type="number" 
                    value={totalDiscount}
                    onChange={(e) => setTotalDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="00.0"
                  />
                </div>
                <div>
                  <Label className="font-semibold mb-2 block">Payable Amount</Label>
                  <Input 
                    type="number" 
                    value={payableAmount}
                    onChange={(e) => setPayableAmount(parseFloat(e.target.value) || 0)}
                    placeholder="00"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Label className="font-semibold">Remaining Amount</Label>
                <span className="font-semibold">/-</span>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="waived" 
                    checked={waivedOff}
                    onCheckedChange={(checked) => setWaivedOff(checked as boolean)}
                  />
                  <Label htmlFor="waived" className="cursor-pointer">
                    Mark As Waived Off
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={resetForm}>
                  CANCEL
                </Button>
                <Button onClick={handleSaveBill} className="bg-primary text-primary-foreground">
                  SAVE BILL
                </Button>
                <Button onClick={handleSaveBill} className="bg-primary text-primary-foreground">
                  COLLECT PAYMENT
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
