import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, DragEvent, KeyboardEvent } from "react";

import { useToast } from "../context/ToastContext";
import { useAuth } from "../hooks/useAuth";
import { getActiveSchoolYear, uploadCsvImport } from "../lib/api";
import type { SchoolYearSummary } from "../types/application";
import type { CsvImportSummary } from "../types/import";

const IMPORT_HISTORY_STORAGE_KEY = "csv_import_history";
const MAX_IMPORT_HISTORY_ITEMS = 6;

type ImportHistoryItem = CsvImportSummary & {
  id: string;
  fileName: string;
  importedAt: string;
};

type IconProps = {
  className?: string;
};

type NavigationItem = {
  label: string;
  href?: string;
  icon: (props: IconProps) => React.JSX.Element;
  isActive?: boolean;
};

const brandTextureStyle: CSSProperties = {
  backgroundColor: "#1F4D3A",
  backgroundImage: [
    "linear-gradient(180deg, rgba(22,56,42,0.96), rgba(31,77,58,0.98))",
    "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.08), transparent 24%)",
    "radial-gradient(circle at 82% 4%, rgba(255,255,255,0.06), transparent 28%)",
    "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 8px)"
  ].join(", ")
};

const paperTextureStyle: CSSProperties = {
  backgroundColor: "#F8F6F2",
  backgroundImage: [
    "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(248,243,236,0.96))",
    "radial-gradient(circle at top right, rgba(212,162,76,0.10), transparent 28%)",
    "radial-gradient(circle at bottom left, rgba(31,77,58,0.05), transparent 24%)",
    "repeating-linear-gradient(0deg, rgba(31,77,58,0.018) 0, rgba(31,77,58,0.018) 1px, transparent 1px, transparent 14px)"
  ].join(", ")
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

const getImportHistoryResult = (item: ImportHistoryItem): string => {
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

const isImportHistoryItem = (value: unknown): value is ImportHistoryItem => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.fileName === "string" &&
    typeof candidate.importedAt === "string" &&
    typeof candidate.importedFamilies === "number" &&
    typeof candidate.importedApplications === "number" &&
    typeof candidate.importedStudents === "number" &&
    typeof candidate.skippedRows === "number"
  );
};

const readStoredImportHistory = (): ImportHistoryItem[] => {
  try {
    const rawValue = window.localStorage.getItem(IMPORT_HISTORY_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isImportHistoryItem).slice(0, MAX_IMPORT_HISTORY_ITEMS);
  } catch {
    return [];
  }
};

const persistImportHistory = (items: ImportHistoryItem[]): void => {
  try {
    window.localStorage.setItem(
      IMPORT_HISTORY_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_IMPORT_HISTORY_ITEMS))
    );
  } catch {
    // Ignore storage write failures and keep the in-memory history.
  }
};

const DashboardIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M8 12h8M12 8v8" strokeLinecap="round" />
    </svg>
  );
};

const FolderIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h3l1.6 1.8h6.4A2.5 2.5 0 0 1 20 9.3v7.2A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M7.5 12h9" strokeLinecap="round" />
    </svg>
  );
};

const ShieldIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3.5 5.5 6v5.5c0 4.2 2.5 7.9 6.5 9 4-1.1 6.5-4.8 6.5-9V6L12 3.5Z" />
      <path d="m8.5 12 2.1 2.1L15.5 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const CogIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
      <path
        d="M19.4 13.1a7.9 7.9 0 0 0 0-2.2l1.6-1.2-1.7-3-1.9.6a7.5 7.5 0 0 0-1.9-1.1l-.3-2.1h-3.4l-.3 2.1a7.5 7.5 0 0 0-1.9 1.1l-1.9-.6-1.7 3 1.6 1.2a7.9 7.9 0 0 0 0 2.2l-1.6 1.2 1.7 3 1.9-.6c.6.5 1.2.9 1.9 1.1l.3 2.1h3.4l.3-2.1c.7-.2 1.3-.6 1.9-1.1l1.9.6 1.7-3-1.6-1.2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const LogoutIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M10 6V4.8A1.8 1.8 0 0 1 11.8 3h5.4A1.8 1.8 0 0 1 19 4.8v14.4a1.8 1.8 0 0 1-1.8 1.8h-5.4A1.8 1.8 0 0 1 10 19.2V18" />
      <path d="M14.5 12H5.5m0 0 2.7-2.8M5.5 12l2.7 2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

const navigationItems: NavigationItem[] = [
  {
    label: "Tableau de bord",
    href: "/",
    icon: DashboardIcon
  },
  {
    label: "Demandes",
    href: "/imports/new",
    icon: FolderIcon,
    isActive: true
  },
  {
    label: "Validation",
    icon: ShieldIcon
  },
  {
    label: "Administration",
    icon: CogIcon
  }
];

