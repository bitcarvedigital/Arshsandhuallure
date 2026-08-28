import PhotoUploader from './PhotoUploader'
import { Field, TextArea, ChoiceRow, DiamondRule, MicroLabel } from './ui'

export const PHOTO_SLOT_LABELS = {
  selfie: 'Selfie / Current Look',
  makeup_inspo: 'Makeup Inspiration',
  hair_inspo: 'Hair Inspiration',
  additional: 'Additional Inspiration',
}

const SERVICES = [
  { value: 'hair', label: 'Hair' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'both', label: 'Both' },
]
const SKIN_TYPES = ['normal', 'dry', 'oily', 'combination', 'sensitive'].map((v) => ({
  value: v,
  label: v.charAt(0).toUpperCase() + v.slice(1),
}))
const HAIR_LENGTHS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
  { value: 'extensions', label: 'Extensions' },
  { value: 'clip_ins', label: 'Clip-ins' },
]
const HAIR_TEXTURES = ['straight', 'wavy', 'curly', 'coily'].map((v) => ({
  value: v,
  label: v.charAt(0).toUpperCase() + v.slice(1),
}))

// One form for every per-person profile: the bride's own, party members she
// adds, the public party link, and admin edits.
// value: party_member-shaped object; uploadFile(slot, file) -> {path}
export default function MemberProfileForm({ value, onChange, uploadFile, resolveUrl, disabled, hideRelation }) {
  const set = (patch) => onChange({ ...value, ...patch })
  const photos = value.photos || {}
  const setPhotos = (slot, list) => set({ photos: { ...photos, [slot]: list } })

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Field
          label="Name"
          required
          value={value.name || ''}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Full name"
          disabled={disabled}
        />
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

      <ChoiceRow label="Services" options={SERVICES} value={value.services} onChange={(v) => set({ services: v })} disabled={disabled} />
      <ChoiceRow label="Skin Type" options={SKIN_TYPES} value={value.skin_type} onChange={(v) => set({ skin_type: v })} disabled={disabled} />
      <ChoiceRow label="Hair Length" options={HAIR_LENGTHS} value={value.hair_length} onChange={(v) => set({ hair_length: v })} disabled={disabled} />
      <ChoiceRow label="Hair Texture" options={HAIR_TEXTURES} value={value.hair_texture} onChange={(v) => set({ hair_texture: v })} disabled={disabled} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <TextArea
          label="Likes & Preferences"
          value={value.likes || ''}
          onChange={(e) => set({ likes: e.target.value })}
          placeholder="e.g. dewy skin, soft lashes, warm tones, romantic updo…"
          disabled={disabled}
        />
        <TextArea
          label="Dislikes / Deal-breakers"
          value={value.dislikes || ''}
          onChange={(e) => set({ dislikes: e.target.value })}
          placeholder="e.g. fake lashes, heavy liner, cakey finish…"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Field
          label="Foundation Brand (if known)"
          value={value.foundation_brand || ''}
          onChange={(e) => set({ foundation_brand: e.target.value })}
          placeholder="Brand"
          disabled={disabled}
        />
        <Field
          label="Foundation Shade (if known)"
          value={value.foundation_shade || ''}
          onChange={(e) => set({ foundation_shade: e.target.value })}
          placeholder="Shade"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <TextArea
          label="Allergies / Sensitivities"
          value={value.allergies || ''}
          onChange={(e) => set({ allergies: e.target.value })}
          placeholder="Please list anything we should know"
          disabled={disabled}
        />
        <TextArea
          label="Skin Concerns / Notes"
          value={value.skin_concerns || ''}
          onChange={(e) => set({ skin_concerns: e.target.value })}
          placeholder="Anything else about your skin or hair"
          disabled={disabled}
        />
      </div>

      <DiamondRule />
      <MicroLabel>Photos — a current selfie plus any inspiration</MicroLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {Object.entries(PHOTO_SLOT_LABELS).map(([slot, label]) => (
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
    </div>
  )
}
