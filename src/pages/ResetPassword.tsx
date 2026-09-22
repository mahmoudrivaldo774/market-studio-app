import React, { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { KeyRound, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setHasRecoverySession(Boolean(data.session))
      setIsChecking(false)
    })

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasRecoverySession(true)
        setIsChecking(false)
      }
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < 8) {
      toast.error('كلمة المرور يجب أن تتكون من 8 أحرف على الأقل')
      return
    }
    if (password !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('تم تحديث كلمة المرور')
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث كلمة المرور')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isChecking && !hasRecoverySession) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-brand-blue text-white flex items-center justify-center mx-auto mb-3">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">تعيين كلمة مرور جديدة</h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">كلمة المرور الجديدة</label>
            <div className="relative">
              <KeyRound className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="pr-10 text-left"
                dir="ltr"
                autoComplete="new-password"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">تأكيد كلمة المرور</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              className="text-left"
              dir="ltr"
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" isLoading={isLoading}>
            حفظ كلمة المرور
          </Button>
        </form>
      </div>
    </div>
  )
}
