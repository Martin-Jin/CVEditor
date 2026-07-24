// Registry of section "types". Each type has a fixed, known-good internal
// layout (rendered by the matching component in components/sections/).
// Users can add new sections of any of these types and reorder them freely,
// but cannot invent a brand-new freeform layout — this is what keeps every
// section visually consistent with the rest of the document.

export const sectionTypeDefs = {
  text: {
    label: 'Text block',
    description: 'A paragraph of free text, e.g. a summary or objective.',
    defaultTitle: 'New Section',
    emptyContent: { body: 'Write a short paragraph here.' },
  },
  'entry-list': {
    label: 'Entry list',
    description: 'A list of dated entries with bullets — jobs, education, awards, projects.',
    defaultTitle: 'New Section',
    emptyContent: { items: [] },
    emptyItem: {
      org: 'Organisation',
      role: '',
      dateRange: '',
      location: '',
      description: '',
      bullets: [],
      footer: '',
    },
  },
  'skill-list': {
    label: 'Skill list',
    description: 'A bolded label followed by descriptive text, one per line.',
    defaultTitle: 'New Section',
    emptyContent: { items: [] },
    emptyItem: { label: 'Skill', text: 'Description of the skill.' },
  },
  'label-list': {
    label: 'Label list',
    description: 'A bold heading with a line of text underneath, repeated.',
    defaultTitle: 'New Section',
    emptyContent: { items: [] },
    emptyItem: { label: 'Label', text: 'Supporting detail.' },
  },
};

export const sectionTypeOrder = ['text', 'entry-list', 'skill-list', 'label-list'];