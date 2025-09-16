import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { isCapacitorEnvironment, isWebEnvironment, getFilePath } from './capacitor';
import type { Attachment } from '@shared/schema';

export interface FileSystemService {
  // Photo capture
  capturePhoto(options?: CapturePhotoOptions): Promise<Attachment>;
  
  // File operations
  saveFile(fileData: string | Blob, fileName: string, mimeType: string): Promise<Attachment>;
  readFile(fileUri: string): Promise<string | Blob>;
  deleteFile(fileUri: string): Promise<boolean>;
  
  // File import/export
  importFile(): Promise<Attachment>;
  shareFile(attachment: Attachment): Promise<boolean>;
  
  // Directory management
  ensureDirectoriesExist(): Promise<void>;
  getStorageInfo(): Promise<StorageInfo>;
  
  // File validation
  validateFile(file: File | Blob, maxSizeBytes?: number): Promise<FileValidationResult>;
}

export interface CapturePhotoOptions {
  quality?: number; // 0-100
  allowEditing?: boolean;
  source?: 'camera' | 'library' | 'prompt';
}

export interface StorageInfo {
  usedSpace: number;
  availableSpace: number;
  totalFiles: number;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
  };
}

class CapacitorFileSystemService implements FileSystemService {
  private readonly ATTACHMENTS_DIR = 'attachments';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg', 'audio/wav', 'video/mp4', 'video/quicktime'
  ];

  async capturePhoto(options: CapturePhotoOptions = {}): Promise<Attachment> {
    if (!isCapacitorEnvironment()) {
      throw new Error('Camera capture is only available in Capacitor environment');
    }

    try {
      const photo = await Camera.getPhoto({
        quality: options.quality || 80,
        allowEditing: options.allowEditing || false,
        resultType: CameraResultType.DataUrl,
        source: options.source === 'library' ? CameraSource.Photos : 
               options.source === 'camera' ? CameraSource.Camera : 
               CameraSource.Prompt,
      });

      if (!photo.dataUrl) {
        throw new Error('Failed to capture photo data');
      }

      // Generate unique filename
      const fileName = `photo_${Date.now()}.${photo.format || 'jpeg'}`;
      
      // Save photo to filesystem
      return this.saveFile(photo.dataUrl, fileName, `image/${photo.format || 'jpeg'}`);
    } catch (error) {
      console.error('Failed to capture photo:', error);
      throw new Error('Failed to capture photo');
    }
  }

  async saveFile(fileData: string | Blob, fileName: string, mimeType: string): Promise<Attachment> {
    await this.ensureDirectoriesExist();
    
    try {
      let data: string;
      let size: number;

      if (fileData instanceof Blob) {
        // Convert Blob to base64
        data = await this.blobToBase64(fileData);
        size = fileData.size;
      } else if (fileData.startsWith('data:')) {
        // Extract base64 from data URL
        data = fileData.split(',')[1];
        size = this.getBase64Size(data);
      } else {
        // Assume it's already base64
        data = fileData;
        size = this.getBase64Size(data);
      }

      // Generate unique file path
      const fileId = this.generateFileId();
      const filePath = `${this.ATTACHMENTS_DIR}/${fileId}_${fileName}`;
      
      if (isCapacitorEnvironment()) {
        // Save to Capacitor filesystem
        await Filesystem.writeFile({
          path: filePath,
          data: data,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        });

        // Return Capacitor-style file URI
        const fileUri = `${Directory.Data}/${filePath}`;
        
        return {
          id: fileId,
          name: fileName,
          type: mimeType,
          url: fileUri,
          size: size,
        };
      } else {
        // For web environment, store in IndexedDB as base64
        const fileUri = `data:${mimeType};base64,${data}`;
        
        return {
          id: fileId,
          name: fileName,
          type: mimeType,
          url: fileUri,
          size: size,
        };
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      throw new Error('Failed to save file to storage');
    }
  }

  async readFile(fileUri: string): Promise<string | Blob> {
    try {
      if (isCapacitorEnvironment() && !fileUri.startsWith('data:')) {
        // Read from Capacitor filesystem
        const result = await Filesystem.readFile({
          path: fileUri.replace(`${Directory.Data}/`, ''),
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        });
        
        return result.data as string;
      } else {
        // For web or data URLs, return as is
        if (fileUri.startsWith('data:')) {
          return fileUri;
        } else {
          // Fetch from HTTP URL (fallback)
          const response = await fetch(fileUri);
          return response.blob();
        }
      }
    } catch (error) {
      console.error('Failed to read file:', error);
      throw new Error('Failed to read file from storage');
    }
  }

  async deleteFile(fileUri: string): Promise<boolean> {
    try {
      if (isCapacitorEnvironment() && !fileUri.startsWith('data:')) {
        await Filesystem.deleteFile({
          path: fileUri.replace(`${Directory.Data}/`, ''),
          directory: Directory.Data,
        });
      }
      // For web/data URLs, no action needed (will be garbage collected)
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  async importFile(): Promise<Attachment> {
    if (isWebEnvironment()) {
      // Use file input for web
      return this.importFileWeb();
    } else {
      // Use native file picker for Capacitor
      return this.importFileNative();
    }
  }

  private async importFileWeb(): Promise<Attachment> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = this.ALLOWED_TYPES.join(',');
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        try {
          const validation = await this.validateFile(file);
          if (!validation.isValid) {
            reject(new Error(validation.error || 'Invalid file'));
            return;
          }

          const attachment = await this.saveFile(file, file.name, file.type);
          resolve(attachment);
        } catch (error) {
          reject(error);
        }
      };

      input.click();
    });
  }

  private async importFileNative(): Promise<Attachment> {
    // For now, use camera/photos as file import
    // In a full implementation, you might use a file picker plugin
    return this.capturePhoto({ source: 'library' });
  }

  async shareFile(attachment: Attachment): Promise<boolean> {
    try {
      if (isCapacitorEnvironment()) {
        await Share.share({
          title: attachment.name,
          text: `Sharing ${attachment.name}`,
          url: attachment.url,
        });
      } else {
        // Web sharing API or fallback
        if (navigator.share && attachment.url.startsWith('data:')) {
          // Convert data URL to blob for web sharing
          const response = await fetch(attachment.url);
          const blob = await response.blob();
          const file = new File([blob], attachment.name, { type: attachment.type });
          
          await navigator.share({
            title: attachment.name,
            files: [file],
          });
        } else {
          // Fallback: download file
          const link = document.createElement('a');
          link.href = attachment.url;
          link.download = attachment.name;
          link.click();
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to share file:', error);
      return false;
    }
  }

  async ensureDirectoriesExist(): Promise<void> {
    if (!isCapacitorEnvironment()) return;

    try {
      await Filesystem.mkdir({
        path: this.ATTACHMENTS_DIR,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (error) {
      // Directory might already exist, that's OK
      if (!error.message?.includes('already exists')) {
        console.warn('Failed to create attachments directory:', error);
      }
    }
  }

  async getStorageInfo(): Promise<StorageInfo> {
    let usedSpace = 0;
    let totalFiles = 0;

    try {
      if (isCapacitorEnvironment()) {
        // Get directory contents to calculate usage
        const files = await Filesystem.readdir({
          path: this.ATTACHMENTS_DIR,
          directory: Directory.Data,
        });
        
        totalFiles = files.files.length;
        
        // Note: Capacitor doesn't provide easy file size access
        // This is an approximation
        usedSpace = totalFiles * 1024 * 1024; // Assume 1MB per file average
      }

      return {
        usedSpace,
        availableSpace: this.MAX_FILE_SIZE * 100, // Approximate
        totalFiles,
      };
    } catch (error) {
      console.warn('Failed to get storage info:', error);
      return {
        usedSpace: 0,
        availableSpace: this.MAX_FILE_SIZE * 100,
        totalFiles: 0,
      };
    }
  }

  async validateFile(file: File | Blob, maxSizeBytes?: number): Promise<FileValidationResult> {
    const maxSize = maxSizeBytes || this.MAX_FILE_SIZE;
    
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size ${this.formatFileSize(file.size)} exceeds maximum allowed size of ${this.formatFileSize(maxSize)}`,
      };
    }

    if (file.type && !this.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed`,
      };
    }

    return {
      isValid: true,
      fileInfo: {
        name: file instanceof File ? file.name : 'blob',
        size: file.size,
        type: file.type,
      },
    };
  }

  // Helper methods
  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private getBase64Size(base64: string): number {
    // Approximate size calculation for base64
    return Math.round(base64.length * 0.75);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Web-only implementation for environments without Capacitor
class WebFileSystemService implements FileSystemService {
  async capturePhoto(): Promise<Attachment> {
    throw new Error('Camera capture not supported in web environment');
  }

  async saveFile(fileData: string | Blob, fileName: string, mimeType: string): Promise<Attachment> {
    // For web, we'll store files as data URLs in IndexedDB
    let dataUrl: string;
    
    if (fileData instanceof Blob) {
      dataUrl = await this.blobToDataUrl(fileData);
    } else if (fileData.startsWith('data:')) {
      dataUrl = fileData;
    } else {
      dataUrl = `data:${mimeType};base64,${fileData}`;
    }

    return {
      id: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: fileName,
      type: mimeType,
      url: dataUrl,
      size: fileData instanceof Blob ? fileData.size : this.getBase64Size(fileData),
    };
  }

  async readFile(fileUri: string): Promise<string | Blob> {
    if (fileUri.startsWith('data:')) {
      return fileUri;
    }
    throw new Error('Invalid file URI for web environment');
  }

  async deleteFile(): Promise<boolean> {
    // No action needed for web - data URLs will be garbage collected
    return true;
  }

  async importFile(): Promise<Attachment> {
    const capacitorService = new CapacitorFileSystemService();
    return capacitorService.importFile();
  }

  async shareFile(attachment: Attachment): Promise<boolean> {
    const capacitorService = new CapacitorFileSystemService();
    return capacitorService.shareFile(attachment);
  }

  async ensureDirectoriesExist(): Promise<void> {
    // No action needed for web
  }

  async getStorageInfo(): Promise<StorageInfo> {
    return {
      usedSpace: 0,
      availableSpace: 50 * 1024 * 1024, // 50MB estimate
      totalFiles: 0,
    };
  }

  async validateFile(file: File | Blob): Promise<FileValidationResult> {
    const capacitorService = new CapacitorFileSystemService();
    return capacitorService.validateFile(file);
  }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private getBase64Size(base64: string): number {
    return Math.round(base64.length * 0.75);
  }
}

// Export the appropriate service based on environment
export const fileSystemService: FileSystemService = isCapacitorEnvironment() 
  ? new CapacitorFileSystemService()
  : new WebFileSystemService();

// Export types and classes for advanced usage
export { CapacitorFileSystemService, WebFileSystemService };