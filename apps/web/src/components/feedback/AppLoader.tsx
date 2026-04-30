type AppLoaderProps = {
  label?: string;
  size?: "sm" | "md";
};

const sizeClassNames: Record<NonNullable<AppLoaderProps["size"]>, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12"
};

const AppLoader = ({ label = "Chargement des données...", size = "md" }: AppLoaderProps) => {
  return (
    <div className="flex items-center gap-4">
      <span
        className={`${sizeClassNames[size]} grid shrink-0 place-items-center rounded-full border border-primary/10 bg-primary/5`}
      >
        <span className="h-1/2 w-1/2 animate-spin rounded-full border-2 border-primary/15 border-t-primary motion-reduce:animate-none" />
      </span>
      <p className="text-sm leading-6 text-slate-600">{label}</p>
    </div>
  );
};

export default AppLoader;
