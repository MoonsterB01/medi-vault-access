import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Settings2, Loader2 } from "lucide-react";

interface LabTest {
  id: string;
  test_name: string;
  test_code: string | null;
  price: number | null;
  normal_range: string | null;
  sample_type: string | null;
  department: string | null;
  unit: string | null;
  turnaround_time: string | null;
}

const sampleTypes = ["Blood", "Urine", "Stool", "Sputum", "Swab", "Tissue", "CSF", "Other"];
const departments = ["Biochemistry", "Hematology", "Microbiology", "Pathology", "Immunology", "Radiology"];

export default function LabTestMaster({ hospitalData }: { hospitalData: any }) {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    test_name: "",
    test_code: "",
    price: "",
    normal_range: "",
    sample_type: "",
    department: "",
    unit: "",
    turnaround_time: "",
  });

  useEffect(() => {
    fetchTests();
  }, [hospitalData]);

  const fetchTests = async () => {
    if (!hospitalData?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lab_tests")
        .select("*")
        .eq("hospital_id", hospitalData.id)
        .order("test_name");

      if (error) throw error;
      setTests(data || []);
    } catch (error: any) {
      toast.error("Failed to load lab tests");
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter((test) =>
    test.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.test_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddDialog = () => {
    setEditingTest(null);
    setFormData({
      test_name: "",
      test_code: "",
      price: "",
      normal_range: "",
      sample_type: "",
      department: "",
      unit: "",
      turnaround_time: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (test: LabTest) => {
    setEditingTest(test);
    setFormData({
      test_name: test.test_name,
      test_code: test.test_code || "",
      price: test.price?.toString() || "",
      normal_range: test.normal_range || "",
      sample_type: test.sample_type || "",
      department: test.department || "",
      unit: test.unit || "",
      turnaround_time: test.turnaround_time || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.test_name.trim()) {
      toast.error("Test name is required");
      return;
    }

    setSaving(true);

    try {
      const testData = {
        test_name: formData.test_name.trim(),
        test_code: formData.test_code.trim() || null,
        price: formData.price ? parseFloat(formData.price) : null,
        normal_range: formData.normal_range.trim() || null,
        sample_type: formData.sample_type || null,
        department: formData.department || null,
        unit: formData.unit.trim() || null,
        turnaround_time: formData.turnaround_time.trim() || null,
        hospital_id: hospitalData.id,
      };

      if (editingTest) {
        const { error } = await supabase
          .from("lab_tests")
          .update(testData)
          .eq("id", editingTest.id);

        if (error) throw error;
        toast.success("Lab test updated successfully");
      } else {
        const { error } = await supabase
          .from("lab_tests")
          .insert(testData);

        if (error) throw error;
        toast.success("Lab test added successfully");
      }

      setIsDialogOpen(false);
      fetchTests();
    } catch (error: any) {
      toast.error(error.message || "Failed to save lab test");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lab test?")) return;

    try {
      const { error } = await supabase
        .from("lab_tests")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Lab test deleted successfully");
      fetchTests();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete lab test");
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
          <h2 className="text-2xl font-bold">Lab Test Master</h2>
          <p className="text-muted-foreground">Manage lab test catalog</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lab Test
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tests by name, code, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Settings2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? "No tests found matching your search" : "No lab tests configured yet"}</p>
              {!searchTerm && (
                <Button onClick={openAddDialog} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Lab Test
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Sample Type</TableHead>
                  <TableHead>Normal Range</TableHead>
                  <TableHead>Price (₹)</TableHead>
                  <TableHead>TAT</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.test_name}</TableCell>
                    <TableCell>{test.test_code || "-"}</TableCell>
                    <TableCell>{test.department || "-"}</TableCell>
                    <TableCell>{test.sample_type || "-"}</TableCell>
                    <TableCell>
                      {test.normal_range ? `${test.normal_range} ${test.unit || ""}` : "-"}
                    </TableCell>
                    <TableCell>{test.price ? `₹${test.price}` : "-"}</TableCell>
                    <TableCell>{test.turnaround_time || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(test)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(test.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTest ? "Edit Lab Test" : "Add New Lab Test"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test_name">Test Name *</Label>
              <Input
                id="test_name"
                value={formData.test_name}
                onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                placeholder="e.g., Complete Blood Count"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test_code">Test Code</Label>
              <Input
                id="test_code"
                value={formData.test_code}
                onChange={(e) => setFormData({ ...formData, test_code: e.target.value })}
                placeholder="e.g., CBC001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample_type">Sample Type</Label>
              <Select
                value={formData.sample_type}
                onValueChange={(value) => setFormData({ ...formData, sample_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sample type" />
                </SelectTrigger>
                <SelectContent>
                  {sampleTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g., 500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="turnaround_time">Turnaround Time</Label>
              <Input
                id="turnaround_time"
                value={formData.turnaround_time}
                onChange={(e) => setFormData({ ...formData, turnaround_time: e.target.value })}
                placeholder="e.g., 24 hours"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="normal_range">Normal Range</Label>
              <Input
                id="normal_range"
                value={formData.normal_range}
                onChange={(e) => setFormData({ ...formData, normal_range: e.target.value })}
                placeholder="e.g., 4.5-11.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., x10^3/µL"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingTest ? "Update" : "Add"} Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
