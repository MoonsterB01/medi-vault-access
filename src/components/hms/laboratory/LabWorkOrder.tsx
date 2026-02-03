// Redirect to LabWorkOrderList which handles the work order functionality
import LabWorkOrderList from "./LabWorkOrderList";

export default function LabWorkOrder({ hospitalData }: { hospitalData: any }) {
  return <LabWorkOrderList hospitalData={hospitalData} />;
}
