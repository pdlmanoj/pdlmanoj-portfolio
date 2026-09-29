import { useEffect, useRef, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { navItems, type NavItem } from '../../data/site';
import { profile } from '../../data/profile';
import { useTheme } from '../../hooks/useTheme';
import { pageUrl } from '../../lib/assets';
import { Icon } from '../ui/Icon';
import { navigate, type Route } from '../../hooks/useHashRoute';

interface NavbarProps {
  route: Route;
}

/**
 * The socials shown in the navbar, icons only. The email is in here now as well: it
 * used to be filtered out and mobile-only, which meant the one thing a visitor can
 * act on without leaving the site was reachable on a phone and not on a desktop.
 */
const socialItems = profile.socials;

export function Navbar({ route }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();
  const activeSection = route.name === 'home' ? route.section : undefined;
  const isDark = theme === 'dark';

  // Any navigation closes the mobile menu.
  useEffect(() => setMenuOpen(false), [route]);

  // Escape closes the menu and returns focus to the button that opened it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  /**
   * A nav item is either a page — the blog, the projects, the experience — or a
   * heading on the homepage.
   *
   * A page link is built from the site root rather than from a `./` or `../`
   * prefix, so it points at the same place from the homepage, from a post and from
   * a page, and the browser follows it as an ordinary navigation. That is the point:
   * the address bar then holds the new page's own URL, which is what the links on
   * that page are resolved against. A section link is a hash, and is handled here to
   * avoid a reload.
   */
  const navHref = (item: NavItem) =>
    item.kind === 'page' ? pageUrl(`${item.id}/`) : `#/${item.id}`;

  const isActive = (item: NavItem) =>
    item.kind === 'page' ? route.name === item.id : activeSection === item.id;

  const onNavClick = (item: NavItem) => (event: React.MouseEvent) => {
    setMenuOpen(false);
    if (item.kind === 'page') return; // a real page: let the browser navigate
    event.preventDefault();
    navigate(`#/${item.id}`);
  };

  return (
    // `border-text/20` rather than `border-border`: the bar is transparent, so the
    // line has to come from the text colour to read as a drawn edge in both themes
    // instead of vanishing against the page.
    <header className="sticky top-0 z-50 border-b border-text/20 bg-bg/85 backdrop-blur-sm">
      {/*
        Three groups, each pulled to its own edge: the monogram alone on the left,
        then the pages, then the socials and the theme toggle on the right. `ml-auto`
        on the page list is what opens the gap after the monogram; the socials get
        their own group with a rule in front of them, so they read as a separate
        thing rather than as one more link in the list.
      */}
      <nav
        className="left-gutter mx-auto flex h-[4.5rem] w-full max-w-5xl items-center gap-4 px-5 sm:px-8"
        aria-label="Main"
      >
        <a
          href="#/"
          onClick={(event) => {
            event.preventDefault();
            setMenuOpen(false);
            navigate('#/');
          }}
          className="label-mono text-lg tracking-[0.18em] text-text transition-colors hover:text-accent"
        >
          {profile.initials}
        </a>

        {/* Desktop navigation */}
        <ul className="ml-auto hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <li key={item.id}>
              <a
                href={navHref(item)}
                aria-current={isActive(item) ? 'true' : undefined}
                onClick={onNavClick(item)}
                // Black until it is hovered or the current page, then the accent.
                // `font-medium` because at 400 these were the faintest text in the
                // bar, quieter than the wordmark next to them.
                className={[
                  'link-underline py-1 text-base font-medium text-text transition-colors hover:text-accent',
                  isActive(item) ? 'text-accent' : '',
                ].join(' ')}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop socials: their own group, set off by a rule so they do not read
            as another page link. The mail icon is last in the group, after the two
            networks it belongs with, and opens the mail client rather than a tab. */}
        <div className="hidden items-center gap-4 border-l border-border pl-6 md:flex">
          {socialItems.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.icon === 'mail' ? undefined : '_blank'}
              rel="noreferrer noopener"
              className="text-muted transition-colors hover:text-accent"
            >
              <span className="sr-only">{link.label}</span>
              <Icon name={link.icon} className="h-[1.35rem] w-[1.35rem]" />
            </a>
          ))}
        </div>

        {/* Light/dark toggle. Shows the theme it switches to. */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="-ml-1 rounded-full p-3 text-muted transition-colors duration-150 hover:bg-hover hover:text-text"
          >
            <span className="sr-only">
              {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            </span>
            {isDark ? (
              <Sun key="sun" className="icon-swap h-[1.35rem] w-[1.35rem]" aria-hidden="true" />
            ) : (
              <Moon key="moon" className="icon-swap h-[1.35rem] w-[1.35rem]" aria-hidden="true" />
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="-mr-2 p-3 text-muted transition-colors hover:text-text md:hidden"
          >
            <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
            {menuOpen ? (
              <X className="h-7 w-7" aria-hidden="true" />
            ) : (
              <Menu className="h-7 w-7" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile navigation panel */}
      {menuOpen ? (
        <div id="mobile-navigation" className="border-b border-text/20 bg-bg/95 md:hidden">
          <ul className="left-gutter mx-auto flex w-full max-w-5xl flex-col px-5 pt-4 pb-6 sm:px-8">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={navHref(item)}
                  aria-current={isActive(item) ? 'true' : undefined}
                  onClick={onNavClick(item)}
                  // `font-medium` here for the same reason as in the desktop list:
                  // the page names are the point of the panel and 400 was too light
                  // against the labels below them.
                  className={[
                    'block py-3.5 text-lg font-medium text-text',
                    isActive(item) ? 'text-accent' : '',
                  ].join(' ')}
                >
                  {item.label}
                </a>
              </li>
            ))}
            {/* The socials, including the email, on one line. Two things were wrong
                here: at `text-base` with `gap-x-6` the four of them needed more
                width than a 375px screen has, so `Email` wrapped onto a line of its
                own and the row read as 3 + 1; and a link with no padding is 24px
                tall, well under the 44px a thumb wants. `py-3` fixes the second and
                costs no width, because a tap target needs height, not padding
                around the text. `text-sm` with a tighter gap buys back the first.
                Measured on the built site: all four share one line from 375px up,
                and they wrap below that rather than overflow. A 360px phone still
                gets 3 + 1, which is the lesser of the two faults, and the row is
                44px tall on every one of them. */}
            <li className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
              {profile.socials.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.icon === 'mail' ? undefined : '_blank'}
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 py-3 text-sm text-muted transition-colors hover:text-accent"
                >
                  <Icon name={link.icon} className="h-4 w-4" />
                  {link.label}
                </a>
              ))}
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}
