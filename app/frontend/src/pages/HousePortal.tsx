import { useState, useEffect } from "react";
import { supabase, TABLES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type View = "landing" | "list" | "detail" | "odu_rules";

interface HouseProfile {
  id: string;
  name: string;
  tradition: string;
  spelling_map: unknown;
  pronunciation_map: unknown;
  cast2_table: unknown;
  cast3_table: unknown;
  cast4_table: unknown;
  updated_at: string;
}

interface HouseOduRule {
  id: string;
  house_id: string;
  pattern_key: string;
  odu_code: string;
  combined_name: string;
  result: string;
  subtype: string;
  recommended_ebo: string;
}

/**
 * Public House Portal
 *
 * Public-facing portal for exploring Ifa houses, traditions, lineage,
 * and naming conventions.
 *
 * Screens: Landing → List → Detail → Odu Rules
 */
export default function HousePortal() {
  const [view, setView] = useState<View>("landing");
  const [houses, setHouses] = useState<HouseProfile[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<HouseProfile | null>(null);
  const [oduRules, setOduRules] = useState<HouseOduRule[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadHouses() {
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.house_profile)
      .select("*")
      .order("name");

    if (!error && data) {
      setHouses(data as HouseProfile[]);
    }
    setLoading(false);
  }

  async function loadHouseDetail(houseId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.house_profile)
      .select("*")
      .eq("id", houseId)
      .single();

    if (!error && data) {
      setSelectedHouse(data as HouseProfile);
    }
    setLoading(false);
  }

  async function loadOduRules(houseId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.house_odu_rule)
      .select("*")
      .eq("house_id", houseId)
      .order("pattern_key");

    if (!error && data) {
      setOduRules(data as HouseOduRule[]);
    }
    setLoading(false);
  }

  function navigateToList() {
    loadHouses();
    setView("list");
  }

  function navigateToDetail(houseId: string) {
    loadHouseDetail(houseId);
    setView("detail");
  }

  function navigateToOduRules(houseId: string) {
    loadOduRules(houseId);
    setView("odu_rules");
  }

  function renderJsonField(value: unknown, label: string) {
    if (!value) return <p className="text-gray-400 italic text-sm">Not configured</p>;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return (
          <pre className="bg-gray-50 border rounded-lg p-3 text-xs overflow-x-auto max-h-48">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch {
        return <p className="text-sm text-gray-700">{value}</p>;
      }
    }
    return (
      <pre className="bg-gray-50 border rounded-lg p-3 text-xs overflow-x-auto max-h-48">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  // Landing
  if (view === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl border-indigo-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-[Rubik] text-indigo-800">
              Explore Ifa Houses
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600 leading-relaxed">
              Learn about the traditions, lineage, naming conventions, and spiritual
              identity of each participating Ifa house.
            </p>
            <Button
              className="bg-indigo-700 hover:bg-indigo-800 text-white px-8 py-3 text-lg"
              onClick={navigateToList}
            >
              Browse Houses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // House List
  if (view === "list") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-[Rubik] text-indigo-800">Ifa Houses</h1>
            <Button variant="outline" size="sm" onClick={() => setView("landing")}>
              ← Back
            </Button>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading houses…</p>
          ) : houses.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="py-8 text-center text-gray-500">
                No houses registered yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {houses.map((house) => (
                <Card
                  key={house.id}
                  className="border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigateToDetail(house.id)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-indigo-900 text-lg">{house.name}</p>
                        <p className="text-sm text-gray-500">
                          {house.tradition || "Tradition not specified"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {house.tradition && (
                          <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50">
                            {house.tradition}
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" className="text-indigo-600">
                          View →
                        </Button>
                      </div>
                    </div>
                    {house.updated_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Updated: {new Date(house.updated_at).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // House Detail
  if (view === "detail" && selectedHouse) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={navigateToList}>
              ← Back to Houses
            </Button>
            <h1 className="text-2xl font-[Rubik] text-indigo-800">{selectedHouse.name}</h1>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading…</p>
          ) : (
            <>
              {/* Basic Info */}
              <Card className="border-indigo-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">House Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">House Name</p>
                      <p className="font-semibold text-indigo-900">{selectedHouse.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tradition</p>
                      <p className="font-medium">{selectedHouse.tradition || "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Spelling Map */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Spelling Map</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderJsonField(selectedHouse.spelling_map, "Spelling Map")}
                </CardContent>
              </Card>

              {/* Pronunciation Map */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Pronunciation Map</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderJsonField(selectedHouse.pronunciation_map, "Pronunciation Map")}
                </CardContent>
              </Card>

              {/* Cast Tables */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Cast Tables</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Cast2 Table (Ire/Osogbo)</p>
                    {renderJsonField(selectedHouse.cast2_table, "Cast2")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Cast3 Table (Subtype)</p>
                    {renderJsonField(selectedHouse.cast3_table, "Cast3")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Cast4 Table (Orisha Owner)</p>
                    {renderJsonField(selectedHouse.cast4_table, "Cast4")}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  className="bg-indigo-700 hover:bg-indigo-800 text-white"
                  onClick={() => navigateToOduRules(selectedHouse.id)}
                >
                  View House Odu Rules
                </Button>
                <Button variant="outline" onClick={navigateToList}>
                  Back to Houses
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Odu Rules
  if (view === "odu_rules" && selectedHouse) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigateToDetail(selectedHouse.id)}>
              ← Back to House
            </Button>
            <h1 className="text-2xl font-[Rubik] text-indigo-800">
              Odu Rules — {selectedHouse.name}
            </h1>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading rules…</p>
          ) : oduRules.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="py-8 text-center text-gray-500">
                No Odu rules defined for this house yet.
              </CardContent>
            </Card>
          ) : (
            <Card className="border-indigo-200">
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Pattern Key</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Odu Code</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Combined Name</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Result</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Subtype</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Recommended Ebo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oduRules.map((rule) => (
                        <tr key={rule.id} className="border-b border-gray-100 hover:bg-indigo-50/30">
                          <td className="py-2 px-3 font-mono text-xs">{rule.pattern_key}</td>
                          <td className="py-2 px-3 font-semibold text-indigo-800">{rule.odu_code}</td>
                          <td className="py-2 px-3">{rule.combined_name}</td>
                          <td className="py-2 px-3">
                            <Badge
                              variant="outline"
                              className={
                                rule.result === "ire"
                                  ? "border-green-400 text-green-700 bg-green-50"
                                  : "border-red-400 text-red-700 bg-red-50"
                              }
                            >
                              {rule.result}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-gray-600">{rule.subtype || "—"}</td>
                          <td className="py-2 px-3 text-gray-600">{rule.recommended_ebo || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
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