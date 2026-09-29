import { PageHeader } from '../components/layout/PageHeader';
import { Reveal } from '../components/ui/Reveal';
import { experience, type Experience } from '../data/experience';

interface CompanyGroup {
  company: string;
  span: string;
  industry?: string;
  roles: Experience[];
  from: number;
  to: number;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function monthValue(label: string): number | null {
  const match = label.trim().match(/^([a-z]{3})[a-z]*\s+(\d{4})$/i);

  if (!match) return null;

  const month = MONTHS.indexOf(match[1].toLowerCase());

  if (month === -1) return null;

  return Number(match[2]) * 12 + month;
}

function periodEnds(period: string): { from: number; to: number } {
  const [start, end] = period.split('—').map((part) => part.trim());

  const from = monthValue(start) ?? 0;
  const to = /present/i.test(end) ? Number.POSITIVE_INFINITY : (monthValue(end) ?? from);

  return { from, to };
}

function formatEnd(value: number): string {
  if (!Number.isFinite(value)) return 'Present';

  return `${MONTHS[value % 12]} ${Math.floor(value / 12)}`;
}

function formatStart(value: number): string {
  const formatted = formatEnd(value);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function periodLabel(from: number, to: number): string {
  return `${formatStart(from)} — ${formatEnd(to)}`;
}

function groupByCompany(entries: Experience[]): CompanyGroup[] {
  const groups: CompanyGroup[] = [];

  for (const entry of entries) {
    const company = entry.company ?? entry.role;
    const { from, to } = periodEnds(entry.period);
    const current = groups.at(-1);

    if (current && current.company === company) {
      current.roles.push(entry);
      current.from = Math.min(current.from, from);
      current.to = Math.max(current.to, to);
      current.span = periodLabel(current.from, current.to);
      continue;
    }

    groups.push({
      company,
      span: periodLabel(from, to),
      industry: entry.industry,
      roles: [entry],
      from,
      to,
    });
  }

  return groups;
}

function RoleEntry({ role }: { role: Experience }) {
  return (
    <div>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
        <h4 className="text-lg font-medium tracking-tight">{role.role}</h4>

        <p className="label-mono shrink-0 text-muted">{role.period}</p>
      </div>

      {role.responsibilities?.length ? (
        <ul className="mt-4 list-disc space-y-2 pl-5">
          {role.responsibilities.map((responsibility) => (
            <li key={responsibility} className="text-base leading-relaxed text-muted">
              {responsibility}
            </li>
          ))}
        </ul>
      ) : null}

      {role.technologies?.length ? (
        <p className="mt-5 font-mono text-sm text-accent">{role.technologies.join(' · ')}</p>
      ) : null}
    </div>
  );
}

/**
 * The experience page, served at `/experience/`.
 *
 * A real page for the same reason `/blog/` is: it is a page a recruiter opens and a
 * link worth sharing, so it needs its own address, its own preview and its own
 * sitemap entry rather than a heading halfway down the homepage. The static version
 * is written at build time by `build/post-pages.ts`.
 *
 * Consecutive entries at the same company are grouped into one block, so a
 * promotion reads as one tenure with two roles under it rather than as two jobs.
 */
export function ExperiencePage() {
  const groups = groupByCompany(experience);

  return (
    <div className="left-gutter mx-auto w-full max-w-5xl px-5 pt-12 pb-24 sm:px-8 sm:pt-16">
      <PageHeader
        title="Experience"
        intro="The systems I have worked on and the impact I've made."
      />

      {groups.length === 0 ? (
        <p className="mt-12 text-muted sm:mt-16">Experience details coming soon.</p>
      ) : (
        <ol className="mt-12 max-w-3xl space-y-14 sm:mt-16">
          {groups.map((group, groupIndex) => (
            <Reveal as="li" key={`${group.company}-${group.span}`} delay={groupIndex * 60}>
              {/* Company */}
              <div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
                  <h2 className="text-xl font-medium tracking-tight sm:text-2xl">
                    {group.company}
                  </h2>

                  <p className="label-mono shrink-0 text-muted">{group.span}</p>
                </div>

                {group.industry ? (
                  <p className="mt-1 font-mono text-sm text-muted">{group.industry}</p>
                ) : null}
              </div>

              {/* Roles */}
              <div className={group.roles.length > 1 ? 'mt-8 space-y-10' : 'mt-7'}>
                {group.roles.map((role, roleIndex) => (
                  <div key={`${role.role}-${role.period}`}>
                    {roleIndex > 0 ? <div className="mb-8 border-t border-border" /> : null}

                    <RoleEntry role={role} />
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </ol>
      )}
    </div>
  );
}
