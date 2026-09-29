import type { Profile } from '../types';

/**
 * ---------------------------------------------------------------------------
 * PROFILE — who you are, in your own words, and where people can find you.
 * Editing this file is enough to update the hero, the about text, the navbar
 * socials and the footer.
 *
 * PLACEHOLDERS to replace (search for "TODO"):
 *   - GitHub and LinkedIn handles below
 * ---------------------------------------------------------------------------
 */

/** The one address on the site, so the navbar, the footer and the JSON-LD agree. */
const email = 'mpsandip12@gmail.com'; // TODO: replace with your real address

export const profile: Profile = {
  name: 'Manoj Paudel',
  initials: 'Manoj Paudel',
  // A file in public/, shown in a circle at the top right of the hero. 440x440.
  avatar: 'profile.jpeg',
  role: 'Junior Backend Developer',

  tagline: 'Backend engineering, fundamentals first.',

  // Shown as a small status line above your name. Change the wording, or delete
  // this line entirely to hide it.
  // availability: 'Open to backend roles',

  // The one warm sentence on the site, shown under your name in the accent red.
  heroParagraph: 'write backend code and learn something new every day.',

  /**
   * The hero intro. The first entry is the greeting and becomes the page `h1`,
   * so it has to keep your name in it; the rest are the paragraphs under it.
   * Delete an entry to shorten the hero.
   *
   * One paragraph under the greeting, on purpose. Four of them made the hero a wall
   * of text that had to be read before the cards were reachable, and the cards are
   * the only way on to the rest of the site. Add an entry back to put one back.
   *
   * The longer version is kept in the comment below rather than deleted: it is good
   * writing that belongs somewhere, and the blog page is the obvious home for it.
   */
  about: [
    'Hey I am Manoj 👋',
    "Python developer working in a fintech company. I started as an intern in 2025 and now work on features real people use. It's a great way to learn, and I try to deep dive into why things are done in a certain way in a real project, not just how.",
    "At work, I'm mostly adding features to a big system that already exists. That's good, but I kept wondering how I would build one from zero. So in my free time, I'm building projects to learn how production-grade projects are built. I like to learn backend tools using a step-by-step plan, do every step by hand, and then use it in my project. Yes, sometimes it breaks. That's how I learn.",
    "I'll write here every week about what I learn, what I build, and what goes wrong. My goal is to become a strong backend engineer, build things I'm curious about, and maybe work remotely one day. If you're also learning backend, stay and read along. We can learn together.",
  ],

  socials: [
    {
      label: 'GitHub',
      handle: '@pdlmanoj', // TODO: replace with your username
      href: 'https://github.com/pdlmanoj',
      icon: 'github',
    },
    {
      label: 'LinkedIn',
      handle: 'in/pdlmanoj', // TODO: replace with your profile
      href: 'https://www.linkedin.com/in/pdlmanoj',
      icon: 'linkedin',
    },
    {
      label: 'Twitter',
      handle: '@pdlmanoj_', // TODO: replace with your real username
      href: 'https://twitter.com/pdlmanoj_',
      icon: 'twitter',
    },
    {
      label: 'Email',
      handle: email,
      href: `mailto:${email}`,
      icon: 'mail',
    },
  ],
};
