import { supabase } from './supabase'
import { useAuthStore } from '../store/authStore'

export async function appRpc<T = unknown>(
  functionName: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const user = useAuthStore.getState().user
  if (!user) {
    throw new Error('انتهت جلسة المستخدم. يرجى تسجيل الدخول مرة أخرى.')
  }

  const { data, error } = await supabase.rpc(functionName, params)

  if (error) throw error
  return data as T
}
