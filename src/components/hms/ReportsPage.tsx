import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, Download } from "lucide-react";

export default function ReportsPage({ hospitalData }: { hospitalData: any }) {
  const reportTypes = [
    { title: 'Patient Statistics', description: 'View patient admission and visit trends', icon: BarChart3 },
    { title: 'Financial Reports', description: 'Billing and revenue analysis', icon: FileText },
    { title: 'Inventory Reports', description: 'Pharmacy and supply chain reports', icon: FileText },
    { title: 'Doctor Performance', description: 'Doctor consultation and patient metrics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Reports & Analytics</h2>
        <p className="text-muted-foreground">Generate and view hospital reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.title}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    View Report
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
