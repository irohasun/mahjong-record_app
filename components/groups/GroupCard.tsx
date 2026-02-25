import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Users } from 'lucide-react-native';
import { Group } from '@/types/Groups';

interface GroupCardProps {
  group: Group;
  onPress: (group: Group) => void;
}

export function GroupCard({ group, onPress }: GroupCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(group)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {group.avatarUrl ? (
          <Image source={{ uri: group.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Users size={20} color="#FF6B35" />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.groupName} numberOfLines={1}>
          {group.name}
        </Text>
        {group.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {group.description}
          </Text>
        ) : null}
      </View>
      <View style={styles.memberBadge}>
        <Users size={14} color="#8E8E93" />
        <Text style={styles.memberCount}>{group.memberCount}</Text>
      </View>
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
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  description: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  memberCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
});
