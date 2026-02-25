import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { X, Search, User, UserPlus } from 'lucide-react-native';
import { FriendService } from '@/services/FriendService';

interface FriendSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestSent: () => void;
}

interface SearchResult {
  id: string;
  username: string;
  avatarUrl?: string;
}

export function FriendSearchModal({
  visible,
  onClose,
  onRequestSent,
}: FriendSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await FriendService.searchUsers(query.trim());
      setResults(data);
    } catch (error) {
      Alert.alert('エラー', '検索に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleSendRequest = useCallback(
    async (userId: string) => {
      try {
        await FriendService.sendFriendRequest(userId);
        setSentIds((prev) => new Set([...prev, userId]));
        onRequestSent();
        Alert.alert('送信完了', 'フレンドリクエストを送信しました');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'リクエストの送信に失敗しました';
        Alert.alert('エラー', message);
      }
    },
    [onRequestSent]
  );

  const handleClose = useCallback(() => {
    setQuery('');
    setResults([]);
    setSentIds(new Set());
    onClose();
  }, [onClose]);

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => {
      const isSent = sentIds.has(item.id);
      return (
        <View style={styles.resultItem}>
          <View style={styles.resultLeft}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={18} color="#8E8E93" />
              </View>
            )}
            <Text style={styles.resultUsername} numberOfLines={1}>
              {item.username}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.sendButton, isSent && styles.sentButton]}
            onPress={() => handleSendRequest(item.id)}
            disabled={isSent}
          >
            {isSent ? (
              <Text style={styles.sentText}>送信済み</Text>
            ) : (
              <>
                <UserPlus size={16} color="#FFF" />
                <Text style={styles.sendText}>追加</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [sentIds, handleSendRequest]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>フレンド検索</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search size={18} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="ユーザー名で検索"
              placeholderTextColor="#AEAEB2"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>検索</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loading} size="large" color="#FF6B35" />
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.resultsList}
          />
        ) : query.trim() ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ユーザーが見つかりません</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ユーザー名を入力して検索してください</Text>
          </View>
        )}
      </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  searchButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  loading: {
    marginTop: 40,
  },
  resultsList: {
    padding: 16,
    paddingTop: 0,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  resultUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  sentButton: {
    backgroundColor: '#E5E5EA',
  },
  sendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  sentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
  },
});
