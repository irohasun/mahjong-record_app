import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Friend } from '@/types/Friends';
import { FriendCard } from './FriendCard';

interface FriendsListProps {
  friends: Friend[];
  maxDisplay?: number;
  onPress?: (friend: Friend) => void;
  onRemove?: (friend: Friend) => void;
  onShowAll?: () => void;
}

export function FriendsList({
  friends,
  maxDisplay = 3,
  onPress,
  onRemove,
  onShowAll,
}: FriendsListProps) {
  if (friends.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>フレンドがいません</Text>
        <Text style={styles.emptySubText}>
          「+」ボタンからフレンドを追加しましょう
        </Text>
      </View>
    );
  }

  const displayFriends = friends.slice(0, maxDisplay);
  const hasMore = friends.length > maxDisplay;

  return (
    <View>
      {displayFriends.map((friend) => (
        <FriendCard
          key={friend.id}
          friend={friend}
          onPress={onPress}
          onRemove={onRemove}
        />
      ))}
      {hasMore && onShowAll && (
        <TouchableOpacity style={styles.showAllButton} onPress={onShowAll}>
          <Text style={styles.showAllText}>
            すべて見る ({friends.length}人)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFF',
    borderRadius: 10,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptySubText: {
    fontSize: 12,
    color: '#AEAEB2',
    marginTop: 4,
  },
  showAllButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  showAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
});
