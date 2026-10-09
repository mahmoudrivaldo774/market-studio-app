import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { appRpc } from '../lib/appApi'
import { useProductStore } from '../store/productStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ArrowRight, Upload, X, Image as ImageIcon, Video } from 'lucide-react'
import { calcDiscount } from '../lib/utils'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { removeProductMedia, uploadProductMedia, validateProductMedia } from '../lib/productMedia'

export const AddEditProduct: React.FC = () => {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { categories, setCategories } = useProductStore()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name_ar: '', name_en: '', barcode: '', price: '', sale_price: '',
    category_id: '', description: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [existingVideo, setExistingVideo] = useState<string | null>(null)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [originalVideo, setOriginalVideo] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const fetchCats = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name_ar')
    if (data) setCategories(data)
  }, [setCategories])

  useEffect(() => {
    if (categories.length === 0) fetchCats()
  }, [categories.length, fetchCats])

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImagePreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setImagePreview(null)
    }
  }, [imageFile])

  const fetchProduct = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
    if (data && !error) {
      setFormData({
        name_ar: data.name_ar, name_en: data.name_en || '', barcode: data.barcode || '',
        price: data.price?.toString() || '', sale_price: data.sale_price?.toString() || '',
        category_id: data.category_id || '', description: data.description || '',
      })
      setExistingImage(data.image_url)
      setExistingVideo(data.video_url)
      setOriginalImage(data.image_url)
      setOriginalVideo(data.video_url)
    }
  }, [id])

  useEffect(() => {
    if (isEdit) fetchProduct()
  }, [fetchProduct, isEdit])

  const selectMediaFile = (file: File | undefined, kind: 'image' | 'video') => {
    if (!file) return
    const validationError = validateProductMedia(file, kind)
    if (validationError) {
      toast.error(validationError)
      return
    }
    if (kind === 'image') setImageFile(file)
    else setVideoFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const price = formData.price ? Number(formData.price) : null
    const salePrice = formData.sale_price ? Number(formData.sale_price) : null
    if (!formData.name_ar.trim() || (price !== null && (!Number.isFinite(price) || price < 0))) {
      toast.error('الرجاء إدخال الاسم والسعر'); return
    }
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice <= 0 || (price !== null && salePrice >= price))) {
      toast.error('سعر العرض يجب أن يكون أكبر من صفر وأقل من السعر الأساسي'); return
    }
    setIsLoading(true)
    const uploadedUrls: string[] = []
    try {
      let imageUrl = existingImage
      let videoUrl = existingVideo
      if (imageFile) {
        imageUrl = await uploadProductMedia(imageFile, 'images')
        uploadedUrls.push(imageUrl)
      }
      if (videoFile) {
        videoUrl = await uploadProductMedia(videoFile, 'videos')
        uploadedUrls.push(videoUrl)
      }

      const productData = {
        name_ar: formData.name_ar.trim(),
        name_en: formData.name_en.trim() || null,
        barcode: formData.barcode.trim() || null,
        price,
        sale_price: salePrice,
        category_id: formData.category_id || null,
        description: formData.description.trim() || null,
        image_url: imageUrl,
        video_url: videoUrl,
        updated_at: new Date().toISOString(),
      }

      if (isEdit) {
        await appRpc('update_product', {
          p_product_id: id,
          p_product: productData,
        })
        await appRpc('log_activity', { p_action: 'update_product', p_product_id: id })
        const replacedMedia = [
          originalImage && imageUrl !== originalImage ? originalImage : null,
          originalVideo && videoUrl !== originalVideo ? originalVideo : null,
        ]
        await removeProductMedia(replacedMedia).catch(error => {
          console.warn('Could not remove replaced product media:', error)
        })
        toast.success('تم تحديث المنتج ✓')
      } else {
        const data = await appRpc<{ id: string }>('create_product', {
          p_product: productData,
        })
        await appRpc('log_activity', { p_action: 'create_product', p_product_id: data.id })
        toast.success('تمت إضافة المنتج ✓')
      }
      navigate('/')
    } catch (err: unknown) {
      await removeProductMedia(uploadedUrls).catch(cleanupError => {
        console.warn('Could not clean up uploaded product media:', cleanupError)
      })
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ المنتج')
    } finally {
      setIsLoading(false)
    }
  }

  const price = parseFloat(formData.price) || 0
  const salePrice = parseFloat(formData.sale_price) || 0
  const discount = salePrice > 0 && price > salePrice ? calcDiscount(price, salePrice) : 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-5 pb-20">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl touch-target">
          <ArrowRight className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'تعديل منتج' : 'إضافة منتج جديد'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold border-b pb-2 text-brand-orange">المعلومات الأساسية</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم (عربي) </label>
              <Input required value={formData.name_ar} onChange={e => setFormData({...formData, name_ar: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم (إنجليزي)</label>
              <Input value={formData.name_en} onChange={e => setFormData({...formData, name_en: e.target.value})} dir="ltr" />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">الباركود</label>
              <Input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">السعر الأساسي </label>
              <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">سعر العرض</label>
              <Input type="number" step="0.01" value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value})} dir="ltr" />
              {discount > 0 && (
                <p className="text-xs text-brand-gold font-bold mt-1">🏷️ خصم {discount}%</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">القسم</label>
            <select
              className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-orange outline-none touch-target"
              value={formData.category_id}
              onChange={e => setFormData({...formData, category_id: e.target.value})}
            >
              <option value="">بدون قسم</option>
              {categories.map(c => (<option key={c.id} value={c.id}>{c.icon} {c.name_ar}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">الوصف التسويقي</label>
            <textarea
              className="flex min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-orange outline-none resize-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="اكتب وصفاً جذاباً للمنتج ليتم نسخه ومشاركته..."
            />
          </div>
        </div>

        {/* Media Upload */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold border-b pb-2 text-brand-orange">الوسائط</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {/* Image */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">صورة المنتج (PNG مفرغ)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 min-h-[200px] flex flex-col items-center justify-center bg-gray-50 relative hover:border-brand-orange/50 transition-colors">
                {imagePreview || existingImage ? (
                  <div className="relative w-full flex items-center justify-center">
                    <img src={imagePreview || existingImage!} alt="Preview" className="max-h-[180px] object-contain rounded-lg" />
                    <button type="button" onClick={() => { setImageFile(null); setExistingImage(null) }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 text-center">اضغط أو اسحب الصورة هنا</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP</p>
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => selectMediaFile(e.target.files?.[0], 'image')} />
                  </>
                )}
              </div>
            </div>

            {/* Video */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">فيديو المنتج (MP4)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 min-h-[200px] flex flex-col items-center justify-center bg-gray-50 relative hover:border-brand-orange/50 transition-colors">
                {videoFile || existingVideo ? (
                  <div className="relative w-full flex flex-col items-center justify-center">
                    <Video className="w-12 h-12 text-brand-orange mb-2" />
                    <p className="text-sm font-medium truncate max-w-full px-4">{videoFile ? videoFile.name : 'فيديو موجود'}</p>
                    <button type="button" onClick={() => { setVideoFile(null); setExistingVideo(null) }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 text-center">اضغط أو اسحب الفيديو هنا</p>
                    <p className="text-xs text-gray-400 mt-1">MP4, WebM</p>
                    <input type="file" accept="video/mp4,video/webm" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => selectMediaFile(e.target.files?.[0], 'video')} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>إلغاء</Button>
          <Button type="submit" className="flex-[2]" size="lg" isLoading={isLoading}>{isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}</Button>
        </div>
      </form>
    </motion.div>
  )
}
