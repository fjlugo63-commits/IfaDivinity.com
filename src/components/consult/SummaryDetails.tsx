import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryDetailsProps {
  odu: string;
  status: string;
  ebo: string;
  notes: string;
}

export default function SummaryDetails({ odu, status, ebo, notes }: SummaryDetailsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 mb-6">
      <Card className="border-indigo-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Odu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-[Rubik] text-indigo-800">{odu}</p>
        </CardContent>
      </Card>

      <Card className="border-indigo-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Ire / Osogbo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-[Rubik] text-indigo-800">{status}</p>
        </CardContent>
      </Card>

      <Card className="border-indigo-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Ebo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-[Rubik] text-indigo-800">{ebo}</p>
        </CardContent>
      </Card>

      <Card className="border-indigo-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-[Rubik] text-indigo-800">{notes}</p>
        </CardContent>
      </Card>
    </div>
  );
}