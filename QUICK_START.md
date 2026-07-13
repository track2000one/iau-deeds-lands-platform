# دليل البدء السريع | Quick Start Guide

## 🚨 خطأ: Firebase غير مُعد | Error: Firebase Not Configured

إذا رأيت رسالة خطأ عند تسجيل الدخول، فهذا يعني أن Firebase غير مُعد بعد.

If you see an error when trying to login, it means Firebase is not configured yet.

---

## ⚡ الحل السريع | Quick Solution

### الخطوة 1: أنشئ مشروع Firebase | Step 1: Create Firebase Project

1. اذهب إلى | Go to: https://console.firebase.google.com/
2. انقر على **Add Project** أو **إضافة مشروع**
3. أدخل اسم المشروع | Enter project name: `land-deeds-management`
4. اتبع الخطوات حتى ينشأ المشروع | Follow steps until project is created

### الخطوة 2: فعّل الخدمات المطلوبة | Step 2: Enable Required Services

#### Authentication
1. في القائمة الجانبية، اختر **Authentication**
2. انقر **Get Started**
3. اختر **Email/Password**
4. فعّل الخيار | Enable it
5. احفظ | Save

#### Firestore Database
1. في القائمة الجانبية، اختر **Firestore Database**
2. انقر **Create Database**
3. اختر **Start in production mode**
4. اختر الموقع | Select location: `europe-west1`
5. انقر **Enable**

#### Storage
1. في القائمة الجانبية، اختر **Storage**
2. انقر **Get Started**
3. اقبل القواعد الافتراضية | Accept default rules
4. اختر نفس الموقع | Select same location
5. انقر **Done**

### الخطوة 3: احصل على بيانات الاتصال | Step 3: Get Connection Details

1. انقر على أيقونة الترس ⚙️ بجانب **Project Overview**
2. اختر **Project Settings**
3. انزل إلى **Your apps**
4. انقر على أيقونة الويب `</>`
5. أدخل اسم التطبيق | Enter app name: `Land Deeds Web App`
6. انقر **Register app**
7. ستظهر لك بيانات مثل | You will see config like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxx"
};
```

### الخطوة 4: أضف البيانات إلى المشروع | Step 4: Add Config to Project

1. افتح ملف `.env` في المشروع
2. استبدل القيم | Replace values:

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxxx
```

3. احفظ الملف | Save the file

### الخطوة 5: أعد تشغيل المشروع | Step 5: Restart Project

```bash
# أوقف السيرفر | Stop the server (Ctrl+C)
# ثم شغّله مجدداً | Then run again
pnpm dev
```

### الخطوة 6: أنشئ حساب المسؤول | Step 6: Create Admin Account

الآن يجب إنشاء حساب المسؤول الأول:

1. في Firebase Console، اذهب إلى **Authentication** → **Users**
2. انقر **Add User**
3. أدخل:
   - Email: `admin@example.com`
   - Password: `Admin123!`
4. انقر **Add User**
5. انسخ **User UID**

6. اذهب إلى **Firestore Database**
7. انقر **Start Collection**
8. اسم المجموعة | Collection ID: `users`
9. Document ID: الصق User UID الذي نسخته
10. أضف الحقول | Add fields:
    - `uid` (string): الصق User UID
    - `email` (string): `admin@example.com`
    - `username` (string): `المسؤول` أو `Admin`
    - `role` (string): `admin`
    - `createdAt` (timestamp): اختر الوقت الحالي
    - `updatedAt` (timestamp): اختر الوقت الحالي
11. احفظ | Save

### ✅ الآن يمكنك تسجيل الدخول! | Now You Can Login!

- Email: `admin@example.com`
- Password: `Admin123!`

---

## 📚 للمزيد من التفاصيل | For More Details

راجع ملف | See file: **FIREBASE_SETUP.md**

---

## ❓ مشاكل شائعة | Common Issues

### 1. "Permission Denied"
- تأكد من إضافة قواعد الأمان في Firestore
- راجع قسم "Security Rules" في FIREBASE_SETUP.md

### 2. "Invalid Email"
- تأكد من كتابة البريد بشكل صحيح
- البريد يجب أن يحتوي على `@`

### 3. "لا يمكن رفع الملفات"
- تأكد من تفعيل Storage
- تأكد من إضافة قواعد الأمان في Storage

---

## 🆘 الدعم | Support

إذا واجهت مشكلة | If you face any issue:
1. راجع ملف FIREBASE_SETUP.md
2. تحقق من console في المتصفح (F12)
3. تأكد من إدخال بيانات Firebase بشكل صحيح
