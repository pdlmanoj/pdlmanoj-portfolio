interface TagProps {
  children: string;
}

/** Small monospace metadata label, e.g. "Featured · In Progress". */
export function Tag({ children }: TagProps) {
  return <span className="label-mono text-muted">{children}</span>;
}
