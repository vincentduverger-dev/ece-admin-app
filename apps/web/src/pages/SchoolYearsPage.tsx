import Breadcrumb from "../components/ui/Breadcrumb";
import PageSectionHeader from "../components/layout/PageSectionHeader";

const SchoolYearsPage = () => {
  const pageTopBar = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="w-fit rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-sm text-primaryDark shadow-[0_10px_22px_-22px_rgba(15,23,42,0.18)]">
        <Breadcrumb
          items={[
            { label: "Tableau de bord", href: "/" },
            { label: "Années scolaires" }
          ]}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <PageSectionHeader topBar={pageTopBar} title="Années scolaires" />

      <section className="rounded-[28px] border border-[#e9ded2] bg-white/76 p-6 shadow-[0_22px_48px_-36px_rgba(15,23,42,0.38)] backdrop-blur sm:p-8">
        <div className="max-w-3xl">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-primaryLight">
            Administration ECE
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            Gestion des années scolaires à venir.
          </p>
        </div>
      </section>
    </div>
  );
};

export default SchoolYearsPage;
