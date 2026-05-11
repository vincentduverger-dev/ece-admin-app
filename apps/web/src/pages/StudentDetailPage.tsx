import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";

import PageSectionHeader from "../components/layout/PageSectionHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import ErrorState from "../components/ui/ErrorState";
import LevelBadge from "../components/ui/LevelBadge";
import LoadingState from "../components/ui/LoadingState";
import PersonAvatar, {
  type PersonAvatarVariant
} from "../components/ui/PersonAvatar";
import PriorityBadge from "../components/ui/PriorityBadge";
import StudentStatusBadge, { getVisibleStudentStatus } from "../components/ui/StudentStatusBadge";
import {
  fetchDashboardStats,
  getSchoolYearLevelCapacities,
  getStudentById,
  updateStudentAdmissionStatus,
  updateStudentPriority
} from "../lib/api";
import type {
  ApplicationGender,
  StudentListItem,
  VisibleStudentAdmissionStatus
} from "../types/application";
import type { DashboardLevelStat } from "../types/dashboard";

const formatDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric"
});

const getEnterStyle = (delay: number): CSSProperties => {
  return { "--ui-enter-delay": `${delay}ms` } as CSSProperties;
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

const getFamilyDisplayName = (student: StudentListItem): string => {
  const family = student.application.family;
  const familyNames = [family.fatherLastName, family.motherLastName]
    .filter((value): value is string => Boolean(value?.trim()));

  return familyNames.length > 0
    ? Array.from(new Set(familyNames)).join(" / ")
    : student.lastName;
};

const getStudentAvatarVariant = (
  gender: ApplicationGender
): PersonAvatarVariant => {
  if (gender === "BOY") {
    return "boy";
  }

  if (gender === "GIRL") {
    return "girl";
  }

  return "neutral";
};

const BackIcon = ({ className = "h-4 w-4" }: { className?: string }) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10.75 3.25 6.25 8l4.5 4.75" />
      <path d="M6.5 8h7" />
    </svg>
  );
};

const StudentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentListItem | null>(null);
  const [levelCapacityByLevelId, setLevelCapacityByLevelId] = useState<
    Record<string, { isConfigured: boolean; availablePlaces: number }>
  >({});
  const [activeLevelStatsByLevelId, setActiveLevelStatsByLevelId] = useState<
    Record<string, DashboardLevelStat>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

  const loadStudent = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!id) {
        setError("Identifiant élève manquant.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const loadedStudent = await getStudentById(id, { signal });
        const [capacities, dashboardStats] = await Promise.all([
          getSchoolYearLevelCapacities(loadedStudent.application.schoolYear.id, { signal }),
          loadedStudent.application.schoolYear.isActive
            ? fetchDashboardStats({ signal })
            : Promise.resolve(null)
        ]);

        if (signal?.aborted) {
          return;
        }

        setStudent(loadedStudent);
        setLevelCapacityByLevelId(
          Object.fromEntries(
            capacities.map((capacity) => [
              capacity.levelId,
              {
                isConfigured: capacity.id !== null,
                availablePlaces: capacity.availablePlaces
              }
            ])
          )
        );
        setActiveLevelStatsByLevelId(
          Object.fromEntries(
            (dashboardStats?.byLevel ?? [])
              .filter((level): level is DashboardLevelStat & { id: string } =>
                typeof level.id === "string"
              )
              .map((level) => [level.id, level])
          )
        );
      } catch (loadError) {
        if (isAbortError(loadError) || signal?.aborted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger la fiche élève."
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [id]
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadStudent(controller.signal);

    return () => controller.abort();
  }, [loadStudent]);

  const handleStatusChange = useCallback(
    async (nextStatus: VisibleStudentAdmissionStatus): Promise<void> => {
      if (!student) {
        return;
      }

      setIsUpdatingStatus(true);
      setError(null);

      try {
        const result = await updateStudentAdmissionStatus(student.id, nextStatus);

        setStudent((currentStudent) =>
          currentStudent
            ? {
                ...currentStudent,
                admissionStatus: result.student.admissionStatus,
                application: {
                  ...currentStudent.application,
                  status: result.applicationStatus
                }
              }
            : currentStudent
        );
        if (student.application.schoolYear.isActive) {
          const dashboardStats = await fetchDashboardStats();

          setActiveLevelStatsByLevelId(
            Object.fromEntries(
              dashboardStats.byLevel
                .filter((level): level is DashboardLevelStat & { id: string } =>
                  typeof level.id === "string"
                )
                .map((level) => [level.id, level])
            )
          );
        }
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : "Impossible de modifier le statut de l'élève."
        );
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [student]
  );

  const handlePriorityToggle = useCallback(async (): Promise<void> => {
    if (!student) {
      return;
    }

    setIsUpdatingPriority(true);
    setError(null);

    try {
      const updatedStudent = await updateStudentPriority(
        student.id,
        !student.isPriority
      );

      setStudent(updatedStudent);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Impossible de modifier la priorité de l'élève."
      );
    } finally {
      setIsUpdatingPriority(false);
    }
  }, [student]);

  const pageTopBar = (
    <div
      className="ui-animate-in ui-animate-in--subtle w-fit rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-sm text-primaryDark shadow-[0_10px_22px_-22px_rgba(15,23,42,0.18)]"
      style={getEnterStyle(20)}
    >
      <Breadcrumb
        items={[
          { label: "Tableau de bord", href: "/" },
          { label: "Élèves", href: "/students" },
          { label: student ? `${student.firstName} ${student.lastName}` : "Fiche élève" }
        ]}
      />
    </div>
  );

  const pageHeader = (
    <div className="ui-animate-in ui-animate-in--subtle" style={getEnterStyle(130)}>
      <PageSectionHeader
        topBar={pageTopBar}
        eyebrow="Fiche élève"
        title={student ? `${student.firstName} ${student.lastName}` : "Fiche élève"}
        description="Vue de traitement individuelle avec la famille, le niveau demandé et les décisions élève."
      />
    </div>
  );

  if (isLoading && !student) {
    return (
      <>
        {pageHeader}
        <LoadingState variant="page" />
      </>
    );
  }

  if (error && !student) {
    return (
      <>
        {pageHeader}
        <ErrorState message={error} backLink="/students" />
      </>
    );
  }

  if (!student) {
    return null;
  }

  const family = student.application.family;
  const visibleStatus = getVisibleStudentStatus(student.admissionStatus);
  const isAccepted = visibleStatus === "ACCEPTED";
  const isWaitlisted = visibleStatus === "WAITLISTED";
  const levelCapacity = levelCapacityByLevelId[student.levelId];
  const activeLevelStats = activeLevelStatsByLevelId[student.levelId];
  const isCapacityMissing = levelCapacity?.isConfigured === false;
  const isLevelFull =
    student.application.schoolYear.isActive &&
    typeof activeLevelStats?.remainingPlaces === "number" &&
    activeLevelStats.remainingPlaces <= 0;
  const acceptBlockMessage = isCapacityMissing
    ? "Places disponibles non renseignées pour ce niveau."
    : isLevelFull
    ? "Ce niveau est complet. Aucune place restante."
    : null;
  const isAcceptDisabled =
    isUpdatingStatus || isAccepted || Boolean(acceptBlockMessage);

  return (
    <>
      {pageHeader}

      {error ? <ErrorState message={error} actionLabel="Réessayer" onAction={() => void loadStudent()} /> : null}

      <section
        className="ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent overflow-hidden rounded-[32px] border border-primary/20 bg-[#fffdf8] shadow-[0_30px_66px_-38px_rgba(31,77,58,0.42)]"
        style={getEnterStyle(190)}
      >
        <div className="border-b border-secondary/30 bg-primary px-5 py-5 text-white sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <PersonAvatar
                label={`${student.firstName} ${student.lastName}`}
                size="lg"
                variant={getStudentAvatarVariant(student.gender)}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
                  Décision élève
                </p>
                <h2 className="mt-1.5 text-3xl font-semibold text-white">
                  {student.firstName} {student.lastName}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StudentStatusBadge status={student.admissionStatus} />
                  <LevelBadge code={student.level.code} label={student.level.label} size="md" />
                  <PriorityBadge isPriority={student.isPriority} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isUpdatingPriority}
                onClick={() => void handlePriorityToggle()}
                className="rounded-full border border-secondary/35 bg-secondary/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-secondary/25 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {student.isPriority ? "Retirer priorité" : "Marquer prioritaire"}
              </button>
              <button
                type="button"
                disabled={isAcceptDisabled}
                onClick={() => void handleStatusChange("ACCEPTED")}
                className="rounded-full bg-success px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-55"
              >
                Accepter
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus || isWaitlisted}
                onClick={() => void handleStatusChange("WAITLISTED")}
                className="rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-55"
              >
                Mettre en attente
              </button>
            </div>
          </div>
          {acceptBlockMessage ? (
            <p className="mt-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
              {acceptBlockMessage}
            </p>
          ) : null}
        </div>

        <div className="grid items-start gap-4 bg-[#fffaf2] p-5 sm:p-6 lg:grid-cols-3">
          <article className="rounded-[24px] border border-white bg-white/85 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primaryLight">
              Informations élève
            </p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="font-semibold text-slate-500">Nom complet</dt>
                <dd className="mt-1 text-slate-900">{student.firstName} {student.lastName}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Date de naissance</dt>
                <dd className="mt-1 text-slate-900">{formatDate.format(new Date(student.birthDate))}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Niveau demandé</dt>
                <dd className="mt-2">
                  <LevelBadge code={student.level.code} label={student.level.label} size="sm" />
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-[24px] border border-white bg-white/85 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primaryLight">
              Famille
            </p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="font-semibold text-slate-500">Famille</dt>
                <dd className="mt-1 text-slate-900">Famille {getFamilyDisplayName(student)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Parents</dt>
                <dd className="mt-1 text-slate-900">
                  {[family.fatherFirstName, family.fatherLastName].filter(Boolean).join(" ") || "Père non renseigné"}
                  <br />
                  {[family.motherFirstName, family.motherLastName].filter(Boolean).join(" ") || "Mère non renseignée"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Contact</dt>
                <dd className="mt-1 break-all text-slate-900">
                  {family.contactEmail || "Email non renseigné"}
                  <br />
                  {family.contactPhone || "Téléphone non renseigné"}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-[24px] border border-white bg-white/85 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primaryLight">
              Contexte secondaire
            </p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="font-semibold text-slate-500">Année scolaire</dt>
                <dd className="mt-1 text-slate-900">{student.application.schoolYear.label}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Soumission</dt>
                <dd className="mt-1 text-slate-900">
                  {formatDate.format(new Date(student.application.submittedAt))}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Origine</dt>
                <dd className="mt-2">
                  <Link
                    to={`/applications/${student.application.id}`}
                    className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary"
                  >
                    Voir la famille
                  </Link>
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <div className="ui-animate-in mt-5 flex justify-center" style={getEnterStyle(250)}>
        <Link
          to="/students"
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-5 py-2.5 text-sm font-semibold text-primaryDark shadow-[0_14px_30px_-24px_rgba(15,23,42,0.3)] transition hover:border-primary/35 hover:text-primary"
        >
          <BackIcon />
          <span>Retour à la liste d&apos;élèves</span>
        </Link>
      </div>
    </>
  );
};

export default StudentDetailPage;
