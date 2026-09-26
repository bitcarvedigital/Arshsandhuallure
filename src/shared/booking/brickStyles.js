// Brick colours for the timeline — full literal class strings so Tailwind's
// JIT keeps them. Hair = soft sage, makeup = blush, both = a diagonal split,
// important people = dark with a gold-light diamond, the bride = that plus a
// gold ring, gaps = dashed outline.

const FILL = {
  hair: 'bg-[#E4E8DC] text-[#33402A]',
  makeup: 'bg-[#F1DACA] text-[#4E2F22]',
  both: 'bg-[linear-gradient(135deg,#E4E8DC_0%,#E4E8DC_50%,#F1DACA_50%,#F1DACA_100%)] text-[#2E241C]',
  none: 'bg-[#EFE6DA] text-dark',
}

const STRIPE = {
  hair: 'bg-[#7D8B6A]',
  makeup: 'bg-[#B9826A]',
  both: 'bg-[linear-gradient(180deg,#7D8B6A_0%,#7D8B6A_50%,#B9826A_50%,#B9826A_100%)]',
  none: 'bg-[#C8B8AC]',
}

export function brickClasses(brick) {
  if (brick.kind === 'gap') {
    return { box: 'border border-dashed border-[#B8A898] bg-transparent text-[#8A7A70]', stripe: '' }
  }
  const svc = brick.service && FILL[brick.service] ? brick.service : 'none'
  if (brick.vip || brick.bride) {
    return {
      box: `bg-btn-dark text-beige ${brick.bride ? 'ring-2 ring-gold-light ring-offset-2 ring-offset-[#FBF8F4]' : ''}`,
      stripe: STRIPE[svc],
    }
  }
  return { box: FILL[svc], stripe: STRIPE[svc] }
}

export const SERVICE_SHORT = { hair: 'Hair', makeup: 'Makeup', both: 'Hair & Makeup' }

export const LEGEND = [
  { key: 'hair', label: 'Hair', swatch: 'bg-[#E4E8DC] border-l-4 border-[#7D8B6A]' },
  { key: 'makeup', label: 'Makeup', swatch: 'bg-[#F1DACA] border-l-4 border-[#B9826A]' },
  { key: 'both', label: 'Hair & Makeup', swatch: 'bg-[linear-gradient(135deg,#E4E8DC_0%,#E4E8DC_50%,#F1DACA_50%,#F1DACA_100%)]' },
  { key: 'vip', label: 'Important person', swatch: 'bg-btn-dark' },
  { key: 'bride', label: 'Bride', swatch: 'bg-btn-dark ring-2 ring-gold-light ring-offset-1 ring-offset-[#FBF8F4]' },
  { key: 'gap', label: 'Break', swatch: 'border border-dashed border-[#B8A898]' },
]
