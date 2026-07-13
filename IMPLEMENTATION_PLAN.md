# خطة تنفيذ منصة إدارة صكوك الأراضي والعقارات

## نظرة عامة
منصة متكاملة لإدارة صكوك الأراضي والعقارات الخاصة بجامعة الإمام عبدالرحمن بن فيصل، تشمل 15 واجهة رئيسية مع نظام صلاحيات متقدم وإدارة المرفقات والتقارير.

---

## 1. البنية التحنية والتقنيات

### التقنيات المستخدمة
- ✅ **React 18** + **TypeScript** - للواجهات الأمامية
- ✅ **React Router** - للتنقل بين الصفحات
- ✅ **Tailwind CSS v4** - للتصميم
- ✅ **Supabase** - قاعدة البيانات والمصادقة ورفع الملفات
- ✅ **React Hook Form** - لإدارة النماذج
- ✅ **Lucide Icons** - للأيقونات
- ✅ **i18next** - للدعم متعدد اللغات (عربي/إنجليزي)

### البنية الحالية
```
src/
├── app/
│   ├── App.tsx (✅ موجود)
│   ├── routes.tsx (✅ موجود)
│   └── components/
│       ├── Layout.tsx (✅ موجود)
│       └── ui/ (✅ مكونات UI جاهزة)
├── context/
│   ├── AuthContext.tsx (✅ موجود)
│   └── ThemeContext.tsx (✅ موجود)
├── i18n/
│   └── config.ts (✅ موجود)
└── styles/ (✅ موجود)
```

---

## 2. قاعدة البيانات (Supabase Schema)

### الجداول المطلوبة

#### 2.1 جدول المستخدمين والصلاحيات
```sql
-- users (يستخدم جدول auth.users الافتراضي في Supabase)
-- user_profiles
- id (UUID, FK to auth.users)
- username (TEXT)
- email (TEXT)
- role (TEXT) -- 'admin' or 'employee'
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- permissions
- id (UUID, PK)
- user_id (UUID, FK)
- can_add (BOOLEAN)
- can_edit (BOOLEAN)
- can_delete (BOOLEAN)
- can_print_reports (BOOLEAN)
- module_name (TEXT) -- 'deeds', 'lands', 'buildings', 'all'
- created_at (TIMESTAMP)
```

