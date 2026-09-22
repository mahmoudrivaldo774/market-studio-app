import React, { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { appRpc } from '@/lib/appApi'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { BrandSettings } from '@/types'
import { Upload, Save, Palette, Image as ImageIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const defaultSettings: BrandSettings = {
  primaryColor: '#1e3a8a',
  secondaryColor: '#10b981',
  textColor: '#000000',
  logoUrl: null,
}

export const Settings: React.FC = () => {
  const { isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<BrandSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data: brandData, error: brandError } = await supabase.rpc('get_brand_settings')
      if (brandError) throw brandError
      if (brandData) setSettings(brandData as BrandSettings)

    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('حدث خطأ أثناء تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  }, [])

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
    fetchSettings();
  }, [fetchSettings, isAdmin, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await appRpc('upsert_setting', { p_key: 'brand', p_value: settings })

      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة صحيحة');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `brand/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-media')
        .getPublicUrl(filePath);

      setSettings(prev => ({ ...prev, logoUrl: publicUrl }));
      toast.success('تم رفع الشعار بنجاح');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('حدث خطأ أثناء رفع الشعار');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner className="w-12 h-12 text-brand-blue" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-4xl mx-auto"
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Palette className="w-8 h-8 text-brand-blue" />
          إعدادات العلامة التجارية
        </h1>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <LoadingSpinner className="w-5 h-5 text-white" /> : <Save className="w-5 h-5" />}
          حفظ الإعدادات
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-xl font-semibold mb-4">الألوان</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اللون الأساسي (Primary Color)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="h-12 w-20 rounded cursor-pointer border-0 p-0"
                />
                <Input
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اللون الثانوي (Secondary Color)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="h-12 w-20 rounded cursor-pointer border-0 p-0"
                />
                <Input
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">لون النص (Text Color)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.textColor}
                  onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                  className="h-12 w-20 rounded cursor-pointer border-0 p-0"
                />
                <Input
                  value={settings.textColor}
                  onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                  className="font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h2 className="text-xl font-semibold mb-4">الشعار</h2>
            <div className="flex flex-col items-start gap-4">
              {settings.logoUrl && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <img src={settings.logoUrl} alt="Logo Preview" className="h-20 object-contain" />
                </div>
              )}
              <div className="relative">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="logo-upload"
                  className={`flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploading ? <LoadingSpinner className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                  رفع شعار جديد
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4">معاينة</h2>
          <div 
            className="rounded-xl overflow-hidden shadow-sm"
            style={{ backgroundColor: '#f3f4f6' }}
          >
            {/* Mock Header */}
            <div 
              className="p-4 flex items-center justify-between"
              style={{ backgroundColor: settings.primaryColor }}
            >
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-8 object-contain bg-white/10 rounded p-1" />
              ) : (
                <div className="h-8 w-24 bg-white/20 rounded"></div>
              )}
              <div className="flex gap-2">
                <div className="h-2 w-8 bg-white/30 rounded-full"></div>
                <div className="h-2 w-8 bg-white/30 rounded-full"></div>
              </div>
            </div>

            {/* Mock Content */}
            <div className="p-8 flex flex-col items-center justify-center space-y-6">
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm overflow-hidden p-6 text-center space-y-4">
                <div className="w-32 h-32 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold" style={{ color: settings.textColor }}>
                  عنوان تجريبي للمنتج
                </h3>
                <p className="opacity-70" style={{ color: settings.textColor }}>
                  هذا النص يعرض كيف سيبدو لون النص في التطبيق
                </p>
                <button
                  className="w-full py-3 rounded-lg font-bold text-white transition-opacity hover:opacity-90 mt-4"
                  style={{ backgroundColor: settings.secondaryColor }}
                >
                  الزر الثانوي
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
