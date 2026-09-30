import { Platform } from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { toast } from '@/shared/contexts/toast';
import { logger } from '@/ignoreWarnings';

export type ImagePickerResult = {
  signedUrl: string;
  fileName: string;
  fileSize?: number;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

class ImagePickerService {
  private async checkCameraPermission(): Promise<boolean> {
    try {
      const perm =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.CAMERA
          : PERMISSIONS.ANDROID.CAMERA;
      const status = await check(perm);
      if (status === RESULTS.GRANTED) return true;
      if (status === RESULTS.DENIED) {
        const result = await request(perm);
        return result === RESULTS.GRANTED;
      }
      if (status === RESULTS.BLOCKED) {
        toast.show({
          title: 'Camera permission is blocked. Enable it in Settings.',
          type: 'error',
        });
      }
      return false;
    } catch (err) {
      logger.error('Camera permission error:', err);
      return false;
    }
  }

  private async checkPhotoLibraryPermission(): Promise<boolean> {
    try {
      const perm =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.PHOTO_LIBRARY
          : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;
      const status = await check(perm);
      if (status === RESULTS.GRANTED) return true;
      if (status === RESULTS.DENIED) {
        const result = await request(perm);
        return result === RESULTS.GRANTED;
      }
      if (status === RESULTS.BLOCKED) {
        toast.show({
          title: 'Photo library permission is blocked. Enable it in Settings.',
          type: 'error',
        });
      }
      return false;
    } catch (err) {
      logger.error('Photo library permission error:', err);
      return false;
    }
  }

  async pickImage(): Promise<ImagePickerResult | null> {
    try {
      const hasPermission = await this.checkPhotoLibraryPermission();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 1024,
        includeBase64: false,
      });

      if (result.errorCode) {
        toast.show({ title: result.errorMessage ?? 'Unable to open gallery', type: 'error' });
        return null;
      }

      const asset = result.assets?.[0];
      if (!asset) return null;

      if ((asset.fileSize ?? 0) > MAX_FILE_SIZE) {
        toast.show({ title: 'Image is too large. Max size is 2 MB.', type: 'error' });
        return null;
      }

      return {
        signedUrl: asset.uri ?? '',
        fileName: asset.fileName ?? 'image.jpg',
        ...(asset.fileSize !== undefined ? { fileSize: asset.fileSize } : {}),
      };
    } catch (err) {
      logger.error('pickImage error:', err);
      toast.show({ title: 'Unable to open gallery', type: 'error' });
      return null;
    }
  }

  async openCamera(): Promise<ImagePickerResult | null> {
    try {
      const hasPermission = await this.checkCameraPermission();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCamera({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 1024,
        includeBase64: false,
      });

      if (result.errorCode) {
        const msg =
          result.errorCode === 'camera_unavailable'
            ? 'Camera is not available on this device'
            : result.errorCode === 'permission'
            ? 'Camera permission is required'
            : result.errorMessage ?? 'Unable to open camera';
        toast.show({ title: msg, type: 'error' });
        return null;
      }

      const asset = result.assets?.[0];
      if (!asset) return null;

      if ((asset.fileSize ?? 0) > MAX_FILE_SIZE) {
        toast.show({ title: 'Image is too large. Max size is 2 MB.', type: 'error' });
        return null;
      }

      return {
        signedUrl: asset.uri ?? '',
        fileName: asset.fileName ?? 'camera_image.jpg',
        ...(asset.fileSize !== undefined ? { fileSize: asset.fileSize } : {}),
      };
    } catch (err) {
      logger.error('openCamera error:', err);
      toast.show({ title: 'Unable to open camera', type: 'error' });
      return null;
    }
  }
}

const imagePickerService = new ImagePickerService();
export default imagePickerService;
