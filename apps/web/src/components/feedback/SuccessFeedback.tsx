type SuccessFeedbackProps = {
  description?: string;
  title: string;
};

const SuccessFeedback = ({ description, title }: SuccessFeedbackProps) => {
  return (
    <section className="rounded-[26px] border border-success/20 bg-success/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-success/20 bg-success/10">
          <svg
            viewBox="0 0 24 24"
            className="h-10 w-10 text-success"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="m5 12 4 4L19 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="success-feedback__check"
            />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-success">
            Succès
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default SuccessFeedback;
