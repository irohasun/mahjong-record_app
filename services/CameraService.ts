import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import { Platform } from 'react-native';
import { PhotoAsset } from '@/types/Media';

/**
 * カメラ・画像選択のための薄いサービス層
 * - 依存の追加は行わず、既存の expo-* に限定
 * - 挙動変更はせず、将来の撮影UI導入に備えたインターフェースのみ提供
 */
export class CameraService {
  /**
   * カメラ権限をリクエスト
   * 失敗時は false を返す
   */
  static async requestCameraPermission(): Promise<boolean> {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  }

  /**
   * フォトライブラリ権限をリクエスト
   */
  static async requestLibraryPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Media library permission error:', error);
      return false;
    }
  }

  /**
   * 画像をライブラリから1枚選択
   */
  static async pickSingleImage(): Promise<PhotoAsset | null> {
    try {
      const hasPermission = await this.requestLibraryPermission();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      const a = result.assets[0];
      return {
        uri: a.uri,
        width: a.width ?? 0,
        height: a.height ?? 0,
        mimeType: a.mimeType,
        fileName: (a as any).fileName,
      };
    } catch (error) {
      console.error('pickSingleImage error:', error);
      return null;
    }
  }

  /**
   * 画像を撮影（UIは将来の画面実装に委譲）
   * ここでは簡易にカメラ起動→1枚撮影の最低限の流れを想定
   */
  static async takePhotoSimple(): Promise<PhotoAsset | null> {
    try {
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) return null;

      // ImagePicker のカメラ起動にフォールバック（expo-camera の独自UIは今後検討）
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      const a = result.assets[0];
      return {
        uri: a.uri,
        width: a.width ?? 0,
        height: a.height ?? 0,
        mimeType: a.mimeType,
        fileName: (a as any).fileName,
      };
    } catch (error) {
      console.error('takePhotoSimple error:', error);
      return null;
    }
  }
}


