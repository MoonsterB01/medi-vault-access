import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2 } from "lucide-react";

export default function LabComponent({ hospitalData }: { hospitalData: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Lab Component</h2>
        <p className="text-muted-foreground">Manage lab test components and parameters</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Component Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Settings2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Lab component management interface coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
