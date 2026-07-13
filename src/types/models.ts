// أنواع البيانات لجميع الكيانات في المنصة

// نوع الاستخدام
export type UsageType =
  | 'residential' // سكني
  | 'commercial' // تجاري
  | 'industrial' // صناعي
  | 'agricultural' // زراعي
  | 'educational' // تعليمي
  | 'governmental' // حكومي
  | 'mixed' // مختلط
  | 'other'; // أخرى

// الصك
export interface Deed {
  id: string;
  propertyDescription: string; // بيان العقار
  usageType: UsageType; // نوع الاستخدام
  deedNumber: string; // رقم الصك
  deedDate: Date; // تاريخ الصك
  plotNumber: string; // رقم القطعة
  planNumber: string; // رقم المخطط
  area: number; // المساحة (م²)
  location: string; // الموقع
  coordinates?: string; // الإحداثيات (lat,lng)
  isPlanned: boolean; // هل الأرض مخططة
  city: string; // المدينة
  district?: string; // الحي
  region: string; // المنطقة
  notes?: string; // ملاحظات
  createdBy: string; // معرف المنشئ
  createdAt: Date;
  updatedAt: Date;
}

// الأرض المخصصة
export interface AllocatedLand {
  id: string;
  propertyDescription: string; // بيان العقار
  plotNumber: string; // رقم القطعة
  planNumber: string; // رقم المخطط
  area: number; // المساحة
  usageType: UsageType; // نوع الاستخدام
  region: string; // المنطقة
  city: string; // المدينة
  district: string; // الحي
  coordinates?: string; // الإحداثيات
  googleEarthLink?: string; // رابط Google Earth
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// الأرض المسلمة
export interface DeliveredLand {
  id: string;
  recipientEntity: string; // اسم الجهة المستلمة
  deliveryDate: Date; // تاريخ الاستلام
  propertyDescription: string; // بيان العقار
  plotNumber: string; // رقم القطعة
  planNumber: string; // رقم المخطط
  area: number; // المساحة
  location: string; // الموقع
  coordinates?: string; // الإحداثيات
  deliveryMinutesNumber?: string; // رقم محضر التسليم
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// معلومات المستأجر/المالك
export interface PartyInfo {
  name: string; // الاسم
  commercialRegistration?: string; // السجل التجاري
  entityRepresentative?: string; // ممثل الجهة
  identityNumber?: string; // رقم الهوية
  nationality?: string; // الجنسية
  mobileNumber?: string; // رقم الجوال
}

// الأرض المؤجرة (من الجامعة)
export interface LeasedLandOut {
  id: string;
  tenant: PartyInfo; // بيانات المستأجر
  contractNumber: string; // رقم العقد
  contractStartDate: Date; // تاريخ بداية العقد
  contractDuration: string; // مدة العقد
  plotNumber: string; // رقم القطعة
  planNumber: string; // رقم المخطط
  area: number; // المساحة
  location: string; // الموقع
  coordinates?: string; // الإحداثيات
  rentAmount?: number; // قيمة الإيجار
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// الأرض المستأجرة (للجامعة)
export interface LeasedLandIn {
  id: string;
  owner: PartyInfo; // بيانات المالك
  contractNumber: string; // رقم العقد
  contractDuration: string; // مدة العقد
  propertyDescription: string; // بيان العقار
  area: number; // المساحة
  location: string; // الموقع
  coordinates?: string; // الإحداثيات
  rentAmount?: number; // قيمة الإيجار
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// المبنى المؤجر (من الجامعة)
export interface LeasedBuildingOut {
  id: string;
  tenant: PartyInfo; // بيانات المستأجر
  contractNumber: string; // رقم العقد
  buildingNumber: string; // رقم المبنى
  planNumber?: string; // رقم المخطط
  locationName: string; // اسم الموقع
  area: number; // المساحة
  city: string; // المدينة
  district?: string; // الحي
  coordinates?: string; // الإحداثيات
  rentAmount?: number; // قيمة الإيجار
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// المبنى المستأجر (للجامعة)
export interface LeasedBuildingIn {
  id: string;
  owner: PartyInfo; // بيانات المالك
  contractNumber: string; // رقم العقد
  buildingNumber: string; // رقم المبنى
  locationName: string; // اسم الموقع
  area: number; // المساحة
  region: string; // المنطقة
  city?: string; // المدينة
  coordinates?: string; // الإحداثيات
  rentAmount?: number; // قيمة الإيجار
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// المرفق - في نسخة الويب يتم حفظ رابط Google Drive فقط ولا يتم رفع الملف من الواجهة
export interface Attachment {
  id: string;
  entityId: string; // معرف السجل المرتبط
  entityType:
    | 'deed'
    | 'allocated_land'
    | 'delivered_land'
    | 'leased_land_out'
    | 'leased_land_in'
    | 'leased_building_out'
    | 'leased_building_in';
  attachmentType:
    | 'deed_image'
    | 'plan_image'
    | 'location_image'
    | 'contract_image'
    | 'delivery_minutes'
    | 'other';
  title: string; // اسم المرفق
  driveUrl: string; // رابط Google Drive
  driveFileId?: string;
  mimeType?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// نوع السجل لأغراض البحث
export type RecordType =
  | 'deed'
  | 'allocated_land'
  | 'delivered_land'
  | 'leased_land_out'
  | 'leased_land_in'
  | 'leased_building_out'
  | 'leased_building_in';

// معايير البحث
export interface SearchCriteria {
  keyword?: string; // كلمة البحث
  recordType?: RecordType; // نوع السجل
  city?: string; // المدينة
  region?: string; // المنطقة
  usageType?: UsageType; // نوع الاستخدام
  dateFrom?: Date; // من تاريخ
  dateTo?: Date; // إلى تاريخ
}

// الإحصائيات
export interface Statistics {
  totalDeeds: number;
  totalAllocatedLands: number;
  totalDeliveredLands: number;
  totalLeasedLandsOut: number;
  totalLeasedLandsIn: number;
  totalLeasedBuildingsOut: number;
  totalLeasedBuildingsIn: number;
  totalArea: number; // إجمالي المساحة
  totalRecords: number; // إجمالي السجلات
}
