import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function LabWorkOrder({ hospitalData }: { hospitalData: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Lab Work Order</h2>
        <p className="text-muted-foreground">Create and manage lab work orders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Work Order Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Work order management interface coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
