// Pure derivation of the six-step journey from portal data. States:
// locked | available | draft | pending | changes_requested | done

export function deriveJourney({ agreement, payments, intake, docs }) {
  const byType = Object.fromEntries((docs || []).map((d) => [d.doc_type, d]))
  const retainer = (payments || []).find((p) => p.kind === 'retainer')
  const final = (payments || []).find((p) => p.kind === 'final')

  const agreementState = !agreement ? 'available' : agreement.status === 'approved' ? 'done' : 'pending'
  const signed = !!agreement

  const retainerState = !signed ? 'locked' : retainer?.status === 'received' ? 'done' : 'available'

  let intakeState = 'locked'
  if (signed) {
    if (!intake) intakeState = 'available'
    else if (intake.status === 'draft') intakeState = 'draft'
    else if (intake.status === 'pending') intakeState = 'pending'
    else if (intake.status === 'changes_requested') intakeState = 'changes_requested'
    else if (intake.status === 'approved') intakeState = 'done'
  }

  const guidesVisible = byType.hair_guide?.visible || byType.skin_guide?.visible
  const guidesState = guidesVisible ? 'done' : 'locked'

  const timelineState = byType.timeline?.visible ? 'done' : 'locked'

  const finalState = final?.status === 'received' ? 'done' : timelineState === 'done' || retainerState === 'done' ? 'available' : 'locked'

  return [
    {
      key: 'agreement',
      n: 1,
      title: 'Sign your service agreement',
      desc: 'Read and e-sign your agreement — it takes two minutes.',
      state: agreementState,
      to: '/portal/agreement',
    },
    {
      key: 'retainer',
      n: 2,
      title: 'Send your retainer',
      desc: 'A 30% retainer by e-transfer secures your date.',
      state: retainerState,
      to: '/portal/retainer',
    },
    {
      key: 'intake',
      n: 3,
      title: 'Tell us about you & your party',
      desc: 'Your intake form — looks, photos, and everyone being styled.',
      state: intakeState,
      to: '/portal/intake',
    },
    {
      key: 'guides',
      n: 4,
      title: 'Prepare with our guides',
      desc: 'Your hair & skin preparation guides for the big day.',
      state: guidesState,
      to: '/portal/docs',
    },
    {
      key: 'timeline',
      n: 5,
      title: 'Your getting-ready timeline',
      desc: 'Appears here once Arsh crafts your morning schedule.',
      state: timelineState,
      to: '/portal/docs/timeline',
    },
    {
      key: 'final',
      n: 6,
      title: 'Final payment',
      desc: 'The remaining balance, due before your event day.',
      state: finalState,
      to: '/portal/retainer',
    },
  ]
}
