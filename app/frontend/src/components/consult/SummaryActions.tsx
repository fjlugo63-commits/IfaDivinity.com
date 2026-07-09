import { Button } from "@/components/ui/button";

interface SummaryActionsProps {
  onSave: () => void;
  onPay: () => void;
}

export default function SummaryActions({ onSave, onPay }: SummaryActionsProps) {
  return (
    <div className="flex gap-3">
      <Button
        onClick={onSave}
        className="bg-indigo-700 hover:bg-indigo-800 text-white"
      >
        Save Consult
      </Button>
      <Button
        onClick={onPay}
        variant="outline"
        className="border-amber-600 text-amber-700 hover:bg-amber-50"
      >
        Proceed to Payment
      </Button>
    </div>
  );
}