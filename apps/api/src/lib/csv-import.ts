import { StudentGender } from "@prisma/client";
import { createHash } from "node:crypto";

import { parse } from "csv-parse/sync";

import { badRequest } from "./errors";

const MAX_STUDENTS_PER_ROW = 4;

const CHILD_ENTITY_TOKENS = ["enfant", "eleve", "child", "candidat"];

const BASE_COLUMN_ALIASES = {
  submittedAt: [
    "horodateur",
    "timestamp",
    "date de soumission",
    "date soumission"
  ],
  contactEmail: [
    "adresse e mail",
    "adresse email",
    "email de contact",
    "e mail de contact",
    "mail de contact"
  ],
  contactPhone: [
    "telephone",
    "numero de telephone",
    "telephone de contact",
    "numero de telephone de correspondance",
    "portable",
    "telephone portable"
  ],
  fatherLastName: [
    "nom du pere",
    "nom pere",
    "nom du parent 1",
    "nom parent 1"
  ],
  fatherFirstName: [
    "prenom du pere",
    "prenom pere",
    "prenom du parent 1",
    "prenom parent 1"
  ],
  fatherCity: [
    "ville du pere",
    "ville pere",
    "ville de residence du pere",
    "ville du parent 1",
    "ville parent 1"
  ],
  motherLastName: [
    "nom de la mere",
    "nom mere",
    "nom du parent 2",
    "nom parent 2"
  ],
  motherFirstName: [
    "prenom de la mere",
    "prenom mere",
    "prenom du parent 2",
    "prenom parent 2"
  ],
  motherCity: [
    "ville de la mere",
    "ville mere",
    "ville de residence de la mere",
    "ville du parent 2",
    "ville parent 2"
  ],
  familyStatus: [
    "situation familiale",
    "situation de famille",
    "statut familial"
  ],
  postalAddress: [
    "adresse postale",
    "adresse complete",
    "adresse du domicile"
  ],
  googleAccountEmail: [
    "adresse e mail du compte google",
    "adresse email du compte google",
    "email du compte google",
    "e mail du compte google",
    "google account email",
    "nom d utilisateur"
  ],
  discoverySource: [
    "comment avez vous connu l ecole",
    "comment avez vous connu notre ecole",
    "comment avez vous connu l etablissement",
    "source de decouverte",
    "origine de la demande"
  ],
  declaredChildrenCount: [
    "nombre d enfants a inscrire",
    "nombre d enfants",
    "combien d enfants"
  ]
} as const;

type BaseColumnKey = keyof typeof BASE_COLUMN_ALIASES;
type ChildColumnKey = "lastName" | "firstName" | "fullName" | "birthDate" | "gender" | "level";

type ChildColumnIndexes = Partial<Record<ChildColumnKey, number>>;
type BaseColumnIndexes = Partial<Record<BaseColumnKey, number>>;

type ResolvedImportColumns = {
  base: BaseColumnIndexes;
  children: ChildColumnIndexes[];
};

type ParsedStudentImportRow = {
  firstName: string;
  lastName: string;
  gender: StudentGender;
  birthDate: Date;
  requestedLevelLabel: string;
  requestedLevelKey: string;
  rankInForm: number;
};

export type ParsedCsvImportRow = {
  rowNumber: number;
  family: {
    fatherLastName: string | null;
    fatherFirstName: string | null;
    fatherCity: string | null;
    motherLastName: string | null;
    motherFirstName: string | null;
    motherCity: string | null;
    familyStatus: string | null;
    contactEmail: string;
    contactPhone: string | null;
    postalAddress: string | null;
    googleAccountEmail: string | null;
  };
  application: {
    submittedAt: Date;
    declaredChildrenCount: number;
    discoverySource: string | null;
  };
  students: ParsedStudentImportRow[];
  duplicateFingerprint: string;
};

export type CsvImportInvalidRow = {
  rowNumber: number;
  reason: string;
};

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

export type ParseCsvImportResult = {
  rows: ParsedCsvImportRow[];
  invalidRows: CsvImportInvalidRow[];
  totalRows: number;
  detectedDelimiter: string;
  duplicateFamilies: CsvImportDuplicateFamily[];
  duplicateFamiliesCount: number;
};

const normalizeWhitespace = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

