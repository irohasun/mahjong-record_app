import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';

interface MonthPickerModalProps {
  visible: boolean;
  selectedDate: Date;
  yearRange: { minYear: number; maxYear: number } | null;
  tempYear: number;
  tempMonth: number;
  onTempYearChange: (year: number) => void;
  onTempMonthChange: (month: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function MonthPickerModal({
  visible,
  selectedDate,
  yearRange,
  tempYear,
  tempMonth,
  onTempYearChange,
  onTempMonthChange,
  onConfirm,
  onClose,
}: MonthPickerModalProps) {
  const years: number[] = [];
  const min = yearRange?.minYear ?? selectedDate.getFullYear() - 10;
  const max = yearRange?.maxYear ?? selectedDate.getFullYear();
  for (let y = max; y >= min; y--) years.push(y);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 16, width: 300 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>年月を選択</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <ScrollView style={{ height: 220, width: 120 }}>
              {years.map((y) => (
                <TouchableOpacity key={y} style={{ paddingVertical: 10 }} onPress={() => onTempYearChange(y)}>
                  <Text style={{ fontSize: 16, color: tempYear === y ? '#FF6B35' : '#1C1C1E', fontWeight: tempYear === y ? '700' as const : '500' as const }}>{y}年</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView style={{ height: 220, width: 120 }}>
              {[...Array(12)].map((_, i) => i + 1).map((m) => (
                <TouchableOpacity key={m} style={{ paddingVertical: 10 }} onPress={() => onTempMonthChange(m)}>
                  <Text style={{ fontSize: 16, color: tempMonth === m ? '#FF6B35' : '#1C1C1E', fontWeight: tempMonth === m ? '700' as const : '500' as const }}>{m}月</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12 }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: '#6D6D70', fontWeight: '600' }}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm}>
              <Text style={{ color: '#FF6B35', fontWeight: '700' }}>決定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
