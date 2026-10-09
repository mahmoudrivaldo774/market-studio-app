import React, { useState, useEffect, useCallback } from 'react'
import { appRpc } from '../lib/appApi'
import { User, ActivityLog } from '../types'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Shield, User as UserIcon, Users, Activity, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'

const ACTION_LABELS: Record<string, string> = {
  login: '🔑 تسجيل دخول',
  create_product: '➕ إضافة منتج',
  update_product: '✏️ تعديل منتج',
  delete_product: '🗑️ حذف منتج',
  copy_product: '📋 نسخ منتج',
  share_product: '📤 مشاركة منتج',
}

export const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users')
  const currentUser = useAuthStore(state => state.user)

  const fetchUsers = useCallback(async () => {
    try {
      const data = await appRpc<User[]>('list_users')
      setUsers(data || [])
    } catch { toast.error('فشل في جلب المستخدمين') }
    finally { setIsLoading(false) }
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const data = await appRpc<ActivityLog[]>('list_activity')
      setLogs(data || [])
    } catch { /* silently fail */ }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchLogs()
  }, [fetchLogs, fetchUsers])

  const handleRoleChange = async (id: string, role: 'admin' | 'staff') => {
    try {
      await appRpc('update_user_role', { p_user_id: id, p_role: role })
      setUsers(current => current.map(user => user.id === id ? { ...user, role } : user))
      toast.success('تم تحديث الصلاحية')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث الصلاحية')
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setActiveTab('users')} className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all touch-target ${activeTab === 'users' ? 'bg-white shadow-sm text-brand-orange' : 'text-gray-500'}`}>
          <Users className="w-4 h-4 inline-block ml-1.5" />المستخدمين
        </button>
        <button onClick={() => setActiveTab('logs')} className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all touch-target ${activeTab === 'logs' ? 'bg-white shadow-sm text-brand-orange' : 'text-gray-500'}`}>
          <Activity className="w-4 h-4 inline-block ml-1.5" />سجل النشاط
        </button>
      </div>

      {activeTab === 'users' ? (
        <div>
          <p className="mb-4 text-sm text-gray-500">
            الحسابات الجديدة تُنشأ من شاشة التسجيل، ثم يمكنك تغيير صلاحيتها من هنا.
          </p>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b bg-gray-50/50"><h2 className="font-bold flex items-center gap-2"><Users className="w-5 h-5 text-gray-600" />قائمة المستخدمين ({users.length})</h2></div>
              {isLoading ? <LoadingSpinner /> : (
                <div className="divide-y divide-gray-100">
                  {users.map(u => (
                    <div key={u.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                          {u.role === 'admin' ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{u.username}</p>
                          <p className="text-xs text-gray-400">{u.role === 'admin' ? 'مدير' : 'موظف'}</p>
                        </div>
                      </div>
                      <select
                        aria-label={`صلاحية ${u.username}`}
                        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange"
                        value={u.role}
                        disabled={u.id === currentUser?.id}
                        onChange={event => void handleRoleChange(u.id, event.target.value as 'admin' | 'staff')}
                      >
                        <option value="staff">موظف</option>
                        <option value="admin">مدير</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
      ) : (
        /* Activity Logs */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b bg-gray-50/50"><h2 className="font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-gray-600" />سجل النشاط</h2></div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">لا توجد سجلات نشاط بعد</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-sm">
                    {ACTION_LABELS[log.action]?.split(' ')[0] || '📌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-bold">{(log as any).user?.username || 'مجهول'}</span>
                      <span className="text-gray-500 mx-1">—</span>
                      <span>{ACTION_LABELS[log.action]?.split(' ').slice(1).join(' ') || log.action}</span>
                      {(log as any).product?.name_ar && (
                        <span className="text-brand-orange font-medium mr-1">"{(log as any).product.name_ar}"</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ar }) : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
