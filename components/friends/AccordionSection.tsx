import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ChevronDown, Plus } from 'lucide-react-native';

interface AccordionSectionProps {
  title: string;
  count?: number;
  onAdd?: () => void;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function AccordionSection({
  title,
  count,
  onAdd,
  defaultExpanded = true,
  children,
}: AccordionSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotation = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggle = useCallback(() => {
    Animated.timing(rotation, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setExpanded((prev) => !prev);
  }, [expanded, rotation]);

  const rotateInterpolation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {count !== undefined && (
            <Text style={styles.count}>{count}</Text>
          )}
        </View>
        <View style={styles.actions}>
          {onAdd && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <Animated.View style={{ transform: [{ rotate: rotateInterpolation }] }}>
            <ChevronDown size={20} color="#8E8E93" />
          </Animated.View>
        </View>
      </TouchableOpacity>
      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginTop: 8,
  },
});
