import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NotesPanelProps {
  notes: string;
  setNotes: (value: string) => void;
}

export default function NotesPanel({ notes, setNotes }: NotesPanelProps) {
  return (
    <Card className="border-gray-200 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-[Rubik] text-gray-700">
          Session Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="notes-input" className="text-sm text-gray-600 mb-2 block">
          Additional observations, guidance, or follow-up notes
        </Label>
        <Textarea
          id="notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Session notes, follow-up instructions, client observations..."
          rows={3}
        />
      </CardContent>
    </Card>
  );
}