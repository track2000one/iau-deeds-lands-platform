# Firebase Setup Guide - دليل إعداد Firebase

هذا الدليل يشرح كيفية ربط التطبيق بمشروع Firebase الخاص بك.
This guide explains how to connect the application to your Firebase project.

---

## المتطلبات الأساسية / Prerequisites

1. حساب Google
2. مشروع Firebase (سنقوم بإنشائه)
3. Node.js و pnpm مثبتين على جهازك

---

## الخطوة 1: إنشاء مشروع Firebase
## Step 1: Create Firebase Project

1. انتقل إلى [Firebase Console](https://console.firebase.google.com/)
2. اضغط على "Add project" أو "إضافة مشروع"
3. أدخل اسم المشروع (مثال: "university-deeds-system")
4. قم بإلغاء تفعيل Google Analytics إذا لم تكن بحاجة إليه
5. اضغط "Create project"

---

## الخطوة 2: تفعيل Authentication
## Step 2: Enable Authentication

1. في Firebase Console، اذهب إلى **Build > Authentication**
2. اضغط "Get started"
3. في تبويب "Sign-in method"، فعّل:
   - **Email/Password** (مهم جداً)
4. احفظ التغييرات

---

## الخطوة 3: إنشاء قاعدة بيانات Firestore
## Step 3: Create Firestore Database

1. اذهب إلى **Build > Firestore Database**
2. اضغط "Create database"
3. اختر **Production mode** (سنضبط القواعد لاحقاً)
4. اختر موقع الخادم (يفضل: `nam5 (us-central)` أو الأقرب لموقعك)
5. اضغط "Enable"

### إعداد قواعد الأمان / Security Rules

بعد إنشاء قاعدة البيانات، اذهب إلى تبويب **Rules** وضع هذه القواعد:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // User documents - only owner can write
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## الخطوة 4: تفعيل Firebase Storage
## Step 4: Enable Firebase Storage

1. اذهب إلى **Build > Storage**
2. اضغط "Get started"
3. اقبل القواعد الافتراضية
4. اختر نفس الموقع الذي اخترته لـ Firestore
5. اضغط "Done"

### إعداد قواعد Storage

اذهب إلى تبويب **Rules** وضع هذه القواعد:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                     request.resource.size < 10 * 1024 * 1024; // Max 10MB
    }
  }
}
```

---

## الخطوة 5: الحصول على معلومات المشروع
## Step 5: Get Project Configuration

1. في Firebase Console، اضغط على ⚙️ (Settings) > **Project settings**
2. مرر للأسفل إلى قسم "Your apps"
3. اضغط على أيقونة Web `</>`
4. سجل التطبيق باسم (مثال: "University Deeds Web App")
5. ستظهر لك معلومات التكوين:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

---

## الخطوة 6: إعداد المتغيرات البيئية
## Step 6: Setup Environment Variables

1. في مجلد المشروع، أنشئ ملف `.env`:

```bash
cp .env.example .env
```

2. افتح ملف `.env` وضع معلومات مشروعك:

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

3. احفظ الملف

⚠️ **مهم جداً**: لا تضف ملف `.env` إلى Git! تأكد من وجود `.env` في ملف `.gitignore`

---

## الخطوة 7: إنشاء مستخدم admin
## Step 7: Create Admin User

### الطريقة 1: من Firebase Console

1. اذهب إلى **Build > Authentication > Users**
2. اضغط "Add user"
3. أدخل:
   - Email: `admin@university.edu`
   - Password: `admin123` (يمكنك تغييره لاحقاً)
4. اضغط "Add user"
5. انسخ الـ **User UID** الذي ظهر

### إضافة بيانات Admin في Firestore

1. اذهب إلى **Build > Firestore Database**
2. اضغط "Start collection"
3. Collection ID: `users`
4. أول Document ID: الصق **User UID** الذي نسخته
5. أضف الحقول التالية:

```
Field: email       | Type: string  | Value: admin@university.edu
Field: displayName | Type: string  | Value: System Administrator
Field: role        | Type: string  | Value: admin
Field: createdAt   | Type: timestamp | Value: (current time)
Field: updatedAt   | Type: timestamp | Value: (current time)
Field: permissions | Type: map     | (انظر الأسفل)
```

**permissions map:**
```
deeds:
  canAdd: true
  canEdit: true
  canDelete: true
  canPrint: true
  canView: true

allocated_lands:
  canAdd: true
  canEdit: true
  canDelete: true
  canPrint: true
  canView: true

