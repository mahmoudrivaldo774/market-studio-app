import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabaseConfigurationError, supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Store, User, Lock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

function getLoginErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '')
  const normalizedMessage = message.toLowerCase()

  if (
    error instanceof TypeError &&
    (normalizedMessage.includes('fetch') || normalizedMessage.includes('network'))
  ) {
    return 'تعذر الاتصال بخادم قاعدة البيانات. تحقق من VITE_SUPABASE_URL ثم أعد تشغيل الخادم.'
  }

  return message || 'حدث خطأ أثناء تسجيل الدخول'
}

export const Login: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [identifier, setIdentifier] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!identifier.trim() || !password.trim() || (mode === 'signup' && !username.trim())) {
      setError(mode === 'signup'
        ? 'الرجاء إدخال البريد الإلكتروني واسم المستخدم وكلمة المرور'
        : 'الرجاء إدخال اسم المستخدم وكلمة المرور')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }

    setIsLoading(true)
    try {
      const configurationError = getSupabaseConfigurationError()
      if (configurationError) throw new Error(configurationError)

      if (mode === 'signup') {
        if (!identifier.includes('@')) {
          setError('اكتب بريدًا إلكترونيًا صحيحًا')
          return
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email: identifier.trim(),
          password,
          options: {
            data: { username: username.trim() },
          },
        })

        if (authError) throw authError

        if (!data.session) {
          setError('تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول.')
          setMode('login')
          setPassword('')
          setConfirmPassword('')
          return
        }

        const { data: profile, error: profileError } = await supabase.rpc('ensure_auth_profile', {
          p_username: username.trim(),
        })
        if (profileError) throw profileError
        if (!profile?.user) throw new Error('تعذر إنشاء ملف المستخدم.')

        useAuthStore.getState().setSupabaseUser(profile.user)
        toast.success('تم إنشاء الحساب بنجاح!')
        navigate('/')
      } else {
        if (!identifier.includes('@')) {
          setError('اكتب البريد الإلكتروني المسجل في حسابك')
          return
        }

        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: identifier.trim(),
          password,
        })

        if (authError) throw authError
        if (!data.user) throw new Error('تعذر إنشاء جلسة المستخدم.')

        const { data: profile, error: profileError } = await supabase.rpc('ensure_auth_profile', {
          p_username: data.user.user_metadata?.username || identifier.split('@')[0],
        })
        if (profileError) throw profileError
        if (!profile?.user) throw new Error('تعذر تحميل ملف المستخدم.')

        useAuthStore.getState().setSupabaseUser(profile.user)
        toast.success(`مرحباً ${profile.user.username}!`)
        navigate('/')
      }
    } catch (err: unknown) {
      console.error('Login error:', err)
      setError(getLoginErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    setError('')
    if (!identifier.includes('@')) {
      setError('اكتب بريدك الإلكتروني أولًا ثم اضغط نسيت كلمة المرور')
      return
    }

    setIsResettingPassword(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(identifier.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) throw resetError
      toast.success('تم إرسال رابط استعادة كلمة المرور إلى بريدك')
    } catch (resetError) {
      setError(getLoginErrorMessage(resetError))
    } finally {
      setIsResettingPassword(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4" style={{
      background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 40%, #059669 100%)'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-white/20">
            <Store className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">Pick n' Pack Studio</h1>
          <p className="text-white/70 mt-1 text-sm">نظام إدارة استوديو المنتجات</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">اسم المستخدم</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError('') }}
                    className="pr-10 text-left h-12"
                    dir="ltr"
                    placeholder="اسمك داخل التطبيق"
                    autoComplete="username"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError('') }}
                  className="pr-10 text-left h-12"
                  dir="ltr"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  className="pr-10 text-left h-12"
                  dir="ltr"
                  placeholder="••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">تأكيد كلمة المرور</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                    className="pr-10 text-left h-12"
                    dir="ltr"
                    placeholder="أعد كتابة كلمة المرور"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full text-lg font-bold" isLoading={isLoading}>
              {mode === 'signup' ? 'إنشاء الحساب' : 'دخول'}
            </Button>
            {mode === 'login' && (
              <button
                type="button"
                disabled={isResettingPassword}
                onClick={() => void handlePasswordReset()}
                className="w-full text-sm font-semibold text-brand-orange hover:underline disabled:opacity-50"
              >
                {isResettingPassword ? 'جارٍ إرسال الرابط...' : 'نسيت كلمة المرور؟'}
              </button>
            )}
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setError('')
                setPassword('')
                setConfirmPassword('')
              }}
              className="text-sm font-semibold text-brand-orange hover:underline"
            >
              {mode === 'login' ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
            </button>
          </div>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">Pick n' Pack Studio v1.0 © 2026</p>
      </motion.div>
    </div>
  )
}
