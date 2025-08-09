import { supabase } from '@/lib/supabase';

export class StorageService {
  static async uploadGamePhoto(accountId: string, gameId: string, uri: string): Promise<string> {
    const bucket = 'game-photos';
    const ext = uri.split('?')[0].split('#')[0].split('.').pop() || 'jpg';
    const path = `games/${accountId}/${gameId}.${ext}`;

    // Fetch file data
    const res = await fetch(uri);
    const blob = await res.blob();

    // Ensure bucket exists (ignore errors if already exists)
    await supabase.storage.createBucket(bucket, { public: true }).catch(() => {});

    // Upload (upsert)
    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      upsert: true,
      contentType: blob.type || 'image/jpeg',
    });
    if (error) throw error;
    return `${bucket}/${path}`; // return storage path
  }

  static getPublicUrl(storagePath: string): string | null {
    const [bucket, ...rest] = storagePath.split('/');
    const path = rest.join('/');
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  }
}


