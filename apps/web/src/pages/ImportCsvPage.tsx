import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  MouseEvent
} from "react";

import AppLoader from "../components/feedback/AppLoader";
import FeedbackEmptyState from "../components/feedback/EmptyState";
import PageSectionHeader from "../components/layout/PageSectionHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import { useToast } from "../context/ToastContext";
import {
  createSchoolYear,
  getActiveSchoolYear,
  getCsvImportHistory,
  previewCsvImport,
  uploadCsvImport
} from "../lib/api";
import type { SchoolYearSummary } from "../types/application";
import type { CsvImportHistoryItem, CsvImportPreview, CsvImportSummary } from "../types/import";

type IconProps = {
  className?: string;
};

const contentCardClassName =
  "rounded-[28px] border border-[#e9ded2] bg-white/76 shadow-[0_22px_48px_-36px_rgba(15,23,42,0.38)] backdrop-blur";

const MISSING_ACTIVE_SCHOOL_YEAR_MESSAGE =
  "Aucune année scolaire active n'est configurée pour le moment.";

const SCHOOL_YEAR_LABEL_PATTERN = /^(\d{4})-(\d{4})$/u;

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short"
});

const numberFormatter = new Intl.NumberFormat("fr-FR");

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

const getEnterStyle = (delay: number): CSSProperties => {
  return {
    "--ui-enter-delay": `${delay}ms`
  } as CSSProperties;
};

const formatSchoolYearLabel = (label: string): string => {
  return label.replace(/^(\d{4})-(\d{4})$/u, "$1 - $2");
};

const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${numberFormatter.format(size)} o`;
  }

  if (size < 1024 * 1024) {
    return `${numberFormatter.format(Math.round(size / 102.4) / 10)} Ko`;
  }

  return `${numberFormatter.format(Math.round(size / (1024 * 102.4)) / 10)} Mo`;
};

const pluralize = (count: number, singular: string, plural: string): string => {
  return `${numberFormatter.format(count)} ${count > 1 ? plural : singular}`;
};

const getImportedFamiliesCount = (
  item: Pick<CsvImportHistoryItem, "importedFamilies" | "importedApplications">
): number => {
  if (item.importedFamilies > 0 || item.importedApplications === 0) {
    return item.importedFamilies;
  }

  return item.importedApplications;
};

const getDuplicateRowsCount = (
  item: Pick<CsvImportHistoryItem, "duplicateRows" | "duplicateRowsCount">
): number => {
  return item.duplicateRowsCount ?? item.duplicateRows ?? 0;
};

const getDuplicateFamiliesCount = (
  item: Pick<CsvImportHistoryItem, "duplicateFamilies" | "duplicateFamiliesCount">
): number => {
  return item.duplicateFamiliesCount ?? item.duplicateFamilies ?? 0;
};

const getImportHistoryResult = (item: CsvImportHistoryItem): string => {
  return [
    pluralize(getImportedFamiliesCount(item), "famille", "familles"),
    pluralize(item.importedApplications, "demande", "demandes"),
    pluralize(item.importedStudents, "élève", "élèves"),
    pluralize(item.skippedRows, "ligne ignorée", "lignes ignorées")
  ].join(" · ");
};

const getImportSuccessMessage = (summary: CsvImportSummary, isComplementaryImport: boolean): string => {
  const result = `${pluralize(summary.importedApplications, "demande", "demandes")} et ${pluralize(summary.importedStudents, "élève", "élèves")}`;

  if (isComplementaryImport) {
    return `Ajout terminé : ${result} ajoutés à la campagne en cours.`;
  }

  return `Import terminé : ${result} traités.`;
};

const getDuplicatePreviewCount = (preview: CsvImportPreview): number => {
  return preview.duplicateRowsCount + preview.duplicateFamiliesCount;
};

const getActiveSchoolYearErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error) || error.message.trim().length === 0) {
    return "Impossible de charger l'année scolaire active.";
  }

  if (error.message === "Active school year not found") {
    return MISSING_ACTIVE_SCHOOL_YEAR_MESSAGE;
  }

  return `Impossible de charger l'année scolaire active. ${error.message}`;
};

const getSchoolYearCreationErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error) || error.message.trim().length === 0) {
    return "Impossible de créer l'année scolaire.";
  }

  switch (error.message) {
    case "School year label is required":
      return "Renseignez une année scolaire avant de créer l'année active.";
    case "Invalid school year label format":
    case "Invalid school year label range":
      return "Le format attendu est YYYY-YYYY, par exemple 2026-2027.";
    case "Invalid school year activation value":
      return "Impossible d'activer l'année scolaire demandée.";
    case "School year label already exists":
      return "Cette année scolaire existe déjà. Activez-la depuis l'administration si nécessaire.";
    default:
      return error.message;
  }
};

const getImportHistoryErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error) || error.message.trim().length === 0) {
    return "Impossible de charger l'historique des imports.";
  }

  return `Impossible de charger l'historique des imports. ${error.message}`;
};

const getImportErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error) || error.message.trim().length === 0) {
    return "L'import du fichier CSV a échoué.";
  }

  switch (error.message) {
    case "CSV file is required":
      return "Sélectionnez un fichier CSV avant de lancer l'import.";
    case "Invalid CSV file format":
      return "Seuls les fichiers au format CSV (.csv) sont acceptés.";
    case "CSV file is empty":
      return "Le fichier CSV sélectionné est vide.";
    case "Invalid CSV content":
      return "Le contenu du fichier CSV est invalide.";
    case "Active school year not found":
      return "Aucune année scolaire active n'est configurée pour recevoir l'import.";
    case "CSV import already completed for active school year":
      return "Cette campagne d'inscription possède déjà un import CSV réussi. Rechargez la page puis utilisez l'action d'ajout à la campagne en cours.";
    default:
      if (error.message.startsWith("CSV missing ")) {
        return "Le fichier CSV ne correspond pas au format attendu du formulaire.";
      }

      if (error.message.startsWith("Row ")) {
        return "Le fichier CSV contient au moins une ligne invalide pour l'import.";
      }

      return error.message;
  }
};

const isCsvFile = (file: File): boolean => {
  return file.name.trim().toLowerCase().endsWith(".csv");
};

const normalizeSchoolYearInput = (value: string): string => {
  return value.replace(/[–—]/gu, "-").replace(/\s+/gu, "");
};

const isValidSchoolYearLabel = (value: string): boolean => {
  const labelMatch = value.match(SCHOOL_YEAR_LABEL_PATTERN);

  if (!labelMatch) {
    return false;
  }

  return Number.parseInt(labelMatch[2], 10) === Number.parseInt(labelMatch[1], 10) + 1;
};

const getSchoolYearDraftPlaceholder = (
  schoolYear: SchoolYearSummary | null
): string => {
  if (!schoolYear) {
    return "2026-2027";
  }

  return `${schoolYear.endYear}-${schoolYear.endYear + 1}`;
};

const CampaignIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <rect x="3.5" y="4.5" width="13" height="11.5" rx="2.5" />
      <path d="M6.5 3.25v3M13.5 3.25v3M3.75 8.25h12.5M7 11h2.5M7 13.25h4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const UploadIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 16V7.5m0 0L8.7 10.8M12 7.5l3.3 3.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
    </svg>
  );
};

const UploadIllustration = () => {
  return (
    <svg
      viewBox="0 0 180 120"
      aria-hidden="true"
      className="h-28 w-auto text-slate-400"
    >
      <defs>
        <linearGradient id="csv-paper" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F6F2EB" />
          <stop offset="100%" stopColor="#E2E4E7" />
        </linearGradient>
      </defs>
      <path
        d="M18 62h48"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="m53 48 13 14-13 14"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M88 22h31l18 18v47c0 4.4-3.6 8-8 8H88c-4.4 0-8-3.6-8-8V30c0-4.4 3.6-8 8-8Z"
        fill="url(#csv-paper)"
        stroke="#A6ADB7"
        strokeWidth="2"
      />
      <path d="M119 22v20h18" fill="#E4E7EC" stroke="#A6ADB7" strokeWidth="2" />
      <rect x="92" y="50" width="32" height="20" rx="6" fill="#D4A24C" />
      <text
        x="108"
        y="64"
        fill="#FFFFFF"
        fontSize="12"
        fontWeight="700"
        textAnchor="middle"
      >
        CSV
      </text>
      <rect x="118" y="58" width="52" height="42" rx="4" fill="#F5F4EF" stroke="#BEC4CD" strokeWidth="2" />
      <path d="M118 72h52M118 86h52M131 58v42M144 58v42M157 58v42" stroke="#D0D5DB" strokeWidth="1.5" />
    </svg>
  );
};

const SummaryMetric = ({
  label,
  value
}: {
  label: string;
  value: number;
}) => {
  return (
    <article className="flex min-h-32 flex-col items-center justify-center rounded-[22px] border border-[#eee3d7] bg-white/85 px-4 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      <p className="max-w-full text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-primary">
        {numberFormatter.format(value)}
      </p>
    </article>
  );
};

