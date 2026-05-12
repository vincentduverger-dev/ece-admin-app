import type { ReactNode } from "react";

type PageSectionHeaderProps = {
  topBar?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
};

const PageSectionHeader = ({
  topBar,
  eyebrow,
  title,
  description,
  aside
}: PageSectionHeaderProps) => {
  return (
    <section className="mb-6">
      {topBar ? <div>{topBar}</div> : null}

      <div
        className={`${topBar ? "mt-6 " : ""}flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between`}
      >
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primaryLight">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 font-serif text-4xl leading-tight text-slate-900 sm:text-[3rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-4xl text-[1.02rem] leading-8 text-slate-700">
              {description}
            </p>
          ) : null}
        </div>

        {aside ? (
          <div className="flex shrink-0 flex-col gap-3 lg:items-end">{aside}</div>
        ) : null}
      </div>
    </section>
  );
};

export default PageSectionHeader;
