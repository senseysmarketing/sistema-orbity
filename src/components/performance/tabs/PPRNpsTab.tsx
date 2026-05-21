import NPSPage from "@/pages/NPSPage";

// Render existing NPS page UI within the Performance & PPR tab.
// Kept as a thin wrapper so we can layer period-aware customizations later.
export function PPRNpsTab() {
  return <NPSPage />;
}
