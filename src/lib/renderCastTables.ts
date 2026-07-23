import { supabase, TABLES } from './supabase';

/**
 * render_cast2, render_cast3, render_cast4 modules
 *
 * Render Ire/Osogbo (cast2), subtype (cast3), and Orisha owner (cast4)
 * according to house-specific cast tables stored in house_profile.
 *
 * Each cast table is a JSON mapping like:
 *   { "ire": "Ire (Blessing)", "osogbo": "Osogbo (Obstacle)" }
 */

export interface RenderCast2Input {
  ire_or_osogbo: string;
  house_id: string;
}

export interface RenderCast2Output {
  cast2_display: string;
}

export interface RenderCast3Input {
  subtype: string;
  house_id: string;
}

export interface RenderCast3Output {
  cast3_display: string;
}

export interface RenderCast4Input {
  orisha_owner: string;
  house_id: string;
}

export interface RenderCast4Output {
  cast4_display: string;
}

/**
 * Apply a cast table mapping to a value.
 * If the value exists as a key in the table, return the mapped display value.
 * Falls back to the original value if no mapping found.
 */
function applyCastTable(
  value: string | null,
  table: Record<string, string> | null
): string {
  if (!value) return 'N/A';
  if (!table || typeof table !== 'object') return value;

  // Direct match
  if (table[value]) return table[value];

  // Case-insensitive match
  const lowerValue = value.toLowerCase();
  for (const [key, mapped] of Object.entries(table)) {
    if (key.toLowerCase() === lowerValue) {
      return mapped;
    }
  }

  return value;
}

/**
 * render_cast2: Render Ire/Osogbo according to house-specific cast2 table.
 */
export async function renderCast2(
  input: RenderCast2Input
): Promise<RenderCast2Output> {
  const { ire_or_osogbo, house_id } = input;

  const { data: house } = await supabase
    .from(TABLES.house_profile)
    .select('cast2_table')
    .eq('id', house_id)
    .single();

  const rendered = applyCastTable(ire_or_osogbo, house?.cast2_table || null);

  return { cast2_display: rendered };
}

/**
 * render_cast3: Render subtype according to house-specific cast3 table.
 */
export async function renderCast3(
  input: RenderCast3Input
): Promise<RenderCast3Output> {
  const { subtype, house_id } = input;

  const { data: house } = await supabase
    .from(TABLES.house_profile)
    .select('cast3_table')
    .eq('id', house_id)
    .single();

  const rendered = applyCastTable(subtype, house?.cast3_table || null);

  return { cast3_display: rendered };
}

/**
 * render_cast4: Render Orisha owner according to house-specific cast4 table.
 */
export async function renderCast4(
  input: RenderCast4Input
): Promise<RenderCast4Output> {
  const { orisha_owner, house_id } = input;

  const { data: house } = await supabase
    .from(TABLES.house_profile)
    .select('cast4_table')
    .eq('id', house_id)
    .single();

  const rendered = applyCastTable(orisha_owner, house?.cast4_table || null);

  return { cast4_display: rendered };
}