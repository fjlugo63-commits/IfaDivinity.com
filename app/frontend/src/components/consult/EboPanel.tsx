import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EboPanelProps {
  ebo: string;
  setEbo: (value: string) => void;
}

export default function EboPanel({ ebo, setEbo }: EboPanelProps) {
  return (
    <Card className="border-indigo-200 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-[Rubik] text-indigo-800">
          Ebó / Prescription
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="ebo-input" className="text-sm text-gray-600 mb-2 block">
          Describe the ebó (sacrifice/offering) or prescription for the client
        </Label>
        <Textarea
          id="ebo-input"
          value={ebo}
          onChange={(e) => setEbo(e.target.value)}
          placeholder="Describe the ebó, materials needed, and instructions..."
          rows={4}
        />
      </CardContent>
    </Card>
  );
}