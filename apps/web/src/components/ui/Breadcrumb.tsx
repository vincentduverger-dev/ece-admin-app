type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

const Breadcrumb = ({ items }: BreadcrumbProps) => {
  return (
    <nav aria-label="Fil d'Ariane">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {items.map((item, index) => {
          const isCurrentPage = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-slate-400">
                  /
                </span>
              ) : null}

              {item.href && !isCurrentPage ? (
                <a
                  href={item.href}
                  className="font-medium text-slate-500 transition hover:text-primaryDark"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={isCurrentPage ? "page" : undefined}
                  className={
                    isCurrentPage
                      ? "font-semibold text-slate-900"
                      : "font-medium text-slate-500"
                  }
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
