import React, { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { LogOut, Menu, X, Home, Users, PlusCircle, Bell, Store, Settings } from 'lucide-react'
import { cn } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

interface NotificationProduct {
  id: string
  name_ar: string
  image_url?: string | null
  last_copied_at?: string | null
  created_at?: string
}

export const Layout: React.FC = () => {
  const { user, logout, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [uncopiedProducts, setUncopiedProducts] = useState<NotificationProduct[]>([])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      logout()
      navigate('/login')
    }
  }

  const fetchUncopiedProducts = useCallback(async () => {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const { data } = await supabase
        .from('products')
        .select('id, name_ar, image_url, last_copied_at, created_at')
        .or(`last_copied_at.is.null,last_copied_at.lt.${sevenDaysAgo.toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(20)
      setUncopiedProducts(data || [])
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    fetchUncopiedProducts()
  }, [fetchUncopiedProducts, location.pathname])

  const menuItems = [
    { name: 'الرئيسية', icon: Home, path: '/' },
  ]

  if (isAdmin()) {
    menuItems.push(
      { name: 'إضافة منتج', icon: PlusCircle, path: '/product/new' },
      { name: 'المستخدمين', icon: Users, path: '/users' },
      { name: 'الإعدادات', icon: Settings, path: '/settings' }
    )
  }

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center shadow-md">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-brand-blue">Market Studio</h1>
            <p className="text-xs text-gray-400">استوديو المنتجات</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setIsSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium touch-target',
              location.pathname === item.path
                ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/25'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold text-lg">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{user?.username}</p>
            <p className="text-xs text-gray-400">{user?.role === 'admin' ? 'مدير' : 'موظف'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-500 hover:bg-red-50 w-full px-4 py-3 rounded-xl transition-colors touch-target font-medium"
        >
          <LogOut className="w-5 h-5" />
          تسجيل الخروج
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-l border-gray-200 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: 260 }}
              animate={{ x: 0 }}
              exit={{ x: 260 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="lg:hidden fixed top-0 right-0 bottom-0 w-64 bg-white z-50 flex flex-col shadow-2xl"
            >
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg touch-target"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            <h2 className="text-lg font-bold text-brand-blue lg:hidden">Market Studio</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                className="p-2 rounded-lg hover:bg-gray-100 touch-target relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {uncopiedProducts.length > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {uncopiedProducts.length > 9 ? '9+' : uncopiedProducts.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="fixed right-4 top-16 w-80 max-w-[90vw] bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b bg-gray-50">
                        <h3 className="font-bold text-sm text-gray-700">منتجات لم تُنسخ منذ 7 أيام+</h3>
                      </div>
                      <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
                        {uncopiedProducts.length === 0 ? (
                          <div className="p-6 text-center text-gray-400 text-sm">لا توجد إشعارات 🎉</div>
                        ) : (
                          uncopiedProducts.slice(0, 5).map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setShowNotifications(false)
                                navigate(`/product/${p.id}`)
                              }}
                              className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-right"
                            >
                              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-lg">⚠️</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{p.name_ar}</p>
                                <p className="text-xs text-gray-400">
                                  {p.last_copied_at
                                    ? `آخر نسخ: ${formatDistanceToNow(new Date(p.last_copied_at), { addSuffix: true, locale: ar })}`
                                    : 'لم يُنسخ أبداً'
                                  }
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                      {uncopiedProducts.length > 0 && (
                        <div className="border-t border-gray-100">
                          <button
                            onClick={() => {
                              setShowNotifications(false)
                              navigate('/notifications')
                            }}
                            className="w-full p-3 text-center text-sm font-semibold text-brand-blue hover:bg-brand-blue/5 transition-colors"
                          >
                            عرض كل الإشعارات ({uncopiedProducts.length})
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="w-9 h-9 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold lg:hidden">
              {user?.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
