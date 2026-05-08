export type CsvImportStatus = "SUCCESS" | "FAILED";

export type CsvImportDuplicateFamily = {
  key: string;
  reason: string;
  rows: number[];
  familyPreview: {
    fatherFullName: string | null;
    motherFullName: string | null;
    contactEmail: string;
    contactPhone: string | null;
  };
};

export type CsvImportHistoryItem = {
  id: string;
  fileName: string | null;
  importedFamilies: number;
  importedApplications: number;
  importedStudents: number;
  skippedRows: number;
  duplicateRows: number;
  duplicateRowsCount?: number;
  duplicateFamilies: number;
  duplicateFamiliesCount?: number;
  invalidRows: number;
  totalRows: number;
  status: CsvImportStatus;
  createdAt: string;
  schoolYearId: string | null;
  schoolYearLabel: string | null;
};

export type CsvImportSummary = {
  importedFamilies: number;
  createdFamilies?: number;
  reusedFamilies?: number;
  importedApplications: number;
  importedStudents: number;
  skippedRows: number;
  duplicateRows?: number;
  duplicateRowsCount?: number;
  duplicateFamilies?: CsvImportDuplicateFamily[];
  duplicateFamiliesCount?: number;
  mergedDuplicateFamilyRows?: number;
  invalidRows?: number;
  totalRows?: number;
  activeSchoolYear?: string;
  delimiter?: string;
  historyEntry?: CsvImportHistoryItem;
  mergeDuplicateFamilies?: boolean;
};

export type CsvImportDuplicateRow = {
  rowNumber: number;
  reason: string;
};

export type CsvImportPreview = {
  totalRows: number;
  invalidRows: number;
  duplicateRows: CsvImportDuplicateRow[];
  duplicateRowsCount: number;
  duplicateFamilies: CsvImportDuplicateFamily[];
  duplicateFamiliesCount: number;
  activeSchoolYear?: string;
  delimiter?: string;
};
