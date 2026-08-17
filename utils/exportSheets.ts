// 対局履歴エクスポート用: 日付ごとのExcelシート構築
import { GameRecord } from '@/types/GameRecord';
import { parseRawScores, computeSessionTotals } from '@/utils/exportRows';

export interface DateSheet {
  sheetName: string;
  rows: (string | number)[][];
}

function groupGamesByDate(games: GameRecord[]): Map<string, GameRecord[]> {
  const groups = new Map<string, GameRecord[]>();
  games.forEach((game) => {
    const dateKey = game.date.slice(0, 10);
    const group = groups.get(dateKey);
    if (group) {
      group.push(game);
    } else {
      groups.set(dateKey, [game]);
    }
  });
  return groups;
}

function buildSessionRows(game: GameRecord, sessionIndex: number, sessionCount: number): (string | number)[][] {
  const playerCount = game.players.length;
  const playerNames = game.players.map((p) => p.name);
  const rounds = game.rounds ?? [];
  const { hanchanOnlyTotal, chipCounts, totalWithChips } = computeSessionTotals(game);

  const rows: (string | number)[][] = [];

  if (sessionCount > 1) {
    rows.push([`対局${sessionIndex + 1}`]);
  }

  rows.push(['', ...playerNames]);

  rounds.forEach((round, hanchanIndex) => {
    const rawScores = parseRawScores(round.memo, playerCount);
    rows.push([`半荘${hanchanIndex + 1} 素点`, ...rawScores.map((s) => s ?? '')]);
    rows.push([`半荘${hanchanIndex + 1} 精算`, ...round.points]);
  });

  rows.push(['半荘計', ...hanchanOnlyTotal]);
  rows.push(['チップ数', ...chipCounts]);
  rows.push(['合計点(チップ込み)', ...totalWithChips]);

  return rows;
}

export function buildDateSheets(games: GameRecord[]): DateSheet[] {
  const groups = groupGamesByDate(games);
  const sortedDates = Array.from(groups.keys()).sort();

  return sortedDates.map((dateKey) => {
    const sessions = groups.get(dateKey)!;
    const rows: (string | number)[][] = [];

    sessions.forEach((game, sessionIndex) => {
      if (sessionIndex > 0) {
        rows.push([]);
      }
      rows.push(...buildSessionRows(game, sessionIndex, sessions.length));
    });

    return { sheetName: dateKey, rows };
  });
}
