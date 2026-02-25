import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Group } from '@/types/Groups';
import { GroupCard } from './GroupCard';

interface GroupsListProps {
  groups: Group[];
  maxDisplay?: number;
  onPress: (group: Group) => void;
  onShowAll?: () => void;
}

export function GroupsList({
  groups,
  maxDisplay = 3,
  onPress,
  onShowAll,
}: GroupsListProps) {
  if (groups.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>参加中のグループがありません</Text>
        <Text style={styles.emptySubText}>
          「+」ボタンからグループを作成しましょう
        </Text>
      </View>
    );
  }

  const displayGroups = groups.slice(0, maxDisplay);
  const hasMore = groups.length > maxDisplay;

  return (
    <View>
      {displayGroups.map((group) => (
        <GroupCard key={group.id} group={group} onPress={onPress} />
      ))}
      {hasMore && onShowAll && (
        <TouchableOpacity style={styles.showAllButton} onPress={onShowAll}>
          <Text style={styles.showAllText}>
            すべて見る ({groups.length}グループ)
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
