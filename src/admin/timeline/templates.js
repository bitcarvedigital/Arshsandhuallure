// Pre-made sample timelines. Applying one sets the chairs + timing and
// arranges the event's booked people onto them (or sample bricks when the
// event has no services priced yet).

const p = (service, minutes, n) => Array.from({ length: n }, () => ({ service, minutes, bride: false }))

export const TEMPLATES = [
  {
    id: 'bride_only',
    name: 'Bride only',
    desc: 'One artist, just the bride.',
    columns: ['Arsh'],
    strategy: 'single',
    mode: 'ready_by',
    sample: [{ service: 'both', minutes: 150, bride: true }],
  },
  {
    id: 'bride_3',
    name: 'Bride + 3 · one artist',
    desc: 'Three guests first, the bride finishes last.',
    columns: ['Arsh'],
    strategy: 'single',
    mode: 'ready_by',
    sample: [...p('both', 75, 3), { service: 'both', minutes: 150, bride: true }],
  },
  {
    id: 'bride_6_two',
    name: 'Bride + 6 · two artists',
    desc: 'Arsh with the bride, the assistant takes the party — load balanced.',
    columns: ['Arsh', 'Assistant'],
    strategy: 'split',
    mode: 'ready_by',
    sample: [...p('both', 75, 6), { service: 'both', minutes: 150, bride: true }],
  },
  {
    id: 'party_makeup',
    name: 'Mehndi / Jaggo party makeup',
    desc: 'Two artists, quick party makeup from a set start time.',
    columns: ['Arsh', 'Assistant'],
    strategy: 'split',
    mode: 'start_at',
    sample: [...p('makeup', 45, 6), { service: 'makeup', minutes: 90, bride: true }],
  },
  {
    id: 'teams',
    name: 'Hair team + makeup team',
    desc: 'A hair chair and a makeup chair — people rotate between them.',
    columns: ['Hair', 'Makeup'],
    strategy: 'teams',
    mode: 'ready_by',
    sample: [...p('both', 90, 4), { service: 'both', minutes: 150, bride: true }],
  },
]
