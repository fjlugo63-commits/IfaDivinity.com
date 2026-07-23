import { useState, useEffect } from "react";
import { supabase, TABLES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

type ContributionType =
  | "interpretation"
  | "correction"
  | "variant"
  | "pronunciation"
  | "lineage_specific"
  | "general_knowledge";

type Step = "landing" | "form" | "thank_you";

const CONTRIBUTION_TYPES: { value: ContributionType; label: string }[] = [
  { value: "interpretation", label: "Interpretation" },
  { value: "correction", label: "Correction" },
  { value: "variant", label: "Variant" },
  { value: "pronunciation", label: "Pronunciation" },
  { value: "lineage_specific", label: "Lineage-Specific" },
  { value: "general_knowledge", label: "General Knowledge" },
];

interface OduOption {
  id: string;
  odu_code: string;
}

/**
 * Public Contribution Portal
 *
 * A public-facing portal for submitting Odu knowledge contributions,
 * lineage insights, corrections, and interpretations.
 *
 * Flow: Landing → Form → Thank You
 */
export default function ContributionPortal() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("landing");
  const [oduOptions, setOduOptions] = useState<OduOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [oduCode, setOduCode] = useState("");
  const [contributionType, setContributionType] = useState<ContributionType>("interpretation");
  const [content, setContent] = useState("");

  // Load Odu options from odu_name_map
  useEffect(() => {
    async function loadOduOptions() {
      const { data } = await supabase
        .from(TABLES.odu_name_map)
        .select("id, odu_code")
        .order("odu_code");

      if (data) {
        setOduOptions(data as OduOption[]);
      }
    }
    loadOduOptions();
  }, []);

  async function handleSubmit() {
    if (!user) {
      setError("You must be logged in to submit a contribution.");
      return;
    }
    if (!oduCode || !content.trim()) {
      setError("Please select an Odu and provide content.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from(TABLES.contribution_record)
      .insert({
        user_id: user.id,
        odu_code: oduCode,
        contribution_type: contributionType,
        content: content.trim(),
        status: "pending",
      });

    setSubmitting(false);

    if (insertError) {
      console.error("Contribution submission error:", insertError);
      setError("Failed to submit contribution. Please try again.");
      return;
    }

    setStep("thank_you");
  }

  function resetForm() {
    setOduCode("");
    setContributionType("interpretation");
    setContent("");
    setError(null);
    setStep("landing");
  }

  // Landing Page
  if (step === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl border-indigo-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-[Rubik] text-indigo-800">
              Contribute to the Ifa Knowledge Library
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600 leading-relaxed">
              Share your lineage insights, interpretations, corrections, or additional
              knowledge to help expand the IfaDivinity community library.
            </p>
            <Button
              className="bg-indigo-700 hover:bg-indigo-800 text-white px-8 py-3 text-lg"
              onClick={() => setStep("form")}
            >
              Submit Contribution
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Thank You Page
  if (step === "thank_you") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl border-green-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-[Rubik] text-green-800">
              Thank You!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600 leading-relaxed">
              Your contribution has been submitted and is awaiting review by our
              moderation team.
            </p>
            <Button
              variant="outline"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              onClick={resetForm}
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Contribution Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl border-indigo-200">
          <CardHeader>
            <CardTitle className="text-xl font-[Rubik] text-indigo-800">
              Submit a Contribution
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Share your knowledge about a specific Odu.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Odu Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Odu</label>
              <select
                value={oduCode}
                onChange={(e) => setOduCode(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select an Odu…</option>
                {oduOptions.map((o) => (
                  <option key={o.id} value={o.odu_code}>
                    {o.odu_code}
                  </option>
                ))}
              </select>
            </div>

            {/* Contribution Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Type of Contribution
              </label>
              <select
                value={contributionType}
                onChange={(e) => setContributionType(e.target.value as ContributionType)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {CONTRIBUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Contribution Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Share your interpretation, correction, variant, or knowledge…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setStep("landing")}
              >
                Cancel
              </Button>
              <Button
                className="bg-indigo-700 hover:bg-indigo-800 text-white"
                onClick={handleSubmit}
                disabled={submitting || !oduCode || !content.trim()}
              >
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}