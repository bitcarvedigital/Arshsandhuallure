import { useRef, useState, useEffect } from 'react'
import { downscaleImage } from './image'
import { MicroLabel, ErrorNote } from './ui'

const MAX_PER_SLOT = 6

// value: [{kind:'upload', path} | {kind:'link', url}]
// uploadFile(file) -> {path}    resolveUrl(path) -> signed display URL
export default function PhotoUploader({ label, value = [], onChange, uploadFile, resolveUrl, disabled }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [previews, setPreviews] = useState({})

  useEffect(() => {
    let alive = true
    async function load() {
      const next = {}
      for (const item of value) {
        if (item.kind === 'upload' && !previews[item.path] && resolveUrl) {
          try {
            next[item.path] = await resolveUrl(item.path)
          } catch {
            next[item.path] = ''
          }
        }
      }
      if (alive && Object.keys(next).length) setPreviews((p) => ({ ...p, ...next }))
    }
    load()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  async function handleFiles(files) {
    setError('')
    const room = MAX_PER_SLOT - value.length
    const list = Array.from(files).slice(0, Math.max(0, room))
    if (!list.length) {
      setError(`Up to ${MAX_PER_SLOT} photos here`)
      return
    }
    setBusy(true)
    try {
      const added = []
      for (const file of list) {
        const small = await downscaleImage(file)
        const { path } = await uploadFile(small)
        added.push({ kind: 'upload', path })
      }
      onChange([...value, ...added])
    } catch (e) {
      setError(e.message || 'Upload failed — please try again')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function addLink() {
    const url = link.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      setError('Links need to start with http:// or https://')
      return
    }
    if (value.length >= MAX_PER_SLOT) {
      setError(`Up to ${MAX_PER_SLOT} photos here`)
      return
    }
    setError('')
    onChange([...value, { kind: 'link', url }])
    setLink('')
  }

  return (
    <div className="flex flex-col gap-3">
      <MicroLabel>{label}</MicroLabel>
      <div className="flex flex-wrap gap-3">
        {value.map((item, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl bg-beige-card overflow-hidden">
            {item.kind === 'upload' ? (
              previews[item.path] ? (
                <img src={previews[item.path]} alt={`${label} photo ${i + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[11px] text-faint p-1 text-center">
                  Photo
                </div>
              )
            ) : (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open linked photo ${i + 1} in a new tab`}
                className="w-full h-full flex items-center justify-center text-[11px] text-gold underline underline-offset-2 p-1 text-center"
              >
                Link ↗
              </a>
            )}
            {!disabled && (
              // 32px tap area; the visible dot stays small and soft
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={`Remove ${item.kind === 'link' ? 'link' : 'photo'} ${i + 1} from ${label}`}
                className="group absolute top-0 right-0 w-8 h-8 flex items-center justify-center cursor-pointer"
              >
                <span className="w-6 h-6 rounded-full bg-dark/75 group-hover:bg-dark text-beige flex items-center justify-center transition-colors">
                  <svg aria-hidden="true" viewBox="0 0 12 12" className="w-2.5 h-2.5">
                    <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            )}
          </div>
        ))}
        {!disabled && value.length < MAX_PER_SLOT && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label={busy ? 'Uploading…' : `Add photos — ${label}`}
            className="w-20 h-20 rounded-xl bg-beige-card/70 text-muted text-[11px] tracking-[0.15em] uppercase hover:bg-[#E3D6C8] hover:text-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
          >
            {busy ? '…' : '+ Add'}
          </button>
        )}
      </div>
      {!disabled && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="or paste a photo link"
            aria-label={`Photo link — ${label}`}
            className="bg-transparent border-b border-[#C8B8AC] py-2 text-dark placeholder-[#8A7060] text-sm focus:outline-none focus:border-gold flex-1 min-w-0"
          />
          <button
            type="button"
            onClick={addLink}
            className="min-h-[40px] px-2 -mr-2 text-[11px] tracking-[0.2em] uppercase text-gold hover:text-dark transition-colors cursor-pointer whitespace-nowrap"
          >
            Add link
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div role="status" aria-live="polite" className="empty:hidden">
        <ErrorNote>{error}</ErrorNote>
      </div>
    </div>
  )
}
