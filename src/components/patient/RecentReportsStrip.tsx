import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DocumentCard } from "./DocumentCard";

interface Props {
  documents: any[];
}

export function RecentReportsStrip({ documents }: Props) {
  const navigate = useNavigate();
  const recent = (documents || []).slice(0, 8);

  if (recent.length === 0) {
    return (
      <Card className="p-6 flex flex-col items-center text-center animate-fade-in">
        <h2 className="text-lg font-semibold mb-2">Recent Reports</h2>
        <p className="text-sm text-muted-foreground mb-4">No reports yet.</p>
        <Button size="sm" onClick={() => navigate("/patient-dashboard#upload")}>
          <Upload className="h-4 w-4 mr-2" /> Upload Report
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-semibold">Recent Reports</h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => navigate("/patient-dashboard#documents")}
        >
          See all <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
        {recent.map((doc) => (
          <div key={doc.id} className="snap-start">
            <DocumentCard doc={doc} variant="strip" />
          </div>
        ))}
      </div>
    </div>
  );
}
