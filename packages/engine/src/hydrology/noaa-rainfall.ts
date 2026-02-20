/**
 * NOAA Atlas 14 Rainfall Data — bundled lookup by US state/region.
 *
 * Provides 24-hour precipitation frequency estimates for common return periods.
 * Values are representative state-wide averages from NOAA Atlas 14 Volume datasets.
 * Engineers should verify with location-specific data for final design.
 *
 * Units: inches (24-hour duration)
 */

export interface PrecipFrequencyData {
  /** State abbreviation */
  state: string;
  /** State full name */
  name: string;
  /** SCS rainfall distribution type for this region */
  stormType: "I" | "IA" | "II" | "III";
  /** 24-hour rainfall depths by return period (inches) */
  depths: {
    "2yr": number;
    "5yr": number;
    "10yr": number;
    "25yr": number;
    "50yr": number;
    "100yr": number;
  };
}

/**
 * Representative 24-hour precipitation depths by state.
 * Source: NOAA Atlas 14, state-wide median values.
 * Storm types follow SCS rainfall distribution regions.
 */
export const STATE_RAINFALL_DATA: PrecipFrequencyData[] = [
  // Northeast — Type II (most), Type III (coastal)
  { state: "CT", name: "Connecticut",     stormType: "II",  depths: { "2yr": 3.2, "5yr": 4.2, "10yr": 5.0, "25yr": 6.0, "50yr": 6.8, "100yr": 7.6 } },
  { state: "DE", name: "Delaware",        stormType: "II",  depths: { "2yr": 3.1, "5yr": 4.0, "10yr": 4.7, "25yr": 5.8, "50yr": 6.5, "100yr": 7.3 } },
  { state: "ME", name: "Maine",           stormType: "II",  depths: { "2yr": 2.7, "5yr": 3.5, "10yr": 4.2, "25yr": 5.2, "50yr": 5.9, "100yr": 6.7 } },
  { state: "MD", name: "Maryland",        stormType: "II",  depths: { "2yr": 3.2, "5yr": 4.1, "10yr": 4.9, "25yr": 6.0, "50yr": 6.8, "100yr": 7.6 } },
  { state: "MA", name: "Massachusetts",   stormType: "II",  depths: { "2yr": 3.1, "5yr": 4.0, "10yr": 4.8, "25yr": 5.8, "50yr": 6.6, "100yr": 7.4 } },
  { state: "NH", name: "New Hampshire",   stormType: "II",  depths: { "2yr": 2.8, "5yr": 3.6, "10yr": 4.3, "25yr": 5.3, "50yr": 6.1, "100yr": 6.9 } },
  { state: "NJ", name: "New Jersey",      stormType: "II",  depths: { "2yr": 3.3, "5yr": 4.3, "10yr": 5.1, "25yr": 6.2, "50yr": 7.0, "100yr": 7.9 } },
  { state: "NY", name: "New York",        stormType: "II",  depths: { "2yr": 2.9, "5yr": 3.7, "10yr": 4.4, "25yr": 5.4, "50yr": 6.2, "100yr": 7.0 } },
  { state: "PA", name: "Pennsylvania",    stormType: "II",  depths: { "2yr": 2.9, "5yr": 3.7, "10yr": 4.4, "25yr": 5.4, "50yr": 6.2, "100yr": 7.0 } },
  { state: "RI", name: "Rhode Island",    stormType: "II",  depths: { "2yr": 3.2, "5yr": 4.1, "10yr": 4.9, "25yr": 6.0, "50yr": 6.8, "100yr": 7.6 } },
  { state: "VT", name: "Vermont",         stormType: "II",  depths: { "2yr": 2.7, "5yr": 3.4, "10yr": 4.1, "25yr": 5.0, "50yr": 5.7, "100yr": 6.5 } },

  // Southeast — Type II/III
  { state: "AL", name: "Alabama",         stormType: "III", depths: { "2yr": 4.2, "5yr": 5.6, "10yr": 6.6, "25yr": 8.0, "50yr": 9.0, "100yr": 10.2 } },
  { state: "FL", name: "Florida",         stormType: "III", depths: { "2yr": 4.8, "5yr": 6.3, "10yr": 7.5, "25yr": 9.2, "50yr": 10.5, "100yr": 12.0 } },
  { state: "GA", name: "Georgia",         stormType: "III", depths: { "2yr": 3.8, "5yr": 5.0, "10yr": 5.9, "25yr": 7.2, "50yr": 8.2, "100yr": 9.3 } },
  { state: "NC", name: "North Carolina",  stormType: "III", depths: { "2yr": 3.6, "5yr": 4.7, "10yr": 5.6, "25yr": 6.9, "50yr": 7.8, "100yr": 8.8 } },
  { state: "SC", name: "South Carolina",  stormType: "III", depths: { "2yr": 3.9, "5yr": 5.1, "10yr": 6.1, "25yr": 7.5, "50yr": 8.5, "100yr": 9.6 } },
  { state: "VA", name: "Virginia",        stormType: "II",  depths: { "2yr": 3.2, "5yr": 4.1, "10yr": 4.9, "25yr": 6.0, "50yr": 6.8, "100yr": 7.7 } },
  { state: "WV", name: "West Virginia",   stormType: "II",  depths: { "2yr": 2.7, "5yr": 3.4, "10yr": 4.1, "25yr": 5.0, "50yr": 5.7, "100yr": 6.5 } },

  // Midwest — Type II
  { state: "IL", name: "Illinois",        stormType: "II",  depths: { "2yr": 3.0, "5yr": 3.9, "10yr": 4.6, "25yr": 5.6, "50yr": 6.4, "100yr": 7.2 } },
  { state: "IN", name: "Indiana",         stormType: "II",  depths: { "2yr": 2.9, "5yr": 3.7, "10yr": 4.4, "25yr": 5.4, "50yr": 6.2, "100yr": 7.0 } },
  { state: "IA", name: "Iowa",            stormType: "II",  depths: { "2yr": 2.8, "5yr": 3.6, "10yr": 4.3, "25yr": 5.3, "50yr": 6.0, "100yr": 6.8 } },
  { state: "KS", name: "Kansas",          stormType: "II",  depths: { "2yr": 2.9, "5yr": 3.8, "10yr": 4.5, "25yr": 5.6, "50yr": 6.4, "100yr": 7.3 } },
  { state: "KY", name: "Kentucky",        stormType: "II",  depths: { "2yr": 3.1, "5yr": 4.0, "10yr": 4.7, "25yr": 5.7, "50yr": 6.5, "100yr": 7.3 } },
  { state: "MI", name: "Michigan",        stormType: "II",  depths: { "2yr": 2.5, "5yr": 3.2, "10yr": 3.8, "25yr": 4.7, "50yr": 5.4, "100yr": 6.1 } },
  { state: "MN", name: "Minnesota",       stormType: "II",  depths: { "2yr": 2.6, "5yr": 3.3, "10yr": 3.9, "25yr": 4.8, "50yr": 5.5, "100yr": 6.3 } },
  { state: "MO", name: "Missouri",        stormType: "II",  depths: { "2yr": 3.2, "5yr": 4.1, "10yr": 4.9, "25yr": 6.0, "50yr": 6.9, "100yr": 7.8 } },
  { state: "NE", name: "Nebraska",        stormType: "II",  depths: { "2yr": 2.7, "5yr": 3.5, "10yr": 4.1, "25yr": 5.1, "50yr": 5.8, "100yr": 6.6 } },
  { state: "ND", name: "North Dakota",    stormType: "II",  depths: { "2yr": 2.1, "5yr": 2.7, "10yr": 3.2, "25yr": 3.9, "50yr": 4.5, "100yr": 5.1 } },
  { state: "OH", name: "Ohio",            stormType: "II",  depths: { "2yr": 2.7, "5yr": 3.5, "10yr": 4.1, "25yr": 5.0, "50yr": 5.7, "100yr": 6.5 } },
  { state: "OK", name: "Oklahoma",        stormType: "II",  depths: { "2yr": 3.4, "5yr": 4.4, "10yr": 5.3, "25yr": 6.5, "50yr": 7.5, "100yr": 8.5 } },
  { state: "SD", name: "South Dakota",    stormType: "II",  depths: { "2yr": 2.3, "5yr": 3.0, "10yr": 3.5, "25yr": 4.3, "50yr": 5.0, "100yr": 5.7 } },
  { state: "TN", name: "Tennessee",       stormType: "II",  depths: { "2yr": 3.5, "5yr": 4.5, "10yr": 5.3, "25yr": 6.5, "50yr": 7.4, "100yr": 8.4 } },
  { state: "WI", name: "Wisconsin",       stormType: "II",  depths: { "2yr": 2.6, "5yr": 3.3, "10yr": 3.9, "25yr": 4.8, "50yr": 5.5, "100yr": 6.3 } },

  // South Central — Type II/III
  { state: "AR", name: "Arkansas",        stormType: "II",  depths: { "2yr": 3.5, "5yr": 4.5, "10yr": 5.4, "25yr": 6.6, "50yr": 7.5, "100yr": 8.5 } },
  { state: "LA", name: "Louisiana",       stormType: "III", depths: { "2yr": 4.8, "5yr": 6.2, "10yr": 7.3, "25yr": 8.9, "50yr": 10.2, "100yr": 11.5 } },
  { state: "MS", name: "Mississippi",     stormType: "III", depths: { "2yr": 4.2, "5yr": 5.5, "10yr": 6.5, "25yr": 7.9, "50yr": 9.0, "100yr": 10.1 } },
  { state: "TX", name: "Texas",           stormType: "III", depths: { "2yr": 3.5, "5yr": 4.6, "10yr": 5.5, "25yr": 6.8, "50yr": 7.8, "100yr": 8.9 } },

  // Mountain West — Type II
  { state: "AZ", name: "Arizona",         stormType: "II",  depths: { "2yr": 1.6, "5yr": 2.1, "10yr": 2.5, "25yr": 3.1, "50yr": 3.5, "100yr": 4.0 } },
  { state: "CO", name: "Colorado",        stormType: "II",  depths: { "2yr": 1.7, "5yr": 2.2, "10yr": 2.7, "25yr": 3.4, "50yr": 3.9, "100yr": 4.5 } },
  { state: "ID", name: "Idaho",           stormType: "II",  depths: { "2yr": 1.3, "5yr": 1.7, "10yr": 2.0, "25yr": 2.5, "50yr": 2.9, "100yr": 3.3 } },
  { state: "MT", name: "Montana",         stormType: "II",  depths: { "2yr": 1.5, "5yr": 1.9, "10yr": 2.3, "25yr": 2.8, "50yr": 3.2, "100yr": 3.7 } },
  { state: "NV", name: "Nevada",          stormType: "II",  depths: { "2yr": 1.1, "5yr": 1.4, "10yr": 1.7, "25yr": 2.1, "50yr": 2.5, "100yr": 2.8 } },
  { state: "NM", name: "New Mexico",      stormType: "II",  depths: { "2yr": 1.6, "5yr": 2.1, "10yr": 2.5, "25yr": 3.1, "50yr": 3.5, "100yr": 4.0 } },
  { state: "UT", name: "Utah",            stormType: "II",  depths: { "2yr": 1.3, "5yr": 1.7, "10yr": 2.0, "25yr": 2.5, "50yr": 2.9, "100yr": 3.3 } },
  { state: "WY", name: "Wyoming",         stormType: "II",  depths: { "2yr": 1.4, "5yr": 1.8, "10yr": 2.1, "25yr": 2.6, "50yr": 3.0, "100yr": 3.5 } },

  // Pacific — Type I/IA
  { state: "AK", name: "Alaska",          stormType: "I",   depths: { "2yr": 1.8, "5yr": 2.4, "10yr": 2.8, "25yr": 3.5, "50yr": 4.0, "100yr": 4.6 } },
  { state: "CA", name: "California",      stormType: "I",   depths: { "2yr": 2.2, "5yr": 3.2, "10yr": 3.9, "25yr": 5.0, "50yr": 5.8, "100yr": 6.7 } },
  { state: "HI", name: "Hawaii",          stormType: "I",   depths: { "2yr": 4.0, "5yr": 5.5, "10yr": 6.7, "25yr": 8.5, "50yr": 9.8, "100yr": 11.2 } },
  { state: "OR", name: "Oregon",          stormType: "IA",  depths: { "2yr": 2.3, "5yr": 3.0, "10yr": 3.5, "25yr": 4.3, "50yr": 5.0, "100yr": 5.7 } },
  { state: "WA", name: "Washington",      stormType: "IA",  depths: { "2yr": 2.2, "5yr": 2.8, "10yr": 3.3, "25yr": 4.0, "50yr": 4.6, "100yr": 5.3 } },

  // DC
  { state: "DC", name: "District of Columbia", stormType: "II", depths: { "2yr": 3.3, "5yr": 4.2, "10yr": 5.0, "25yr": 6.1, "50yr": 7.0, "100yr": 7.9 } },
];

