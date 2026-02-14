import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';

interface YearPickerModalProps {
  visible: boolean;
  selectedDate: Date;
  yearRange: { minYear: number; maxYear: number } | null;
  onSelectYear: (year: number) => void;
  onClose: () => void;
}

export function YearPickerModal({
  visible,
  selectedDate,
  yearRange,
  onSelectYear,
  onClose,
}: YearPickerModalProps) {
  const years: number[] = [];
  const min = yearRange?.minYear ?? selectedDate.getFullYear() - 10;
  const max = yearRange?.maxYear ?? selectedDate.getFullYear();
  for (let y = max; y >= min; y--) years.push(y);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 16, width: 280, maxHeight: 360 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>年を選択</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {years.map((y) => (
              <TouchableOpacity key={y} style={{ paddingVertical: 10 }} onPress={() => onSelectYear(y)}>
                <Text style={{ fontSize: 16, color: '#1C1C1E' }}>{y}年</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 8 }} onPress={onClose}>
            <Text style={{ color: '#FF6B35', fontWeight: '600' }}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
