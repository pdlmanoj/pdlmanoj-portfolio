import { projects } from '../data/projects';
import type { Project } from '../types';

/** Featured projects first, then everything else, each group newest-first. */
export function orderedProjects(): Project[] {
  return [...projects].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
}
