import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FriendRequest } from '@/types/Friends';
import { GroupInvitation } from '@/types/Groups';
import { FriendRequestCard } from './FriendRequestCard';
import { GroupInvitationCard } from '@/components/groups/GroupInvitationCard';

interface RequestsContainerProps {
  friendRequests: FriendRequest[];
  groupInvitations: GroupInvitation[];
  onAcceptFriend: (request: FriendRequest) => void;
  onRejectFriend: (request: FriendRequest) => void;
  onAcceptInvitation: (invitation: GroupInvitation) => void;
  onRejectInvitation: (invitation: GroupInvitation) => void;
}

export function RequestsContainer({
  friendRequests,
  groupInvitations,
  onAcceptFriend,
  onRejectFriend,
  onAcceptInvitation,
  onRejectInvitation,
}: RequestsContainerProps) {
  const totalCount = friendRequests.length + groupInvitations.length;

  if (totalCount === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>リクエスト</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalCount}</Text>
        </View>
      </View>

      {friendRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>フレンドリクエスト</Text>
          {friendRequests.map((request) => (
            <FriendRequestCard
              key={request.id}
              request={request}
              onAccept={onAcceptFriend}
              onReject={onRejectFriend}
            />
          ))}
        </View>
      )}

      {groupInvitations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>シリーズへの招待</Text>
          {groupInvitations.map((invitation) => (
            <GroupInvitationCard
              key={invitation.id}
              invitation={invitation}
              onAccept={onAcceptInvitation}
              onReject={onRejectInvitation}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 10,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  badge: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  section: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 6,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
