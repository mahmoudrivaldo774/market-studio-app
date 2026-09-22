import React from 'react'
import { Link } from 'react-router-dom'
import { Product } from '../types'
import { formatPrice, calcDiscount, cn } from '../lib/utils'
import { Copy, Share2, Star, Video, ImageIcon, Check } from 'lucide-react'
import { ViewMode } from '../types'
import { motion } from 'framer-motion'

interface ProductCardProps {
  product: Product
  viewMode: ViewMode
  onCopy: (product: Product) => void
  onShare: (product: Product) => void
  onToggleFavorite: (product: Product) => void
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product, viewMode, onCopy, onShare, onToggleFavorite
}) => {
  const isCopied = !!product.last_copied_at
  const discount = product.sale_price ? calcDiscount(product.price, product.sale_price) : 0

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center gap-4 p-3 bg-white rounded-xl border transition-all',
          isCopied ? 'opacity-60 border-brand-green/30 bg-brand-green/5' : 'border-gray-100 hover:shadow-md'
        )}
      >
        <Link to={`/product/${product.id}`} className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden relative block">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}
          {product.video_url && (
            <div className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
              <Video className="w-3 h-3 text-white" />
            </div>
          )}
          {isCopied && (
            <div className="absolute inset-0 bg-brand-green/10 flex items-center justify-center">
              <span className="bg-brand-green text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5" />تم النشر
              </span>
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <Link to={`/product/${product.id}`} className="hover:text-brand-blue transition-colors flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate text-sm">{product.name_ar}</h3>
            </Link>
            <button onClick={() => onToggleFavorite(product)} className="p-1.5 text-gray-400 hover:text-yellow-500 touch-target">
              <Star className={cn('w-5 h-5', product.is_favorite && 'fill-yellow-400 text-yellow-400')} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-bold text-brand-blue">{formatPrice(product.sale_price || product.price)}</span>
            {product.sale_price && <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>}
            {discount > 0 && <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">-{discount}%</span>}
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => onCopy(product)} className="flex items-center gap-1.5 bg-brand-blue/10 text-brand-blue px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-brand-blue/20 transition-colors touch-target">
              <Copy className="w-3.5 h-3.5" />نسخ
            </button>
            <button onClick={() => onShare(product)} className="flex items-center gap-1.5 bg-brand-green/10 text-brand-green px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-brand-green/20 transition-colors touch-target">
              <Share2 className="w-3.5 h-3.5" />مشاركة
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  // Grid view
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex flex-col bg-white rounded-xl border overflow-hidden transition-all group',
        isCopied ? 'opacity-60 border-brand-green/30 ring-1 ring-brand-green/20' : 'border-gray-100 hover:shadow-lg'
      )}
    >
      <Link to={`/product/${product.id}`} className="aspect-square bg-gray-50 relative block overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
        {product.video_url && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1.5">
            <Video className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow">
            -{discount}%
          </div>
        )}
        {isCopied && (
          <div className="absolute bottom-2 right-2">
            <span className="bg-brand-green text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Check className="w-3 h-3" />تم النشر
            </span>
          </div>
        )}
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1">
          <Link to={`/product/${product.id}`} className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm truncate">{product.name_ar}</h3>
          </Link>
          <button onClick={() => onToggleFavorite(product)} className="p-1 -ml-1">
            <Star className={cn('w-4 h-4', product.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-base font-bold text-brand-blue">{formatPrice(product.sale_price || product.price)}</span>
          {product.sale_price && <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>}
        </div>

        <div className="mt-auto pt-2 border-t border-gray-50 flex gap-2">
          <button
            onClick={() => onCopy(product)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-brand-blue text-white py-2 rounded-lg text-xs font-semibold hover:bg-brand-blue/90 transition-colors touch-target active:scale-95"
          >
            <Copy className="w-3.5 h-3.5" />نسخ
          </button>
          <button
            onClick={() => onShare(product)}
            className="w-10 flex items-center justify-center bg-brand-green/10 text-brand-green rounded-lg hover:bg-brand-green/20 transition-colors touch-target"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
