// Plain config only — no googleapis import here. This file is safe to pull
// into client bundles (via source-links.ts); sync-gsheets.ts imports the
// live googleapis-backed client separately and must never be imported from
// a "use client" component.
//
// Resolved by hand against the live sheets (see GTM/closures tab inspection)
// — gids and header rows are exact, not guessed.
export const GSHEET_SOURCES = {
  crmActive: {
    label: "CRM Sales — CRM active",
    spreadsheetId: "1vj5zZpp4cnL-GYJjkPAGdoACu0dkxilLLz1dOE-zna8",
    gid: 1950942071,
    headerRow: 1,
  },
  crmLoyaltyClosures: {
    label: "CRM Sales — CRM+Loyalty closures",
    spreadsheetId: "1vj5zZpp4cnL-GYJjkPAGdoACu0dkxilLLz1dOE-zna8",
    gid: 421659588,
    headerRow: 2, // row 1 is a summary/totals block, not headers
  },
  crmGtmDemo: {
    label: "CRM GTM — Demo",
    spreadsheetId: "1niPe7V1g-LncgZYLZ3V3ZkjSijh35mJV4vDhvfQCu2U",
    gid: 910496136,
    headerRow: 1,
  },
  roadmap: {
    label: "CRM [Product] — Roadmap",
    spreadsheetId: "1Tf7yrBzimusad7t-Qiv5XigzI1dKNLYUMZ3mROX_A2U",
    gid: 1878848473,
    headerRow: 1,
  },
  loyaltyOnboarding: {
    label: "Dotpe CRM [Activation] — Loyalty enable",
    spreadsheetId: "1gDPL8qw3N9pNxEE4dxM466TI-IaIvSwJLqbvmEXUww8",
    gid: 738465948,
    headerRow: 1,
  },
} as const;

export function gsheetUrl(source: { spreadsheetId: string; gid: number }) {
  return `https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/edit?gid=${source.gid}#gid=${source.gid}`;
}
