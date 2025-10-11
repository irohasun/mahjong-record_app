import { Audio, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native'; // Platform を利用するためのインポートを追加
import { Platform } from 'react-native';

// Expo Go対応の簡易ボイスサービス
// - 端末で音声を録音し、ファイルURIを返す
// - アップロードは呼び出し元で実装（サーバAPIへPOSTなど）
// - DevClient/本番でネイティブ音声認識へ切替える場合は、このサービスを分岐で差し替える
export type RecordingResult = {
  uri: string;
  durationMs?: number;
  mimeType?: string; // 送信先API都合で付与したい場合
};

export class VoiceService {
  private recording: Audio.Recording | null = null;

  async prepareAsync(): Promise<void> {
    // マイク権限と録音カテゴリを設定
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Microphone permission not granted');
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });
  }

  async startAsync(): Promise<void> {
    if (this.recording) return;
    await this.prepareAsync();

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    this.recording = recording;
  }

  async stopAsync(): Promise<RecordingResult> {
    if (!this.recording) throw new Error('Recording has not started');

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      const status = (await this.recording.getStatusAsync()) as AVPlaybackStatus & {
        durationMillis?: number;
      };

      this.recording = null;

      if (!uri) throw new Error('Failed to obtain recording URI');

      return {
        uri,
        durationMs: 'durationMillis' in status ? status.durationMillis : undefined,
        mimeType: Platform.select({ ios: 'audio/m4a', android: 'audio/3gp', default: 'audio/m4a' }) || 'audio/m4a',
      };
    } finally {
      this.recording = null;
    }
  }

  isRecording(): boolean {
    return this.recording != null;
  }
}
