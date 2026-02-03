import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, TestTube, Loader2, Search, AlertCircle } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  shareable_id: string;
  gender: string;
  primary_contact: string;
}

interface LabTest {
  id: string;
  test_name: string;
  test_code: string | null;
  price: number | null;
  sample_type: string | null;
}

interface SelectedTest {
  id: string;
  test_id: string;
  test_name: string;
  price: number;
}

export default function OrderLabTests({ hospitalData }: { hospitalData: any }) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLabTests();
    fetchDoctors();
  }, [hospitalData]);

  const fetchLabTests = async () => {
    const { data } = await supabase
      .from("lab_tests")
      .select("*")
      .eq("hospital_id", hospitalData.id)
      .order("test_name");
    if (data) setLabTests(data);
  };

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from("doctors")
      .select("id, doctor_id, users(name)")
      .in("hospital_affiliations", [hospitalData.id]);
    if (data) setDoctors(data);
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

  const addTest = (testId: string) => {
    const test = labTests.find(t => t.id === testId);
    if (!test) return;

    if (selectedTests.some(t => t.test_id === testId)) {
      toast.error("Test already added");
      return;
    }

    setSelectedTests([
      ...selectedTests,
      {
        id: crypto.randomUUID(),
        test_id: test.id,
        test_name: test.test_name,
        price: test.price || 0,
      }
    ]);
  };

  const removeTest = (id: string) => {
    setSelectedTests(selectedTests.filter(t => t.id !== id));
  };

  const calculateTotal = () => {
    return selectedTests.reduce((sum, test) => sum + test.price, 0);
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    if (selectedTests.length === 0) {
      toast.error("Please add at least one test");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderNumber = `LAB-${Date.now().toString().slice(-8)}`;

      const { error } = await supabase
        .from("lab_orders")
        .insert({
          order_number: orderNumber,
          patient_id: selectedPatient.id,
          hospital_id: hospitalData.id,
          doctor_id: selectedDoctor || null,
          tests: selectedTests.map(t => ({
            test_id: t.test_id,
            test_name: t.test_name,
            price: t.price,
          })),
          status: "ordered",
          priority,
          notes: notes || null,
        });

      if (error) throw error;

      toast.success(`Lab order ${orderNumber} created successfully`);

      // Reset form
      setSelectedPatient(null);
      setSelectedTests([]);
      setSelectedDoctor("");
      setPriority("normal");
      setNotes("");
    } catch (error: any) {
      toast.error(error.message || "Failed to create lab order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Order Lab Tests</h2>
        <p className="text-muted-foreground">Create new lab test orders for patients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Patient & Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search Patient</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ID, or phone..."
                    value={selectedPatient?.name || patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      searchPatients(e.target.value);
                      if (selectedPatient) setSelectedPatient(null);
                    }}
                    className="pl-10"
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

              {selectedPatient && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Patient ID</p>
                    <p className="font-medium">{selectedPatient.shareable_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium">{selectedPatient.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <p className="font-medium">{selectedPatient.primary_contact}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Lab Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select onValueChange={addTest}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a test to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {labTests.map((test) => (
                      <SelectItem key={test.id} value={test.id}>
                        {test.test_name} {test.price ? `- ₹${test.price}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No tests added yet</p>
                  <p className="text-sm">Select tests from the dropdown above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTests.map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{test.test_name}</p>
                        <p className="text-sm text-muted-foreground">₹{test.price}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeTest(test.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {labTests.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">No lab tests configured. Add tests in Lab Component first.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Referring Doctor</Label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.users.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions or notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPatient ? (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{selectedPatient.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPatient.shareable_id}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No patient selected</p>
              )}

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Tests ({selectedTests.length})</p>
                {selectedTests.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTests.map((test) => (
                      <div key={test.id} className="flex justify-between text-sm">
                        <span>{test.test_name}</span>
                        <span>₹{test.price}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Total</span>
                      <span>₹{calculateTotal()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tests selected</p>
                )}
              </div>

              {priority !== "normal" && (
                <Badge variant={priority === "stat" ? "destructive" : "default"}>
                  {priority.toUpperCase()} Priority
                </Badge>
              )}

              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleSubmit}
                disabled={!selectedPatient || selectedTests.length === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