const stripAccents = (value: string): string => {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const normalizeLookupValue = (value: string): string => {
  return normalizeWhitespace(
    stripAccents(value)
      .toLowerCase()
      .replace(/['’]/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
  );
};

const normalizeCompactLookupValue = (value: string): string => {
  return normalizeLookupValue(value).replace(/\s+/g, "");
};

const normalizeDuplicateFamilyText = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }

  const normalizedValue = normalizeWhitespace(value).toLowerCase();

  return normalizedValue.length > 0 ? normalizedValue : null;
};

const normalizeDuplicateFamilyPhone = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }

  const normalizedPhone = value.replace(/[\s.\-()]/gu, "").trim();

  return normalizedPhone.length > 0 ? normalizedPhone : null;
};

const getCellValue = (cells: string[], index: number | undefined): string | null => {
  if (index === undefined || index >= cells.length) {
    return null;
  }

  const value = typeof cells[index] === "string" ? cells[index] : String(cells[index] ?? "");
  const trimmedValue = normalizeWhitespace(value);

  return trimmedValue.length > 0 ? trimmedValue : null;
};

const detectDelimiter = (content: string): string => {
  const firstNonEmptyLine = content
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\uFEFF/u, ""))
    .find((line) => line.trim().length > 0);

  if (!firstNonEmptyLine) {
    return ",";
  }

  const delimiters = [",", ";", "\t"] as const;
  let bestDelimiter: string = ",";
  let bestCount = -1;

  for (const delimiter of delimiters) {
    let count = 0;
    let inQuotes = false;

    for (let index = 0; index < firstNonEmptyLine.length; index += 1) {
      const currentChar = firstNonEmptyLine[index];

      if (currentChar === "\"") {
        const nextChar = firstNonEmptyLine[index + 1];

        if (inQuotes && nextChar === "\"") {
          index += 1;
          continue;
        }

        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && currentChar === delimiter) {
        count += 1;
      }
    }

    if (count > bestCount) {
      bestDelimiter = delimiter;
      bestCount = count;
    }
  }

  return bestDelimiter;
};

const normalizedAliasEntries = Object.entries(BASE_COLUMN_ALIASES).map(([key, aliases]) => [
  key,
  aliases.map((alias) => normalizeLookupValue(alias))
]) as [BaseColumnKey, string[]][];

const findBaseColumnIndex = (
  normalizedHeaders: string[],
  aliases: string[]
): number | undefined => {
  const matchedIndex = normalizedHeaders.findIndex((header) =>
    aliases.some((alias) => header === alias || header.includes(alias))
  );

  return matchedIndex >= 0 ? matchedIndex : undefined;
};

const hasChildIndexToken = (normalizedHeader: string, studentIndex: number): boolean => {
  return CHILD_ENTITY_TOKENS.some((token) => {
    const tokenBeforeIndex = new RegExp(`\\b${token}\\b.*\\b${studentIndex}\\b`, "u");
    const indexBeforeToken = new RegExp(`\\b${studentIndex}\\b.*\\b${token}\\b`, "u");

    return tokenBeforeIndex.test(normalizedHeader) || indexBeforeToken.test(normalizedHeader);
  });
};

const containsWholeWord = (value: string, word: string): boolean => {
  return new RegExp(`\\b${word}\\b`, "u").test(value);
};

const matchesChildField = (
  normalizedHeader: string,
  studentIndex: number,
  field: ChildColumnKey
): boolean => {
  if (!hasChildIndexToken(normalizedHeader, studentIndex)) {
    return false;
  }

  switch (field) {
    case "lastName":
      return containsWholeWord(normalizedHeader, "nom")
        && !containsWholeWord(normalizedHeader, "prenom")
        && !containsWholeWord(normalizedHeader, "complet");
    case "firstName":
      return containsWholeWord(normalizedHeader, "prenom")
        && !containsWholeWord(normalizedHeader, "nom");
    case "fullName":
      return normalizedHeader.includes("nom complet")
        || normalizedHeader.includes("full name")
        || (
          containsWholeWord(normalizedHeader, "nom")
          && containsWholeWord(normalizedHeader, "prenom")
        );
    case "birthDate":
      return normalizedHeader.includes("date de naissance")
        || containsWholeWord(normalizedHeader, "naissance")
        || normalizedHeader.includes("birth date");
    case "gender":
      return containsWholeWord(normalizedHeader, "sexe")
        || containsWholeWord(normalizedHeader, "genre")
        || normalizedHeader.includes("gender");
    case "level":
      return containsWholeWord(normalizedHeader, "niveau")
        || containsWholeWord(normalizedHeader, "classe")
        || containsWholeWord(normalizedHeader, "section")
        || normalizedHeader.includes("level");
  }
};

