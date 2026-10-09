import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { appRpc } from '../lib/appApi'
import { Product } from '../types'
import { useAuthStore } from '../store/authStore'
import { formatPrice, calcDiscount, copyToClipboard } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ArrowRight, Copy, Share2, Star, Edit, Download, Video, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { removeProductMedia } from '../lib/productMedia'

export const ProductDetails: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuthStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProduct = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      setProduct(data)
    } catch {
      toast.error('فشل في جلب تفاصيل المنتج')
      navigate('/')
    } finally {
      setIsLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  const handleCopy = async () => {
    if (!product) return
    const text = [product.name_ar, product.description || '', `السعر: ${product.sale_price || product.price} جنيه`].filter(Boolean).join('\n')
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
      await appRpc('log_activity', { p_action: 'copy_product', p_product_id: product.id })
      setProduct({ ...product, copy_count: newCount, last_copied_at: now })
    } catch {
      toast.error('فشل في نسخ النص')
    }
  }

  const handleShare = async () => {
    if (!product) return
    const shareData: ShareData = { title: product.name_ar, text: `${product.name_ar}\nالسعر: ${product.sale_price || product.price} جنيه` }
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
      handleCopy()
    }
  }

  const handleDownloadImage = async () => {
    if (!product?.image_url) return
    try {
      const res = await fetch(product.image_url)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${product.name_ar}.png`; document.body.appendChild(a); a.click(); document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('بدأ تحميل الصورة')
    } catch { toast.error('فشل تحميل الصورة') }
  }

  const handleDelete = async () => {
    if (!product || !window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) return
    try {
      await appRpc('log_activity', {
        p_action: 'delete_product',
        p_product_id: product.id,
        p_details: { name: product.name_ar },
      })
      await appRpc('delete_product', { p_product_id: product.id })
      await removeProductMedia([product.image_url, product.video_url]).catch(error => {
        console.warn('Could not remove deleted product media:', error)
      })
      toast.success('تم حذف المنتج')
      navigate('/')
    } catch { toast.error('حدث خطأ أثناء الحذف') }
  }

  const handleToggleFavorite = async () => {
    if (!product) return
    const newFav = !product.is_favorite
    await appRpc('toggle_product_favorite', {
      p_product_id: product.id,
      p_is_favorite: newFav,
    })
    setProduct({ ...product, is_favorite: newFav })
    if (newFav) toast.success('تمت الإضافة للمفضلة ⭐')
  }

  if (isLoading) return <LoadingSpinner />
  if (!product) return null

  const discount = product.sale_price ? calcDiscount(product.price, product.sale_price) : 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors touch-target">
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate max-w-[200px] md:max-w-md">{product.name_ar}</h1>
        </div>
        {isAdmin() && (
          <div className="flex gap-2">
            <Link to={`/product/edit/${product.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5"><Edit className="w-4 h-4" />تعديل</Button>
            </Link>
            <Button variant="danger" size="sm" className="gap-1.5" onClick={handleDelete}><Trash2 className="w-4 h-4" />حذف</Button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Image */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 aspect-square overflow-hidden flex items-center justify-center relative">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-contain p-6" />
            ) : (
              <div className="text-6xl">📷</div>
            )}
            {product.is_favorite && (
              <div className="absolute top-4 left-4">
                <Star className="w-8 h-8 fill-yellow-400 text-yellow-400 drop-shadow" />
              </div>
            )}
            {discount > 0 && (
              <div className="absolute top-4 right-4 bg-red-500 text-white font-bold px-3 py-1.5 rounded-xl shadow-lg text-sm">
                خصم {discount}%
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {product.image_url && (
              <Button variant="outline" className="flex-1 gap-2" onClick={handleDownloadImage}><Download className="w-4 h-4" />تحميل الصورة</Button>
            )}
            {product.video_url && (
              <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(product.video_url!, '_blank')}><Video className="w-4 h-4" />عرض الفيديو</Button>
            )}
          </div>

        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="mb-3">
              <span className="text-sm font-medium text-brand-blue bg-brand-blue/10 px-3 py-1 rounded-full">
                {product.category?.icon} {product.category?.name_ar || 'بدون قسم'}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-1">{product.name_ar}</h2>
            {product.name_en && <p className="text-gray-500">{product.name_en}</p>}
            {product.barcode && <p className="text-xs text-gray-400 font-mono mt-2">الباركود: {product.barcode}</p>}

            <div className="flex items-center gap-4 py-4 border-y border-gray-100 my-4">
              <span className="text-3xl font-black text-brand-blue">{formatPrice(product.sale_price || product.price)}</span>
              {product.sale_price && (
                <div className="flex flex-col">
                  <span className="text-lg text-gray-400 line-through">{formatPrice(product.price)}</span>
                  <span className="text-sm text-red-500 font-bold">توفير {formatPrice(product.price - product.sale_price)}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-gray-900">الوصف التسويقي</h3>
              <div className="bg-gray-50 p-4 rounded-xl text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100 text-sm">
                {product.description || 'لا يوجد وصف متاح'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="flex-1 gap-2 text-base" onClick={handleCopy}><Copy className="w-5 h-5" />نسخ النص</Button>
            <Button size="lg" variant="secondary" className="flex-1 gap-2 text-base" onClick={handleShare}><Share2 className="w-5 h-5" />مشاركة</Button>
            <Button size="lg" variant={product.is_favorite ? 'outline' : 'ghost'} className="gap-2" onClick={handleToggleFavorite}>
              <Star className={`w-5 h-5 ${product.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-1">مرات النسخ</p>
              <p className="text-2xl font-black text-gray-900">{product.copy_count || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-1">آخر نسخ</p>
              <p className="text-sm font-bold text-gray-900 mt-1.5">
                {product.last_copied_at
                  ? formatDistanceToNow(new Date(product.last_copied_at), { addSuffix: true, locale: ar })
                  : 'لم يُنسخ بعد'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
