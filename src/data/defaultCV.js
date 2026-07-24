// Default CV content shown to a fresh visitor. This is deliberately a
// generic placeholder template — the real resume text lives only in
// `myCV.local.js`, a gitignored file that never leaves your machine (see the
// override loading below).
//
// Shape overview:
//   cv.header            -> { name, title, contacts: [], links: [] }
//   cv.columns            -> ['left' | 'right'] section id lists, OR
//   cv.singleColumn        depending on layout.twoColumn toggle
//   cv.sections[id]       -> { id, type, title, items: [...] }
//
// Each entry-list item has: { org, role, dateRange, location, description,
// bullets, footer }. `role` is a subtitle line rendered under `org` (e.g. a
// degree name, or a parenthetical qualifier).
//
// Each section has a `type` that maps to a renderer in sectionTypes.js.
// This keeps every section's internal formatting locked to one of a small
// number of known-good layouts, so users customize *content* and
// *style tokens* (spacing/fonts/alignment) rather than free-form position.

import { nanoid } from 'nanoid';

const id = () => nanoid(8);

function blankCV() {
  const sections = {
    summary: {
      id: 'summary',
      type: 'text',
      title: 'Summary',
      body: 'A short paragraph introducing yourself — your field, your strengths, and what you’re looking for.',
    },
    experience: {
      id: 'experience',
      type: 'entry-list',
      title: 'Work Experience',
      items: [
        {
          id: id(),
          org: 'Company Name',
          role: 'Job Title',
          dateRange: 'Month Year - Present',
          location: 'City, Country',
          description: 'One-line summary of the role.',
          bullets: [
            'What you did and the impact it had.',
            'Another accomplishment or responsibility.',
          ],
          footer: '',
        },
      ],
    },
    education: {
      id: 'education',
      type: 'entry-list',
      title: 'Education',
      items: [
        {
          id: id(),
          org: 'Institution Name',
          role: 'Degree / Qualification',
          dateRange: 'Month Year - Month Year',
          location: '',
          description: 'Relevant details — GPA, honours, coursework.',
          bullets: [],
          footer: '',
        },
      ],
    },
    technicalSkills: {
      id: 'technicalSkills',
      type: 'skill-list',
      title: 'Skills',
      items: [{ id: id(), label: 'Skill area', text: 'Tools, languages, or techniques you’re proficient in.' }],
    },
    projects: {
      id: 'projects',
      type: 'entry-list',
      title: 'Projects',
      items: [],
    },
  };

  return {
    header: {
      name: 'Your Name',
      title: 'Your professional title or tagline',
      contacts: [
        { id: id(), label: 'Email', value: 'you@example.com' },
        { id: id(), label: 'LinkedIn', value: 'https://www.linkedin.com/in/your-handle/' },
      ],
      links: [],
    },
    sections,
    layout: {
      leftColumn: ['summary', 'experience', 'projects'],
      rightColumn: ['education', 'technicalSkills'],
    },
  };
}

// If a `myCV.local.js` file exists next to this one, it wins — this is how
// you keep your own filled-out CV as the app's starting point without ever
// committing it. `import.meta.glob` is resolved at build time by Vite, so
// this is a no-op (empty object) in a clone that doesn't have the file.
const localOverride = import.meta.glob('./myCV.local.js', { eager: true });
const local = localOverride['./myCV.local.js'];

export function createDefaultCV() {
  return local ? local.createDefaultCV() : blankCV();
}
