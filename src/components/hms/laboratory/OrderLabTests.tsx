import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestTube } from "lucide-react";

export default function OrderLabTests({ hospitalData }: { hospitalData: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Order Lab Tests</h2>
        <p className="text-muted-foreground">Order new lab tests for patients</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Lab Test Ordering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <TestTube className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Lab test ordering interface coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