const findChildColumnIndex = (
  normalizedHeaders: string[],
  studentIndex: number,
  field: ChildColumnKey
): number | undefined => {
  const matchedIndex = normalizedHeaders.findIndex((header) =>
    matchesChildField(header, studentIndex, field)
  );

  return matchedIndex >= 0 ? matchedIndex : undefined;
};

const resolveImportColumns = (headers: string[]): ResolvedImportColumns => {
  const normalizedHeaders = headers.map((header) => normalizeLookupValue(header));
  const base: BaseColumnIndexes = {};

  for (const [key, aliases] of normalizedAliasEntries) {
    const index = findBaseColumnIndex(normalizedHeaders, aliases);

    if (index !== undefined) {
      base[key] = index;
    }
  }

  const children: ChildColumnIndexes[] = Array.from(
    { length: MAX_STUDENTS_PER_ROW },
    (_value, childIndex) => {
      const studentIndex = childIndex + 1;

      return {
        lastName: findChildColumnIndex(normalizedHeaders, studentIndex, "lastName"),
        firstName: findChildColumnIndex(normalizedHeaders, studentIndex, "firstName"),
        fullName: findChildColumnIndex(normalizedHeaders, studentIndex, "fullName"),
        birthDate: findChildColumnIndex(normalizedHeaders, studentIndex, "birthDate"),
        gender: findChildColumnIndex(normalizedHeaders, studentIndex, "gender"),
        level: findChildColumnIndex(normalizedHeaders, studentIndex, "level")
      };
    }
  );

  return {
    base,
    children
  };
};

const validateImportColumns = (columns: ResolvedImportColumns): void => {
  if (columns.base.submittedAt === undefined) {
    throw badRequest("CSV missing submission date column");
  }

  if (columns.base.contactEmail === undefined) {
    throw badRequest("CSV missing contact email column");
  }

  const firstStudentColumns = columns.children[0];

  if (!firstStudentColumns) {
    throw badRequest("CSV missing student columns");
  }

  const hasStudentNameColumns =
    firstStudentColumns.fullName !== undefined
    || (
      firstStudentColumns.firstName !== undefined
      && firstStudentColumns.lastName !== undefined
    );

  if (!hasStudentNameColumns) {
    throw badRequest("CSV missing first student name columns");
  }

  if (firstStudentColumns.birthDate === undefined) {
    throw badRequest("CSV missing first student birth date column");
  }

  if (firstStudentColumns.level === undefined) {
    throw badRequest("CSV missing first student level column");
  }
};

const parseRequiredInteger = (value: string | null): number | null => {
  if (value === null) {
    return null;
  }

  const normalizedValue = value.replace(",", ".").trim();
  const parsedValue = Number.parseInt(normalizedValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
};

const createUtcDate = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date | null => {
  const candidateDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second, 0));

  if (
    candidateDate.getUTCFullYear() !== year
    || candidateDate.getUTCMonth() !== month - 1
    || candidateDate.getUTCDate() !== day
    || candidateDate.getUTCHours() !== hour
    || candidateDate.getUTCMinutes() !== minute
    || candidateDate.getUTCSeconds() !== second
  ) {
    return null;
  }

  return candidateDate;
};

