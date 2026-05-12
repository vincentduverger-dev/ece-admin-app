import type { ToastItem, ToastType } from "../../context/ToastContext";

type ToastProps = {
  toast: ToastItem;
  onDismiss: (toastId: number) => void;
};

const variantStyles: Record<
  ToastType,
  {
    badgeClassName: string;
    borderClassName: string;
    label: string;
    labelClassName: string;
  }
> = {
  success: {
    badgeClassName: "bg-success",
    borderClassName: "border-success/20",
    label: "Succès",
    labelClassName: "text-success"
  },
  error: {
    badgeClassName: "bg-danger",
    borderClassName: "border-danger/20",
    label: "Erreur",
    labelClassName: "text-danger"
  }
};

const Toast = ({ toast, onDismiss }: ToastProps) => {
  const variant = variantStyles[toast.type];

  return (
    <article
      role={toast.type === "error" ? "alert" : "status"}
      className={`pointer-events-auto rounded-3xl border bg-white/95 p-4 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur ${variant.borderClassName}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-2 h-2.5 w-2.5 flex-none rounded-full ${variant.badgeClassName}`}
        />

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.18em] ${variant.labelClassName}`}
          >
            {variant.label}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{toast.message}</p>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="inline-flex flex-none items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
          aria-label="Fermer la notification"
        >
          X
        </button>
      </div>
    </article>
  );
};

export default Toast;
