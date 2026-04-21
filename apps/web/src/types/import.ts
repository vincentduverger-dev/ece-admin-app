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
};
