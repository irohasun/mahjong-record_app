import { AuthService } from '@/services/AuthService';

export const ensureAuthenticated = async () => {
  let user = await AuthService.getCurrentUser();
  if (!user) {
    try {
      const anon = await AuthService.signInAnonymously();
      user = (anon as any)?.user ?? null;
    } catch {
      // 無視して続行
    }
  }
  return user;
}; 