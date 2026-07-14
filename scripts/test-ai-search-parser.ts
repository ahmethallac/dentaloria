// Regression test for src/lib/aiSearchParser.ts.
// Run with: npx tsx scripts/test-ai-search-parser.ts
//
// Fetches the REAL treatments/cities/countries from the live Supabase
// project (same public anon key already committed in
// src/integrations/supabase/client.ts) so this catches real-world
// mismatches between what patients type and the actual stored data —
// not just whatever a hand-written mock happens to look like.

import { parseSearchQuery, type SearchableData } from "../src/lib/aiSearchParser";

const SUPABASE_URL = "https://lbnpnjyhmxmcurffmcom.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxibnBuanlobXhtY3VyZmZtY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTk5NjEsImV4cCI6MjA2OTU3NTk2MX0.ZxaOF-fdk3orrvqCCR8qdLmDEcv81FlmCM1XRQ3Odg8";

async function fetchTable(table: string, select: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}`, {
    headers: { apikey: SUPABASE_KEY },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${table}: ${res.status}`);
  return res.json();
}

interface Case {
  query: string;
  expect: {
    treatment?: string | null;
    city?: string | null;
    country?: string | null;
    languages?: string[];
    sort?: string | null;
  };
}

// Every case here is either a real bug Ahmet found in production, or an
// already-confirmed-working case kept so a future fix can't silently
// re-break it.
const CASES: Case[] = [
  {
    query: "Antalyadaki almanca hizmet verenler",
    expect: { city: "Antalya", languages: ["de"] },
  },
  {
    query: "İstanbul'daki klinikler",
    expect: { city: "Istanbul" },
  },
  {
    query: "istanbuldaki klinikler",
    expect: { city: "Istanbul" },
  },
  {
    query: "Cheapest dental implant clinics in Antalya",
    expect: { city: "Antalya", treatment: "All-on-4 Dental Implants", sort: "price_asc" },
  },
  {
    query: "Highest rated Hollywood Smile clinics in Istanbul",
    expect: { city: "Istanbul", treatment: "Porcelain Veneers", sort: "rating" },
  },
  {
    query: "Dental clinics in Antalya that speak Polish",
    expect: { city: "Antalya", languages: ["pl"], treatment: null },
  },
  {
    query: "Best veneers clinics in Izmir",
    expect: { city: "Izmir", treatment: "Porcelain Veneers", sort: "rating" },
  },
  {
    query: "Affordable teeth whitening in Istanbul",
    expect: { city: "Istanbul", treatment: "Teeth Whitening", sort: "price_asc" },
  },
  {
    query: "All-on-4 implants in Antalya",
    expect: { city: "Antalya", treatment: "All-on-4 Dental Implants" },
  },
  {
    query: "kızım için ağzı bozmayacak bir şeyler istiyorum",
    expect: { city: null, treatment: null, languages: [], sort: null },
  },
  {
    query: "kızım için ağzı bozmayacak bir implant istiyorum",
    expect: { city: null, treatment: "All-on-4 Dental Implants" },
  },
];

async function main() {
  const [treatments, cities, countries] = await Promise.all([
    fetchTable("treatments", "id,name"),
    fetchTable("cities", "id,name,country_id"),
    fetchTable("countries", "id,name"),
  ]);
  const data: SearchableData = { treatments, cities, countries };

  let failed = 0;

  for (const { query, expect } of CASES) {
    const parsed = parseSearchQuery(query, data);
    const treatmentName = data.treatments.find((t) => t.id === parsed.treatmentId)?.name ?? null;
    const cityName = data.cities.find((c) => c.id === parsed.cityId)?.name ?? null;
    const countryName = data.countries.find((c) => c.id === parsed.countryId)?.name ?? null;

    const problems: string[] = [];
    if ("treatment" in expect && treatmentName !== expect.treatment) {
      problems.push(`treatment: expected ${JSON.stringify(expect.treatment)}, got ${JSON.stringify(treatmentName)}`);
    }
    if ("city" in expect && cityName !== expect.city) {
      problems.push(`city: expected ${JSON.stringify(expect.city)}, got ${JSON.stringify(cityName)}`);
    }
    if ("country" in expect && countryName !== expect.country) {
      problems.push(`country: expected ${JSON.stringify(expect.country)}, got ${JSON.stringify(countryName)}`);
    }
    if (expect.languages && JSON.stringify([...parsed.languageCodes].sort()) !== JSON.stringify([...expect.languages].sort())) {
      problems.push(`languages: expected ${JSON.stringify(expect.languages)}, got ${JSON.stringify(parsed.languageCodes)}`);
    }
    if ("sort" in expect && (parsed.sortBy ?? null) !== expect.sort) {
      problems.push(`sort: expected ${JSON.stringify(expect.sort)}, got ${JSON.stringify(parsed.sortBy ?? null)}`);
    }

    if (problems.length > 0) {
      failed++;
      console.log(`FAIL  "${query}"`);
      for (const p of problems) console.log(`      ${p}`);
    } else {
      console.log(`PASS  "${query}"`);
    }
  }

  console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
