import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, SafeAreaView, ScrollView, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { AccountService } from '@/services/AccountService';
import { StorageService } from '@/services/StorageService';
import { ensureAuthenticated } from '@/utils/authUtils';

export default function ProfileEditScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const account = await AccountService.getAccount();
        setUsername(account.username || '');
        if ((account as any).avatar_url) {
          const url = StorageService.getPublicUrl((account as any).avatar_url);
          if (url) setAvatarUri(url);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限が必要', '写真へのアクセス権限が必要です');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  const save = async () => {
    if (!username.trim()) {
      Alert.alert('エラー', '名前を入力してください');
      return;
    }
    setSaving(true);
    try {
      const user = await ensureAuthenticated();
      // 名前を更新
      await AccountService.updateUsername(username.trim());

      // 画像がローカルURIならアップロード
      let avatarPath: string | undefined;
      if (avatarUri && avatarUri.startsWith('file')) {
        avatarPath = await StorageService.uploadProfilePhoto(user.id, avatarUri);
        // accounts.avatar_url を更新
        await (async () => {
          const { data: { user: u } } = await (await import('@/lib/supabase')).supabase.auth.getUser();
          if (!u || u.id === 'dummy-user-id') return;
          const { supabase } = await import('@/lib/supabase');
          await supabase.from('accounts').update({ avatar_url: avatarPath }).eq('id', u.id);
        })();
      }

      Alert.alert('保存完了', 'プロフィールを更新しました', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', 'プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>プロフィール編集</Text>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickAvatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
          </TouchableOpacity>
          <Text style={styles.hint}>画像をタップして変更</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>名前</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="あなたの名前"
            style={styles.input}
            maxLength={20}
          />
        </View>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={save}>
          <Text style={styles.saveText}>保存</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F2F2F7',
  },
  avatarPlaceholder: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  hint: {
    color: '#6D6D70',
    marginTop: 8,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#6D6D70',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});


