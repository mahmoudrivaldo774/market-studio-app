import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Bell, BellOff, ExternalLink, CheckCheck, Calendar, Clock, ImageIcon } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { ar } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

interface NotificationItem {
  id: string
  name_ar: string
  image_url?: string | null
  last_copied_at?: string | null
  created_at?: string
}

export const Notifications: React.FC = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('market-read-notifications')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  // Persist read state
  useEffect(() => {
    localStorage.setItem('market-read-notifications', JSON.stringify([...readIds]))
  }, [readIds])

  const fetchProducts = useCallback(async () => {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data, error } = await supabase
        .from('products')
        .select('id, name_ar, image_url, last_copied_at, created_at')
        .or(`last_copied_at.is.null,last_copied_at.lt.${sevenDaysAgo.toISOString()}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const markAllRead = () => {
    const allIds = new Set(products.map(p => p.id))
    setReadIds(allIds)
  }

  const unreadCount = products.filter(p => !readIds.has(p.id)).length

  const getDaysSinceCreation = (createdAt?: string) => {
    if (!createdAt) return 0
    return differenceInDays(new Date(), new Date(createdAt))
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-orange" />
            الإشعارات
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            منتجات لم تُنسخ أو تُنشر منذ 7 أيام أو أكثر
          </p>
        </div>
        {products.length > 0 && unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-2 flex-shrink-0" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" />
            تحديد الكل كمقروء ({unreadCount})
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-brand-gold/10 rounded-2xl flex items-center justify-center mb-4">
            <BellOff className="w-10 h-10 text-brand-gold" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">لا توجد إشعارات حالياً 🎉</h2>
          <p className="text-gray-500 text-sm max-w-sm">
            جميع المنتجات تم نسخها أو نشرها خلال آخر 7 أيام. عمل رائع!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product, index) => {
            const isRead = readIds.has(product.id)
            const daysSinceCreation = getDaysSinceCreation(product.created_at)

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'bg-white rounded-xl border p-4 flex items-center gap-4 transition-all',
                  isRead
                    ? 'border-gray-100 opacity-60'
                    : 'border-orange-200 shadow-sm shadow-orange-100'
                )}
              >
                {/* Product Thumbnail */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon className="w-7 h-7" />
                    </div>
                  )}
                  {!isRead && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-gray-900 truncate text-sm sm:text-base">{product.name_ar}</h3>
                    {!isRead && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                        جديد
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      أُضيف منذ {daysSinceCreation} يوم
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {product.last_copied_at
                        ? `آخر نسخ: ${formatDistanceToNow(new Date(product.last_copied_at), { addSuffix: true, locale: ar })}`
                        : 'لم يُنسخ أبداً'
                      }
                    </span>
                  </div>
                </div>

                {/* Action */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-shrink-0"
                  onClick={() => {
                    setReadIds(prev => new Set([...prev, product.id]))
                    navigate(`/product/${product.id}`)
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">فتح المنتج</span>
                </Button>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
