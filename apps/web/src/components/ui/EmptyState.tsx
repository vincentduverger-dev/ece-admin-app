type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction
}: EmptyStateProps) => {
  const hasAction = typeof actionLabel === "string" && typeof onAction === "function";

  return (
    <section className="rounded-3xl border border-dashed border-border bg-white/85 p-8 text-center shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur sm:p-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
        Aucune donnée
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h2>

      {description ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
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