#### 2.2 جدول الصكوك (Deeds)
```sql
-- deeds
- id (UUID, PK)
- property_description (TEXT) -- بيان العقار
- usage_type (TEXT) -- نوع الاستخدام
- deed_number (TEXT) -- رقم الصك
- deed_date (DATE) -- تاريخ الصك
- plot_number (TEXT) -- رقم القطعة
- plan_number (TEXT) -- رقم المخطط
- area (DECIMAL) -- المساحة (م²)
- location (TEXT) -- الموقع
- coordinates (TEXT) -- الإحداثيات (lat,lng)
- is_planned (BOOLEAN) -- هل الأرض مخططة
- city (TEXT) -- المدينة
- district (TEXT) -- الحي
- region (TEXT) -- المنطقة
- created_by (UUID, FK)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 2.3 جدول الأراضي المخصصة
```sql
-- allocated_lands
- id (UUID, PK)
- property_description (TEXT)
- plot_number (TEXT)
- plan_number (TEXT)
- area (DECIMAL)
- usage_type (TEXT)
- region (TEXT)
- city (TEXT)
- district (TEXT)
- coordinates (TEXT)
- google_earth_link (TEXT)
- created_by (UUID, FK)
- created_at (TIMESTAMP)
```

#### 2.4 جدول الأراضي المسلمة
```sql
-- delivered_lands
- id (UUID, PK)
- recipient_entity (TEXT) -- اسم الجهة المستلمة
- delivery_date (DATE) -- تاريخ الاستلام
- property_description (TEXT)
- plot_number (TEXT)
- plan_number (TEXT)
- area (DECIMAL)
- location (TEXT)
- coordinates (TEXT)
- created_by (UUID, FK)
- created_at (TIMESTAMP)
```

#### 2.5 جدول الأراضي المؤجرة (من الجامعة)
```sql
-- leased_lands_out
- id (UUID, PK)
- tenant_name (TEXT) -- اسم المستأجر
- contract_number (TEXT) -- رقم العقد
- contract_start_date (DATE)
- contract_duration (TEXT) -- مدة العقد
- plot_number (TEXT)
- plan_number (TEXT)
- area (DECIMAL)
- location (TEXT)
- coordinates (TEXT)
-- بيانات المستأجر
- commercial_registration (TEXT)
- entity_representative (TEXT)
- identity_number (TEXT)
- nationality (TEXT)
- mobile_number (TEXT)
- created_by (UUID, FK)
- created_at (TIMESTAMP)
```

#### 2.6 جدول الأراضي المستأجرة (للجامعة)
```sql
-- leased_lands_in
- id (UUID, PK)
- owner_name (TEXT) -- اسم المالك
- contract_number (TEXT)
- contract_duration (TEXT)
- property_description (TEXT)
- area (DECIMAL)
- location (TEXT)
- coordinates (TEXT)
-- بيانات المالك
- commercial_registration (TEXT)
- identity_number (TEXT)
- mobile_number (TEXT)
- entity_representative (TEXT)
- created_by (UUID, FK)
- created_at (TIMESTAMP)
```

#### 2.7 جدول المباني المؤجرة (من الجامعة)
```sql
-- leased_buildings_out
- id (UUID, PK)
- tenant_name (TEXT)
- contract_number (TEXT)
- building_number (TEXT)
- plan_number (TEXT)
- location_name (TEXT)
- area (DECIMAL)
- city (TEXT)
-- بيانات المستأجر
- commercial_registration (TEXT)
- entity_representative (TEXT)
- identity_number (TEXT)
- nationality (TEXT)
- mobile_number (TEXT)
- created_by (UUID, FK)
- created_at (TIMESTAMP)
```

#### 2.8 جدول المباني المستأجرة (للجامعة)
```sql
-- leased_buildings_in
- id (UUID, PK)
- owner_name (TEXT)
- contract_number (TEXT)
- building_number (TEXT)
- location_name (TEXT)
- area (DECIMAL)
- region (TEXT)
-- بيانات المالك
- commercial_registration (TEXT)
- identity_number (TEXT)
- mobile_number (TEXT)
- entity_representative (TEXT)
- created_by (UUID, FK)
- created_at (TIMESTAMP)
```

#### 2.9 جدول المرفقات
```sql
-- attachments
- id (UUID, PK)
- record_id (UUID) -- معرف السجل المرتبط
- record_type (TEXT) -- 'deed', 'allocated_land', 'delivered_land', etc.
- file_name (TEXT)
- file_path (TEXT) -- مسار الملف في Supabase Storage
- file_type (TEXT) -- 'deed_image', 'plan_image', 'location_image', 'contract_image', etc.
- file_size (INTEGER)
- uploaded_by (UUID, FK)
- uploaded_at (TIMESTAMP)
```

---

## 3. نظام الصلاحيات (Permissions System)

### الأدوار (Roles)
1. **المسؤول (Admin)**
   - جميع الصلاحيات
   - إدارة حسابات الموظفين
   - تعديل الصلاحيات
   - الوصول إلى لوحة التحكم

2. **الموظف (Employee)**
   - صلاحيات محددة حسب ما يمنحه المسؤول
   - إضافة/تعديل/حذف/طباعة حسب الصلاحيات

### مستويات الصلاحيات لكل موديول
- ✅ إضافة (can_add)
- ✅ تعديل (can_edit)
- ✅ حذف (can_delete)
- ✅ طباعة التقارير (can_print_reports)

---

## 4. الواجهات والصفحات المطلوبة

### 4.1 واجهات المصادقة
- ✅ `/login` - تسجيل الدخول (موجودة حالياً)
- 🆕 `/admin/create-employee` - إنشاء حساب موظف (للمسؤول فقط)

### 4.2 الواجهة الرئيسية
- ✅ `/` - الصفحة الرئيسية (موجودة حالياً)
- تحديث: إضافة بطاقات إحصائية (عدد الصكوك، الأراضي، المباني، إلخ)

### 4.3 واجهات الصكوك
- 🆕 `/deeds` - عرض جميع الصكوك
- 🆕 `/deeds/new` - إضافة صك جديد
- 🆕 `/deeds/:id` - عرض تفاصيل صك
- 🆕 `/deeds/:id/edit` - تعديل صك

### 4.4 واجهات الأراضي
- 🆕 `/lands/allocated` - الأراضي المخصصة
- 🆕 `/lands/allocated/new` - إضافة أرض مخصصة
- 🆕 `/lands/delivered` - الأراضي المسلمة
- 🆕 `/lands/delivered/new` - إضافة أرض مسلمة
- 🆕 `/lands/leased-out` - الأراضي المؤجرة (من الجامعة)
- 🆕 `/lands/leased-out/new` - إضافة أرض مؤجرة
- 🆕 `/lands/leased-in` - الأراضي المستأجرة (للجامعة)
- 🆕 `/lands/leased-in/new` - إضافة أرض مستأجرة

### 4.5 واجهات المباني
- 🆕 `/buildings/leased-out` - المباني المؤجرة (من الجامعة)
- 🆕 `/buildings/leased-out/new` - إضافة مبنى مؤجر
- 🆕 `/buildings/leased-in` - المباني المستأجرة (للجامعة)
- 🆕 `/buildings/leased-in/new` - إضافة مبنى مستأجر

### 4.6 واجهة الاستعلام والبحث
- 🆕 `/search` - صفحة البحث الموحدة
  - بحث في الصكوك
  - بحث في الأراضي (جميع الأنواع)
  - بحث في المباني (جميع الأنواع)
  - فلترة متقدمة

### 4.7 واجهة التقارير
- 🆕 `/reports` - صفحة التقارير (موجودة حالياً - تحتاج تطوير)
  - تقارير الصكوك
  - تقارير الأراضي (حسب النوع)
  - تقارير المباني (حسب النوع)
  - طباعة PDF

### 4.8 واجهة لوحة التحكم
- 🆕 `/admin/dashboard` - لوحة تحكم المسؤول
  - إدارة حسابات الموظفين
  - تعديل الصلاحيات
  - إعادة ضبط البيانات التجريبية
  - إحصائيات النظام

### 4.9 واجهات أخرى
- ✅ `/settings` - الإعدادات (موجودة)
- 🆕 `/maps` - عرض الخرائط (موجودة - تحتاج ربط مع Google Earth)

---

## 5. المكونات المشتركة (Shared Components)

### 5.1 مكونات النماذج
```typescript
// FormField - حقل نموذج موحد
// FileUpload - رفع ملفات متعدد
// CoordinatesInput - إدخال إحداثيات مع معاينة
// DatePicker - اختيار التاريخ
// SelectDropdown - قائمة منسدلة
// TextArea - منطقة نص كبيرة
```

### 5.2 مكونات العرض
```typescript
// DataTable - جدول بيانات مع فلترة وترتيب
// Card - بطاقة عرض موحدة
// StatCard - بطاقة إحصائية
// AttachmentList - قائمة المرفقات
// GoogleEarthLink - رابط خرائط جوجل
// PermissionGuard - حماية الصفحات حسب الصلاحيات
```

### 5.3 مكونات التقارير
```typescript
// ReportTemplate - قالب تقرير موحد
// PrintButton - زر طباعة
// ExportPDF - تصدير PDF
```

---

## 6. ميزات النظام

### 6.1 نظام رفع الملفات
- استخدام **Supabase Storage**
- دعم أنواع الملفات: PDF, PNG, JPG, JPEG
- حد أقصى لحجم الملف: 10MB
- تصنيف المرفقات حسب النوع
- معاينة الصور قبل الرفع

### 6.2 نظام البحث
- بحث نصي في جميع الحقول
- فلترة متقدمة حسب:
  - نوع السجل
  - التاريخ
  - المنطقة/المدينة/الحي
  - نوع الاستخدام
  - المساحة

### 6.3 نظام التقارير
- تقارير ديناميكية لكل نوع سجل
- طباعة مباشرة من المتصفح
- تصدير PDF
- تضمين شعار الجامعة
- دعم اللغة العربية في الطباعة

### 6.4 ربط Google Earth
- إدخال الإحداثيات بصيغة `lat,lng`
- توليد رابط تلقائي للموقع
- زر فتح الموقع في Google Maps
- عرض الموقع على الخريطة داخل المنصة

---

## 7. خطة التنفيذ المرحلية

### المرحلة 1: إعداد البنية التحتية (يوم 1-2)
1. ✅ إعداد مشروع Supabase
2. ✅ إنشاء جداول قاعدة البيانات
3. ✅ إعداد Supabase Storage للمرفقات
4. ✅ إعداد سياسات الأمان (Row Level Security)
5. ✅ ربط Supabase مع المشروع

### المرحلة 2: نظام المصادقة والصلاحيات (يوم 3)
1. تطوير نظام تسجيل الدخول الكامل
2. إنشاء صفحة تسجيل موظف جديد
3. بناء نظام الصلاحيات (Permissions Context)
4. إنشاء مكون PermissionGuard
5. تطوير لوحة التحكم للمسؤول

### المرحلة 3: واجهات الصكوك (يوم 4-5)
1. صفحة عرض جميع الصكوك
2. نموذج إضافة صك جديد
3. صفحة تفاصيل الصك
4. صفحة تعديل الصك
5. نظام رفع مرفقات الصك

### المرحلة 4: واجهات الأراضي (يوم 6-8)
1. الأراضي المخصصة (عرض + إضافة + تعديل)
2. الأراضي المسلمة (عرض + إضافة + تعديل)
3. الأراضي المؤجرة من الجامعة (عرض + إضافة + تعديل)
4. الأراضي المستأجرة للجامعة (عرض + إضافة + تعديل)
5. نظام المرفقات لكل نوع

### المرحلة 5: واجهات المباني (يوم 9-10)
1. المباني المؤجرة من الجامعة (عرض + إضافة + تعديل)
2. المباني المستأجرة للجامعة (عرض + إضافة + تعديل)
3. نظام المرفقات للمباني

### المرحلة 6: البحث والتقارير (يوم 11-12)
1. بناء صفحة البحث الموحدة
2. نظام الفلترة المتقدمة
3. تطوير نظام التقارير
4. إضافة خاصية الطباعة
5. تصدير PDF

### المرحلة 7: ربط الخرائط والميزات الإضافية (يوم 13)
1. ربط Google Earth/Maps
2. عرض المواقع على الخريطة
3. تحسين الصفحة الرئيسية
4. إضافة الإحصائيات

### المرحلة 8: الاختبار والتحسينات (يوم 14-15)
1. اختبار جميع الواجهات
2. اختبار نظام الصلاحيات
3. اختبار رفع الملفات
4. تحسين الأداء
5. إصلاح الأخطاء
6. تحسين تجربة المستخدم

---

## 8. ملاحظات مهمة

### الأمان والخصوصية
- جميع البيانات محمية بنظام RLS في Supabase
- المستخدم يرى فقط البيانات المسموح له بها
- المرفقات محمية ولا يمكن الوصول إليها بدون صلاحيات
- كلمات المرور مشفرة بالكامل

### الأداء
- استخدام Pagination لعرض السجلات
- Lazy Loading للمرفقات
- Caching للبيانات المتكررة
- تحسين الاستعلامات

### تجربة المستخدم
- دعم كامل للغة العربية
- واجهة RTL احترافية
- رسائل خطأ واضحة
- تأكيد قبل الحذف
- حفظ تلقائي للنماذج

### قابلية التوسع
- بنية معيارية قابلة للتطوير
- إمكانية إضافة أنواع جديدة من السجلات
- إمكانية إضافة صلاحيات جديدة
- إمكانية ربط أنظمة خارجية

---

## 9. المتطلبات الفنية

### Supabase Setup
```bash
# تثبيت مكتبة Supabase
pnpm add @supabase/supabase-js

# متغيرات البيئة المطلوبة
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### المكتبات الإضافية المطلوبة
```bash
# نماذج وتحقق
pnpm add react-hook-form@7.55.0 zod @hookform/resolvers

# التواريخ
pnpm add date-fns

# التقارير والطباعة
pnpm add jspdf html2canvas

# الخرائط (إذا لزم الأمر)
pnpm add @react-google-maps/api
```

---

## 10. الخلاصة

هذه المنصة ستكون حلاً متكاملاً لإدارة صكوك الأراضي والعقارات مع:
- ✅ 15+ واجهة متكاملة
- ✅ نظام صلاحيات متقدم
- ✅ قاعدة بيانات آمنة ومنظمة
- ✅ نظام مرفقات احترافي
- ✅ تقارير قابلة للطباعة
- ✅ بحث واستعلام متقدم
- ✅ ربط مع خرائط جوجل
- ✅ دعم كامل للعربية والإنجليزية

**الوقت المقدر للتنفيذ الكامل**: 15 يوم عمل

---

## هل هذه الخطة واضحة ومناسبة؟

يرجى مراجعة الخطة وإبداء ملاحظاتك أو تعديلاتك قبل البدء بالتنفيذ.