const SidebarLink = ({ item }: { item: NavigationItem }) => {
  const content = (
    <>
      <item.icon className="h-5 w-5 shrink-0" />
      <span>{item.label}</span>
    </>
  );

  if (!item.href) {
    return (
      <span
        aria-disabled="true"
        className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-base font-medium text-white/75"
      >
        {content}
      </span>
    );
  }

  return (
    <a
      href={item.href}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition ${
        item.isActive
          ? "bg-secondary text-white shadow-[0_14px_28px_-18px_rgba(212,162,76,0.95)]"
          : "border border-white/10 bg-white/5 text-white/90 hover:bg-white/10"
      }`}
    >
      {content}
    </a>
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
  const { logout, user } = useAuth();
  const { showError, showSuccess } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeSchoolYear, setActiveSchoolYear] = useState<SchoolYearSummary | null>(null);
  const [activeSchoolYearError, setActiveSchoolYearError] = useState<string | null>(null);
  const [isLoadingActiveSchoolYear, setIsLoadingActiveSchoolYear] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>(() => readStoredImportHistory());
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    persistImportHistory(history);
  }, [history]);

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

  const latestImport = history[0] ?? null;
  const activeSchoolYearLabel = activeSchoolYear
    ? formatSchoolYearLabel(activeSchoolYear.label)
    : latestImport?.activeSchoolYear
      ? formatSchoolYearLabel(latestImport.activeSchoolYear)
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

  const handleLogout = (): void => {
    logout();
    window.location.replace("/login");
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
      const nextHistoryItem: ImportHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        fileName: selectedFile.name,
        importedAt: new Date().toISOString(),
        ...summary
      };

      setHistory((currentHistory) =>
        [nextHistoryItem, ...currentHistory].slice(0, MAX_IMPORT_HISTORY_ITEMS)
      );
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

  return (
    <main className="min-h-screen bg-background text-slate-900">
      <header
        className="border-b-4 border-secondary shadow-[0_20px_55px_-35px_rgba(15,23,42,0.65)]"
        style={brandTextureStyle}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src="/logo_ece.png"
              alt="Logo ECE"
              className="h-16 w-16 rounded-full border border-white/80 bg-white/95 p-1 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.75)] sm:h-20 sm:w-20"
            />
            <div className="min-w-0 text-white">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="text-3xl font-semibold tracking-tight sm:text-[2.8rem]">
                  ECE
                </p>
                <p className="text-xl font-medium text-white/90 sm:text-2xl">
                  École de la Culture et de l&apos;Éducation
                </p>
              </div>
              <p className="mt-1 text-sm text-white/75">
                Interface d&apos;administration des demandes d&apos;inscription
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] sm:flex">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-lg font-semibold">
              {user?.role === "admin" ? "A" : "?"}
            </span>
            <span className="text-lg font-medium">Admin</span>
            <ChevronDownIcon className="h-4 w-4 text-white/80" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start">
          <aside
            className="overflow-hidden rounded-[30px] border border-primaryDark/10 text-white shadow-[0_24px_58px_-38px_rgba(15,23,42,0.78)]"
            style={brandTextureStyle}
          >
            <div className="p-4">
              <nav className="space-y-3" aria-label="Navigation principale">
                {navigationItems.map((item) => (
                  <SidebarLink key={item.label} item={item} />
                ))}
              </nav>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base font-medium text-white/95 transition hover:bg-white/10"
              >
                <LogoutIcon className="h-5 w-5" />
                Déconnexion
              </button>
            </div>
          </aside>

          <div>
            <section
              className="overflow-hidden rounded-[34px] border border-[#e8ddd1] px-5 py-5 shadow-[0_26px_58px_-42px_rgba(15,23,42,0.28)] sm:px-6 lg:px-10 lg:py-8"
              style={paperTextureStyle}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <a
                  href="/applications"
                  className="inline-flex items-center gap-2 text-base font-medium text-slate-700 transition hover:text-primaryDark"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Retour à l&apos;administration
                </a>

                <div className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-[#e4d7c8] bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <span className="truncate font-medium">{activeSchoolYearLabel}</span>
                  <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-500" />
                </div>
              </div>

              <h1 className="mt-6 font-serif text-4xl text-slate-900 sm:text-[3rem]">
                Import CSV
              </h1>

              <section className={`${contentCardClassName} mt-6 p-5 sm:p-6`}>
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
                          {isSubmitting
                            ? "Import en cours..."
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
                          {latestImport.fileName} ·{" "}
                          {dateTimeFormatter.format(new Date(latestImport.importedAt))}
                        </p>
                      </div>
                      <div className="rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 text-sm font-medium text-secondaryDark">
                        {latestImport.activeSchoolYear
                          ? formatSchoolYearLabel(latestImport.activeSchoolYear)
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
                      {history.length === 0 ? (
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
                                {dateTimeFormatter.format(new Date(item.importedAt))}
                              </div>
                              <div className="mt-1 text-slate-500">{item.fileName}</div>
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
            </section>

            <footer className="py-8 text-center text-sm text-slate-500">
              © ECE – École de la Culture et de l&apos;Éducation
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ImportCsvPage;
