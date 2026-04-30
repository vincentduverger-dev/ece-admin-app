import AppLoader from "../feedback/AppLoader";

type LoadingStateProps = {
  variant?: "page" | "card";
};

const containerClassName =
  "rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur";

const pulseClassName = "animate-pulse rounded-2xl bg-slate-200/80";

const LoadingState = ({ variant = "page" }: LoadingStateProps) => {
  if (variant === "card") {
    return (
      <section
        aria-busy="true"
        aria-live="polite"
        role="status"
        className={`${containerClassName} p-5 sm:p-6`}
      >
        <div className="flex items-start gap-4">
          <div className={`${pulseClassName} h-12 w-12 rounded-full`} />
          <div className="flex-1 space-y-3">
            <div className={`${pulseClassName} h-4 w-40`} />
            <div className={`${pulseClassName} h-3 w-full max-w-md`} />
            <div className={`${pulseClassName} h-3 w-3/4 max-w-sm`} />
          </div>
        </div>
        <div className="mt-4">
          <AppLoader size="sm" />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-busy="true"
      aria-live="polite"
      role="status"
      className="space-y-6"
    >
      <article className={`${containerClassName} p-6 sm:p-8`}>
        <div className="space-y-3">
          <div className={`${pulseClassName} h-4 w-36`} />
          <div className={`${pulseClassName} h-10 w-full max-w-2xl`} />
          <div className={`${pulseClassName} h-4 w-full max-w-3xl`} />
          <div className={`${pulseClassName} h-4 w-4/5 max-w-2xl`} />
        </div>
        <div className="mt-6">
          <AppLoader />
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className={`${containerClassName} h-32 animate-pulse bg-white/80`}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className={`${containerClassName} h-72 animate-pulse bg-white/80`}
          />
        ))}
      </div>
    </section>
  );
};

export default LoadingState;
