import { describe, expect, it } from 'vitest'
import { getProductMediaPath, validateProductMedia } from './productMedia'

function file(name: string, type: string, size: number) {
  return new File([new Uint8Array(size)], name, { type })
}

describe('product media validation', () => {
  it('accepts supported images within the limit', () => {
    expect(validateProductMedia(file('product.webp', 'image/webp', 1024), 'image')).toBeNull()
  })

  it('rejects unsupported image types and oversized videos', () => {
    expect(validateProductMedia(file('product.gif', 'image/gif', 1024), 'image')).toContain('غير مدعومة')
    expect(validateProductMedia(file('product.mp4', 'video/mp4', 50 * 1024 * 1024 + 1), 'video')).toContain('50')
  })
})

describe('product media paths', () => {
  it('extracts a storage path from a public URL', () => {
    expect(getProductMediaPath(
      'https://demo.supabase.co/storage/v1/object/public/product-media/images/item.png?x=1',
    )).toBe('images/item.png')
  })

  it('ignores URLs outside the product media bucket', () => {
    expect(getProductMediaPath('https://example.com/item.png')).toBeNull()
    expect(getProductMediaPath(null)).toBeNull()
  })
})
