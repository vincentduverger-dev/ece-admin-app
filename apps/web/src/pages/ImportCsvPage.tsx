import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import { Link } from "react-router-dom";

import PageSectionHeader from "../components/layout/PageSectionHeader";
import { useToast } from "../context/ToastContext";
import { getActiveSchoolYear, getCsvImportHistory, uploadCsvImport } from "../lib/api";
import type { SchoolYearSummary } from "../types/application";
import type { CsvImportHistoryItem, CsvImportSummary } from "../types/import";

type IconProps = {
  className?: string;
};

const contentCardClassName =
  "rounded-[28px] border border-[#e9ded2] bg-white/76 shadow-[0_22px_48px_-36px_rgba(15,23,42,0.38)] backdrop-blur";

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short"
});

const numberFormatter = new Intl.NumberFormat("fr-FR");

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
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

const getImportHistoryResult = (item: CsvImportHistoryItem): string => {
  return [
    pluralize(item.importedFamilies, "famille", "familles"),
    pluralize(item.importedApplications, "demande", "demandes"),
    pluralize(item.importedStudents, "élève", "élèves"),
    pluralize(item.skippedRows, "ligne ignorée", "lignes ignorées")
  ].join(" · ");
};

const getImportSuccessMessage = (summary: CsvImportSummary): string => {
  return `Import terminé : ${pluralize(summary.importedApplications, "demande", "demandes")} et ${pluralize(summary.importedStudents, "élève", "élèves")} traités.`;
};

const getActiveSchoolYearErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error) || error.message.trim().length === 0) {
    return "Impossible de charger l'année scolaire active.";
  }

  if (error.message === "Active school year not found") {
    return "Aucune année scolaire active n'est configurée pour le moment.";
  }

  return `Impossible de charger l'année scolaire active. ${error.message}`;
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

const ChevronDownIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="m5.5 7.5 4.5 4.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const ArrowLeftIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12.5 4.5 7 10l5.5 5.5M7 10h8" strokeLinecap="round" strokeLinejoin="round" />
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
    <article className="rounded-[22px] border border-[#eee3d7] bg-white/85 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-primary">
        {numberFormatter.format(value)}
      </p>
    </article>
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
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const latestImport = history[0] ?? null;
  const activeSchoolYearLabel = activeSchoolYear
    ? formatSchoolYearLabel(activeSchoolYear.label)
    : latestImport?.schoolYearLabel
      ? formatSchoolYearLabel(latestImport.schoolYearLabel)
      : "Non configurée";

  const openFilePicker = (): void => {
    if (isSubmitting) {
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const clearSelectedFile = (): void => {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSelectedFile = (nextFile: File): void => {
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
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextFile = event.target.files?.[0];

    if (!nextFile) {
      return;
    }

    handleSelectedFile(nextFile);
  };

  const handleUploadZoneKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (!droppedFile) {
      return;
    }

    handleSelectedFile(droppedFile);
  };

  const handleImportSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    if (!selectedFile) {
      const message = "Sélectionnez un fichier CSV avant de lancer l'import.";

      setInlineMessage(message);
      showError(message);
      return;
    }

    if (!activeSchoolYear) {
      const message =
        activeSchoolYearError ??
        "Aucune année scolaire active n'est configurée pour recevoir l'import.";

      setInlineMessage(message);
      showError(message);
      return;
    }

    setIsSubmitting(true);
    setInlineMessage(null);

    try {
      const summary = await uploadCsvImport(selectedFile);

      if (summary.historyEntry) {
        setHistory((currentHistory) => [
          summary.historyEntry as CsvImportHistoryItem,
          ...currentHistory.filter((item) => item.id !== summary.historyEntry?.id)
        ]);
      }

      clearSelectedFile();
      showSuccess(getImportSuccessMessage(summary));
    } catch (submitError) {
      const message = getImportErrorMessage(submitError);

      setInlineMessage(message);
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageTopBar = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <Link
        to="/applications"
        className="inline-flex items-center gap-2 text-base font-medium text-slate-700 transition hover:text-primaryDark"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Retour à l&apos;administration
      </Link>

      <div className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-[#e4d7c8] bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <span className="truncate font-medium">{activeSchoolYearLabel}</span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-500" />
      </div>
    </div>
  );

  return (
    <>
      <PageSectionHeader topBar={pageTopBar} title="Import CSV" />
      <section className={`${contentCardClassName} p-5 sm:p-6`}>
        <p className="max-w-5xl text-[1.05rem] leading-8 text-slate-700">
          Téléversez un fichier CSV pour importer des demandes d&apos;inscription
          collectées via un formulaire Google et les centraliser pour
          l&apos;année scolaire active.
        </p>

        <ul className="mt-5 space-y-3 pl-5 text-[1.02rem] leading-7 text-slate-700 marker:text-primary">
          <li>Les doublons sont détectés automatiquement.</li>
          <li>
            Le fichier importé sera rattaché à l&apos;année scolaire{" "}
            {activeSchoolYear ? activeSchoolYearLabel : "active configurée"}.
          </li>
          <li>Seuls les fichiers au format CSV (.csv) sont acceptés.</li>
          <li>Chaque import génère un résumé des demandes importées.</li>
        </ul>

        {activeSchoolYearError ? (
          <p className="mt-5 rounded-[22px] border border-danger/15 bg-danger/5 px-4 py-3 text-sm text-danger">
            {activeSchoolYearError}
          </p>
        ) : null}

        <form className="mt-6" onSubmit={(event) => void handleImportSubmit(event)}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={openFilePicker}
            onKeyDown={handleUploadZoneKeyDown}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-[28px] border border-dashed px-5 py-8 transition sm:px-8 ${
              isDragging
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
                    onClick={openFilePicker}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-3 rounded-2xl bg-secondary px-6 py-3 text-lg font-semibold text-white shadow-[0_18px_28px_-18px_rgba(212,162,76,0.98)] transition hover:bg-secondaryDark disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <UploadIcon className="h-5 w-5" />
                    Choisir un fichier
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
                    : "Ajoutez un CSV exporté depuis le formulaire pour démarrer."}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={selectedFile ? clearSelectedFile : openFilePicker}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {selectedFile ? "Retirer le fichier" : "Choisir un fichier"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingActiveSchoolYear}
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-wait disabled:bg-slate-300"
                >
                  {isSubmitting ? "Import en cours..." : "Lancer l'import"}
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

        {latestImport ? (
          <section className="mt-6 rounded-[26px] border border-[#ebdfd3] bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-5">
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryMetric label="Familles" value={latestImport.importedFamilies} />
              <SummaryMetric
                label="Demandes"
                value={latestImport.importedApplications}
              />
              <SummaryMetric label="Élèves" value={latestImport.importedStudents} />
              <SummaryMetric label="Ignorées" value={latestImport.skippedRows} />
              <SummaryMetric
                label="Doublons"
                value={latestImport.duplicateRows ?? 0}
              />
            </div>

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

      <section className={`${contentCardClassName} mt-6 overflow-hidden`}>
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
                    className="px-5 py-6 text-center text-base text-slate-500 sm:px-6"
                  >
                    Chargement de l&apos;historique des imports...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-5 py-6 text-center text-base text-slate-500 sm:px-6"
                  >
                    Aucun import enregistré pour le moment.
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
                          ? `${pluralize(item.duplicateRows, "doublon", "doublons")} détecté${item.duplicateRows > 1 ? "s" : ""}`
                          : "Aucun doublon signalé"}
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
