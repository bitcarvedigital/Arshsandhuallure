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
          <div key={i} className="relative w-20 h-20 border border-[#C8B8AC] bg-beige-card overflow-hidden">
            {item.kind === 'upload' ? (
              previews[item.path] ? (
                <img src={previews[item.path]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-[#8A7A70] p-1 text-center">
                  photo
                </div>
              )
            ) : (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="w-full h-full flex items-center justify-center text-[9px] text-gold underline p-1 text-center break-all"
              >
                link
              </a>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label="Remove"
                className="absolute top-0 right-0 w-5 h-5 bg-dark text-beige text-[10px] leading-5 cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {!disabled && value.length < MAX_PER_SLOT && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-20 h-20 border border-dashed border-[#A89080] text-[#8A7060] text-[10px] tracking-[0.15em] uppercase hover:border-gold hover:text-gold transition-colors cursor-pointer disabled:opacity-50"
          >
            {busy ? '…' : '+ Add'}
          </button>
        )}
      </div>
      {!disabled && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="or paste a photo link"
            className="bg-transparent border-b border-[#C8B8AC] py-2 text-dark placeholder-[#8A7060] text-xs focus:outline-none focus:border-gold flex-1"
          />
          <button
            type="button"
            onClick={addLink}
            className="text-[10px] tracking-[0.2em] uppercase text-gold cursor-pointer whitespace-nowrap"
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
      <ErrorNote>{error}</ErrorNote>
    </div>
  )
}
