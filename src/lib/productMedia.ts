import { supabase } from './supabase'

const BUCKET = 'product-media'
const PUBLIC_PATH_MARKER = `/storage/v1/object/public/${BUCKET}/`

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm'])

export function validateProductMedia(file: File, kind: 'image' | 'video'): string | null {
  const allowedTypes = kind === 'image' ? IMAGE_TYPES : VIDEO_TYPES
  const maxSize = kind === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024

  if (!allowedTypes.has(file.type)) {
    return kind === 'image'
      ? 'صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WebP.'
      : 'صيغة الفيديو غير مدعومة. استخدم MP4 أو WebM.'
  }

  if (file.size > maxSize) {
    return kind === 'image'
      ? 'حجم الصورة يجب ألا يتجاوز 10 ميجابايت.'
      : 'حجم الفيديو يجب ألا يتجاوز 50 ميجابايت.'
  }

  return null
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export async function uploadProductMedia(file: File, folder: 'images' | 'videos') {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `${folder}/${generateUUID()}.${extension}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export function getProductMediaPath(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null
  try {
    const decodedUrl = decodeURIComponent(publicUrl)
    const markerIndex = decodedUrl.indexOf(PUBLIC_PATH_MARKER)
    if (markerIndex === -1) return null
    return decodedUrl.slice(markerIndex + PUBLIC_PATH_MARKER.length).split('?')[0] || null
  } catch {
    return null
  }
}

export async function removeProductMedia(urls: Array<string | null | undefined>) {
  const paths = [...new Set(urls.map(getProductMediaPath).filter((path): path is string => Boolean(path)))]
  if (paths.length === 0) return

  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) throw error
}
