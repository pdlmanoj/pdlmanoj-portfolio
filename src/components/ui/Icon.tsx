import { Github, Linkedin, Mail, MonitorPlay, Twitter } from 'lucide-react';
import type { IconName } from '../../types';

/**
 * Maps the icon keys used in data files to real components, so content files
 * never need to import from a component or icon library.
 */
const icons = {
  github: Github,
  linkedin: Linkedin,
  twitter: Twitter,
  mail: Mail,
  /** Live demo of a project (its deployed frontend). */
  demo: MonitorPlay,
} satisfies Record<IconName, typeof Github>;

interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className = 'h-4 w-4' }: IconProps) {
  const Component = icons[name];
  return <Component className={className} aria-hidden="true" />;
}
