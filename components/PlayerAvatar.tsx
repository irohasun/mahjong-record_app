import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface PlayerAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase() || '?';
}

export default function PlayerAvatar({ name, avatarUrl, size = 32 }: PlayerAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!avatarUrl && !imgError;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setImgError(true)}
        />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>
          {getInitial(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  image: {
    resizeMode: 'cover',
  },
  initial: {
    color: '#6B7280',
    fontWeight: '700',
  },
});
