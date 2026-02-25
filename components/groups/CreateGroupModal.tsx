import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { GroupService } from '@/services/GroupService';

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateGroupModal({
  visible,
  onClose,
  onCreated,
}: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('エラー', 'グループ名を入力してください');
      return;
    }

    setLoading(true);
    try {
      await GroupService.createGroup(name.trim(), description.trim() || undefined, isPublic);
      onCreated();
      handleClose();
      Alert.alert('作成完了', 'グループを作成しました');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'グループの作成に失敗しました';
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  }, [name, description, isPublic, onCreated]);

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
    setIsPublic(false);
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>グループ作成</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>グループ名 *</Text>
            <TextInput
              style={styles.input}
              placeholder="グループ名を入力"
              placeholderTextColor="#AEAEB2"
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>説明</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="グループの説明を入力（任意）"
              placeholderTextColor="#AEAEB2"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>公開グループ</Text>
              <Text style={styles.switchDescription}>
                公開するとグループ検索で見つけられるようになります
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#E5E5EA', true: '#FF6B35' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createButton, !name.trim() && styles.disabledButton]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.createButtonText}>グループを作成</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  form: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
  },
  switchDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
    maxWidth: 240,
  },
  footer: {
    padding: 16,
    marginTop: 'auto',
  },
  createButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
});
