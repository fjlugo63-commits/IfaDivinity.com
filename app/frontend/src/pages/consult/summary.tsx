import { useConsult } from "../../contexts/consultContext";
import SummaryHeader from "../../components/consult/SummaryHeader";
import SummaryDetails from "../../components/consult/SummaryDetails";
import SummaryActions from "../../components/consult/SummaryActions";

export default function ConsultSummary() {
  const { state } = useConsult();

  // Temporary placeholders until Module 6 (Supabase)
  const summary = {
    clientName: "Client Name",
    odu: "Odu Placeholder",
    status: "Ire",
    ebo: "Ebo Placeholder",
    notes: "Notes Placeholder"
  };

  function saveConsult() {
    console.log("Saving consult:", summary);
  }

  function goToPayment() {
    window.location.href = "/consult/payment";
  }

  return (
    <div className="p-6">
      <SummaryHeader clientName={summary.clientName} />
      <SummaryDetails
        odu={summary.odu}
        status={summary.status}
        ebo={summary.ebo}
        notes={summary.notes}
      />
      <SummaryActions onSave={saveConsult} onPay={goToPayment} />
    </div>
  );
}