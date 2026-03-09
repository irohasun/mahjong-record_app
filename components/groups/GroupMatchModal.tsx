import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { X, Check, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GroupMember } from '@/types/Groups';
import { StorageService } from '@/services/StorageService';

interface GroupMatchModalProps {
  visible: boolean;
  onClose: () => void;
  members: GroupMember[];
  currentUserId: string;
  groupId: string;
  groupName: string;
}

export function GroupMatchModal({
  visible,
  onClose,
  members,
  currentUserId,
  groupId,
  groupName,
}: GroupMatchModalProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set([currentUserId]));
  const [playerCount, setPlayerCount] = useState<3 | 4>(members.length === 3 ? 3 : 4);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string | null>>({});
  const [resolvingUrls, setResolvingUrls] = useState(false);

  // モーダルが開くたびに初期化
  useEffect(() => {
    if (visible) {
      const defaultCount = members.length === 3 ? 3 : 4;
      setPlayerCount(defaultCount);
      setSelectedIds(new Set([currentUserId]));
      resolveAvatarUrls();
    }
  }, [visible, currentUserId, members]);

  const resolveAvatarUrls = useCallback(async () => {
    const membersWithUrl = members.filter((m) => m.avatarUrl);
    if (membersWithUrl.length === 0) return;

    setResolvingUrls(true);
    try {
      const entries = await Promise.all(
        membersWithUrl.map(async (m) => {
          const url = await StorageService.getPublicUrl(m.avatarUrl!);
          return [m.memberId, url] as [string, string | null];
        })
      );
      setResolvedUrls(Object.fromEntries(entries));
    } catch {
      // URL解決失敗時はアバターなし
    } finally {
      setResolvingUrls(false);
    }
  }, [members]);

  const handleToggleMember = useCallback(
    (memberId: string) => {
      if (memberId === currentUserId) return; // 自分は解除不可

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(memberId)) {
          next.delete(memberId);
        } else {
          if (next.size < playerCount) {
            next.add(memberId);
          }
        }
        return next;
      });
    },
    [currentUserId, playerCount]
  );

  const handlePlayerCountChange = useCallback(
    (count: 3 | 4) => {
      setPlayerCount(count);
      // 選択数が超過する場合、自分以外を末尾から削除
      setSelectedIds((prev) => {
        if (prev.size <= count) return prev;
        const next = new Set<string>();
        next.add(currentUserId);
        for (const id of prev) {
          if (id === currentUserId) continue;
          if (next.size >= count) break;
          next.add(id);
        }
        return next;
      });
    },
    [currentUserId]
  );

  const handleStartMatch = useCallback(() => {
    const selectedMembers = members.filter((m) => selectedIds.has(m.memberId));
    // 自分を先頭に並び替え
    const sorted = [
      ...selectedMembers.filter((m) => m.memberId === currentUserId),
      ...selectedMembers.filter((m) => m.memberId !== currentUserId),
    ];

    const playersParam = JSON.stringify(
      sorted.map((m) => ({
        name: m.username,
        avatarUrl: resolvedUrls[m.memberId] ?? null,
      }))
    );

    onClose();
    router.push({
      pathname: '/(tabs)/add-game',
      params: {
        groupMatchPlayers: playersParam,
        groupMatchPlayerCount: String(playerCount),
        groupMatchGroupId: groupId,
        groupMatchGroupName: groupName,
      },
    });
  }, [members, selectedIds, currentUserId, resolvedUrls, playerCount, onClose, router]);

  const isStartEnabled = selectedIds.size === playerCount;
  const canChangeTo3 = members.length >= 3;
  const canChangeTo4 = members.length >= 4;

  const renderMember = useCallback(
    ({ item }: { item: GroupMember }) => {
      const isSelected = selectedIds.has(item.memberId);
      const isSelf = item.memberId === currentUserId;
      const avatarUrl = resolvedUrls[item.memberId];
      const isSelectable = isSelected || selectedIds.size < playerCount;

      return (
        <TouchableOpacity
          style={[styles.memberRow, isSelected && styles.memberRowSelected]}
          onPress={() => handleToggleMember(item.memberId)}
          disabled={isSelf || (!isSelected && !isSelectable)}
          activeOpacity={0.7}
        >
          <View style={styles.memberInfo}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={16} color="#8E8E93" />
              </View>
            )}
            <View>
              <Text style={styles.memberName}>{item.username}</Text>
              {isSelf && <Text style={styles.selfLabel}>自分</Text>}
            </View>
          </View>
          <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
            {isSelected && <Check size={14} color="#FFF" strokeWidth={3} />}
          </View>
        </TouchableOpacity>
      );
    },
    [selectedIds, currentUserId, resolvedUrls, playerCount, handleToggleMember]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>対戦メンバー選択</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        {/* 人数切り替え */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              styles.segmentLeft,
              playerCount === 4 && styles.segmentActive,
              !canChangeTo4 && styles.segmentDisabled,
            ]}
            onPress={() => canChangeTo4 && handlePlayerCountChange(4)}
            disabled={!canChangeTo4}
          >
            <Text style={[styles.segmentText, playerCount === 4 && styles.segmentTextActive]}>
              4人麻雀
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              styles.segmentRight,
              playerCount === 3 && styles.segmentActive,
              !canChangeTo3 && styles.segmentDisabled,
            ]}
            onPress={() => canChangeTo3 && handlePlayerCountChange(3)}
            disabled={!canChangeTo3}
          >
            <Text style={[styles.segmentText, playerCount === 3 && styles.segmentTextActive]}>
              3人麻雀
            </Text>
          </TouchableOpacity>
        </View>

        {/* 選択状況 */}
        <Text style={styles.selectionStatus}>
          {selectedIds.size} / {playerCount} 人を選択中
        </Text>

        {/* メンバーリスト */}
        {resolvingUrls ? (
          <ActivityIndicator style={styles.loader} color="#FF6B35" />
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.memberId}
            renderItem={renderMember}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* 開始ボタン */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.startButton, !isStartEnabled && styles.startButtonDisabled]}
            onPress={handleStartMatch}
            disabled={!isStartEnabled}
          >
            <Text style={[styles.startButtonText, !isStartEnabled && styles.startButtonTextDisabled]}>
              グループ対戦開始
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
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
    padding: 4,
  },
  segmentContainer: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  segmentLeft: {
    borderRightWidth: 0.5,
    borderRightColor: '#FF6B35',
  },
  segmentRight: {
    borderLeftWidth: 0.5,
    borderLeftColor: '#FF6B35',
  },
  segmentActive: {
    backgroundColor: '#FF6B35',
  },
  segmentDisabled: {
    opacity: 0.4,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  segmentTextActive: {
    color: '#FFF',
  },
  selectionStatus: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
  },
  loader: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberRowSelected: {
    backgroundColor: '#FFF5F0',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  selfLabel: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  startButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  startButtonTextDisabled: {
    color: '#8E8E93',
  },
});
