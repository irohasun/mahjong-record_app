import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { User, Check, X } from 'lucide-react-native';
import { GroupInvitation } from '@/types/Groups';

interface GroupInvitationCardProps {
  invitation: GroupInvitation;
  onAccept: (invitation: GroupInvitation) => void;
  onReject: (invitation: GroupInvitation) => void;
}

export function GroupInvitationCard({
  invitation,
  onAccept,
  onReject,
}: GroupInvitationCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.avatarContainer}>
        {invitation.invitedBy.avatarUrl ? (
          <Image
            source={{ uri: invitation.invitedBy.avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <User size={20} color="#8E8E93" />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.groupName} numberOfLines={1}>
          {invitation.groupName}
        </Text>
        <Text style={styles.subText}>
          {invitation.invitedBy.username}から招待
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => onAccept(invitation)}
        >
          <Check size={16} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => onReject(invitation)}
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
  groupName: {
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
