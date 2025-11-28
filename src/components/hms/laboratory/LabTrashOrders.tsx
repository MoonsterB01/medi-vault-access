import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

export default function LabTrashOrders({ hospitalData }: { hospitalData: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Trash Orders</h2>
        <p className="text-muted-foreground">View and restore deleted lab orders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Deleted Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Trash2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No deleted orders found</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
