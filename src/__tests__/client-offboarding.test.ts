import { describe, expect, it } from "vitest";
import {
  shouldIncludeOpenPayment,
  type Client,
} from "@/hooks/useFinancialMetrics";

const inactiveClient: Client = {
  id: "client-1",
  name: "Cliente",
  monthly_value: 1000,
  active: false,
  start_date: "2026-01-01",
  contact: null,
  service: null,
  due_date: 25,
  observations: null,
  contract_start_date: null,
  contract_end_date: null,
  has_loyalty: false,
  cancelled_at: "2026-09-21T17:10:40Z",
};

describe("client offboarding financial visibility", () => {
  it("keeps an explicitly preserved charge visible after deactivation", () => {
    expect(shouldIncludeOpenPayment(
      { status: "pending", preserved_after_deactivation: true },
      inactiveClient,
      "2026-10",
    )).toBe(true);
  });

  it("does not keep an unpreserved open charge after deactivation", () => {
    expect(shouldIncludeOpenPayment(
      { status: "pending", preserved_after_deactivation: false },
      inactiveClient,
      "2026-09",
    )).toBe(false);
  });

  it("does not count cancelled charges", () => {
    expect(shouldIncludeOpenPayment(
      { status: "cancelled", preserved_after_deactivation: false },
      inactiveClient,
      "2026-09",
    )).toBe(false);
  });
});