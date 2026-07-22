import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ConsultSummary() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("id");

  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    async function loadSummary() {
      const { data } = await supabase
        .from("consult_summary")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      setSummary(data);
    }

    loadSummary();
  }, [sessionId]);

  if (!summary) return <div>Loading…</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Consult Summary</h1>

      <p><strong>Odu:</strong> {summary.odu}</p>
      <p><strong>Status:</strong> {summary.status}</p>
      <p><strong>Notes:</strong> {summary.notes}</p>
    </div>
  );
}