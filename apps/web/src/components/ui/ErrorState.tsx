type ErrorStateProps = {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  backLink?: string;
};

const getBackLinkLabel = (backLink: string): string => {
  if (backLink === "/applications") {
    return "Retour à la liste";
  }

  if (backLink === "/") {
    return "Retour au dashboard";
  }

  return "Retour";
};

const ErrorState = ({
  title = "Impossible de charger les données",
  message,
  actionLabel,
  onAction,
  backLink
}: ErrorStateProps) => {
  const hasAction = typeof actionLabel === "string" && typeof onAction === "function";
  const hasBackLink = typeof backLink === "string" && backLink.length > 0;

  return (
    <section className="rounded-3xl border border-danger/20 bg-white/90 p-8 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-danger">
        Erreur
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{message}</p>

      {hasAction || hasBackLink ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {hasAction ? (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center rounded-full bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
            >
              {actionLabel}
            </button>
          ) : null}

          {hasBackLink ? (
            <a
              href={backLink}
              className={`inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                hasAction
                  ? "border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  : "bg-primary text-white hover:bg-primaryDark"
              }`}
            >
              {getBackLinkLabel(backLink)}
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default ErrorState;
