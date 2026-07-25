import { useState, useEffect } from "react";
import { supabase, TABLES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type View = "landing" | "list" | "detail" | "verification";

interface AwoProfile {
  id: string;
  user_id: string;
  house_id: string;
  lineage: string;
  certification_status: string;
  updated_at: string;
}

interface HouseProfile {
  id: string;
  name: string;
  tradition: string;
}

/**
 * Public Awo Directory
 *
 * Public-facing directory of certified Awo with verification
 * and lineage profiles.
 *
 * Screens: Landing → List → Detail → Verification
 */
export default function AwoDirectory() {
  const [view, setView] = useState<View>("landing");
  const [awos, setAwos] = useState<AwoProfile[]>([]);
  const [selectedAwo, setSelectedAwo] = useState<AwoProfile | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<HouseProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterHouse, setFilterHouse] = useState("");
  const [filterLineage, setFilterLineage] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Verification
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Houses for filter dropdown
  const [houses, setHouses] = useState<HouseProfile[]>([]);

  useEffect(() => {
    async function loadHouses() {
      const { data } = await supabase
        .from(TABLES.house_profile)
        .select("id, name, tradition")
        .order("name");
      if (data) setHouses(data as HouseProfile[]);
    }
    loadHouses();
  }, []);

  async function loadAwos() {
    setLoading(true);
    let query = supabase
      .from(TABLES.awo_profile)
      .select("*")
      .order("updated_at", { ascending: false });

    if (filterHouse) query = query.eq("house_id", filterHouse);
    if (filterLineage) query = query.ilike("lineage", `%${filterLineage}%`);
    if (filterStatus) query = query.eq("certification_status", filterStatus);

    const { data, error } = await query;
    if (!error && data) setAwos(data as AwoProfile[]);
    setLoading(false);
  }

  async function loadAwoDetail(awoId: string) {
    setLoading(true);
    const { data: awoData } = await supabase
      .from(TABLES.awo_profile)
      .select("*")
      .eq("id", awoId)
      .single();

    if (awoData) {
      const awo = awoData as AwoProfile;
      setSelectedAwo(awo);

      // Fetch house info
      if (awo.house_id) {
        const { data: houseData } = await supabase
          .from(TABLES.house_profile)
          .select("id, name, tradition")
          .eq("id", awo.house_id)
          .single();
        if (houseData) setSelectedHouse(houseData as HouseProfile);
      }
    }
    setLoading(false);
  }

  function navigateToList() {
    loadAwos();
    setView("list");
  }

  function navigateToDetail(awoId: string) {
    loadAwoDetail(awoId);
    setView("detail");
  }

  function navigateToVerification() {
    setVerificationCode("");
    setVerificationResult(null);
    setView("verification");
  }

  function handleVerify() {
    setVerifying(true);
    // Simulated verification — in production this would call an API endpoint
    setTimeout(() => {
      if (verificationCode.trim().length >= 6) {
        setVerificationResult("verified");
      } else {
        setVerificationResult("invalid");
      }
      setVerifying(false);
    }, 1000);
  }

  function getStatusBadgeClass(status: string) {
    switch (status?.toLowerCase()) {
      case "certified":
      case "verified":
        return "border-green-500 text-green-700 bg-green-50";
      case "pending":
        return "border-amber-500 text-amber-700 bg-amber-50";
      case "revoked":
      case "expired":
        return "border-red-500 text-red-700 bg-red-50";
      default:
        return "border-gray-400 text-gray-600";
    }
  }

  function getHouseName(houseId: string) {
    const house = houses.find((h) => h.id === houseId);
    return house?.name || houseId;
  }

  // Landing
  if (view === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl border-indigo-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-[Rubik] text-indigo-800">
              Certified Awo Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600 leading-relaxed">
              Explore verified Awo across all participating houses. View lineage,
              tradition, and certification status.
            </p>
            <Button
              className="bg-indigo-700 hover:bg-indigo-800 text-white px-8 py-3 text-lg"
              onClick={navigateToList}
            >
              Browse Awo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verification
  if (view === "verification" && selectedAwo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigateToDetail(selectedAwo.id)}>
              ← Back to Profile
            </Button>
            <h1 className="text-2xl font-[Rubik] text-indigo-800">Verify Awo</h1>
          </div>

          <Card className="border-indigo-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Public Verification</CardTitle>
              <p className="text-sm text-gray-500">
                Enter the verification code to confirm this Awo's authenticity.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Verification Code</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter verification code…"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <Button
                className="bg-indigo-700 hover:bg-indigo-800 text-white w-full"
                onClick={handleVerify}
                disabled={verifying || !verificationCode.trim()}
              >
                {verifying ? "Verifying…" : "Verify"}
              </Button>

              {verificationResult === "verified" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-semibold text-green-800">Verified</p>
                  <p className="text-sm text-green-600">This Awo's certification is authentic.</p>
                </div>
              )}

              {verificationResult === "invalid" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="font-semibold text-red-800">Invalid Code</p>
                  <p className="text-sm text-red-600">
                    The verification code could not be confirmed. Please check and try again.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Detail
  if (view === "detail" && selectedAwo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={navigateToList}>
              ← Back to Directory
            </Button>
            <h1 className="text-2xl font-[Rubik] text-indigo-800">Awo Profile</h1>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading…</p>
          ) : (
            <>
              <Card className="border-indigo-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Profile Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Awo User ID</p>
                      <p className="font-mono text-xs text-gray-700">{selectedAwo.user_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">House</p>
                      <p className="font-semibold text-indigo-900">
                        {selectedHouse?.name || selectedAwo.house_id || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tradition</p>
                      <p className="font-medium">{selectedHouse?.tradition || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Lineage</p>
                      <p className="font-medium">{selectedAwo.lineage || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Certification Status</p>
                      <Badge variant="outline" className={getStatusBadgeClass(selectedAwo.certification_status)}>
                        {selectedAwo.certification_status || "Unknown"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p className="text-sm">
                        {selectedAwo.updated_at
                          ? new Date(selectedAwo.updated_at).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  className="bg-indigo-700 hover:bg-indigo-800 text-white"
                  onClick={navigateToVerification}
                >
                  Verify Awo
                </Button>
                <Button variant="outline" onClick={navigateToList}>
                  Back to Directory
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // List
  if (view === "list") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-[Rubik] text-indigo-800">Awo Directory</h1>
            <Button variant="outline" size="sm" onClick={() => setView("landing")}>
              ← Back
            </Button>
          </div>

          {/* Filters */}
          <Card className="border-gray-200">
            <CardContent className="pt-4">
              <div className="flex gap-4 flex-wrap">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    House
                  </label>
                  <select
                    value={filterHouse}
                    onChange={(e) => setFilterHouse(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Houses</option>
                    {houses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Lineage
                  </label>
                  <input
                    type="text"
                    value={filterLineage}
                    onChange={(e) => setFilterLineage(e.target.value)}
                    placeholder="Filter by lineage…"
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All</option>
                    <option value="certified">Certified</option>
                    <option value="pending">Pending</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button size="sm" onClick={loadAwos} className="bg-indigo-700 hover:bg-indigo-800 text-white">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Awo List */}
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading…</p>
          ) : awos.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="py-8 text-center text-gray-500">
                No Awo found matching your criteria.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {awos.map((awo) => (
                <Card
                  key={awo.id}
                  className="border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigateToDetail(awo.id)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-indigo-900">
                          {getHouseName(awo.house_id)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {awo.lineage || "Lineage not specified"} · Updated{" "}
                          {awo.updated_at ? new Date(awo.updated_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusBadgeClass(awo.certification_status)}>
                          {awo.certification_status || "Unknown"}
                        </Badge>
                        <Button variant="ghost" size="sm" className="text-indigo-600">
                          View →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading…</p>
    </div>
  );
}