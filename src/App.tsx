import React, { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoadingSpinner } from './components/LoadingSpinner'
import { useAuthStore } from './store/authStore'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'

const Login = lazy(() => import('./pages/Login').then(({ Login }) => ({ default: Login })))
const Dashboard = lazy(() => import('./pages/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })))
const ProductDetails = lazy(() => import('./pages/ProductDetails').then(({ ProductDetails }) => ({ default: ProductDetails })))
const AddEditProduct = lazy(() => import('./pages/AddEditProduct').then(({ AddEditProduct }) => ({ default: AddEditProduct })))
const UsersManagement = lazy(() => import('./pages/UsersManagement').then(({ UsersManagement }) => ({ default: UsersManagement })))
const Settings = lazy(() => import('./pages/Settings').then(({ Settings }) => ({ default: Settings })))
const Notifications = lazy(() => import('./pages/Notifications').then(({ Notifications }) => ({ default: Notifications })))
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(({ ResetPassword }) => ({ default: ResetPassword })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
})

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) => {
  const { user, isAdmin } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && !isAdmin()) return <Navigate to="/" replace />
  return <>{children}</>
}

type AuthProfile = {
  id: string
  username: string
  role: 'admin' | 'staff'
  created_at?: string
}

const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setSupabaseUser, logout } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const syncSupabaseSession = async (session: Session | null) => {
      if (!session?.user) return false

      const { data, error } = await supabase.rpc('ensure_auth_profile', {
        p_username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || null,
      })

      if (error) throw error
      if (!data?.user) throw new Error('لم يتم العثور على ملف المستخدم.')

      setSupabaseUser(data.user as AuthProfile)
      return true
    }

    const validate = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getSession()
        if (authError) throw authError

        if (await syncSupabaseSession(authData.session)) {
          if (!cancelled) setReady(true)
          return
        }

        logout()
      } catch (error) {
        console.error('Auth bootstrap error:', error)
        if (!cancelled) logout()
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    validate()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        logout()
        return
      }

      if (session && event !== 'INITIAL_SESSION') {
        setTimeout(() => {
          void syncSupabaseSession(session).catch((error) => {
            console.error('Supabase Auth session sync error:', error)
            logout()
          })
        }, 0)
      }
    })

    return () => {
      cancelled = true
      authListener.subscription.unsubscribe()
    }
  }, [setSupabaseUser, logout])

  if (!ready) return <LoadingSpinner />
  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: { fontFamily: 'Cairo', borderRadius: '12px', padding: '12px 16px' },
            }}
          />
          <AuthBootstrap>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="product/:id" element={<ProductDetails />} />
                <Route path="product/new" element={<ProtectedRoute requireAdmin><AddEditProduct /></ProtectedRoute>} />
                <Route path="product/edit/:id" element={<ProtectedRoute requireAdmin><AddEditProduct /></ProtectedRoute>} />
                <Route path="users" element={<ProtectedRoute requireAdmin><UsersManagement /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute requireAdmin><Settings /></ProtectedRoute>} />
                <Route path="notifications" element={<Notifications />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthBootstrap>
        </Router>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}

export default App