const parseDateValue = (value: string, includeTime: boolean): Date | null => {
  const normalizedValue = normalizeWhitespace(value);

  if (normalizedValue.length === 0) {
    return null;
  }

  const dayFirstMatch = normalizedValue.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/u
  );

  if (dayFirstMatch) {
    const [, rawDay, rawMonth, rawYear, rawHour, rawMinute, rawSecond] = dayFirstMatch;
    const year = rawYear.length === 2 ? Number.parseInt(`20${rawYear}`, 10) : Number.parseInt(rawYear, 10);
    const day = Number.parseInt(rawDay, 10);
    const month = Number.parseInt(rawMonth, 10);
    const hour = includeTime ? Number.parseInt(rawHour ?? "0", 10) : 12;
    const minute = includeTime ? Number.parseInt(rawMinute ?? "0", 10) : 0;
    const second = includeTime ? Number.parseInt(rawSecond ?? "0", 10) : 0;

    return createUtcDate(year, month, day, hour, minute, second);
  }

  const isoDateTimeMatch = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/u
  );

  if (isoDateTimeMatch) {
    const parsedDate = new Date(normalizedValue);

    if (!Number.isNaN(parsedDate.getTime())) {
      if (!includeTime && isoDateTimeMatch[4] === undefined) {
        return createUtcDate(
          Number.parseInt(isoDateTimeMatch[1], 10),
          Number.parseInt(isoDateTimeMatch[2], 10),
          Number.parseInt(isoDateTimeMatch[3], 10),
          12,
          0,
          0
        );
      }

      return parsedDate;
    }
  }

  const googleFormsTimestampMatch = normalizedValue.match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)(?:\s+UTC([+-]\d{1,2})(?::?(\d{2}))?)?$/iu
  );

  if (googleFormsTimestampMatch) {
    const [
      ,
      rawYear,
      rawMonth,
      rawDay,
      rawHour,
      rawMinute,
      rawSecond,
      meridiem,
      rawOffsetHours,
      rawOffsetMinutes
    ] = googleFormsTimestampMatch;
    let hour = Number.parseInt(rawHour, 10);

    if (meridiem.toUpperCase() === "PM" && hour < 12) {
      hour += 12;
    }

    if (meridiem.toUpperCase() === "AM" && hour === 12) {
      hour = 0;
    }

    const year = Number.parseInt(rawYear, 10);
    const month = Number.parseInt(rawMonth, 10);
    const day = Number.parseInt(rawDay, 10);
    const minute = Number.parseInt(rawMinute, 10);
    const second = Number.parseInt(rawSecond ?? "0", 10);
    const offsetHours = Number.parseInt(rawOffsetHours ?? "0", 10);
    const offsetMinutes = Number.parseInt(rawOffsetMinutes ?? "0", 10);
    const offsetTotalMinutes = offsetHours * 60 + (offsetHours >= 0 ? offsetMinutes : -offsetMinutes);

    return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - offsetTotalMinutes * 60_000);
  }

  return null;
};

const parseSubmittedAt = (value: string | null): Date | null => {
  if (value === null) {
    return null;
  }

  return parseDateValue(value, true) ?? parseDateValue(value, false);
};

const parseBirthDate = (value: string | null): Date | null => {
  if (value === null) {
    return null;
  }

  return parseDateValue(value, false);
};

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
};

const normalizeEmail = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }

  return value.trim().toLowerCase();
};

const normalizeGender = (value: string | null): StudentGender => {
  if (value === null) {
    return StudentGender.UNKNOWN;
  }

  const normalizedValue = normalizeCompactLookupValue(value);

  if (
    normalizedValue === "f"
    || normalizedValue === "fille"
    || normalizedValue === "feminin"
    || normalizedValue === "female"
    || normalizedValue === "girl"
  ) {
    return StudentGender.GIRL;
  }

  if (
    normalizedValue === "m"
    || normalizedValue === "garcon"
    || normalizedValue === "masculin"
    || normalizedValue === "male"
    || normalizedValue === "boy"
  ) {
    return StudentGender.BOY;
  }

  return StudentGender.UNKNOWN;
};

