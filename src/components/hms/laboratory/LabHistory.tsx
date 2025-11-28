import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function LabHistory({ hospitalData }: { hospitalData: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Lab History</h2>
        <p className="text-muted-foreground">View historical lab records and results</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lab Test History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Lab history interface coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
