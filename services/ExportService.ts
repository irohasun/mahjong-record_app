// 対局履歴のExcelエクスポート・共有サービス
import { Platform, Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { GameRecord } from '@/types/GameRecord';
import { buildDateSheets } from '@/utils/exportSheets';

function buildFileName(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `対局記録_${y}${m}${d}.xlsx`;
}

async function writeFile(fileName: string, base64: string): Promise<string> {
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return fileUri;
}

export class ExportService {
  static async exportGamesAsExcel(games: GameRecord[]): Promise<string> {
    const sheets = buildDateSheets(games);
    const workbook = XLSX.utils.book_new();
    if (sheets.length === 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['対局履歴がありません']]), 'データなし');
    } else {
      sheets.forEach(({ sheetName, rows }) => {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
      });
    }
    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    return writeFile(buildFileName(), base64);
  }

  static async shareExportedFile(fileUri: string): Promise<void> {
    if (Platform.OS === 'ios') {
      await Share.share({ url: fileUri });
    } else {
      await Sharing.shareAsync(fileUri);
    }
  }
}
