import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function EHRPage({ hospitalData }: { hospitalData: any }) {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Electronic Health Records</h2>
        <p className="text-muted-foreground">Access and manage patient medical records</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search patient records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button>Search</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>Search for a patient to view their electronic health records</p>
            <p className="text-sm mt-2">Records include medical history, diagnoses, medications, and documents</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
