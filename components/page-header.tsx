interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

/** Mismo lenguaje del login: eyebrow en mayúsculas + título grande en serif. */
export function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="font-display mt-2 text-3xl text-foreground sm:text-4xl">
        {title}
      </h1>
      {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
