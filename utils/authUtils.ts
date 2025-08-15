import { AuthService } from '@/services/AuthService';

export const ensureAuthenticated = async () => {
  let user = await AuthService.getCurrentUser();
  
  // ユーザーが認証されていない場合は匿名認証を行う
  if (!user) {
    const authResult = await AuthService.signInAnonymously();
    
    if (authResult?.user) {
      user = authResult.user;
    } else {
      // 認証結果でユーザーが取得できない場合は現在のユーザーを再取得
      user = await AuthService.getCurrentUser();
    }
  }
  
  return user;
}; 