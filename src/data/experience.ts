export type { Experience } from '../types';

import type { Experience } from '../types';

/**
 * ---------------------------------------------------------------------------
 * EXPERIENCE — professional history, newest first.
 *
 * To add a role: insert a new object at the top of the list. Every field except
 * `role` and `period` is optional and only renders when present, so you can fill
 * this in piece by piece.
 *
 * HOW TO WRITE EACH FIELD
 *
 *   role            Your actual job title. The one on your contract, honestly.
 *   period          '2025-Nov — Present' or 'Jan 2025 — Aug 2025'
 *   company         Employer name. Omit it until you are happy to publish it.
 *   industry        The field, e.g. 'Fintech'
 *   responsibilities 3–6 lines, one each. Pattern: verb + what you built +
 *                   the interesting technical part.
 *                     good: 'Built the FastAPI webhook service: signature
 *                            verification, idempotency keys, retries via Celery.'
 *                     weak: 'Responsible for maintaining the APIs.'
 *   technologies    The stack you actually used there, not the whole company.
 * ---------------------------------------------------------------------------
 */

export const experience: Experience[] = [
  {
    // TODO: confirm the exact title on your contract.
    role: 'Junior Developer',
    period: 'Nov 2025 — Present',
    company: 'Vanilla Transtechnor Pvt. Ltd.',
    industry: 'Malaysia-based Fintech  | Merchantrade Money',
    responsibilities: [
      'Developed card activation flow, enabling customers to activate their cards after completing eKYC verification.',
      'Implemented AML checks during customer onboarding, applying business logic to flag and handle customers who fall under AML rules.',
      'Built a customer complaint feature that lets users raise issues related to their transactions.',
      'Created automated Cronicle jobs to generate and email daily and monthly Excel reports to 80–100+ branches, reducing manual tracking work for branches monitoring their onboarded customers.',
      'Work supports a fintech platform serving 900K+ customers, built on a microservices architecture.',
    ],
    technologies: [
      'Python',
      'FastAPI',
      'SQLAlchemy',
      'PostgreSQL',
      'Redis',
      'Kafka',
      'Cronicle',
      'Docker',
      'CI/CD',
    ],
  },
  {
    role: 'Python Intern',
    period: 'Aug 2025 — Nov 2025',
    company: 'Vanilla Transtechnor Pvt. Ltd.',
    industry: 'Fintech',
    responsibilities: [
      'Completed a structured learning project Library Management System that progressed through multiple stages: a Python CLI app, then CSV-based storage, then raw SQL with PostgreSQL, then SQLAlchemy, and finally a full FastAPI application.',
      'Built the final version with authentication, book management, admin and user roles, pagination, and reporting features, allowing users to purchase books and admins to track activity.',
      'Learned to write clean, maintainable and reusable code under senior guidance, moving beyond code that just works.',
      'Gained hands-on understanding of how production-grade applications are structured and built, as preparation for the full-time role.',
    ],
    technologies: ['Python', 'FastAPI', 'PostgreSQL', 'SQLAlchemy', 'Git'],
  },
];