const splitCombinedName = (
  value: string | null
): { firstName: string; lastName: string } | null => {
  if (value === null) {
    return null;
  }

  if (value.includes(",")) {
    const [rawLastName, rawFirstName] = value.split(",", 2);
    const firstName = normalizeWhitespace(rawFirstName ?? "");
    const lastName = normalizeWhitespace(rawLastName ?? "");

    if (firstName.length > 0 && lastName.length > 0) {
      return { firstName, lastName };
    }
  }

  const parts = value.split(/\s+/u).filter((part) => part.length > 0);

  if (parts.length < 2) {
    return null;
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
};

export const normalizeLevelLookupKey = (value: string): string => {
  const compactValue = normalizeCompactLookupValue(value);

  switch (compactValue) {
    case "ps":
    case "petitesection":
      return "ps";
    case "ms":
    case "moyennesection":
      return "ms";
    case "gs":
    case "grandesection":
      return "gs";
    case "cp":
    case "courspreparatoire":
      return "cp";
    case "ce1":
    case "courselementaire1":
      return "ce1";
    case "ce2":
    case "courselementaire2":
      return "ce2";
    case "cm1":
    case "coursmoyen1":
      return "cm1";
    case "cm2":
    case "coursmoyen2":
      return "cm2";
    default:
      return compactValue;
  }
};

const buildDuplicateFingerprint = (row: {
  contactEmail: string;
  submittedAt: Date;
  students: ParsedStudentImportRow[];
}): string => {
  return JSON.stringify({
    contactEmail: row.contactEmail,
    submittedAt: row.submittedAt.toISOString(),
    students: row.students
      .map((student) => ({
        firstName: normalizeLookupValue(student.firstName),
        lastName: normalizeLookupValue(student.lastName),
        birthDate: student.birthDate.toISOString(),
        level: student.requestedLevelKey
      }))
      .sort((left, right) => {
        return JSON.stringify(left).localeCompare(JSON.stringify(right));
      })
  });
};

export const buildApplicationImportHash = (
  schoolYearId: string,
  row: ParsedCsvImportRow
): string => {
  return createHash("sha256")
    .update(`${schoolYearId}:${row.duplicateFingerprint}`)
    .digest("hex");
};

const formatFullName = (lastName: string | null, firstName: string | null): string | null => {
  const fullName = [lastName, firstName]
    .map((value) => normalizeWhitespace(value ?? ""))
    .filter((value) => value.length > 0)
    .join(" ");

  return fullName.length > 0 ? fullName : null;
};

const buildDuplicateFamilyEntry = (
  key: string,
  reason: string,
  rows: ParsedCsvImportRow[]
): CsvImportDuplicateFamily => {
  const previewRow = rows[0];

  return {
    key,
    reason,
    rows: rows.map((row) => row.rowNumber).sort((left, right) => left - right),
    familyPreview: {
      fatherFullName: formatFullName(
        previewRow.family.fatherLastName,
        previewRow.family.fatherFirstName
      ),
      motherFullName: formatFullName(
        previewRow.family.motherLastName,
        previewRow.family.motherFirstName
      ),
      contactEmail: previewRow.family.contactEmail,
      contactPhone: previewRow.family.contactPhone
    }
  };
};

const getDuplicateFamilyCompositeKey = (row: ParsedCsvImportRow): string | null => {
  const fatherLastName = normalizeDuplicateFamilyText(row.family.fatherLastName);
  const fatherFirstName = normalizeDuplicateFamilyText(row.family.fatherFirstName);
  const motherLastName = normalizeDuplicateFamilyText(row.family.motherLastName);
  const motherFirstName = normalizeDuplicateFamilyText(row.family.motherFirstName);
  const postalAddress = normalizeDuplicateFamilyText(row.family.postalAddress);

  if (
    !fatherLastName ||
    !fatherFirstName ||
    !motherLastName ||
    !motherFirstName ||
    !postalAddress
  ) {
    return null;
  }

  return [
    fatherLastName,
    fatherFirstName,
    motherLastName,
    motherFirstName,
    postalAddress
  ].join("|");
};

const addDuplicateFamilyCandidate = (
  candidates: Map<string, { reason: string; rows: ParsedCsvImportRow[] }>,
  key: string | null,
  reason: string,
  row: ParsedCsvImportRow
): void => {
  if (!key) {
    return;
  }

  const currentCandidate = candidates.get(key);

  if (currentCandidate) {
    currentCandidate.rows.push(row);
    return;
  }

  candidates.set(key, {
    reason,
    rows: [row]
  });
};

export const detectDuplicateFamilies = (
  rows: ParsedCsvImportRow[]
): CsvImportDuplicateFamily[] => {
  const candidates = new Map<string, { reason: string; rows: ParsedCsvImportRow[] }>();

  for (const row of rows) {
    const normalizedPhone = normalizeDuplicateFamilyPhone(row.family.contactPhone);
    const compositeKey = getDuplicateFamilyCompositeKey(row);

    addDuplicateFamilyCandidate(
      candidates,
      `email:${normalizeDuplicateFamilyText(row.family.contactEmail) ?? ""}`,
      "Même email de contact",
      row
    );
    addDuplicateFamilyCandidate(
      candidates,
      normalizedPhone ? `phone:${normalizedPhone}` : null,
      "Même téléphone de contact",
      row
    );
    addDuplicateFamilyCandidate(
      candidates,
      compositeKey ? `family:${compositeKey}` : null,
      "Même combinaison parents et adresse",
      row
    );
  }

  const duplicateFamilies: CsvImportDuplicateFamily[] = [];
  const coveredRows = new Set<number>();
  const candidatePriority = ["email:", "phone:", "family:"];
  const sortedCandidates = Array.from(candidates.entries()).sort(([leftKey], [rightKey]) => {
    const leftPriority = candidatePriority.findIndex((prefix) => leftKey.startsWith(prefix));
    const rightPriority = candidatePriority.findIndex((prefix) => rightKey.startsWith(prefix));

    return leftPriority - rightPriority || leftKey.localeCompare(rightKey);
  });

  for (const [key, candidate] of sortedCandidates) {
    const distinctRows = Array.from(
      new Map(candidate.rows.map((row) => [row.rowNumber, row])).values()
    ).sort((left, right) => left.rowNumber - right.rowNumber);

    if (distinctRows.length < 2) {
      continue;
    }

    if (new Set(distinctRows.map((row) => row.duplicateFingerprint)).size < 2) {
      continue;
    }

    if (distinctRows.some((row) => coveredRows.has(row.rowNumber))) {
      continue;
    }

    for (const row of distinctRows) {
      coveredRows.add(row.rowNumber);
    }

    duplicateFamilies.push(buildDuplicateFamilyEntry(key, candidate.reason, distinctRows));
  }

  return duplicateFamilies;
};

const parseStudentRow = (
  cells: string[],
  childColumns: ChildColumnIndexes,
  rowNumber: number,
  studentIndex: number
): ParsedStudentImportRow | null => {
  const rawFirstName = getCellValue(cells, childColumns.firstName);
  const rawLastName = getCellValue(cells, childColumns.lastName);
  const rawFullName = getCellValue(cells, childColumns.fullName);
  const rawBirthDate = getCellValue(cells, childColumns.birthDate);
  const rawGender = getCellValue(cells, childColumns.gender);
  const rawLevel = getCellValue(cells, childColumns.level);

  const hasAnyChildValue = [
    rawFirstName,
    rawLastName,
    rawFullName,
    rawBirthDate,
    rawGender,
    rawLevel
  ].some((value) => value !== null);

  if (!hasAnyChildValue) {
    return null;
  }

  const combinedName = splitCombinedName(rawFullName);
  const firstName = rawFirstName ?? combinedName?.firstName ?? null;
  const lastName = rawLastName ?? combinedName?.lastName ?? null;

  if (!firstName || !lastName) {
    throw new Error(`Row ${rowNumber}: student ${studentIndex} is missing a first or last name`);
  }

  const birthDate = parseBirthDate(rawBirthDate);

  if (!birthDate) {
    throw new Error(`Row ${rowNumber}: student ${studentIndex} has an invalid birth date`);
  }

  if (!rawLevel) {
    throw new Error(`Row ${rowNumber}: student ${studentIndex} is missing a requested level`);
  }

  return {
    firstName,
    lastName,
    gender: normalizeGender(rawGender),
    birthDate,
    requestedLevelLabel: rawLevel,
    requestedLevelKey: normalizeLevelLookupKey(rawLevel),
    rankInForm: studentIndex
  };
};

const buildParsedImportRow = (
  cells: string[],
  rowNumber: number,
  columns: ResolvedImportColumns
): ParsedCsvImportRow => {
  const submittedAt = parseSubmittedAt(getCellValue(cells, columns.base.submittedAt));

  if (!submittedAt) {
    throw new Error(`Row ${rowNumber}: invalid submission date`);
  }

  const contactEmail = normalizeEmail(getCellValue(cells, columns.base.contactEmail));

  if (!contactEmail || !isValidEmail(contactEmail)) {
    throw new Error(`Row ${rowNumber}: invalid contact email`);
  }

  const students: ParsedStudentImportRow[] = [];
  const seenStudentKeys = new Set<string>();

  for (let index = 0; index < columns.children.length; index += 1) {
    const studentIndex = index + 1;
    const childColumns = columns.children[index];
    const parsedStudent = parseStudentRow(cells, childColumns, rowNumber, studentIndex);

    if (!parsedStudent) {
      continue;
    }

    const studentKey = [
      normalizeLookupValue(parsedStudent.firstName),
      normalizeLookupValue(parsedStudent.lastName),
      parsedStudent.birthDate.toISOString(),
      parsedStudent.requestedLevelKey
    ].join("|");

    if (seenStudentKeys.has(studentKey)) {
      continue;
    }

    seenStudentKeys.add(studentKey);
    students.push(parsedStudent);
  }

  if (students.length === 0) {
    throw new Error(`Row ${rowNumber}: no valid student found`);
  }

  const declaredChildrenCount = parseRequiredInteger(
    getCellValue(cells, columns.base.declaredChildrenCount)
  ) ?? students.length;

  const row: ParsedCsvImportRow = {
    rowNumber,
    family: {
      fatherLastName: getCellValue(cells, columns.base.fatherLastName),
      fatherFirstName: getCellValue(cells, columns.base.fatherFirstName),
      fatherCity: getCellValue(cells, columns.base.fatherCity),
      motherLastName: getCellValue(cells, columns.base.motherLastName),
      motherFirstName: getCellValue(cells, columns.base.motherFirstName),
      motherCity: getCellValue(cells, columns.base.motherCity),
      familyStatus: getCellValue(cells, columns.base.familyStatus),
      contactEmail,
      contactPhone: getCellValue(cells, columns.base.contactPhone),
      postalAddress: getCellValue(cells, columns.base.postalAddress),
      googleAccountEmail: normalizeEmail(getCellValue(cells, columns.base.googleAccountEmail)),
      // Keep optional contact fields nullable instead of empty strings.
    },
    application: {
      submittedAt,
      declaredChildrenCount,
      discoverySource: getCellValue(cells, columns.base.discoverySource)
    },
    students,
    duplicateFingerprint: ""
  };

  row.duplicateFingerprint = buildDuplicateFingerprint({
    contactEmail: row.family.contactEmail,
    submittedAt: row.application.submittedAt,
    students: row.students
  });

  return row;
};

export const parseCsvImportFile = (buffer: Buffer): ParseCsvImportResult => {
  if (buffer.length === 0) {
    throw badRequest("CSV file is empty");
  }

  if (buffer.includes(0)) {
    throw badRequest("Invalid CSV file");
  }

  const content = buffer.toString("utf8");

  if (content.trim().length === 0) {
    throw badRequest("CSV file is empty");
  }

  const detectedDelimiter = detectDelimiter(content);

  let parsedRows: string[][];

  try {
    parsedRows = parse(content, {
      bom: true,
      delimiter: detectedDelimiter,
      relax_column_count: true,
      skip_empty_lines: true
    }) as string[][];
  } catch {
    throw badRequest("Invalid CSV content");
  }

  if (parsedRows.length < 2) {
    throw badRequest("CSV file is empty");
  }

  const headers = parsedRows[0].map((value) =>
    typeof value === "string" ? value : String(value ?? "")
  );
  const columns = resolveImportColumns(headers);

  validateImportColumns(columns);

  const rows: ParsedCsvImportRow[] = [];
  const invalidRows: CsvImportInvalidRow[] = [];

  for (let index = 1; index < parsedRows.length; index += 1) {
    try {
      const row = buildParsedImportRow(parsedRows[index], index + 1, columns);

      rows.push(row);
    } catch (error) {
      invalidRows.push({
        rowNumber: index + 1,
        reason: error instanceof Error ? error.message : "Invalid CSV row"
      });
    }
  }

  const duplicateFamilies = detectDuplicateFamilies(rows);

  return {
    rows,
    invalidRows,
    totalRows: parsedRows.length - 1,
    detectedDelimiter,
    duplicateFamilies,
    duplicateFamiliesCount: duplicateFamilies.length
  };
};
