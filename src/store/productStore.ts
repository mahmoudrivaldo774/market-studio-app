import { create } from 'zustand'
import { Category, SortOption, ViewMode } from '../types'

interface ProductState {
  categories: Category[]
  searchTerm: string
  selectedCategory: string
  sortBy: SortOption
  viewMode: ViewMode
  showFavoritesOnly: boolean
  hasVideoOnly: boolean
  setCategories: (categories: Category[]) => void
  setSearchTerm: (term: string) => void
  setSelectedCategory: (id: string) => void
  setSortBy: (sort: SortOption) => void
  setViewMode: (mode: ViewMode) => void
  setShowFavoritesOnly: (show: boolean) => void
  setHasVideoOnly: (has: boolean) => void
}

export const useProductStore = create<ProductState>((set) => ({
  categories: [],
  searchTerm: '',
  selectedCategory: 'all',
  sortBy: 'newest',
  viewMode: 'grid',
  showFavoritesOnly: false,
  hasVideoOnly: false,
  setCategories: (categories) => set({ categories }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSortBy: (sortBy) => set({ sortBy }),
  setViewMode: (viewMode) => set({ viewMode }),
  setShowFavoritesOnly: (showFavoritesOnly) => set({ showFavoritesOnly }),
  setHasVideoOnly: (hasVideoOnly) => set({ hasVideoOnly }),
}))
