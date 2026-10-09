import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { appRpc } from '../lib/appApi'
import { useProductStore } from '../store/productStore'
import { ProductCard } from '../components/ProductCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Product } from '../types'
import { Search, Filter, LayoutGrid, List, ChevronDown } from 'lucide-react'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, copyToClipboard } from '../lib/utils'

const PAGE_SIZE = 20

export const Dashboard: React.FC = () => {
  const {
    categories, setCategories,
    searchTerm, setSearchTerm,
    selectedCategory, setSelectedCategory,
    sortBy, setSortBy,
    viewMode, setViewMode,
    showFavoritesOnly, setShowFavoritesOnly,
    hasVideoOnly, setHasVideoOnly,
  } = useProductStore()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Fetch categories
  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('categories').select('*').order('name_ar')
      if (data) setCategories(data)
    }
    fetchCats()
  }, [setCategories])

  // Fetch products with filters
  const fetchProducts = useCallback(async (pageNum: number, append: boolean = false) => {
    if (pageNum === 0) setIsLoading(true)
    else setIsLoadingMore(true)

    try {
      let query = supabase
        .from('products')
        .select('*, category:categories(*)', { count: 'exact' })

      // Search
      if (searchTerm.trim()) {
        query = query.or(`name_ar.ilike.%${searchTerm}%,name_en.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
      }

      // Category filter
      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory)
      }

      // Favorites only
      if (showFavoritesOnly) {
        query = query.eq('is_favorite', true)
      }

      // Video only
      if (hasVideoOnly) {
        query = query.not('video_url', 'is', null)
      }

      // Sort
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'most_copied':
          query = query.order('copy_count', { ascending: false })
          break
        case 'favorites_first':
          query = query.order('is_favorite', { ascending: false }).order('created_at', { ascending: false })
          break
        case 'alphabetical':
          query = query.order('name_ar', { ascending: true })
          break
      }

      // Pagination
      const from = pageNum * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      const newProducts = data || []
      if (append) {
        setProducts(prev => [...prev, ...newProducts])
      } else {
        setProducts(newProducts)
      }
      setHasMore(from + newProducts.length < (count || 0))
    } catch (err: any) {
      console.error(err)
      toast.error('حدث خطأ أثناء جلب المنتجات')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [searchTerm, selectedCategory, sortBy, showFavoritesOnly, hasVideoOnly])

  // Reset and fetch on filter change
  useEffect(() => {
    setPage(0)
    fetchProducts(0, false)
  }, [fetchProducts])

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
        const nextPage = page + 1
        setPage(nextPage)
        fetchProducts(nextPage, true)
      }
    }, { threshold: 0.1 })

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => observerRef.current?.disconnect()
  }, [hasMore, isLoadingMore, isLoading, page, fetchProducts])

  const handleCopy = async (product: Product) => {
    const text = [
      product.name_ar,
      product.description || '',
      `السعر: ${product.sale_price || product.price} جنيه`,
    ].filter(Boolean).join('\n')

    try {
      const success = await copyToClipboard(text)
      if (!success) throw new Error('Copy failed')
      toast.success('تم نسخ النص بنجاح ✓')

      const newCount = (product.copy_count || 0) + 1
      const now = new Date().toISOString()

      await appRpc('update_product_copy', {
        p_product_id: product.id,
        p_copy_count: newCount,
        p_last_copied_at: now,
      })
      await appRpc('log_activity', {
        p_action: 'copy_product',
        p_product_id: product.id,
      })

      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, copy_count: newCount, last_copied_at: now } : p
      ))
    } catch {
      toast.error('فشل في نسخ النص')
    }
  }

  const handleShare = async (product: Product) => {
    const shareData: ShareData = {
      title: product.name_ar,
      text: `${product.name_ar}\nالسعر: ${product.sale_price || product.price} جنيه`,
    }

    // Try sharing with image
    if (product.image_url && navigator.canShare) {
      try {
        const res = await fetch(product.image_url)
        const blob = await res.blob()
        const file = new File([blob], `${product.name_ar}.png`, { type: blob.type })
        const withFile = { ...shareData, files: [file] }
        if (navigator.canShare(withFile)) {
          await navigator.share(withFile)
          await appRpc('log_activity', { p_action: 'share_product', p_product_id: product.id })
          return
        }
      } catch { /* fallback */ }
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        await appRpc('log_activity', { p_action: 'share_product', p_product_id: product.id })
      } catch { /* cancelled */ }
    } else {
      handleCopy(product)
    }
  }

  const handleToggleFavorite = async (product: Product) => {
    const newFav = !product.is_favorite
    try {
      await appRpc('toggle_product_favorite', {
        p_product_id: product.id,
        p_is_favorite: newFav,
      })
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_favorite: newFav } : p))
      if (newFav) toast.success('تمت الإضافة للمفضلة ⭐')
    } catch {
      toast.error('حدث خطأ')
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="ابحث بالاسم أو الباركود..."
              className="pr-10 bg-gray-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 px-4 rounded-lg border font-medium text-sm transition-all touch-target',
              showFilters ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-600 border-gray-300 hover:border-brand-blue'
            )}
          >
            <Filter className="w-4 h-4" />
            فلترة
            <ChevronDown className={cn('w-4 h-4 transition-transform', showFilters && 'rotate-180')} />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <select
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:ring-2 focus:ring-brand-blue outline-none touch-target"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="all">كل الأقسام</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name_ar}</option>
                    ))}
                  </select>

                  <select
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:ring-2 focus:ring-brand-blue outline-none touch-target"
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                  >
                    <option value="newest">الأحدث</option>
                    <option value="most_copied">الأكثر نسخاً</option>
                    <option value="favorites_first">المفضلة أولاً</option>
                    <option value="alphabetical">أبجدي</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input type="checkbox" checked={showFavoritesOnly} onChange={e => setShowFavoritesOnly(e.target.checked)} className="rounded text-brand-blue focus:ring-brand-blue w-4 h-4" />
                    المفضلة فقط ⭐
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input type="checkbox" checked={hasVideoOnly} onChange={e => setHasVideoOnly(e.target.checked)} className="rounded text-brand-blue focus:ring-brand-blue w-4 h-4" />
                    فيديو فقط 🎬
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Toggle */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
          <p className="text-sm text-gray-500">
            {isLoading ? 'جاري التحميل...' : `${products.length} منتج`}
          </p>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2 rounded-md transition-colors touch-target', viewMode === 'grid' ? 'bg-white shadow-sm text-brand-blue' : 'text-gray-400')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2 rounded-md transition-colors touch-target', viewMode === 'list' ? 'bg-white shadow-sm text-brand-blue' : 'text-gray-400')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Products */}
      {isLoading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-bold text-gray-900">لا توجد منتجات</h3>
          <p className="text-gray-500 mt-1 text-sm">لم يتم العثور على منتجات تطابق بحثك</p>
        </div>
      ) : (
        <>
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3'
              : 'flex flex-col gap-3'
          }>
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                viewMode={viewMode}
                onCopy={handleCopy}
                onShare={handleShare}
                onToggleFavorite={handleToggleFavorite}
                onImageClick={setSelectedImage}
              />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
            {isLoadingMore && <LoadingSpinner className="py-4" />}
            {!hasMore && products.length > 0 && (
              <p className="text-sm text-gray-400 py-4">تم عرض جميع المنتجات</p>
            )}
          </div>
        </>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
            />
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-white/20 text-white p-3 rounded-full transition-colors touch-target"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
