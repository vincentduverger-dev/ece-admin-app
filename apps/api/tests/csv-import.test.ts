import { describe, expect, it } from "vitest";

import { detectDuplicateFamilies, normalizeLevelLookupKey } from "../src/lib/csv-import";

const buildImportRow = (overrides: Record<string, unknown> = {}) => ({
  rowNumber: 2,
  family: {
    fatherLastName: "Martin",
    fatherFirstName: "Paul",
    fatherCity: null,
    motherLastName: "Durand",
    motherFirstName: "Lea",
    motherCity: null,
    familyStatus: null,
    contactEmail: "parent@example.test",
    contactPhone: "06 01 02 03 04",
    postalAddress: "1 rue fictive",
    googleAccountEmail: null
  },
  application: {
    submittedAt: new Date("2026-01-15T10:00:00.000Z"),
    declaredChildrenCount: 1,
    discoverySource: null
  },
  students: [],
  duplicateFingerprint: "fingerprint-1",
  ...overrides
});

describe("csv import helpers", () => {
  it("normalizes level labels to lookup keys", () => {
    expect(normalizeLevelLookupKey("Moyenne Section")).toBe("ms");
    expect(normalizeLevelLookupKey("Cours élémentaire 1")).toBe("ce1");
  });

  it("detects duplicate families from normalized contact data", () => {
    const duplicateFamilies = detectDuplicateFamilies([
      buildImportRow(),
      buildImportRow({
        rowNumber: 5,
        family: {
          ...buildImportRow().family,
          contactEmail: "PARENT@example.test",
          contactPhone: "0601020304"
        },
        duplicateFingerprint: "fingerprint-2"
      })
    ] as any);

    expect(duplicateFamilies).toHaveLength(1);
    expect(duplicateFamilies[0]).toMatchObject({
      key: "email:parent@example.test",
      reason: "Même email de contact",
      rows: [2, 5]
    });
  });
});
