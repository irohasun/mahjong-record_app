import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { User, Check, X } from 'lucide-react-native';
import { FriendRequest } from '@/types/Friends';

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: (request: FriendRequest) => void;
  onReject: (request: FriendRequest) => void;
}

export function FriendRequestCard({
  request,
  onAccept,
  onReject,
}: FriendRequestCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.avatarContainer}>
        {request.fromUser.avatarUrl ? (
          <Image
            source={{ uri: request.fromUser.avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <User size={20} color="#8E8E93" />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.username} numberOfLines={1}>
          {request.fromUser.username}
        </Text>
        <Text style={styles.subText}>フレンドリクエスト</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => onAccept(request)}
        >
          <Check size={16} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => onReject(request)}
        >
          <X size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
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
  subText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
