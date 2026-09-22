export type Role = 'admin' | 'staff'

export interface User {
  id: string
  username: string
  role: Role
  created_at?: string
}

export interface Category {
  id: string
  name_ar: string
  name_en?: string
  icon?: string
  created_at?: string
}

export interface Product {
  id: string
  name_ar: string
  name_en?: string
  barcode?: string | null
  price: number
  sale_price?: number | null
  sale_start_date?: string | null
  sale_end_date?: string | null
  description?: string | null
  description_versions?: any
  image_url?: string | null
  video_url?: string | null
  tags?: string[]
  category_id?: string | null
  is_favorite?: boolean
  last_copied_at?: string | null
  copy_count?: number
  created_by?: string | null
  created_at?: string
  updated_at?: string
  // Joined relation
  category?: Category
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  product_id?: string | null
  details?: any
  created_at?: string
  // Joined relations
  user?: Pick<User, 'username'>
  product?: Pick<Product, 'name_ar'>
}

export interface BrandSettings {
  primaryColor: string
  secondaryColor: string
  textColor: string
  logoUrl: string | null
}

export type SortOption = 'newest' | 'most_copied' | 'favorites_first' | 'alphabetical'
export type ViewMode = 'grid' | 'list'
