// Redirect to LabTestMaster which handles the component functionality
import LabTestMaster from "./LabTestMaster";

export default function LabComponent({ hospitalData }: { hospitalData: any }) {
  return <LabTestMaster hospitalData={hospitalData} />;
}
