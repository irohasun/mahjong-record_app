# メール認証とパスワードリセット機能のセットアップ

## 概要

このアプリケーションでは、セキュリティを強化するため、以下の機能が実装されています：

1. **メール認証（Email Verification）**
   - 新規ユーザー登録時に確認メールが送信されます
   - メール内のリンクをクリックしてアカウントを有効化する必要があります
   - メール未確認のユーザーはログインできません

2. **パスワードリセット（Password Reset）**
   - パスワードを忘れた場合、メールアドレスを入力してリセットリンクを受け取れます
   - メール内のリンクから新しいパスワードを設定できます

## ローカル開発環境での設定

### 1. Supabase設定

`supabase/config.toml`で以下の設定が有効になっています：

```toml
[auth.email]
enable_signup = true
enable_confirmations = true  # メール認証を有効化
```

### 2. メールテストサーバー（Inbucket）

ローカル開発環境では、実際にメールを送信する代わりに、Inbucketというメールテストサーバーを使用します。

#### アクセス方法

```
http://localhost:54324
```

ブラウザで上記URLにアクセスすると、送信されたメールを確認できます。

#### 使い方

1. アプリで新規ユーザー登録またはパスワードリセットを実行
2. Inbucket（http://localhost:54324）にアクセス
3. 送信されたメールを確認
4. メール内のリンクをクリック（または手動でコピー）

### 3. メール確認の流れ

#### 新規登録時

1. ユーザーがメールアドレスとパスワードを入力して登録
2. Supabaseが確認メールを送信（Inbucketに届く）
3. ユーザーがメール内の確認リンクをクリック
4. アカウントが有効化される
5. ログイン可能になる

#### ログイン時（メール未確認の場合）

1. ユーザーがログインを試みる
2. メール未確認エラーが表示される
3. 「確認メールを再送信」オプションが提示される
4. 再送信ボタンをクリックすると、新しい確認メールが送信される

### 4. パスワードリセットの流れ

1. ログイン画面で「パスワードを忘れた方」をクリック
2. メールアドレスを入力
3. リセットメールが送信される（Inbucketに届く）
4. メール内のリンクをクリック
5. 新しいパスワードを設定

## 本番環境での設定

### 1. Supabase Dashboardでの設定

1. [Supabase Dashboard](https://app.supabase.com)にアクセス
2. プロジェクトを選択
3. **Authentication** → **Settings** に移動
4. **Email Auth** セクションで以下を設定：
   - ✅ Enable email confirmations
   - ✅ Confirm email（デフォルトで有効）

### 2. メール送信設定（SMTP）

本番環境では、実際のメールを送信するためにSMTPサーバーの設定が必要です。

#### 推奨サービス

- **SendGrid**（無料枠あり）
- **AWS SES**
- **Mailgun**
- **Postmark**

#### Supabase Dashboardでの設定

1. **Project Settings** → **Auth** → **Email Templates**
2. **SMTP Settings**で以下を設定：
   ```
   Sender email: noreply@yourdomain.com
   Sender name: Your App Name
   
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey
   SMTP Password: [Your SendGrid API Key]
   ```

### 3. メールテンプレートのカスタマイズ

Supabase Dashboardで以下のテンプレートをカスタマイズできます：

- **Confirm signup**: アカウント確認メール
- **Reset password**: パスワードリセットメール
- **Magic link**: マジックリンクメール
- **Email change**: メールアドレス変更確認メール

#### テンプレート変数

メールテンプレートで使用できる変数：

```html
{{ .ConfirmationURL }}  <!-- 確認URL -->
{{ .Token }}            <!-- 確認トークン -->
{{ .TokenHash }}        <!-- トークンハッシュ -->
{{ .SiteURL }}          <!-- サイトURL -->
{{ .Email }}            <!-- ユーザーのメールアドレス -->
```

### 4. リダイレクトURL設定

アプリへのディープリンクを設定する場合：

1. **Authentication** → **URL Configuration** に移動
2. **Redirect URLs**に以下を追加：
   ```
   exp://localhost:8081/auth/callback
   myapp://auth/callback
   ```

## トラブルシューティング

### メールが届かない

#### ローカル環境

1. Inbucket（http://localhost:54324）が起動しているか確認
2. Supabaseローカルサーバーが起動しているか確認
   ```bash
   supabase status
   ```

#### 本番環境

1. SMTP設定が正しいか確認
2. 送信元メールアドレスが認証されているか確認
3. SPF/DKIM設定が正しいか確認
4. 迷惑メールフォルダを確認

### ログインできない

1. メール確認が完了しているか確認
2. 正しいパスワードを入力しているか確認
3. アカウントが有効になっているか確認

### 確認メールの再送信

アプリのログイン画面で、メール未確認エラーが表示された場合、「確認メールを再送信」ボタンが表示されます。

## コード実装の詳細

### AuthService

主要なメソッド：

```typescript
// ユーザー登録（メール確認メールが送信される）
AuthService.signUp(email, password)

// ログイン（メール未確認の場合はエラー）
AuthService.signIn(email, password)

// 確認メール再送信
AuthService.resendVerificationEmail(email)

// パスワードリセットメール送信
AuthService.resetPassword(email)

// メール確認状態チェック
AuthService.isEmailVerified()
```

### エラーハンドリング

メール未確認エラーは特別なコードで識別されます：

```typescript
try {
  await AuthService.signIn(email, password);
} catch (error) {
  if (error.code === 'EMAIL_NOT_VERIFIED') {
    // メール未確認エラーの処理
    // 確認メール再送信オプションを表示
  }
}
```

## セキュリティのベストプラクティス

1. **メール確認を必須にする**
   - ボットや偽アカウントの登録を防ぐ
   - 有効なメールアドレスを持つユーザーのみ登録

2. **パスワードリセットリンクの有効期限**
   - デフォルト: 1時間
   - リンクは1回のみ使用可能

3. **レート制限**
   - メール送信は1秒に1回まで（デフォルト）
   - DDoS攻撃や悪用を防ぐ

4. **HTTPS必須**
   - 本番環境では必ずHTTPSを使用
   - メールリンクもHTTPSで生成

## 参考リンク

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)

