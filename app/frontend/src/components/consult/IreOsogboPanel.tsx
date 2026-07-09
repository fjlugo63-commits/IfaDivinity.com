import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface IreOsogboPanelProps {
  status: string;
  setStatus: (value: string) => void;
}

export default function IreOsogboPanel({ status, setStatus }: IreOsogboPanelProps) {
  return (
    <Card className="border-green-200 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-[Rubik] text-green-800">
          Iré / Osogbo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="status-select" className="text-sm text-gray-600 mb-2 block">
          Determine if the Odu comes in Iré (blessings) or Osogbo (misfortune)
        </Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="status-select">
            <SelectValue placeholder="Select status..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ire-aiku">Iré Aiku (Long Life)</SelectItem>
            <SelectItem value="ire-aje">Iré Ajé (Wealth)</SelectItem>
            <SelectItem value="ire-omo">Iré Ọmọ (Children)</SelectItem>
            <SelectItem value="ire-elese-ogun">Iré Elésè Ògún</SelectItem>
            <SelectItem value="ire-lona">Iré Lọ́nà (Safe Travel)</SelectItem>
            <SelectItem value="osogbo-iku">Osogbo Ikú (Death)</SelectItem>
            <SelectItem value="osogbo-arun">Osogbo Àrùn (Illness)</SelectItem>
            <SelectItem value="osogbo-ejo">Osogbo Ẹjọ́ (Litigation)</SelectItem>
            <SelectItem value="osogbo-ofo">Osogbo Òfò (Loss)</SelectItem>
            <SelectItem value="osogbo-fitina">Osogbo Fitina (Trouble)</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}