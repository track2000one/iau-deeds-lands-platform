export interface Deed {
  id: string;
  deedNumber: string;
  deedDate: string;
  propertyDescription: string;
  plotNumber: string;
  planNumber: string;
  area: number;
  location: string;
  region: string;
  city: string;
  district: string;
  usageType: string;
  notes: string;
  isPlanned: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  deedId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  attachmentType: 'deed' | 'site' | 'plan' | 'additional';
  fileUrl: string;
  uploadDate: string;
}

export interface DeedFormData extends Omit<Deed, 'id' | 'attachments' | 'createdAt' | 'updatedAt'> {}
