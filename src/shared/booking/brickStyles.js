// Brick colours for the timeline — full literal class strings so Tailwind's
// JIT keeps them. Hair = soft sage, makeup = blush, both = a diagonal split,
// gaps = dashed outline. Important people (the bride included) keep their
// service colour and get a gold ★ next to their name — no dark fills.

const FILL = {
  hair: 'bg-[#E4E8DC] text-[#33402A]',
  makeup: 'bg-[#F1DACA] text-[#4E2F22]',
  both: 'bg-[linear-gradient(135deg,#E4E8DC_0%,#E4E8DC_50%,#F1DACA_50%,#F1DACA_100%)] text-[#2E241C]',
  none: 'bg-soft text-dark',
}

const STRIPE = {
  hair: 'bg-[#7D8B6A]',
  makeup: 'bg-[#B9826A]',
  both: 'bg-[linear-gradient(180deg,#7D8B6A_0%,#7D8B6A_50%,#B9826A_50%,#B9826A_100%)]',
  none: 'bg-[#C8B8AC]',
}

export function brickClasses(brick) {
  if (brick.kind === 'gap') {
    return { box: 'border border-dashed border-[#B8A898] bg-transparent text-faint', stripe: '' }
  }
  const svc = brick.service && FILL[brick.service] ? brick.service : 'none'
  return { box: FILL[svc], stripe: STRIPE[svc] }
}

export const SERVICE_SHORT = { hair: 'Hair', makeup: 'Makeup', both: 'Hair & Makeup' }

export const LEGEND = [
  { key: 'hair', label: 'Hair', swatch: 'bg-[#E4E8DC] border-l-4 border-[#7D8B6A]' },
  { key: 'makeup', label: 'Makeup', swatch: 'bg-[#F1DACA] border-l-4 border-[#B9826A]' },
  { key: 'both', label: 'Hair & Makeup', swatch: 'bg-[linear-gradient(135deg,#E4E8DC_0%,#E4E8DC_50%,#F1DACA_50%,#F1DACA_100%)]' },
  { key: 'vip', label: 'Important', star: true },
  { key: 'gap', label: 'Break', swatch: 'border border-dashed border-[#B8A898]' },
]
