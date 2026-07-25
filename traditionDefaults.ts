/**
 * Tradition-specific defaults for House Profile creation.
 * 
 * Phase1b Ifa Engine architecture: Each tradition (Yoruba / Lucumí)
 * has its own spelling conventions, pronunciation guides, and cast tables.
 * 
 * Cast2 = Ire/Osogbo (2 outcomes)
 * Cast3 = Subtypes (expanded outcomes)
 * Cast4 = Orisha owners (16 primary Odu mapped to Orisha)
 */

// ─── 16 Principal Odu Names ───────────────────────────────────────────────────

const YORUBA_ODU_NAMES: Record<string, string> = {
  '0000': 'Ogbe Meji',
  '0001': 'Oyeku Meji',
  '0010': 'Iwori Meji',
  '0011': 'Odi Meji',
  '0100': 'Irosun Meji',
  '0101': 'Owonrin Meji',
  '0110': 'Obara Meji',
  '0111': 'Okanran Meji',
  '1000': 'Ogunda Meji',
  '1001': 'Osa Meji',
  '1010': 'Ika Meji',
  '1011': 'Oturupon Meji',
  '1100': 'Otura Meji',
  '1101': 'Irete Meji',
  '1110': 'Ose Meji',
  '1111': 'Ofun Meji',
};

const LUCUMI_ODU_NAMES: Record<string, string> = {
  '0000': 'Ejiogbe',
  '0001': 'Oyekun Meji',
  '0010': 'Iwori Meji',
  '0011': 'Odi Meji',
  '0100': 'Iroso Meji',
  '0101': 'Ojuani Meji',
  '0110': 'Obara Meji',
  '0111': 'Okana Meji',
  '1000': 'Ogunda Meji',
  '1001': 'Osa Meji',
  '1010': 'Ika Meji',
  '1011': 'Otrupon Meji',
  '1100': 'Otura Meji',
  '1101': 'Irete Meji',
  '1110': 'Oche Meji',
  '1111': 'Ofun Meji',
};

// ─── Spelling Maps ────────────────────────────────────────────────────────────

export const YORUBA_SPELLING_MAP: Record<string, string> = {
  Ogbe: 'Ògbè',
  Oyeku: 'Òyèkú',
  Iwori: 'Ìwòrì',
  Odi: 'Òdí',
  Irosun: 'Ìrosùn',
  Owonrin: 'Òwónrín',
  Obara: 'Òbàrà',
  Okanran: 'Òkànràn',
  Ogunda: 'Ògúndá',
  Osa: 'Òsá',
  Ika: 'Ìká',
  Oturupon: 'Òtúrúpòn',
  Otura: 'Òtúrá',
  Irete: 'Ìrètè',
  Ose: 'Òsé',
  Ofun: 'Òfún',
};

export const LUCUMI_SPELLING_MAP: Record<string, string> = {
  Ogbe: 'Ejiogbe',
  Oyeku: 'Oyekun',
  Iwori: 'Iwori',
  Odi: 'Odi',
  Irosun: 'Iroso',
  Owonrin: 'Ojuani',
  Obara: 'Obara',
  Okanran: 'Okana',
  Ogunda: 'Ogunda',
  Osa: 'Osa',
  Ika: 'Ika',
  Oturupon: 'Otrupon',
  Otura: 'Otura',
  Irete: 'Irete',
  Ose: 'Oche',
  Ofun: 'Ofun',
};

// ─── Pronunciation Maps ───────────────────────────────────────────────────────

export const YORUBA_PRONUNCIATION_MAP: Record<string, string> = {
  Ogbe: 'ohg-beh',
  Oyeku: 'oh-yeh-koo',
  Iwori: 'ee-woh-ree',
  Odi: 'oh-dee',
  Irosun: 'ee-roh-soon',
  Owonrin: 'oh-wohn-reen',
  Obara: 'oh-bah-rah',
  Okanran: 'oh-kahn-rahn',
  Ogunda: 'oh-goon-dah',
  Osa: 'oh-sah',
  Ika: 'ee-kah',
  Oturupon: 'oh-too-roo-pohn',
  Otura: 'oh-too-rah',
  Irete: 'ee-reh-teh',
  Ose: 'oh-seh',
  Ofun: 'oh-foon',
};

