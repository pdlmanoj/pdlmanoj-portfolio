interface SectionHeaderProps {
  /**
   * Identifies the block, not a section of its own: the id lands on the heading, so
   * an `aria-labelledby` or a deep link can point at it.
   */
  id: string;
  /**
   * Two-digit mono index and its label, e.g. "01" over "Explore". Both are optional
   * and currently unused: one section with one heading does not need a number, and a
   * number that counts nothing is worse than no number.
   */
  index?: string;
  label?: string;
  title: string;
  intro?: string;
  className?: string;
}

/**
 * The heading of a block inside a section, with the same type and spacing every
 * time. Plain by design: no box, no divider, no marker unless one is asked for.
 */
export function SectionHeader({
  id,
  index,
  label,
  title,
  intro,
  className = '',
}: SectionHeaderProps) {
  const marker = index && label;

  return (
    <header className={className}>
      {marker ? (
        <p className="label-mono text-muted">
          <span className="text-text">{index}</span>
          <span className="px-2 text-border-strong">/</span>
          {label}
        </p>
      ) : null}
      <h2
        id={`${id}-title`}
        // The margin clears the marker above it. Without one, the heading starts the
        // block and has nothing to clear.
        className={`text-xl font-medium tracking-tight text-balance sm:text-2xl ${
          marker ? 'mt-3' : ''
        }`}
      >
        {title}
      </h2>
      {intro ? <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">{intro}</p> : null}
    </header>
  );
}
