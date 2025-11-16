import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash, Search } from "lucide-react";

export default function BillingPage({ hospitalData }: { hospitalData: any }) {
  const [billableItems, setBillableItems] = useState([{ item: "", qty: 1, cost: 0, discount: 0, tax: 0, total: 0 }]);

  const handleAddItem = () => {
    setBillableItems([...billableItems, { item: "", qty: 1, cost: 0, discount: 0, tax: 0, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = billableItems.filter((_, i) => i !== index);
    setBillableItems(newItems);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Patient Details</CardTitle>
          <CardDescription>Search for and manage patient information.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label>Patient Name</label>
              <Input placeholder="Patient Name" />
            </div>
            <div className="space-y-2">
              <label>Patient ID</label>
              <Input placeholder="Patient ID" />
            </div>
            <div className="space-y-2">
              <label>Gender</label>
              <Input placeholder="Gender" />
            </div>
            <div className="space-y-2">
              <label>Mobile No</label>
              <Input placeholder="Mobile No" />
            </div>
            <div className="space-y-2">
              <label>Billing Date</label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <label>Visits</label>
              <Input placeholder="Visits" />
            </div>
            <div className="col-span-full flex justify-end">
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Search Patient
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing Details</CardTitle>
          <CardDescription>Select billing options and packages.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label>Billing Head</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="OPD" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opd">OPD</SelectItem>
                  <SelectItem value="ipd">IPD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label>Select Package</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Billing Package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="package1">Package 1</SelectItem>
                  <SelectItem value="package2">Package 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label>Select Category</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="CASH" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">CASH</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Particulars</CardTitle>
            <CardDescription>Add or remove billable items from the invoice.</CardDescription>
          </div>
          <Button onClick={handleAddItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add More Items
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Particulars</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billableItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Billable Item" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="xray">X-Ray</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={item.qty} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={item.cost} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={item.discount} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={item.tax} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={item.total} readOnly />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Manage discounts and payment methods.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label>Select Payment Mode</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Cash" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label>Total Discount</label>
              <Input type="number" placeholder="0.0" />
            </div>
            <div className="space-y-2">
              <label>Payable Amount</label>
              <Input type="number" placeholder="00" readOnly />
            </div>
            <div className="space-y-2">
              <label>Remaining Amount</label>
              <Input type="number" placeholder="00" readOnly />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button variant="outline">Save Bill</Button>
        <Button variant="ghost">Cancel</Button>
        <Button>Collect Payment</Button>
      </div>
    </div>
  );
}