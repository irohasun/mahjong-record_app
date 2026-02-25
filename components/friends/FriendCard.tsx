import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { User } from 'lucide-react-native';
import { Friend } from '@/types/Friends';

interface FriendCardProps {
  friend: Friend;
  onPress?: (friend: Friend) => void;
  onRemove?: (friend: Friend) => void;
}

export function FriendCard({ friend, onPress, onRemove }: FriendCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(friend)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {friend.avatarUrl ? (
          <Image source={{ uri: friend.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <User size={20} color="#8E8E93" />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.username} numberOfLines={1}>
          {friend.username}
        </Text>
        <Text style={styles.statusText}>
          {friend.status === 'accepted' ? '友達' : '承認待ち'}
        </Text>
      </View>
      {friend.status === 'accepted' && onRemove && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(friend)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.removeText}>削除</Text>
        </TouchableOpacity>
      )}
      {friend.status === 'pending' && (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>承認待ち</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  avatarContainer: {
    marginRight: 12,
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
  info: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFF5F5',
  },
  removeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF8F0',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
  },
});
