/**
 * Content models for the whole site.
 *
 * Everything rendered on the site is described by these types, and all of the
 * actual content lives in `src/data/*.ts`. Components never hardcode content,
 * so updating the portfolio only ever means editing a data file.
 */

/** Icon keys are resolved to real components in `src/components/ui/Icon.tsx`. */
export type IconName = 'github' | 'linkedin' | 'twitter' | 'mail' | 'demo';

export interface SocialLink {
  label: string;
  href: string;
  icon: IconName;
  /** Short label used where space is tight, e.g. the footer. */
  handle?: string;
}

export interface Profile {
  name: string;
  /** Short uppercase form used in the navbar and footer. */
  initials: string;
  /**
   * Portrait in the hero: a file name inside `public/`, e.g. `profile.jpeg`.
   * Optional — with no avatar the hero is text only. The URL is built with
   * `assetUrl`, so give the file name and not a path.
   */
  avatar?: string;
  role: string;
  /** One-line positioning statement shown under the name. */
  tagline: string;
  /**
   * Optional status line above the name, e.g. "Open to junior backend roles".
   * Delete the line (or the field) when there is nothing to announce.
   */
  availability?: string;
  /**
   * The one sentence under the name, rendered in the accent red. It is the only
   * warm sentence on the site, so keep it short.
   */
  heroParagraph: string;
  /**
   * The about text, which the hero renders: the first entry is the greeting and
   * becomes the page `h1`, the rest are paragraphs under it.
   */
  about: string[];
  /** GitHub, LinkedIn, Twitter, email. Rendered in the navbar and the mobile menu. */
  socials: SocialLink[];
}

export type ProjectStatus = 'live' | 'in-progress' | 'archived';

export interface Project {
  title: string;
  /** Shown on the card, and as the one line a crawler gets in its fallback list. */
  description: string;
  technologies: string[];
  /** Repository. The card title and the "Code" link both point here. */
  githubUrl?: string;
  liveUrl?: string;
  image?: string;
  imageAlt?: string;
  featured?: boolean;
  status?: ProjectStatus;
}

export interface Experience {
  role: string;
  /** Optional until you are comfortable sharing it publicly. */
  company?: string;
  /** Free-form, e.g. "2025 — Present" or "Jan 2025 — Aug 2025". */
  period: string;
  /** Optional context line, e.g. the industry or type of work. */
  industry?: string;
  responsibilities?: string[];
  technologies?: string[];
}