(وهكذا لجميع الأقسام...)
```

أو يمكنك نسخ هذا JSON:

```json
{
  "deeds": {
    "canAdd": true,
    "canEdit": true,
    "canDelete": true,
    "canPrint": true,
    "canView": true
  },
  "allocated_lands": {
    "canAdd": true,
    "canEdit": true,
    "canDelete": true,
    "canPrint": true,
    "canView": true
  },
  "delivered_lands": {
    "canAdd": true,
    "canEdit": true,
    "canDelete": true,
    "canPrint": true,
    "canView": true
  },
  "leased_lands_out": {
    "canAdd": true,
    "canEdit": true,
    "canDelete": true,
    "canPrint": true,
    "canView": true
  },
  "leased_lands_in": {
    "canAdd": true,
    "canEdit": true,
    "canDelete": true,
    "canPrint": true,
    "canView": true
  },
  "leased_buildings_out": {
    "canAdd": true,
    "canEdit": true,
    "canDelete": true,
    "canPrint": true,
    "canView": true
  },
  "leased_buildings_in": {
    "canAdd": true,
    "canEdit": true,
    "canDelete": true,
    "canPrint": true,
    "canView": true
  }
}
```

---

## الخطوة 8: تشغيل التطبيق
## Step 8: Run the Application

```bash
# تثبيت المكتبات إذا لم تكن مثبتة
pnpm install

# تشغيل التطبيق
pnpm dev
```

انتقل إلى صفحة تسجيل الدخول وسجل دخولك باستخدام:
- Email: `admin@university.edu`
- Password: `admin123`

---

## الخطوة 9: إنشاء مستخدمين إضافيين (اختياري)
## Step 9: Create Additional Users (Optional)

يمكنك إنشاء مستخدمين إضافيين بنفس الطريقة، مع تغيير `role` إلى `employee` للموظفين العاديين.

---

## Firestore Indexes المطلوبة
## Required Firestore Indexes

التطبيق يحتاج إلى Indexes لتحسين الأداء. إذا ظهرت لك رسائل خطأ تطلب إنشاء Index:

1. اضغط على رابط الخطأ الذي يظهر في console
2. سيأخذك مباشرة لصفحة إنشاء Index
3. اضغط "Create Index"
4. انتظر حتى يكتمل (قد يستغرق دقائق)

أو يمكنك إنشاءها يدوياً من **Firestore > Indexes** حسب الحاجة.

---

## استكشاف الأخطاء / Troubleshooting

### خطأ: "Firebase not configured"

- تأكد من إنشاء ملف `.env` ووضع جميع المتغيرات
- أعد تشغيل خادم التطوير بعد تعديل `.env`

### خطأ: "Permission denied" عند تسجيل الدخول

- تأكد من تفعيل Email/Password في Authentication
- تأكد من إنشاء مستخدم في Authentication

### خطأ: "Missing or insufficient permissions"

- تأكد من ضبط قواعد Firestore وFirebase Storage
- تأكد من إنشاء document في collection `users` للمستخدم

### لا تظهر البيانات بعد التسجيل

- تحقق من أن المستخدم لديه permissions صحيحة في Firestore
- افحص console في المتصفح للأخطاء

---

## وضع Demo Mode
## Demo Mode

إذا لم تكن مستعداً لإعداد Firebase بعد، يمكنك استخدام التطبيق في "Demo Mode":

- لا تنشئ ملف `.env`
- سيعمل التطبيق مع بيانات تجريبية محلية
- يمكنك تسجيل الدخول باستخدام:
  - Admin: `admin@university.edu` / `admin123`
  - Employee: `employee@university.edu` / `employee123`

---

## الأمان والإنتاج / Security & Production

عند نشر التطبيق للإنتاج:

1. ✅ غيّر كلمات المرور الافتراضية
2. ✅ فعّل 2FA للمستخدمين المهمين
3. ✅ راجع قواعد Firestore وStorage
4. ✅ فعّل Firebase App Check لحماية API
5. ✅ راجع حدود الاستخدام والتكلفة
6. ✅ أنشئ نسخ احتياطية دورية
7. ✅ راقب Logs في Firebase Console

---

## الدعم / Support

إذا واجهت مشاكل:
1. راجع [Firebase Documentation](https://firebase.google.com/docs)
2. تحقق من console المتصفح للأخطاء
3. راجع Firebase Console > Authentication & Firestore logs

---

**مبروك! 🎉 التطبيق الآن متصل بـ Firebase ويعمل بشكل كامل!**

**Congratulations! 🎉 The application is now connected to Firebase and fully operational!**