export const LUCUMI_PRONUNCIATION_MAP: Record<string, string> = {
  Ejiogbe: 'eh-hee-ohg-beh',
  Oyekun: 'oh-yeh-koon',
  Iwori: 'ee-woh-ree',
  Odi: 'oh-dee',
  Iroso: 'ee-roh-soh',
  Ojuani: 'oh-hwah-nee',
  Obara: 'oh-bah-rah',
  Okana: 'oh-kah-nah',
  Ogunda: 'oh-goon-dah',
  Osa: 'oh-sah',
  Ika: 'ee-kah',
  Otrupon: 'oh-troo-pohn',
  Otura: 'oh-too-rah',
  Irete: 'ee-reh-teh',
  Oche: 'oh-cheh',
  Ofun: 'oh-foon',
};

// ─── Cast2 Tables (Ire / Osogbo) ─────────────────────────────────────────────

export const YORUBA_CAST2_TABLE: Record<string, string> = {
  ire: 'Ire (Àlàáfíà - Blessing)',
  osogbo: 'Osogbo (Ìdààmú - Obstacle)',
};

export const LUCUMI_CAST2_TABLE: Record<string, string> = {
  ire: 'Iré (Bendición - Blessing)',
  osogbo: 'Osobo (Obstáculo - Obstacle)',
};

// ─── Cast3 Tables (Subtypes of Ire/Osogbo) ───────────────────────────────────

export const YORUBA_CAST3_TABLE: Record<string, string> = {
  // Ire subtypes
  ire_aiku: 'Ire Àìkú (Long Life)',
  ire_aje: 'Ire Ajé (Wealth)',
  ire_omo: 'Ire Ọmọ (Children)',
  ire_elese_ogun: 'Ire Elésè Ògún (Victory)',
  ire_ariku: 'Ire Àríkú (Health)',
  ire_owo: 'Ire Owó (Money)',
  ire_aya: 'Ire Aya (Spouse/Marriage)',
  ire_gbogbo: 'Ire Gbogbo (All Blessings)',
  // Osogbo subtypes
  osogbo_iku: 'Osogbo Ikú (Death)',
  osogbo_arun: 'Osogbo Àrùn (Illness)',
  osogbo_ofo: 'Osogbo Ofó (Loss)',
  osogbo_epe: 'Osogbo Èpè (Curse)',
  osogbo_ewon: 'Osogbo Èwọ̀n (Imprisonment)',
  osogbo_ese: 'Osogbo Èsè (Affliction)',
  osogbo_oran: 'Osogbo Òràn (Trouble/Litigation)',
  osogbo_fitina: 'Osogbo Fìtínà (Conflict)',
};

export const LUCUMI_CAST3_TABLE: Record<string, string> = {
  // Iré subtypes
  ire_aiku: 'Iré Aikú (Larga Vida - Long Life)',
  ire_aje: 'Iré Ayé (Riqueza - Wealth)',
  ire_omo: 'Iré Omó (Hijos - Children)',
  ire_elese_ogun: 'Iré Elesé Ogún (Victoria - Victory)',
  ire_ariku: 'Iré Arikú (Salud - Health)',
  ire_owo: 'Iré Owó (Dinero - Money)',
  ire_aya: 'Iré Ayá (Matrimonio - Marriage)',
  ire_gbogbo: 'Iré Gbogbo (Todas las Bendiciones)',
  // Osobo subtypes
  osogbo_iku: 'Osobo Ikú (Muerte - Death)',
  osogbo_arun: 'Osobo Arún (Enfermedad - Illness)',
  osogbo_ofo: 'Osobo Ofó (Pérdida - Loss)',
  osogbo_epe: 'Osobo Epé (Maldición - Curse)',
  osogbo_ewon: 'Osobo Ewón (Prisión - Imprisonment)',
  osogbo_ese: 'Osobo Esé (Aflicción - Affliction)',
  osogbo_oran: 'Osobo Orán (Problema Legal - Litigation)',
  osogbo_fitina: 'Osobo Fitiná (Conflicto - Conflict)',
};

// ─── Cast4 Tables (Orisha Owners of the 16 Principal Odu) ─────────────────────