const DuplicateImportModal = ({
  preview,
  isComplementaryImport,
  activeSchoolYearLabel,
  isSubmitting,
  onCancel,
  onConfirm
}: {
  preview: CsvImportPreview;
  isComplementaryImport: boolean;
  activeSchoolYearLabel: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (mergeDuplicateFamilies: boolean) => void;
}) => {
  const duplicateCount = getDuplicatePreviewCount(preview);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-import-title"
    >
      <section className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-[#e8dccf] bg-white p-5 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.55)] sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondaryDark">
              Vérification avant import
            </p>
            <h2 id="duplicate-import-title" className="mt-2 font-serif text-[2rem] text-slate-900">
              Doublons détectés
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {pluralize(duplicateCount, "doublon a été détecté", "doublons ont été détectés")}
              . Choisissez si les familles signalées doivent être fusionnées avant
              {isComplementaryImport
                ? ` l'ajout à la campagne ${activeSchoolYearLabel}.`
                : " l'import définitif du fichier CSV."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center sm:min-w-72">
            <div className="rounded-2xl border border-[#eee3d7] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Doublons exacts
              </p>
              <p className="mt-2 text-2xl font-semibold text-primary">
                {numberFormatter.format(preview.duplicateRowsCount)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#eee3d7] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Familles
              </p>
              <p className="mt-2 text-2xl font-semibold text-primary">
                {numberFormatter.format(preview.duplicateFamiliesCount)}
              </p>
            </div>
          </div>
        </div>

        {preview.duplicateRows.length > 0 ? (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-slate-900">Doublons exacts</h3>
            <div className="mt-3 grid gap-2">
              {preview.duplicateRows.map((duplicateRow) => (
                <div
                  key={`${duplicateRow.rowNumber}-${duplicateRow.reason}`}
                  className="rounded-2xl border border-[#eee3d7] bg-[#fffdf8] px-4 py-3 text-sm text-slate-700"
                >
                  Ligne CSV {duplicateRow.rowNumber} · {duplicateRow.reason}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {preview.duplicateFamilies.length > 0 ? (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Familles potentiellement en double
            </h3>
            <div className="mt-3 grid gap-3">
              {preview.duplicateFamilies.map((duplicateFamily) => (
                <article
                  key={duplicateFamily.key}
                  className="rounded-2xl border border-[#eee3d7] bg-[#fffdf8] px-4 py-3 text-sm text-slate-700"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {duplicateFamily.reason}
                      </p>
                      <p className="mt-1">
                        Lignes CSV {duplicateFamily.rows.join(", ")}
                      </p>
                    </div>
                    <p className="break-all text-slate-600">
                      {duplicateFamily.familyPreview.contactEmail}
                    </p>
                  </div>
                  <p className="mt-2 text-slate-600">
                    Père : {duplicateFamily.familyPreview.fatherFullName ?? "Non renseigné"}
                    {" · "}
                    Mère : {duplicateFamily.familyPreview.motherFullName ?? "Non renseignée"}
                    {" · "}
                    Téléphone : {duplicateFamily.familyPreview.contactPhone ?? "Non renseigné"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <p className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-6 text-slate-700">
          Fusionner conserve une seule demande pour chaque famille signalée et
          ignore les autres lignes du groupe. Importer sans fusion crée des
          fiches familles séparées pour ces demandes. Les doublons exacts restent
          ignorés dans les deux cas.
          {isComplementaryImport
            ? " Les données déjà présentes dans la campagne seront conservées."
            : ""}
        </p>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(false)}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-2xl border border-secondary/50 px-5 py-3 text-sm font-semibold text-secondaryDark transition hover:bg-secondary/10 disabled:cursor-wait disabled:opacity-60"
          >
            {isComplementaryImport ? "Ajouter sans fusion" : "Importer sans fusion"}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(true)}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-wait disabled:bg-slate-300"
          >
            {isSubmitting
              ? "Import en cours..."
              : isComplementaryImport
                ? "Fusionner et ajouter"
                : "Fusionner et importer"}
          </button>
        </div>
      </section>
    </div>
  );
};

const ComplementaryImportConfirmModal = ({
  activeSchoolYearLabel,
  isSubmitting,
  onCancel,
  onConfirm
}: {
  activeSchoolYearLabel: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="append-import-title"
    >
      <section className="w-full max-w-xl rounded-[28px] border border-[#e8dccf] bg-white p-5 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.55)] sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondaryDark">
          Campagne en cours
        </p>
        <h2 id="append-import-title" className="mt-2 font-serif text-[2rem] text-slate-900">
          Ajouter ces demandes à la campagne en cours ?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Les demandes déjà présentes seront conservées. Les nouvelles demandes
          valides seront ajoutées à l&apos;année scolaire active {activeSchoolYearLabel}.
        </p>
        <p className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-6 text-slate-700">
          Les données existantes seront conservées. Seules les nouvelles demandes
          non déjà importées seront ajoutées.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-wait disabled:bg-slate-300"
          >
            {isSubmitting ? "Ajout en cours..." : "Confirmer l'ajout"}
          </button>
        </div>
      </section>
    </div>
  );
};

const ImportCsvPage = () => {
  const { showError, showSuccess } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeSchoolYear, setActiveSchoolYear] = useState<SchoolYearSummary | null>(null);
  const [activeSchoolYearError, setActiveSchoolYearError] = useState<string | null>(null);
  const [isLoadingActiveSchoolYear, setIsLoadingActiveSchoolYear] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [history, setHistory] = useState<CsvImportHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [schoolYearDraft, setSchoolYearDraft] = useState("");
  const [schoolYearSetupError, setSchoolYearSetupError] = useState<string | null>(null);
  const [isCreatingSchoolYear, setIsCreatingSchoolYear] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastImportSummary, setLastImportSummary] = useState<CsvImportSummary | null>(null);
  const [pendingImportPreview, setPendingImportPreview] = useState<CsvImportPreview | null>(null);
  const [isComplementaryConfirmationOpen, setIsComplementaryConfirmationOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadActiveSchoolYear = async (): Promise<void> => {
      setIsLoadingActiveSchoolYear(true);
      setActiveSchoolYearError(null);

      try {
        const schoolYear = await getActiveSchoolYear({ signal: controller.signal });

        if (controller.signal.aborted) {
          return;
        }

        setActiveSchoolYear(schoolYear);
      } catch (loadError) {
        if (isAbortError(loadError) || controller.signal.aborted) {
          return;
        }

        setActiveSchoolYear(null);
        setActiveSchoolYearError(getActiveSchoolYearErrorMessage(loadError));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingActiveSchoolYear(false);
        }
      }
    };

    void loadActiveSchoolYear();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadImportHistory = async (): Promise<void> => {
      setIsLoadingHistory(true);
      setHistoryError(null);

      try {
        const importHistory = await getCsvImportHistory({ signal: controller.signal });

        if (controller.signal.aborted) {
          return;
        }

        setHistory(importHistory);
      } catch (loadError) {
        if (isAbortError(loadError) || controller.signal.aborted) {
          return;
        }

        setHistory([]);
        setHistoryError(getImportHistoryErrorMessage(loadError));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingHistory(false);
        }
      }
    };

    void loadImportHistory();

    return () => {
      controller.abort();
    };
  }, []);

  const latestImport = useMemo(() => history[0] ?? null, [history]);
  const activeSchoolYearImport = useMemo(() => {
    return activeSchoolYear
      ? history.find(
          (item) =>
            item.schoolYearId === activeSchoolYear.id && item.status === "SUCCESS"
        ) ?? null
      : null;
  }, [activeSchoolYear, history]);
  const activeSchoolYearLabel = activeSchoolYear
    ? formatSchoolYearLabel(activeSchoolYear.label)
    : latestImport?.schoolYearLabel
      ? formatSchoolYearLabel(latestImport.schoolYearLabel)
      : "Non configurée";
  const isSchoolYearSetupRequired =
    !isLoadingActiveSchoolYear &&
    activeSchoolYear === null &&
    activeSchoolYearError === MISSING_ACTIVE_SCHOOL_YEAR_MESSAGE;
  const canManageSchoolYear =
    !isLoadingActiveSchoolYear &&
    (activeSchoolYear !== null || isSchoolYearSetupRequired);
  const isSchoolYearFormLocked =
    isLoadingActiveSchoolYear || isCreatingSchoolYear || isSubmitting;
  const schoolYearDraftPlaceholder = getSchoolYearDraftPlaceholder(activeSchoolYear);
  const hasCompletedImportForActiveSchoolYear = activeSchoolYearImport !== null;
  const lastDuplicateFamilies = lastImportSummary?.duplicateFamilies ?? [];
  const isUploadLocked =
    isLoadingActiveSchoolYear ||
    isLoadingHistory ||
    isCreatingSchoolYear ||
    isSubmitting ||
    activeSchoolYear === null;

  const openFilePicker = useCallback((): void => {
    if (isUploadLocked) {
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, [isUploadLocked]);

  const clearSelectedFile = useCallback((): void => {
    setSelectedFile(null);
    setPendingImportPreview(null);
    setIsComplementaryConfirmationOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleSelectedFile = useCallback((nextFile: File): void => {
    if (isUploadLocked) {
      return;
    }

    if (!isCsvFile(nextFile)) {
      const message = "Seuls les fichiers CSV (.csv) sont acceptés.";

      setSelectedFile(null);
      setInlineMessage(message);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      showError(message);
      return;
    }

    setSelectedFile(nextFile);
    setInlineMessage(null);
    setPendingImportPreview(null);
    setIsComplementaryConfirmationOpen(false);
  }, [isUploadLocked, showError]);

  const handleFileInputChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    const nextFile = event.target.files?.[0];

    if (!nextFile) {
      return;
    }

    handleSelectedFile(nextFile);
  }, [handleSelectedFile]);

  const handleChooseFileButtonClick = useCallback((
    event: MouseEvent<HTMLButtonElement>
  ): void => {
    event.stopPropagation();
    openFilePicker();
  }, [openFilePicker]);

  const finalizeCsvImport = async (mergeDuplicateFamilies: boolean): Promise<void> => {
    if (!selectedFile) {
      const message = "Sélectionnez un fichier CSV avant de lancer l'import.";

      setInlineMessage(message);
      setPendingImportPreview(null);
      showError(message);
      return;
    }

    setIsSubmitting(true);
    setInlineMessage(null);

    try {
      const summary = await uploadCsvImport(selectedFile, { mergeDuplicateFamilies });
      const isComplementaryImport = hasCompletedImportForActiveSchoolYear;

      setLastImportSummary(summary);
      setPendingImportPreview(null);
      setIsComplementaryConfirmationOpen(false);

      if (summary.historyEntry) {
        setHistory((currentHistory) => [
          summary.historyEntry as CsvImportHistoryItem,
          ...currentHistory.filter((item) => item.id !== summary.historyEntry?.id)
        ]);
      }

      clearSelectedFile();
      showSuccess(getImportSuccessMessage(summary, isComplementaryImport));
    } catch (submitError) {
      const message = getImportErrorMessage(submitError);

      setInlineMessage(message);
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadZoneKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    if (isUploadLocked) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  }, [isUploadLocked, openFilePicker]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();

    if (isUploadLocked) {
      return;
    }
    setIsDragging(true);
  }, [isUploadLocked]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();

    if (isUploadLocked) {
      setIsDragging(false);
      return;
    }

    setIsDragging(false);
  }, [isUploadLocked]);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();

    if (isUploadLocked) {
      setIsDragging(false);
      return;
    }
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (!droppedFile) {
      return;
    }

    handleSelectedFile(droppedFile);
  }, [handleSelectedFile, isUploadLocked]);

  const handleSchoolYearDraftChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setSchoolYearDraft(normalizeSchoolYearInput(event.target.value));

    if (schoolYearSetupError) {
      setSchoolYearSetupError(null);
    }
  }, [schoolYearSetupError]);

  const handleSchoolYearSetupSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    const normalizedLabel = normalizeSchoolYearInput(schoolYearDraft);

    if (normalizedLabel.length === 0) {
      const message = "Renseignez une année scolaire avant de créer l'année active.";

      setSchoolYearSetupError(message);
      showError(message);
      return;
    }

    if (!isValidSchoolYearLabel(normalizedLabel)) {
      const message = "Le format attendu est YYYY-YYYY, par exemple 2026-2027.";

      setSchoolYearSetupError(message);
      showError(message);
      return;
    }

    setIsCreatingSchoolYear(true);
    setSchoolYearSetupError(null);

    try {
      const schoolYear = await createSchoolYear({
        label: normalizedLabel,
        isActive: true
      });

      setActiveSchoolYear(schoolYear);
      setActiveSchoolYearError(null);
      setSchoolYearDraft("");
      clearSelectedFile();
      setInlineMessage(null);
      showSuccess(
        `Année scolaire ${formatSchoolYearLabel(schoolYear.label)} créée et activée.`
      );
    } catch (createError) {
      const message = getSchoolYearCreationErrorMessage(createError);

      setSchoolYearSetupError(message);
      showError(message);
    } finally {
      setIsCreatingSchoolYear(false);
    }
  };

  const handleImportSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    if (!activeSchoolYear) {
      const message =
        activeSchoolYearError ??
        "Aucune année scolaire active n'est configurée pour recevoir l'import.";

      setInlineMessage(message);
      showError(message);
      return;
    }

    if (!selectedFile) {
      const message = "Sélectionnez un fichier CSV avant de lancer l'import.";

      setInlineMessage(message);
      showError(message);
      return;
    }

    setIsSubmitting(true);
    setInlineMessage(null);
    setPendingImportPreview(null);

    try {
      const preview = await previewCsvImport(selectedFile);

      if (getDuplicatePreviewCount(preview) > 0) {
        setPendingImportPreview(preview);
        return;
      }

      if (hasCompletedImportForActiveSchoolYear) {
        setIsComplementaryConfirmationOpen(true);
        return;
      }

      await finalizeCsvImport(true);
    } catch (submitError) {
      const message = getImportErrorMessage(submitError);

      setInlineMessage(message);
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageTopBar = (
    <div
      className="ui-animate-in ui-animate-in--subtle flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      style={getEnterStyle(20)}
    >
      <div className="w-fit rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-sm text-primaryDark shadow-[0_10px_22px_-22px_rgba(15,23,42,0.18)]">
        <Breadcrumb
          items={[
            { label: "Tableau de bord", href: "/" },
            { label: "Campagnes d'inscriptions" }
          ]}
        />
      </div>

      <div className="inline-flex max-w-full items-center rounded-2xl border border-[#e4d7c8] bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <span className="truncate font-medium">{activeSchoolYearLabel}</span>
      </div>
    </div>
  );

  return (
    <>
      {pendingImportPreview ? (
        <DuplicateImportModal
          preview={pendingImportPreview}
          isComplementaryImport={hasCompletedImportForActiveSchoolYear}
          activeSchoolYearLabel={activeSchoolYearLabel}
          isSubmitting={isSubmitting}
          onCancel={() => {
            setPendingImportPreview(null);
          }}
          onConfirm={(mergeDuplicateFamilies) => {
            void finalizeCsvImport(mergeDuplicateFamilies);
          }}
        />
      ) : null}

      {isComplementaryConfirmationOpen ? (
        <ComplementaryImportConfirmModal
          activeSchoolYearLabel={activeSchoolYearLabel}
          isSubmitting={isSubmitting}
          onCancel={() => {
            setIsComplementaryConfirmationOpen(false);
          }}
          onConfirm={() => {
            void finalizeCsvImport(true);
          }}
        />
      ) : null}

      <div className="ui-animate-in ui-animate-in--subtle" style={getEnterStyle(120)}>
        <PageSectionHeader topBar={pageTopBar} title="Import CSV" />
      </div>
      <section
        className={`ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent ${contentCardClassName} p-5 sm:p-6`}
        style={getEnterStyle(180)}
      >
        <p className="max-w-5xl text-[1.05rem] leading-8 text-slate-700">
          Téléversez un fichier CSV pour importer des demandes d&apos;inscription
          collectées via un formulaire Google et les centraliser pour
          l&apos;année scolaire active.
        </p>

        <ul className="mt-5 space-y-3 pl-5 text-[1.02rem] leading-7 text-slate-700 marker:text-primary">
          <li>
            Les doublons exacts concernent les lignes déjà importées.
          </li>
          <li>
            Les familles multiples concernent les familles ayant soumis plusieurs demandes.
          </li>
          <li>
            Le fichier importé sera rattaché à l&apos;année scolaire{" "}
            {activeSchoolYear ? activeSchoolYearLabel : "active configurée"}.
          </li>
          <li>Seuls les fichiers au format CSV (.csv) sont acceptés.</li>
          <li>Chaque import génère un résumé des demandes importées.</li>
        </ul>

        {canManageSchoolYear ? (
          <section
            className="ui-animate-in mt-5 overflow-hidden rounded-[32px] border border-primary/20 bg-[#fffdf8] shadow-[0_30px_66px_-44px_rgba(31,77,58,0.42)]"
            style={getEnterStyle(240)}
          >
            <div className="border-b border-secondary/30 bg-primary px-5 py-5 text-white sm:px-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="mt-1 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-secondary shadow-[0_16px_30px_-22px_rgba(0,0,0,0.55)]">
                    <CampaignIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
                      {isSchoolYearSetupRequired
                        ? "Configuration requise"
                        : "Nouvelle campagne"}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {isSchoolYearSetupRequired
                        ? "Créez une année scolaire active avant l'import"
                        : "Créez et activez la prochaine année scolaire"}
                    </h2>
                    <p className="mt-2 max-w-4xl text-sm leading-6 text-white/80">
                      {isSchoolYearSetupRequired
                        ? "Aucune année scolaire active n'est configurée. Créez et activez une année scolaire ici pour débloquer l'import CSV, ou activez une année existante depuis l'administration."
                        : `L'année scolaire active est actuellement ${activeSchoolYearLabel}. Créez et activez ici une nouvelle année scolaire pour rattacher les prochains imports à cette nouvelle campagne d'inscription.`}
                    </p>
                  </div>
                </div>

                {activeSchoolYear ? (
                  <div className="inline-flex w-fit shrink-0 flex-col items-center rounded-2xl border border-secondary/40 bg-secondary/20 px-5 py-3 text-center text-sm text-white shadow-[0_16px_30px_-24px_rgba(0,0,0,0.45)]">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
                      Année active
                    </span>
                    <span className="mt-1 text-lg font-semibold">
                      {activeSchoolYearLabel}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <form
              className="bg-[#fffaf2] px-5 py-5 sm:px-6"
              onSubmit={(event) => void handleSchoolYearSetupSubmit(event)}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Année scolaire
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={schoolYearDraftPlaceholder}
                    value={schoolYearDraft}
                    onChange={handleSchoolYearDraftChange}
                    disabled={isSchoolYearFormLocked}
                    className="mt-2 h-14 w-full rounded-2xl border border-[#dfd1c0] bg-white px-4 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSchoolYearFormLocked}
                  className="inline-flex h-14 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-wait disabled:bg-slate-300"
                >
                  {isCreatingSchoolYear
                    ? "Création en cours..."
                    : "Créer et activer cette année"}
                </button>
              </div>
            </form>

            {schoolYearSetupError ? (
              <p className="mx-5 mb-5 rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-sm text-danger sm:mx-6">
                {schoolYearSetupError}
              </p>
            ) : null}
          </section>
        ) : null}

        {activeSchoolYearError && !canManageSchoolYear ? (
          <p className="mt-5 rounded-[22px] border border-danger/15 bg-danger/5 px-4 py-3 text-sm text-danger">
            {activeSchoolYearError}
          </p>
        ) : null}

        <section className="mt-5 rounded-[24px] border border-primary/15 bg-primary/5 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primaryLight">
                Campagne en cours
              </p>
              <h2 className="mt-2 font-serif text-[1.7rem] text-slate-900">
                Année scolaire {activeSchoolYearLabel}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {hasCompletedImportForActiveSchoolYear
                  ? "Un import a déjà été réalisé pour cette campagne. Vous pouvez ajouter un nouveau fichier CSV contenant uniquement les demandes reçues ultérieurement. Les doublons seront détectés automatiquement."
                  : "Aucun import réussi n'est encore enregistré pour cette année active. Le prochain fichier lancera l'import initial de la campagne."}
              </p>
            </div>
            {activeSchoolYearImport ? (
              <div className="shrink-0 rounded-2xl border border-primary/15 bg-white/80 px-4 py-3 text-sm text-slate-700">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Dernier import
                </span>
                <span className="mt-1 block font-medium text-slate-900">
                  {dateTimeFormatter.format(new Date(activeSchoolYearImport.createdAt))}
                </span>
                <span className="mt-1 block truncate text-slate-500">
                  {activeSchoolYearImport.fileName ?? "Fichier non renseigné"}
                </span>
              </div>
            ) : null}
          </div>
        </section>

        <form
          className="ui-animate-in mt-6"
          style={getEnterStyle(300)}
          onSubmit={(event) => void handleImportSubmit(event)}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <div
            role="button"
            tabIndex={isUploadLocked ? -1 : 0}
            aria-disabled={isUploadLocked}
            onClick={openFilePicker}
            onKeyDown={handleUploadZoneKeyDown}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-[28px] border border-dashed px-5 py-8 transition sm:px-8 ${
              isUploadLocked
                ? "cursor-not-allowed border-[#ede4d8] bg-slate-100/70 opacity-75"
                : isDragging
                ? "border-secondary bg-secondary/8 shadow-[inset_0_0_0_1px_rgba(212,162,76,0.18)]"
                : "border-[#eadfcf] bg-white/45"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-6 lg:flex-row lg:gap-10">
              <UploadIllustration />

              <div className="text-center lg:text-left">
                <p className="text-[1.9rem] leading-tight text-slate-800 sm:text-[2.1rem]">
                  Glissez-déposez votre fichier CSV ici ou
                </p>

                <div className="mt-5 flex flex-col items-center gap-3 lg:items-start">
                  <button
                    type="button"
                    onClick={handleChooseFileButtonClick}
                    disabled={isUploadLocked}
                    className="inline-flex items-center gap-3 rounded-2xl bg-secondary px-6 py-3 text-lg font-semibold text-white shadow-[0_18px_28px_-18px_rgba(212,162,76,0.98)] transition hover:bg-secondaryDark disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <UploadIcon className="h-5 w-5" />
                    {hasCompletedImportForActiveSchoolYear
                      ? "Importer de nouvelles demandes"
                      : "Choisir un fichier"}
                  </button>
                  <p className="text-base text-slate-500">Format accepté : .csv</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-[#ebdfd2] bg-white/82 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Fichier sélectionné
                </p>
                <p className="mt-2 truncate text-base font-medium text-slate-800">
                  {selectedFile ? selectedFile.name : "Aucun fichier sélectionné."}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedFile
                    ? `${formatFileSize(selectedFile.size)} · prêt pour l'import`
                    : hasCompletedImportForActiveSchoolYear
                      ? "Ajoutez un CSV contenant uniquement les demandes reçues après le premier import."
                      : "Ajoutez un CSV exporté depuis le formulaire pour démarrer."}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();

                    if (selectedFile) {
                      clearSelectedFile();
                      return;
                    }

                    openFilePicker();
                  }}
                  disabled={isUploadLocked}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {selectedFile ? "Retirer le fichier" : "Choisir un fichier"}
                </button>
                <button
                  type="submit"
                  disabled={isUploadLocked}
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-wait disabled:bg-slate-300"
                >
                  {isSubmitting
                    ? "Import en cours..."
                    : hasCompletedImportForActiveSchoolYear
                      ? "Ajouter à la campagne"
                      : "Lancer l'import"}
                </button>
              </div>
            </div>

            {inlineMessage ? (
              <p className="mt-4 rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-sm text-danger">
                {inlineMessage}
              </p>
            ) : null}
          </div>
        </form>

        {lastDuplicateFamilies.length > 0 ? (
          <section className="mt-5 rounded-[24px] border border-[#ebdfd2] bg-white/82 px-4 py-4 sm:px-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primaryLight">
                Contrôle métier
              </p>
              <h2 className="mt-2 font-serif text-[1.7rem] text-slate-900">
                Familles potentiellement en double
              </h2>
            </div>

            <div className="mt-4 grid gap-3">
              {lastDuplicateFamilies.map((duplicateFamily) => (
                <article
                  key={duplicateFamily.key}
                  className="rounded-[20px] border border-[#eee3d7] bg-white/88 px-4 py-4"
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {duplicateFamily.reason}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Cette famille possède plusieurs demandes dans le fichier.
                      </p>
                    </div>
                    <div className="w-fit rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold text-primaryDark">
                      Lignes CSV {duplicateFamily.rows.join(", ")}
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Père
                      </dt>
                      <dd className="mt-1 text-slate-900">
                        {duplicateFamily.familyPreview.fatherFullName ?? "Non renseigné"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Mère
                      </dt>
                      <dd className="mt-1 text-slate-900">
                        {duplicateFamily.familyPreview.motherFullName ?? "Non renseigné"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Email
                      </dt>
                      <dd className="mt-1 break-all text-slate-900">
                        {duplicateFamily.familyPreview.contactEmail}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Téléphone
                      </dt>
                      <dd className="mt-1 text-slate-900">
                        {duplicateFamily.familyPreview.contactPhone ?? "Non renseigné"}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {latestImport ? (
          <section
            className="ui-animate-in mt-6 rounded-[26px] border border-[#ebdfd3] bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-5"
            style={getEnterStyle(360)}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primaryLight">
                  Dernier résultat
                </p>
                <h2 className="mt-2 font-serif text-[2rem] text-slate-900">
                  Résumé du dernier import
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {latestImport.fileName ?? "Fichier non renseigné"} ·{" "}
                  {dateTimeFormatter.format(new Date(latestImport.createdAt))}
                </p>
              </div>
              <div className="rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 text-sm font-medium text-secondaryDark">
                {latestImport.schoolYearLabel
                  ? formatSchoolYearLabel(latestImport.schoolYearLabel)
                  : activeSchoolYearLabel}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <SummaryMetric
                label="Familles traitées"
                value={getImportedFamiliesCount(latestImport)}
              />
              <SummaryMetric
                label="Demandes ajoutées"
                value={latestImport.importedApplications}
              />
              <SummaryMetric label="Élèves ajoutés" value={latestImport.importedStudents} />
              <SummaryMetric label="Lignes ignorées" value={latestImport.skippedRows} />
              <SummaryMetric
                label="Doublons exacts"
                value={getDuplicateRowsCount(latestImport)}
              />
              <SummaryMetric
                label="Familles en double"
                value={getDuplicateFamiliesCount(latestImport)}
              />
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Les doublons exacts concernent les lignes déjà importées.
              Les familles multiples concernent les familles ayant soumis plusieurs demandes.
            </p>

            {typeof latestImport.invalidRows === "number" ? (
              <p className="mt-4 text-sm text-slate-600">
                L&apos;import comporte{" "}
                {pluralize(latestImport.invalidRows, "ligne invalide", "lignes invalides")}
                .
              </p>
            ) : null}
          </section>
        ) : null}
      </section>

      <section
        className={`ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent ${contentCardClassName} mt-6 overflow-hidden`}
        style={getEnterStyle(420)}
      >
        <div className="border-b border-[#eadfd2] px-5 py-4 sm:px-6">
          <h2 className="font-serif text-[2rem] text-slate-900">
            Historique des imports
          </h2>
        </div>

        {historyError ? (
          <p className="border-b border-danger/10 bg-danger/5 px-5 py-4 text-sm text-danger sm:px-6">
            {historyError}
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="bg-white/45">
              <tr className="text-base text-slate-700">
                <th className="border-b border-[#efe4d8] px-5 py-4 font-medium sm:px-6">
                  Date
                </th>
                <th className="border-b border-[#efe4d8] px-5 py-4 font-medium sm:px-6">
                  Résultat
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoadingHistory ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-5 py-6 sm:px-6"
                  >
                    <div className="flex justify-center">
                      <AppLoader
                        label="Chargement de l'historique des imports..."
                        size="sm"
                      />
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-5 py-6 sm:px-6"
                  >
                    <FeedbackEmptyState
                      title="Aucun import enregistré pour le moment."
                      description="L'historique se remplira après le premier import CSV réussi."
                    />
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="border-b border-[#f2e9de] px-5 py-4 text-sm text-slate-700 sm:px-6">
                      <div className="font-medium text-slate-900">
                        {dateTimeFormatter.format(new Date(item.createdAt))}
                      </div>
                      <div className="mt-1 text-slate-500">
                        {item.fileName ?? "Fichier non renseigné"}
                      </div>
                    </td>
                    <td className="border-b border-[#f2e9de] px-5 py-4 text-sm text-slate-700 sm:px-6">
                      <div className="font-medium text-slate-900">
                        {getImportHistoryResult(item)}
                      </div>
                      <div className="mt-1 text-slate-500">
                        {typeof item.duplicateRows === "number"
                          ? `${pluralize(getDuplicateRowsCount(item), "doublon exact", "doublons exacts")} détecté${getDuplicateRowsCount(item) > 1 ? "s" : ""}`
                          : "Aucun doublon signalé"}
                        {` · ${pluralize(getDuplicateFamiliesCount(item), "famille en double", "familles en double")}`}
                        {typeof item.invalidRows === "number"
                          ? ` · ${pluralize(item.invalidRows, "ligne invalide", "lignes invalides")}`
                          : ""}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

export default ImportCsvPage;
