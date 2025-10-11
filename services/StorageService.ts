import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

export class StorageService {
  static async uploadGamePhoto(accountId: string, gameId: string, uri: string): Promise<string> {
    const bucket = 'game-photos';
    const ext = uri.split('?')[0].split('#')[0].split('.').pop() || 'jpg';
    const path = `games/${accountId}/${gameId}.${ext}`;

    console.log('🔍 DEBUG: Starting photo upload:', { accountId, gameId, uri, path });

    try {
      // Fetch file data and convert to base64
      console.log('🔍 DEBUG: Fetching file data from URI...');
      const res = await fetch(uri);
      if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
      }
      
      const blob = await res.blob();
      console.log('🔍 DEBUG: File blob created:', { size: blob.size, type: blob.type });

      if (blob.size === 0) {
        throw new Error('Image file is empty (0 bytes)');
      }

      // Convert blob to base64 (React Native compatible)
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
      console.log('🔍 DEBUG: Converted to base64, length:', base64.length);

      // Bucket should already exist from config.toml
      console.log('🔍 DEBUG: Using pre-configured bucket:', bucket);

      // Upload using base64 decode
      console.log('🔍 DEBUG: Uploading to Supabase storage using base64 decode...');
      const { data, error } = await supabase.storage.from(bucket).upload(path, decode(base64), {
        upsert: true,
        contentType: blob.type || 'image/jpeg',
      });
      
      if (error) {
        console.error('❌ DEBUG: Storage upload error:', error);
        throw error;
      }
      
      console.log('✅ DEBUG: Photo uploaded successfully:', data);
      return `${bucket}/${data.path}`; // return storage path
    } catch (error) {
      console.error('❌ DEBUG: Photo upload failed:', error);
      throw error;
    }
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
      
      // 署名付きURLを取得（7日間有効）
      // ローカル環境・本番環境両方で動作する
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 7); // 7日間有効
      
      if (error) {
        console.error('❌ DEBUG: Failed to create signed URL:', error);
        // フォールバックとしてパブリックURLを試す
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
        return publicData?.publicUrl || null;
      }
      
      console.log('✅ DEBUG: Signed URL created:', data.signedUrl);
      return data.signedUrl;
    } catch (error) {
      console.error('❌ DEBUG: Error in getPublicUrl:', error);
      return null;
    }
  }
  
  /**
   * 同期的にパブリックURLを取得する（後方互換性のため）
   * 注意: 署名付きURLが必要な場合は getPublicUrl を使用してください
   */
  static getPublicUrlSync(storagePath: string): string | null {
    const [bucket, ...rest] = storagePath.split('/');
    const path = rest.join('/');
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  }

  static async uploadProfilePhoto(accountId: string, uri: string): Promise<string> {
    const bucket = 'profile-photos';
    const ext = uri.split('?')[0].split('#')[0].split('.').pop() || 'jpg';
    // RLS: second segment must equal auth.uid(); store under avatars/{uid}/profile.ext
    const path = `avatars/${accountId}/profile.${ext}`;

    try {
      console.log('🔍 DEBUG: Starting profile photo upload:', { accountId, uri, path });
      const res = await fetch(uri);
      if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
      }

      const blob = await res.blob();
      console.log('🔍 DEBUG: Profile file blob created:', { size: blob.size, type: blob.type });
      if (blob.size === 0) {
        throw new Error('Image file is empty (0 bytes)');
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(blob);
      const base64 = await base64Promise;
      console.log('🔍 DEBUG: Profile converted to base64, length:', base64.length);

      const { data, error } = await supabase.storage.from(bucket).upload(path, decode(base64), {
        upsert: true,
        contentType: blob.type || 'image/jpeg',
      });

      if (error) throw error;
      console.log('✅ DEBUG: Profile photo uploaded successfully:', data);
      return `${bucket}/${data.path}`;
    } catch (error) {
      console.error('❌ DEBUG: Profile photo upload failed:', error);
      throw error;
    }
  }
}


