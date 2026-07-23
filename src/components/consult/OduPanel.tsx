import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OduPanelProps {
  odu: string;
  setOdu: (value: string) => void;
}

const ODU_LIST = [
  "Eji Ogbe", "Oyeku Meji", "Iwori Meji", "Odi Meji",
  "Irosun Meji", "Owonrin Meji", "Obara Meji", "Okanran Meji",
  "Ogunda Meji", "Osa Meji", "Ika Meji", "Oturupon Meji",
  "Otura Meji", "Irete Meji", "Ose Meji", "Ofun Meji",
];

export default function OduPanel({ odu, setOdu }: OduPanelProps) {
  return (
    <Card className="border-amber-200 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-[Rubik] text-amber-800">
          Odu Selection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="odu-select" className="text-sm text-gray-600 mb-2 block">
          Select the Odu that appeared in the casting
        </Label>
        <Select value={odu} onValueChange={setOdu}>
          <SelectTrigger id="odu-select">
            <SelectValue placeholder="Select Odu..." />
          </SelectTrigger>
          <SelectContent>
            {ODU_LIST.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}