export type ReturnPeriod = "2yr" | "5yr" | "10yr" | "25yr" | "50yr" | "100yr";

/**
 * Look up rainfall data for a given state.
 */
export function getRainfallByState(stateCode: string): PrecipFrequencyData | undefined {
  return STATE_RAINFALL_DATA.find(
    (d) => d.state === stateCode.toUpperCase(),
  );
}

/**
 * Get the 24-hour rainfall depth for a state and return period.
 */
export function getRainfallDepth(
  stateCode: string,
  returnPeriod: ReturnPeriod,
): number | undefined {
  const data = getRainfallByState(stateCode);
  if (!data) return undefined;
  return data.depths[returnPeriod];
}

/**
 * Auto-generate rainfall events for a state.
 * Creates standard events (2yr, 10yr, 25yr, 100yr) with the correct
 * storm type and rainfall depths for that state.
 */
export function generateEventsForState(
  stateCode: string,
): { id: string; label: string; stormType: "I" | "IA" | "II" | "III"; totalDepth: number }[] {
  const data = getRainfallByState(stateCode);
  if (!data) return [];

  const periods: { id: ReturnPeriod; label: string }[] = [
    { id: "2yr", label: "2-Year Storm" },
    { id: "10yr", label: "10-Year Storm" },
    { id: "25yr", label: "25-Year Storm" },
    { id: "100yr", label: "100-Year Storm" },
  ];

  return periods.map((p) => ({
    id: p.id,
    label: `${p.label} (${data.depths[p.id]}")`,
    stormType: data.stormType,
    totalDepth: data.depths[p.id],
  }));
}

/**
 * Get all available states sorted by name.
 */
export function getAvailableStates(): { code: string; name: string }[] {
  return STATE_RAINFALL_DATA
    .map((d) => ({ code: d.state, name: d.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
