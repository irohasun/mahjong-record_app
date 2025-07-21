import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { X, Star, Check, Zap } from 'lucide-react-native';
import { MonetizationService } from '@/services/MonetizationService';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchase: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ visible, onClose, onPurchase }) => {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const success = await MonetizationService.purchasePremium();
      if (success) {
        Alert.alert('購入完了', 'プレミアムプランにアップグレードしました！', [
          { text: 'OK', onPress: onPurchase }
        ]);
      } else {
        Alert.alert('エラー', '購入に失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', '購入処理でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const success = await MonetizationService.restorePurchase();
      if (success) {
        Alert.alert('復元完了', '購入を復元しました', [
          { text: 'OK', onPress: onPurchase }
        ]);
      } else {
        Alert.alert('情報', '復元する購入が見つかりませんでした');
      }
    } catch (error) {
      Alert.alert('エラー', '復元処理でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap, title: '無制限の対局記録', description: '月間制限なしで対局を記録' },
    { icon: X, title: '広告なし', description: '広告表示が一切ありません' },
    { icon: Star, title: '高度な統計分析', description: '詳細な成績分析とグラフ表示' },
    { icon: Check, title: 'データエクスポート', description: 'CSV/JSONでのデータ出力' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>プレミアムプラン</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.starContainer}>
              <Star size={48} color="#FFD700" />
            </View>
            <Text style={styles.heroTitle}>プレミアムにアップグレード</Text>
            <Text style={styles.heroDescription}>
              すべての機能を使って、麻雀の成績をより詳しく分析しましょう
            </Text>
          </View>

          <View style={styles.pricing}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>¥500</Text>
              <Text style={styles.priceDescription}>買い切り</Text>
            </View>
            <Text style={styles.priceNote}>一度の購入で永続的にご利用いただけます</Text>
          </View>

          <View style={styles.features}>
            <Text style={styles.featuresTitle}>プレミアム機能</Text>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <feature.icon size={20} color="#FF6B35" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.comparison}>
            <Text style={styles.comparisonTitle}>プラン比較</Text>
            <View style={styles.comparisonTable}>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonFeature}>月間対局数</Text>
                <Text style={styles.comparisonFree}>3対局</Text>
                <Text style={styles.comparisonPremium}>無制限</Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonFeature}>広告表示</Text>
                <Text style={styles.comparisonFree}>あり</Text>
                <Text style={styles.comparisonPremium}>なし</Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonFeature}>統計分析</Text>
                <Text style={styles.comparisonFree}>基本</Text>
                <Text style={styles.comparisonPremium}>高度</Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonFeature}>データエクスポート</Text>
                <Text style={styles.comparisonFree}>×</Text>
                <Text style={styles.comparisonPremium}>○</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.purchaseButton}
            onPress={handlePurchase}
            disabled={loading}
          >
            <Text style={styles.purchaseButtonText}>
              {loading ? '処理中...' : '¥500で購入'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={loading}
          >
            <Text style={styles.restoreButtonText}>購入を復元</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  hero: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  starContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD70020',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 16,
    color: '#6D6D70',
    textAlign: 'center',
    lineHeight: 24,
  },
  pricing: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 30,
    marginTop: 20,
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FF6B35',
    marginRight: 8,
  },
  priceDescription: {
    fontSize: 16,
    color: '#6D6D70',
    fontWeight: '500',
  },
  priceNote: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  features: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 30,
    marginTop: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B3520',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6D6D70',
  },
  comparison: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 30,
    marginTop: 20,
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  comparisonTable: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  comparisonRow: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    padding: 16,
  },
  comparisonFeature: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  comparisonFree: {
    width: 60,
    fontSize: 14,
    color: '#6D6D70',
    textAlign: 'center',
  },
  comparisonPremium: {
    width: 60,
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  purchaseButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
});