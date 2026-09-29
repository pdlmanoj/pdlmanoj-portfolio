import type { Project } from '../types';

/**
 * ---------------------------------------------------------------------------
 * PROJECTS — the main thing you will update.
 *
 * To add a project: paste a new object at the top of the list. That is the
 * entire workflow — the Projects section reads from this array.
 *
 * Only `title` and `description` are required. Everything else is optional and
 * hidden when missing.
 *
 *   githubUrl:  repository link. Set this and the card title plus the GitHub
 *               icon link both point at it. Without it the card is plain text,
 *               so there are never dead links.
 *   liveUrl:    deployed demo (usually the frontend). A second icon link
 *               appears only on the projects where you set this.
 *   status:     'live' | 'in-progress' | 'archived'   (default: 'live')
 *   featured:   true  -> larger card at the top of the list
 *
 * ---------------------------------------------------------------------------
 */
export const projects: Project[] = [
  {
    title: 'Digital Wallet API',
    description: 'A backend system for managing users, wallets, transactions and payment flows.',
    technologies: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
    featured: true,
    status: 'live',
    githubUrl: 'https://github.com/pdlmanoj/digital-wallet-api',
    liveUrl: 'https://frontend-digitial-wallet.onrender.com/',
  },

  {
    title: 'Mock Payment Gateway',
    description:
      'A simulated payment gateway API designed to experiment with realistic payment flows, transaction states, webhooks and idempotency.',
    technologies: ['Python', 'FastAPI', 'PostgreSQL', 'Webhooks', 'Idempotency'],
    status: 'in-progress',
    githubUrl: 'https://github.com/pdlmanoj/payment-gateway',
    // liveUrl: 'https://your-demo-here.example.com',
  },
];
