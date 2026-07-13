import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Upload a file to Firebase Storage
 * @param file - The file to upload
 * @param path - The storage path (e.g., 'deeds/deed123/attachments/file.pdf')
 * @returns Promise<string> - The download URL of the uploaded file
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
};

/**
 * Delete a file from Firebase Storage
 * @param path - The storage path of the file to delete
 */
export const deleteFile = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
};

/**
 * Get download URL for a file
 * @param path - The storage path of the file
 * @returns Promise<string> - The download URL
 */
export const getFileURL = async (path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw new Error('Failed to get file URL');
  }
};

/**
 * List all files in a directory
 * @param path - The directory path
 * @returns Promise<string[]> - Array of file paths
 */
export const listFiles = async (path: string): Promise<string[]> => {
  try {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);
    return result.items.map(item => item.fullPath);
  } catch (error) {
    console.error('Error listing files:', error);
    throw new Error('Failed to list files');
  }
};

/**
 * Generate a storage path for a deed attachment
 * @param deedId - The deed ID
 * @param fileName - The file name
 * @returns string - The storage path
 */
export const generateDeedAttachmentPath = (deedId: string, fileName: string): string => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `deeds/${deedId}/attachments/${timestamp}_${sanitizedFileName}`;
};

/**
 * Generate a storage path for a land attachment
 * @param landId - The land ID
 * @param landType - The type of land (allocated, delivered, leasedOut, leasedIn)
 * @param fileName - The file name
 * @returns string - The storage path
 */
export const generateLandAttachmentPath = (
  landId: string,
  landType: 'allocated' | 'delivered' | 'leasedOut' | 'leasedIn',
  fileName: string
): string => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `lands/${landType}/${landId}/attachments/${timestamp}_${sanitizedFileName}`;
};

/**
 * Generate a storage path for a building attachment
 * @param buildingId - The building ID
 * @param buildingType - The type of building (leasedOut, leasedIn)
 * @param fileName - The file name
 * @returns string - The storage path
 */
export const generateBuildingAttachmentPath = (
  buildingId: string,
  buildingType: 'leasedOut' | 'leasedIn',
  fileName: string
): string => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `buildings/${buildingType}/${buildingId}/attachments/${timestamp}_${sanitizedFileName}`;
};
