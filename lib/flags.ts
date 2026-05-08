// Country code → flag emoji and name. Uses regional indicator unicode.
export function flag(cc: string): string {
  if (!cc || cc.length !== 2) return '🏳️';
  const a = cc.toUpperCase().charCodeAt(0);
  const b = cc.toUpperCase().charCodeAt(1);
  if (a < 65 || a > 90 || b < 65 || b > 90) return '🏳️';
  const base = 0x1f1e6;
  return String.fromCodePoint(base + (a - 65)) + String.fromCodePoint(base + (b - 65));
}

const NAMES: Record<string, string> = {
  IL: 'Israel', US: 'United States', GB: 'United Kingdom', DE: 'Germany',
  FR: 'France', IN: 'India', BR: 'Brazil', CA: 'Canada', AU: 'Australia',
  JP: 'Japan', CN: 'China', RU: 'Russia', IT: 'Italy', ES: 'Spain',
  NL: 'Netherlands', SE: 'Sweden', NO: 'Norway', FI: 'Finland', DK: 'Denmark',
  PL: 'Poland', UA: 'Ukraine', TR: 'Turkey', SA: 'Saudi Arabia', AE: 'UAE',
  EG: 'Egypt', ZA: 'South Africa', MX: 'Mexico', AR: 'Argentina', CL: 'Chile',
  KR: 'South Korea', SG: 'Singapore', HK: 'Hong Kong', TW: 'Taiwan',
  ID: 'Indonesia', TH: 'Thailand', VN: 'Vietnam', MY: 'Malaysia', PH: 'Philippines',
  PT: 'Portugal', GR: 'Greece', CH: 'Switzerland', AT: 'Austria', BE: 'Belgium',
  IE: 'Ireland', NZ: 'New Zealand', XX: 'Unknown',
};

export function countryName(cc: string): string {
  return NAMES[cc?.toUpperCase()] || cc || '—';
}
