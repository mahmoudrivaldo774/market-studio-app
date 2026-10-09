import React from 'react'
import { Link } from 'react-router-dom'
import { Product } from '../types'
import { formatPrice, calcDiscount, cn } from '../lib/utils'
import { Copy, Share2, Star, Video, ImageIcon, Check, Download, Maximize2 } from 'lucide-react'
import { ViewMode } from '../types'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

interface ProductCardProps {
  product: Product
  viewMode: ViewMode
  onCopy: (product: Product) => void
  onShare: (product: Product) => void
  onToggleFavorite: (product: Product) => void
  onImageClick?: (url: string) => void
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product, viewMode, onCopy, onShare, onToggleFavorite, onImageClick
}) => {
  const isCopied = !!product.last_copied_at
  const discount = product.sale_price ? calcDiscount(product.price || 0, product.sale_price) : 0

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product.image_url) return
    try {
      const res = await fetch(product.image_url)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${product.name_ar}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('بدأ تحميل الصورة')
    } catch {
      toast.error('فشل تحميل الصورة')
    }
  }

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-2xl border transition-all',
          isCopied ? 'opacity-70 border-brand-gold/30 bg-brand-gold/5' : 'border-gray-100 hover:shadow-lg'
        )}
      >
        <div 
          onClick={() => product.image_url && onImageClick?.(product.image_url)}
          className="w-full sm:w-32 h-32 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden relative group cursor-pointer"
        >
          {product.image_url ? (
            <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {product.video_url && (
            <div className="absolute top-1 right-1 bg-black/60 rounded-full p-1.5 backdrop-blur-sm">
              <Video className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex justify-between items-start">
            <Link to={`/product/${product.id}`} className="hover:text-brand-orange transition-colors flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate text-base">{product.name_ar}</h3>
              {product.description && <p className="text-xs text-gray-500 truncate mt-1">{product.description}</p>}
            </Link>
            <button onClick={() => onToggleFavorite(product)} className="p-2 -mr-2 text-gray-400 hover:text-yellow-500 touch-target">
              <Star className={cn('w-5 h-5', product.is_favorite && 'fill-yellow-400 text-yellow-400')} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="font-black text-brand-orange text-lg">{formatPrice(product.sale_price || product.price)}</span>
            {product.sale_price && <span className="text-sm text-gray-400 line-through">{formatPrice(product.price)}</span>}
            {discount > 0 && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">خصم {discount}%</span>}
          </div>
          
          <div className="mt-auto pt-4 flex flex-wrap gap-2">
            <button onClick={() => onCopy(product)} className="flex items-center justify-center gap-1.5 bg-brand-orange text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-orange/90 transition-colors touch-target flex-1 sm:flex-none">
              <Copy className="w-4 h-4" /> نسخ التفاصيل
            </button>
            {product.image_url && (
              <button onClick={handleDownload} className="flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors touch-target flex-1 sm:flex-none">
                <Download className="w-4 h-4" /> تحميل الصورة
              </button>
            )}
            <button onClick={() => onShare(product)} className="flex items-center justify-center bg-brand-gold/10 text-brand-gold px-4 py-2 rounded-xl hover:bg-brand-gold/20 transition-colors touch-target">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  // Grid view (Marketing Gallery Focus)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex flex-col bg-white rounded-2xl border overflow-hidden transition-all group',
        isCopied ? 'border-brand-gold/30 ring-1 ring-brand-gold/20 bg-brand-gold/5' : 'border-gray-100 hover:shadow-xl hover:-translate-y-1'
      )}
    >
      <div 
        onClick={() => product.image_url && onImageClick?.(product.image_url)}
        className="aspect-square bg-gray-50 relative block overflow-hidden cursor-pointer"
      >
        {product.image_url ? (
          <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
        
        {/* Overlay Action */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-transform scale-50 group-hover:scale-100 duration-300" />
        </div>

        {product.video_url && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-full p-2">
            <Video className="w-4 h-4 text-white" />
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-lg">
            -{discount}%
          </div>
        )}
        {isCopied && (
          <div className="absolute bottom-2 right-2">
            <span className="bg-brand-gold/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
              <Check className="w-3 h-3" /> تم النسخ
            </span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1 z-10 bg-inherit">
        <div className="flex justify-between items-start mb-1 gap-2">
          <Link to={`/product/${product.id}`} className="flex-1 min-w-0 group-hover:text-brand-orange transition-colors">
            <h3 className="font-bold text-gray-900 text-sm truncate leading-tight">{product.name_ar}</h3>
          </Link>
          <button onClick={() => onToggleFavorite(product)} className="p-1 -mt-1 -mr-1">
            <Star className={cn('w-4 h-4 transition-colors', product.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400')} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-base font-black text-brand-orange">{formatPrice(product.sale_price || product.price)}</span>
          {product.sale_price && <span className="text-[10px] text-gray-400 line-through">{formatPrice(product.price)}</span>}
        </div>

        {/* Marketing Actions */}
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => onCopy(product)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-brand-orange text-white py-2.5 rounded-xl text-xs font-bold hover:bg-brand-orange/90 transition-colors touch-target shadow-sm active:scale-95"
            >
              <Copy className="w-4 h-4" /> نسخ
            </button>
            {product.image_url && (
              <button
                onClick={handleDownload}
                className="w-11 flex items-center justify-center bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors touch-target active:scale-95"
                title="تحميل الصورة"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onShare(product)}
              className="w-11 flex items-center justify-center bg-brand-gold/10 text-brand-gold rounded-xl hover:bg-brand-gold/20 transition-colors touch-target active:scale-95"
              title="مشاركة"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
