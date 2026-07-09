import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ConsultHistory() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    async function loadSessions() {
      const { data } = await supabase
        .from("consult_sessions")
        .select("*")
        .order("created_at", { ascending: false });

      setSessions(data || []);
    }

    loadSessions();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Consult History</h1>

      {sessions.length === 0 && <p>No consults found.</p>}

      <ul>
        {sessions.map((s) => (
          <li key={s.id} className="mb-4 border p-4 rounded">
            <p><strong>Client:</strong> {s.client_name}</p>
            <p><strong>State:</strong> {s.state}</p>
            <p><strong>Date:</strong> {new Date(s.created_at).toLocaleString()}</p>

            <button
              className="mt-2"
              onClick={() => window.location.href = `/consult/summary?id=${s.id}`}
            >
              View Summary
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}