import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

/** 署名付きURLの有効期限: 7日間 (秒) */
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7;

export class StorageService {
  /**
   * ローカルURIの画像をストレージにアップロードする共通メソッド
   */
  private static async uploadPhoto(
    bucket: string,
    path: string,
    uri: string
  ): Promise<string> {
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
    }

    const blob = await res.blob();
    if (blob.size === 0) {
      throw new Error('Image file is empty (0 bytes)');
    }

    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; // Remove data URL prefix
        resolve(base64);
      };
      reader.onerror = reject;
    });

    reader.readAsDataURL(blob);
    const base64 = await base64Promise;

    const { data, error } = await supabase.storage.from(bucket).upload(path, decode(base64), {
      upsert: true,
      contentType: blob.type || 'image/jpeg',
    });

    if (error) throw error;

    return `${bucket}/${data.path}`;
  }

  private static extractExtension(uri: string): string {
    return uri.split('?')[0].split('#')[0].split('.').pop() || 'jpg';
  }

  static async uploadGamePhoto(accountId: string, gameId: string, uri: string): Promise<string> {
    const ext = this.extractExtension(uri);
    return this.uploadPhoto('game-photos', `games/${accountId}/${gameId}.${ext}`, uri);
  }

  /**
   * ストレージパスから表示可能なURLを取得
   * ローカル環境: 署名付きURL（signed URL）を使用
   * 本番環境: バケットの公開設定に応じて署名付きURLまたはパブリックURLを使用
   * @param storagePath ストレージパス（例: "game-photos/games/xxx/xxx.jpg"）
   * @returns 画像URL
   */
  static async getPublicUrl(storagePath: string): Promise<string | null> {
    try {
      const [bucket, ...rest] = storagePath.split('/');
      const path = rest.join('/');

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

      if (error) {
        // ファイルが存在しない場合などはアバターなし扱い
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      return null;
    }
  }

  static async uploadProfilePhoto(accountId: string, uri: string): Promise<string> {
    const ext = this.extractExtension(uri);
    // RLS: second segment must equal auth.uid(); store under avatars/{uid}/profile.ext
    return this.uploadPhoto('profile-photos', `avatars/${accountId}/profile.${ext}`, uri);
  }

  static async uploadGroupPhoto(groupId: string, uri: string): Promise<string> {
    const ext = this.extractExtension(uri);
    return this.uploadPhoto('group-photos', `groups/${groupId}/avatar.${ext}`, uri);
  }
}