export const YORUBA_CAST4_TABLE: Record<string, string> = {
  Ogbe: 'Obàtálá',
  Oyeku: 'Odùduwà / Ọ̀rúnmìlà',
  Iwori: 'Ògún',
  Odi: 'Yemọja / Ọ̀ṣun',
  Irosun: 'Ọ̀ṣun',
  Owonrin: 'Ṣàngó / Oya',
  Obara: 'Ṣàngó',
  Okanran: 'Ògún / Ọbalúayé',
  Ogunda: 'Ògún',
  Osa: 'Oya',
  Ika: 'Ọ̀ṣóòsì / Ọbalúayé',
  Oturupon: 'Ọbalúayé / Nàná',
  Otura: 'Ọ̀rúnmìlà',
  Irete: 'Ọ̀rúnmìlà / Èṣù',
  Ose: 'Ọ̀ṣun',
  Ofun: 'Obàtálá / Ọ̀ṣàlá',
};

export const LUCUMI_CAST4_TABLE: Record<string, string> = {
  Ejiogbe: 'Obatalá',
  Oyekun: 'Oduduwá / Orúnmila',
  Iwori: 'Ogún',
  Odi: 'Yemayá / Oshún',
  Iroso: 'Oshún',
  Ojuani: 'Changó / Oyá',
  Obara: 'Changó',
  Okana: 'Ogún / Babalú Ayé',
  Ogunda: 'Ogún',
  Osa: 'Oyá',
  Ika: 'Ochosi / Babalú Ayé',
  Otrupon: 'Babalú Ayé / Naná Burukú',
  Otura: 'Orúnmila',
  Irete: 'Orúnmila / Elegguá',
  Oche: 'Oshún',
  Ofun: 'Obatalá',
};

// ─── Full Cast4 Table (all 256 combinations for 4-bit patterns) ───────────────
// For MVP, we provide the 16 principal Odu. Full 256 can be expanded later.

function buildFullCast4(tradition: 'yoruba' | 'lucumi'): Record<string, string> {
  return tradition === 'lucumi' ? LUCUMI_CAST4_TABLE : YORUBA_CAST4_TABLE;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type Tradition = 'yoruba' | 'lucumi';

export interface TraditionDefaults {
  spelling_map: Record<string, string>;
  pronunciation_map: Record<string, string>;
  cast2_table: Record<string, string>;
  cast3_table: Record<string, string>;
  cast4_table: Record<string, string>;
}

/**
 * Get all tradition-specific defaults for a given tradition.
 * Used by both the frontend (preview) and the backend (auto-populate on create).
 */
export function getTraditionDefaults(tradition: Tradition): TraditionDefaults {
  if (tradition === 'lucumi') {
    return {
      spelling_map: LUCUMI_SPELLING_MAP,
      pronunciation_map: LUCUMI_PRONUNCIATION_MAP,
      cast2_table: LUCUMI_CAST2_TABLE,
      cast3_table: LUCUMI_CAST3_TABLE,
      cast4_table: buildFullCast4('lucumi'),
    };
  }

  // Default: Yoruba (also covers 'isese' and other Yoruba-based traditions)
  return {
    spelling_map: YORUBA_SPELLING_MAP,
    pronunciation_map: YORUBA_PRONUNCIATION_MAP,
    cast2_table: YORUBA_CAST2_TABLE,
    cast3_table: YORUBA_CAST3_TABLE,
    cast4_table: buildFullCast4('yoruba'),
  };
}

/**
 * Normalize tradition string to the canonical key.
 * Maps various user inputs to 'yoruba' or 'lucumi'.
 */
export function normalizeTradition(tradition: string): Tradition {
  const lower = tradition.toLowerCase().trim();
  if (['lucumi', 'lucumí', 'lukumi', 'lukumí', 'regla de ocha', 'santeria', 'santería'].includes(lower)) {
    return 'lucumi';
  }
  // Everything else defaults to Yoruba (Isese, Candomble, Trinidad Orisha, etc.)
  return 'yoruba';
}

/**
 * Get the Odu names table for a tradition (used for cast table display).
 */
export function getOduNames(tradition: Tradition): Record<string, string> {
  return tradition === 'lucumi' ? LUCUMI_ODU_NAMES : YORUBA_ODU_NAMES;
}