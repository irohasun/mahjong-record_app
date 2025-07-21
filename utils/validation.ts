import { ValidationError } from '@/types/auth';

export class ValidationUtils {
  static validateEmail(email: string): ValidationError | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email.trim()) {
      return { field: 'email', message: 'メールアドレスを入力してください' };
    }
    
    if (!emailRegex.test(email)) {
      return { field: 'email', message: '有効なメールアドレスを入力してください' };
    }
    
    return null;
  }

  static validatePassword(password: string): ValidationError | null {
    if (!password) {
      return { field: 'password', message: 'パスワードを入力してください' };
    }
    
    if (password.length < 8) {
      return { field: 'password', message: 'パスワードは8文字以上で入力してください' };
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { 
        field: 'password', 
        message: 'パスワードには大文字、小文字、数字を含めてください' 
      };
    }
    
    return null;
  }

  static validateUsername(username: string): ValidationError | null {
    if (!username.trim()) {
      return { field: 'username', message: 'ユーザー名を入力してください' };
    }
    
    if (username.length < 2) {
      return { field: 'username', message: 'ユーザー名は2文字以上で入力してください' };
    }
    
    if (username.length > 30) {
      return { field: 'username', message: 'ユーザー名は30文字以下で入力してください' };
    }
    
    if (!/^[a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(username)) {
      return { 
        field: 'username', 
        message: 'ユーザー名には英数字、ひらがな、カタカナ、漢字、アンダースコアのみ使用できます' 
      };
    }
    
    return null;
  }

  static validatePasswordConfirmation(password: string, confirmPassword: string): ValidationError | null {
    if (password !== confirmPassword) {
      return { field: 'confirmPassword', message: 'パスワードが一致しません' };
    }
    
    return null;
  }

  static validateSignUpData(data: {
    email: string;
    password: string;
    confirmPassword: string;
    username: string;
  }): ValidationError[] {
    const errors: ValidationError[] = [];

    const emailError = this.validateEmail(data.email);
    if (emailError) errors.push(emailError);

    const passwordError = this.validatePassword(data.password);
    if (passwordError) errors.push(passwordError);

    const passwordConfirmError = this.validatePasswordConfirmation(data.password, data.confirmPassword);
    if (passwordConfirmError) errors.push(passwordConfirmError);

    const usernameError = this.validateUsername(data.username);
    if (usernameError) errors.push(usernameError);

    return errors;
  }

  static validatePhone(phone: string): ValidationError | null {
    if (!phone.trim()) {
      return null; // Phone is optional
    }
    
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return { field: 'phone', message: '有効な電話番号を入力してください' };
    }
    
    return null;
  }

  static validateDateOfBirth(date: string): ValidationError | null {
    if (!date) {
      return null; // Optional field
    }
    
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 13) {
      return { field: 'date_of_birth', message: '13歳以上である必要があります' };
    }
    
    if (age > 120) {
      return { field: 'date_of_birth', message: '有効な生年月日を入力してください' };
    }
    
    return null;
  }
}

export class SecurityUtils {
  static sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  static generateSecureToken(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return result;
  }

  static isStrongPassword(password: string): boolean {
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;
    
    return hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChar && isLongEnough;
  }

  static checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('8文字以上にしてください');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('小文字を含めてください');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('大文字を含めてください');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('数字を含めてください');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('特殊文字を含めてください');
    }

    return { score, feedback };
  }
}