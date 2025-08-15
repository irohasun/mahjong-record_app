import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { X, Play } from 'lucide-react-native';
import { MonetizationService } from '@/services/MonetizationService';

interface AdModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const AdModal: React.FC<AdModalProps> = ({ visible, onClose, onComplete }) => {
  const [countdown, setCountdown] = useState(5);
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    if (visible) {
      setCountdown(5);
      setShowSkip(false);
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setShowSkip(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [visible]);

  const handleComplete = async () => {
    try {
      await MonetizationService.recordAdView();
      onComplete();
    } catch (error) {
      console.error('Failed to record ad view:', error);
      onComplete();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>広告</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <View style={styles.adContainer}>
            <View style={styles.playIcon}>
              <Play size={48} color="#FFF" />
            </View>
            <Text style={styles.adTitle}>広告を視聴中...</Text>
            <Text style={styles.adDescription}>
              しばらくお待ちください
            </Text>
            
            {!showSkip && (
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          {showSkip ? (
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleComplete}
            >
              <Text style={styles.skipButtonText}>スキップ</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>
                {countdown}秒後にスキップできます
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  closeButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  adContainer: {
    alignItems: 'center',
  },
  playIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  adTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  adDescription: {
    fontSize: 16,
    color: '#CCC',
    textAlign: 'center',
    marginBottom: 40,
  },
  countdownContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  skipButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  waitingText: {
    color: '#CCC',
    fontSize: 16,
    fontWeight: '500',
  },
});