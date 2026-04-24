export type CsvImportStatus = "SUCCESS" | "FAILED";

export type CsvImportHistoryItem = {
  id: string;
  fileName: string | null;
  importedFamilies: number;
  importedApplications: number;
  importedStudents: number;
  skippedRows: number;
  duplicateRows: number;
  invalidRows: number;
  totalRows: number;
  status: CsvImportStatus;
  createdAt: string;
  schoolYearId: string | null;
  schoolYearLabel: string | null;
};

export type CsvImportSummary = {
  importedFamilies: number;
  importedApplications: number;
  importedStudents: number;
  skippedRows: number;
  duplicateRows?: number;
  invalidRows?: number;
  totalRows?: number;
  activeSchoolYear?: string;
  delimiter?: string;
  historyEntry?: CsvImportHistoryItem;
};
