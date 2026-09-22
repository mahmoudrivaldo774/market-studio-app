# Market Studio

مستودع إعلانات منتجات مبني بـ React وTypeScript وSupabase.

## المتطلبات

- Node.js
- مشروع Supabase
- تفعيل Email provider في Supabase Auth

## الإعداد

1. انسخ `.env.example` إلى `.env` ثم املأ القيم:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

2. طبّق [supabase/schema.sql](supabase/schema.sql) على قاعدة البيانات.
3. ثبّت الحزم وشغّل التطبيق:

```bash
npm install
npm run dev
```

## الحسابات والصلاحيات

- تسجيل الدخول وإنشاء الحساب واستعادة كلمة المرور تتم عبر Supabase Auth.
- الحسابات الجديدة تحصل على دور `staff`.
- المدير يستطيع إدارة الإعلانات والإعدادات وتغيير أدوار المستخدمين.
- لا يمكن للمدير إزالة صلاحية الإدارة من حسابه الحالي.
- عيّن أول مدير من SQL Editor:

```sql
update public.users
set role = 'admin'
where auth_user_id = (
  select id from auth.users where email = 'admin@example.com'
);
```

أضف عنوان التطبيق إلى `Site URL` وأضف مسار استعادة كلمة المرور إلى `Redirect URLs` داخل إعدادات Auth:

```text
https://YOUR_DOMAIN/reset-password
http://localhost:5173/reset-password
```

## التحقق

```bash
npm run lint
npm run build
npm test
```

قبل النشر، اختبر بحساب مدير وحساب موظف، وتأكد من أن الموظف لا يستطيع فتح مسارات الإدارة أو تعديل ملفات `product-media`.

## إعداد الإنتاج

في Supabase Authentication > URL Configuration:

- اجعل `Site URL` هو عنوان التطبيق المنشور.
- أضف `https://YOUR_DOMAIN/reset-password` إلى `Redirect URLs`.
- اترك `http://localhost:5173/reset-password` للتطوير المحلي.
