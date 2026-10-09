-- ============================================================
-- Market Studio - Complete Database Schema
-- ============================================================

-- Supabase installs extensions in the extensions schema.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  auth_user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Supabase Auth users are linked to the app profile by auth_user_id.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text UNIQUE NOT NULL,
  name_en text,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  barcode text UNIQUE,
  price numeric,
  sale_price numeric,
  sale_start_date date,
  sale_end_date date,
  description text,
  description_versions jsonb,
  image_url text,
  video_url text,
  tags text[],
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_favorite boolean DEFAULT false,
  last_copied_at timestamptz,
  copy_count int DEFAULT 0,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activity Log table
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Settings table
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. AUTHENTICATION FUNCTIONS (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_user_id = (SELECT auth.uid())
$$;

REVOKE ALL ON FUNCTION public.current_app_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated;

-- Create or load the app profile for a signed-in Supabase Auth user.
CREATE OR REPLACE FUNCTION public.ensure_auth_profile(p_username text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_user public.users;
  v_username text;
BEGIN
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  SELECT * INTO v_user
  FROM public.users
  WHERE auth_user_id = v_auth_user_id;

  IF v_user.id IS NULL THEN
    v_username := NULLIF(trim(p_username), '');
    IF v_username IS NULL THEN
      v_username := 'user-' || substring(replace(v_auth_user_id::text, '-', '') from 1 for 8);
    END IF;

    IF EXISTS (SELECT 1 FROM public.users WHERE username = v_username) THEN
      v_username := v_username || '-' || substring(replace(v_auth_user_id::text, '-', '') from 1 for 8);
    END IF;

    INSERT INTO public.users (username, role, auth_user_id)
    VALUES (v_username, 'staff', v_auth_user_id)
    RETURNING * INTO v_user;
  END IF;

  RETURN json_build_object(
    'user',
    json_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'role', v_user.role,
      'created_at', v_user.created_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_auth_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_auth_profile(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin public.users;
BEGIN
  SELECT * INTO v_admin FROM public.users WHERE id = public.current_app_user_id();
  IF v_admin.id IS NULL OR v_admin.role <> 'admin' THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  RETURN COALESCE(
    (SELECT json_agg(row_to_json(u) ORDER BY u.created_at DESC)
     FROM (
       SELECT id, username, role, created_at
       FROM public.users
     ) u),
    '[]'::json
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin public.users;
BEGIN
  SELECT * INTO v_admin FROM public.users WHERE id = public.current_app_user_id();
  IF v_admin.id IS NULL OR v_admin.role <> 'admin' OR p_role NOT IN ('admin', 'staff') THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  IF v_admin.id = p_user_id AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'لا يمكنك إزالة صلاحية الإدارة من حسابك الحالي';
  END IF;
  UPDATE public.users SET role = p_role WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_action text,
  p_product_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := public.current_app_user_id();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'انتهت الجلسة';
  END IF;
  INSERT INTO public.activity_log (user_id, action, product_id, details)
  VALUES (v_user_id, p_action, p_product_id, p_details);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_activity()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin public.users;
BEGIN
  SELECT * INTO v_admin FROM public.users WHERE id = public.current_app_user_id();
  IF v_admin.id IS NULL OR v_admin.role <> 'admin' THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  RETURN COALESCE(
    (
      SELECT json_agg(row_to_json(x) ORDER BY x.created_at DESC)
      FROM (
        SELECT
          l.id,
          l.user_id,
          l.action,
          l.product_id,
          l.details,
          l.created_at,
          CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object('username', u.username) END AS "user",
          CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object('name_ar', p.name_ar) END AS product
        FROM public.activity_log l
        LEFT JOIN public.users u ON u.id = l.user_id
        LEFT JOIN public.products p ON p.id = l.product_id
        ORDER BY l.created_at DESC
        LIMIT 100
      ) x
    ),
    '[]'::json
  );
END;
$$;

-- ============================================================
-- 3. DEFAULT CATEGORIES
-- ============================================================

INSERT INTO public.categories (name_ar, icon) VALUES
  ('منتجات الألبان والبيض', '🥛'),
  ('خضار وفاكهة', '🥬'),
  ('المخبوزات', '🍞'),
  ('المكسرات واللب والبذور', '🥜'),
  ('أدوات مكتبية', '✏️'),
  ('شيبس وسناكس', '🍿'),
  ('جاهز وسريع', '⚡'),
  ('جناح الأكل الكوري', '🍜'),
  ('الشوكولاتة والحلوى', '🍫'),
  ('المشروبات الغازية والعصائر', '🥤'),
  ('المياه', '💧'),
  ('القهوة والشاي', '☕'),
  ('آيس كريم', '🍦'),
  ('العناية بالمنزل', '🏠'),
  ('النظافة والعناية الشخصية', '🧼'),
  ('العناية بالجسم', '🧴'),
  ('العناية بالوجه', '✨'),
  ('الشامبو والعناية بالشعر', '💇'),
  ('العناية بالطفل', '👶'),
  ('الخبز في البيت', '🥖'),
  ('حبوب الإفطار والعبوات', '🥣'),
  ('لحمة وسمك وفراخ', '🥩'),
  ('المعلبات والبرطمانات', '🥫'),
  ('المكرونة والأرز', '🍝'),
  ('منتجات من حول العالم', '🌍'),
  ('صحي وأورجانيك', '🌿'),
  ('المنتجات النباتية', '🥗'),
  ('أعشاب وتوابل', '🌶️'),
  ('منتجات مجمدة', '🧊'),
  ('العناية بالحيوانات الأليفة', '🐾'),
  ('مستحضرات التجميل', '💄'),
  ('صحة عامة', '💊'),
  ('المزيد', '📦'),
  ('أجهزة إلكترونية', '📱'),
  ('المطبخ ومستلزماته', '🍳'),
  ('مستلزمات التخييم والشواء', '🏕️'),
  ('أدوات منزلية', '🔧')
ON CONFLICT (name_ar) DO NOTHING;

-- ============================================================
-- 5. PROTECTED WRITE FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_product(p_product jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users;
  v_product public.products;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = public.current_app_user_id();
  IF v_user.id IS NULL OR v_user.role <> 'admin' THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  INSERT INTO public.products (
    name_ar, name_en, barcode, price, sale_price, category_id,
    description, image_url, video_url, created_by
  )
  VALUES (
    NULLIF(p_product->>'name_ar', ''),
    NULLIF(p_product->>'name_en', ''),
    NULLIF(p_product->>'barcode', ''),
    (p_product->>'price')::numeric,
    NULLIF(p_product->>'sale_price', '')::numeric,
    NULLIF(p_product->>'category_id', '')::uuid,
    NULLIF(p_product->>'description', ''),
    NULLIF(p_product->>'image_url', ''),
    NULLIF(p_product->>'video_url', ''),
    v_user.id
  )
  RETURNING * INTO v_product;

  RETURN row_to_json(v_product);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_product(
  p_product_id uuid,
  p_product jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users;
  v_product public.products;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = public.current_app_user_id();
  IF v_user.id IS NULL OR v_user.role <> 'admin' THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  UPDATE public.products
  SET
    name_ar = COALESCE(NULLIF(p_product->>'name_ar', ''), name_ar),
    name_en = CASE WHEN p_product ? 'name_en' THEN NULLIF(p_product->>'name_en', '') ELSE name_en END,
    barcode = CASE WHEN p_product ? 'barcode' THEN NULLIF(p_product->>'barcode', '') ELSE barcode END,
    price = COALESCE(NULLIF(p_product->>'price', '')::numeric, price),
    sale_price = CASE WHEN p_product ? 'sale_price' THEN NULLIF(p_product->>'sale_price', '')::numeric ELSE sale_price END,
    category_id = CASE WHEN p_product ? 'category_id' THEN NULLIF(p_product->>'category_id', '')::uuid ELSE category_id END,
    description = CASE WHEN p_product ? 'description' THEN NULLIF(p_product->>'description', '') ELSE description END,
    image_url = CASE WHEN p_product ? 'image_url' THEN NULLIF(p_product->>'image_url', '') ELSE image_url END,
    video_url = CASE WHEN p_product ? 'video_url' THEN NULLIF(p_product->>'video_url', '') ELSE video_url END,
    updated_at = now()
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'المنتج غير موجود';
  END IF;
  RETURN row_to_json(v_product);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_product(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = public.current_app_user_id();
  IF v_user.id IS NULL OR v_user.role <> 'admin' THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  DELETE FROM public.products WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_product_copy(
  p_product_id uuid,
  p_copy_count integer,
  p_last_copied_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_app_user_id() IS NULL THEN
    RAISE EXCEPTION 'انتهت الجلسة';
  END IF;
  UPDATE public.products
  SET copy_count = GREATEST(p_copy_count, 0), last_copied_at = p_last_copied_at, updated_at = now()
  WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_product_favorite(
  p_product_id uuid,
  p_is_favorite boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_app_user_id() IS NULL THEN
    RAISE EXCEPTION 'انتهت الجلسة';
  END IF;
  UPDATE public.products
  SET is_favorite = p_is_favorite, updated_at = now()
  WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_brand_settings()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(value, '{}'::jsonb)::json
  FROM public.settings
  WHERE key = 'brand'
$$;

CREATE OR REPLACE FUNCTION public.upsert_setting(
  p_key text,
  p_value jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = public.current_app_user_id();
  IF v_user.id IS NULL OR v_user.role <> 'admin' THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  INSERT INTO public.settings (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Users are accessible only through the protected RPCs.
DROP POLICY IF EXISTS "users_read" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

-- Categories are currently read-only from the client.
DROP POLICY IF EXISTS "categories_read" ON public.categories;
DROP POLICY IF EXISTS "categories_write" ON public.categories;
DROP POLICY IF EXISTS "categories_update" ON public.categories;
DROP POLICY IF EXISTS "categories_delete" ON public.categories;
CREATE POLICY "categories_read" ON public.categories FOR SELECT TO authenticated USING (true);

-- Products: everyone can read, admin can insert/delete, staff can update only copy_count/last_copied_at/is_favorite
DROP POLICY IF EXISTS "products_read" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_read" ON public.products FOR SELECT TO authenticated USING (true);

-- Activity logs are written and read through protected RPCs.
DROP POLICY IF EXISTS "activity_read" ON public.activity_log;
DROP POLICY IF EXISTS "activity_insert" ON public.activity_log;

-- Settings are accessed through narrowly scoped RPCs.
DROP POLICY IF EXISTS "settings_read" ON public.settings;
DROP POLICY IF EXISTS "settings_write" ON public.settings;

GRANT SELECT ON public.categories, public.products TO authenticated;

-- ============================================================
-- 7. STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('product-media', 'product-media', true) ON CONFLICT DO NOTHING;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated;

CREATE OR REPLACE FUNCTION app_private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
  )
$$;

REVOKE ALL ON FUNCTION app_private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Public read product-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload product-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow update product-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete product-media" ON storage.objects;
DROP POLICY IF EXISTS "Admin list product-media" ON storage.objects;

-- Public buckets serve images without object policies; mutations require an app admin.
CREATE POLICY "Admin list product-media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'product-media' AND (SELECT app_private.is_admin()));
CREATE POLICY "Allow upload product-media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-media' AND (SELECT app_private.is_admin()));
CREATE POLICY "Allow update product-media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-media' AND (SELECT app_private.is_admin()))
  WITH CHECK (bucket_id = 'product-media' AND (SELECT app_private.is_admin()));
CREATE POLICY "Allow delete product-media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-media' AND (SELECT app_private.is_admin()));

-- ============================================================
-- 8. DEFAULT BRAND SETTINGS
-- ============================================================

INSERT INTO public.settings (key, value) VALUES (
  'brand',
  '{"primaryColor": "#1e3a8a", "secondaryColor": "#10b981", "textColor": "#000000", "logoUrl": null}'::jsonb
) ON CONFLICT (key) DO NOTHING;
