import { supabase, TABLES } from './supabase';

/**
 * render_odu_name module
 *
 * Render Odu name according to house tradition, spelling map, and variants.
 * Fetches house profile for tradition + spelling_map, then odu_name_map for
 * Yoruba/Lukumi names, selects by tradition, and applies house spelling overrides.
 */

export interface RenderOduNameInput {
  odu_code: string;
  house_id: string;
}

export interface RenderOduNameOutput {
  odu_display_name: string;
}

/**
 * Select the tradition-appropriate base Odu name.
 */
function selectTraditionName(
  tradition: string | null,
  yoruba_name: string | null,
  lukumi_name: string | null
): string {
  if (tradition === 'lukumi' && lukumi_name) {
    return lukumi_name;
  }
  return yoruba_name || lukumi_name || 'Unknown Odu';
}

/**
 * Apply house-specific spelling overrides.
 * spelling_map is a JSON object like { "Ogbe": "Ògbè", "Irosun": "Ìrosùn" }
 */
function applySpellingMap(
  name: string,
  spellingMap: Record<string, string> | null
): string {
  if (!spellingMap || typeof spellingMap !== 'object') {
    return name;
  }
  // Direct match
  if (spellingMap[name]) {
    return spellingMap[name];
  }
  // Case-insensitive match
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(spellingMap)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  return name;
}

export async function renderOduName(
  input: RenderOduNameInput
): Promise<RenderOduNameOutput> {
  const { odu_code, house_id } = input;

  // Step 1: Fetch house profile
  const { data: house } = await supabase
    .from(TABLES.house_profile)
    .select('tradition, spelling_map')
    .eq('id', house_id)
    .single();

  // Step 2: Fetch odu_name_map
  const { data: oduMap } = await supabase
    .from(TABLES.odu_name_map)
    .select('yoruba_name, lukumi_name')
    .eq('odu_code', odu_code)
    .single();

  // Step 3: Select tradition name
  const baseName = selectTraditionName(
    house?.tradition || null,
    oduMap?.yoruba_name || null,
    oduMap?.lukumi_name || null
  );

  // Step 4: Apply spelling map
  const renderedName = applySpellingMap(baseName, house?.spelling_map || null);

  return { odu_display_name: renderedName };
}