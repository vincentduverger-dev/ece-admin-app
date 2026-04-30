type EmptyStateProps = {
  actionLabel?: string;
  description?: string;
  onAction?: () => void;
  title: string;
};

const EmptyState = ({
  actionLabel,
  description,
  onAction,
  title
}: EmptyStateProps) => {
  const hasAction = typeof actionLabel === "string" && typeof onAction === "function";

  return (
    <section className="rounded-3xl border border-dashed border-border bg-white/85 p-8 text-center shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur sm:p-10">
      <div className="mx-auto mb-5 flex justify-center">
        <div className="grid h-28 w-28 place-items-center rounded-[28px] border border-dashed border-primary/15 bg-primary/5">
          <svg
            viewBox="0 0 80 80"
            aria-hidden="true"
            className="h-16 w-16 text-primary"
            fill="none"
          >
            <rect x="18" y="18" width="44" height="50" rx="8" fill="white" stroke="currentColor" strokeWidth="3" opacity="0.9" />
            <path d="M28 32h24M28 43h20M28 54h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
            <path d="m29 24 5 5 11-13" stroke="#D4A24C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
        Aucune donnée
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h2>

      {description ? (
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      ) : null}

      {hasAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
};

export default EmptyState;
