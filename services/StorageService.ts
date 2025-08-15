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

  static getPublicUrl(storagePath: string): string | null {
    const [bucket, ...rest] = storagePath.split('/');
    const path = rest.join('/');
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  }
}


