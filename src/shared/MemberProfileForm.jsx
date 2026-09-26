import { useEffect } from 'react'
import PhotoUploader from './PhotoUploader'
import { Field, TextArea, ChoiceRow, FormSection, AutofillWrap, fmtShortDate, softNote } from './ui'
import {
  SERVICES, SERVICE_LABELS, SKIN_TYPES, HAIR_LENGTHS, HAIR_TEXTURES, relevantSections,
} from './booking/services.js'

export const PHOTO_SLOT_LABELS = {
  selfie: 'Selfie / Current Look',
  makeup_inspo: 'Makeup Inspiration',
  hair_inspo: 'Hair Inspiration',
  additional: 'Additional Inspiration',
}

const cap = (v) => v.charAt(0).toUpperCase() + v.slice(1)
const opts = (list, labels) => list.map((v) => ({ value: v, label: labels?.[v] || cap(v.replace('_', '-')) }))
const HAIR_LENGTH_LABELS = { clip_ins: 'Clip-ins' }

// One form for every per-person profile: the bride's own, party members she
// adds, the public party link, and studio edits. Sections that don't apply to
// the chosen service are not rendered at all (hair-only → no skin questions,
// makeup-only → no hair questions).
//
// value            party_member-shaped object
// allowedServices  service choices the booking actually includes (default: all)
// events           the booking's events — shows "Events attending" when > 1
// autofill         { field: 'new' | 'saved' } markers; onAcknowledge(field) clears one
// studio           true in the admin: markers are read-only
export default function MemberProfileForm({
  value, onChange, uploadFile, resolveUrl, disabled, hideRelation,
  allowedServices = SERVICES, events = [], showEvents = false,
  autofill = {}, onAcknowledge, studio = false,
}) {
  const set = (patch) => onChange({ ...value, ...patch })
  const photos = value.photos || {}
  const setPhotos = (slot, list) => set({ photos: { ...photos, [slot]: list } })
  const single = allowedServices.length === 1 ? allowedServices[0] : null
  const sections = relevantSections(value.services)
  const marker = (field) => autofill?.[field]
  const ack = (field) => () => onAcknowledge?.(field)

  // only one service is booked → it is the answer, no question needed
  useEffect(() => {
    if (single && value.services !== single && !disabled) set({ services: single })
  }, [single]) // eslint-disable-line react-hooks/exhaustive-deps

  const eventIds = Array.isArray(value.event_ids) ? value.event_ids : []
  const toggleEvent = (id) =>
    set({ event_ids: eventIds.includes(id) ? eventIds.filter((x) => x !== id) : [...eventIds, id] })

  return (
    <div>
      <FormSection title="About">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <AutofillWrap state={marker('name')} onAcknowledge={ack('name')} readOnly={studio}>
            <Field
              label="Name"
              required
              value={value.name || ''}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Full name"
              disabled={disabled}
            />
          </AutofillWrap>
          {!hideRelation && (
            <Field
              label="Relation to the bride"
              value={value.relation || ''}
              onChange={(e) => set({ relation: e.target.value })}
              placeholder="e.g. Sister, Mom, Bridesmaid"
              disabled={disabled}
            />
          )}
        </div>
      </FormSection>

      {showEvents && events.length > 1 && (
        <FormSection title="Events you’re getting ready for" hint="Tap every event you’ll be styled at.">
          {/* multi-select pills, same look as ChoiceRow (selected = dark) */}
          <div role="group" aria-label="Events you’re getting ready for" className="flex flex-wrap gap-2">
            {events.map((e) => {
              const on = eventIds.includes(e.id)
              return (
                <button
                  key={e.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={on}
                  onClick={() => toggleEvent(e.id)}
                  className={`rounded-full px-4 py-2.5 text-sm transition-colors duration-200 ${
                    on ? 'bg-dark text-beige' : 'bg-beige-card/70 text-dark hover:bg-[#E3D6C8]'
                  } ${disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                >
                  {e.name || e.event_type || 'Event'}
                  <span className={on ? 'text-beige/70' : 'text-muted'}> · {fmtShortDate(e.event_date)}</span>
                </button>
              )
            })}
          </div>
        </FormSection>
      )}

      <FormSection
        title="Services"
        hint={single ? null : 'Choose what you’re booked for — we’ll only ask what matters for it.'}
      >
        <AutofillWrap state={marker('services')} onAcknowledge={ack('services')} readOnly={studio}>
          {single ? (
            <p className="text-sm text-dark">
              {SERVICE_LABELS[single]} <span className="text-faint">— that’s what this booking includes.</span>
            </p>
          ) : (
            <ChoiceRow
              options={opts(allowedServices, SERVICE_LABELS)}
              value={value.services}
              onChange={(v) => set({ services: v })}
              disabled={disabled}
            />
          )}
        </AutofillWrap>
        {!sections.chosen && (
          <p className={softNote}>Choose a service above and your questions will appear.</p>
        )}
      </FormSection>

      {sections.hair && (
        <FormSection title="Hair">
          <ChoiceRow
            label="Hair length"
            options={opts(HAIR_LENGTHS, HAIR_LENGTH_LABELS)}
            value={value.hair_length}
            onChange={(v) => set({ hair_length: v })}
            disabled={disabled}
          />
          <ChoiceRow
            label="Hair texture"
            options={opts(HAIR_TEXTURES)}
            value={value.hair_texture}
            onChange={(v) => set({ hair_texture: v })}
            disabled={disabled}
          />
        </FormSection>
      )}

      {sections.makeup && (
        <FormSection title="Makeup & skin">
          <ChoiceRow
            label="Skin type"
            options={opts(SKIN_TYPES)}
            value={value.skin_type}
            onChange={(v) => set({ skin_type: v })}
            disabled={disabled}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field
              label="Foundation brand (if known)"
              value={value.foundation_brand || ''}
              onChange={(e) => set({ foundation_brand: e.target.value })}
              placeholder="Brand"
              disabled={disabled}
            />
            <Field
              label="Foundation shade (if known)"
              value={value.foundation_shade || ''}
              onChange={(e) => set({ foundation_shade: e.target.value })}
              placeholder="Shade"
              disabled={disabled}
            />
          </div>
          <TextArea
            label="Skin concerns"
            value={value.skin_concerns || ''}
            onChange={(e) => set({ skin_concerns: e.target.value })}
            placeholder="Anything about your skin we should know"
            disabled={disabled}
          />
        </FormSection>
      )}

      {sections.chosen && (
        <FormSection title="Preferences">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <TextArea
              label="Likes & preferences"
              value={value.likes || ''}
              onChange={(e) => set({ likes: e.target.value })}
              placeholder={
                sections.hair && sections.makeup ? 'e.g. dewy skin, soft lashes, romantic updo…'
                : sections.hair ? 'e.g. soft waves, sleek bun, loose curls…'
                : 'e.g. dewy skin, soft lashes, warm tones…'
              }
              disabled={disabled}
            />
            <TextArea
              label="Dislikes / deal-breakers"
              value={value.dislikes || ''}
              onChange={(e) => set({ dislikes: e.target.value })}
              placeholder={sections.makeup ? 'e.g. heavy liner, cakey finish…' : 'e.g. too much volume, tight styles…'}
              disabled={disabled}
            />
          </div>
          <TextArea
            label="Allergies / sensitivities"
            value={value.allergies || ''}
            onChange={(e) => set({ allergies: e.target.value })}
            placeholder="Please list anything we should know"
            disabled={disabled}
          />
        </FormSection>
      )}

      {sections.chosen && (
        <FormSection title="Photos" hint="A current selfie plus any inspiration — photos help the most.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {Object.entries(PHOTO_SLOT_LABELS)
              .filter(([slot]) => (slot !== 'hair_inspo' || sections.hair) && (slot !== 'makeup_inspo' || sections.makeup))
              .map(([slot, label]) => (
                <PhotoUploader
                  key={slot}
                  label={label}
                  value={photos[slot] || []}
                  onChange={(list) => setPhotos(slot, list)}
                  uploadFile={(file) => uploadFile(slot, file)}
                  resolveUrl={resolveUrl}
                  disabled={disabled}
                />
              ))}
          </div>
        </FormSection>
      )}
    </div>
  )
}
