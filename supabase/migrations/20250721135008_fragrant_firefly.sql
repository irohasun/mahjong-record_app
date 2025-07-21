/*
  # ダミーデータ投入スクリプト

  1. 麻雀対局記録のダミーデータ
    - 過去12ヶ月の対局データ
    - 現実的な順位分布と得点
    - 様々な雀荘での対局記録

  2. アカウント情報
    - テストユーザーのアカウント情報
    - プレミアム/フリーユーザーの混在

  3. プレイヤー記録
    - 4人麻雀の記録
    - 実際の麻雀の得点分布を反映
*/

-- まず既存のダミーデータを削除（テスト環境用）
-- DELETE FROM round_records WHERE game_id IN (SELECT id FROM games WHERE account_id = 'test-user-001');
-- DELETE FROM player_records WHERE game_id IN (SELECT id FROM games WHERE account_id = 'test-user-001');
-- DELETE FROM games WHERE account_id = 'test-user-001';
-- DELETE FROM accounts WHERE id = 'test-user-001';

-- テストアカウントの作成
INSERT INTO accounts (
  id, 
  username, 
  created_at, 
  is_premium, 
  purchase_date, 
  monthly_game_count, 
  last_reset_date,
  email,
  email_verified,
  preferred_language,
  timezone,
  status
) VALUES 
('test-user-001', '麻雀太郎', '2024-01-15 10:00:00+09', true, '2024-02-01 12:00:00+09', 45, '2024-12-01 00:00:00+09', 'test@example.com', true, 'ja', 'Asia/Tokyo', 'active');

-- 過去12ヶ月の対局記録を作成
-- 2024年1月の対局記録
INSERT INTO games (
  id,
  account_id,
  date,
  location,
  game_type,
  rules,
  memo,
  duration_minutes,
  game_end_condition,
  final_riichi_sticks,
  final_honba,
  created_at
) VALUES 
('game-001', 'test-user-001', '2024-01-20 14:00:00+09', '雀荘ドラゴン', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '調子良し。リーチ判断が的確だった', 180, 'normal', 1, 2, '2024-01-20 17:00:00+09'),
('game-002', 'test-user-001', '2024-01-27 19:00:00+09', '雀荘フェニックス', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', 'ドラが悪く、守備重視で凌いだ', 195, 'normal', 0, 1, '2024-01-27 22:15:00+09'),

-- 2024年2月の対局記録
('game-003', 'test-user-001', '2024-02-03 15:30:00+09', '雀荘ドラゴン', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '大三元をツモって逆転勝利！', 165, 'normal', 2, 0, '2024-02-03 18:15:00+09'),
('game-004', 'test-user-001', '2024-02-14 20:00:00+09', '雀荘タイガー', '東風戦', '{"startingPoints": 25000, "uma": "+10 +5 -5 -10", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', 'バレンタインデー記念対局', 90, 'normal', 0, 3, '2024-02-14 21:30:00+09'),
('game-005', 'test-user-001', '2024-02-28 16:00:00+09', '雀荘ドラゴン', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '月末の追い込み対局', 210, 'normal', 1, 1, '2024-02-28 19:30:00+09'),

-- 2024年3月の対局記録
('game-006', 'test-user-001', '2024-03-10 13:00:00+09', '雀荘フェニックス', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '春の陽気に誘われて', 175, 'normal', 0, 2, '2024-03-10 16:00:00+09'),
('game-007', 'test-user-001', '2024-03-24 18:30:00+09', '雀荘ドラゴン', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '桜満開の季節、集中力MAX', 155, 'normal', 3, 1, '2024-03-24 21:05:00+09'),

-- 2024年4月〜12月の対局記録（簡略版）
('game-008', 'test-user-001', '2024-04-07 14:00:00+09', '雀荘タイガー', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '新年度初対局', 200, 'normal', 0, 0, '2024-04-07 17:20:00+09'),
('game-009', 'test-user-001', '2024-04-21 19:00:00+09', '雀荘ドラゴン', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', 'GW前の追い込み', 185, 'normal', 1, 2, '2024-04-21 22:05:00+09'),
('game-010', 'test-user-001', '2024-05-05 15:00:00+09', '雀荘フェニックス', '東風戦', '{"startingPoints": 25000, "uma": "+10 +5 -5 -10", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', 'こどもの日記念', 85, 'normal', 2, 0, '2024-05-05 16:25:00+09'),
('game-011', 'test-user-001', '2024-05-19 17:00:00+09', '雀荘ドラゴン', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '五月病を吹き飛ばせ', 190, 'normal', 0, 1, '2024-05-19 20:10:00+09'),
('game-012', 'test-user-001', '2024-06-08 20:00:00+09', '雀荘タイガー', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '梅雨入り前の一局', 175, 'normal', 1, 3, '2024-06-08 22:55:00+09'),
('game-013', 'test-user-001', '2024-06-22 16:30:00+09', '雀荘フェニックス', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '夏至の日の麻雀', 165, 'normal', 0, 0, '2024-06-22 19:15:00+09'),
('game-014', 'test-user-001', '2024-07-14 19:30:00+09', '雀荘ドラゴン', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '夏祭りの前日', 205, 'normal', 2, 1, '2024-07-14 22:55:00+09'),
('game-015', 'test-user-001', '2024-07-28 15:00:00+09', '雀荘タイガー', '東風戦', '{"startingPoints": 25000, "uma": "+10 +5 -5 -10", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '夏休み満喫', 95, 'normal', 0, 2, '2024-07-28 16:35:00+09'),
('game-016', 'test-user-001', '2024-08-11 18:00:00+09', '雀荘フェニックス', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '山の日記念対局', 180, 'normal', 1, 0, '2024-08-11 21:00:00+09'),
('game-017', 'test-user-001', '2024-08-25 14:30:00+09', '雀荘ドラゴン', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '夏の終わりを惜しんで', 170, 'normal', 0, 1, '2024-08-25 17:20:00+09'),
('game-018', 'test-user-001', '2024-09-08 17:00:00+09', '雀荘タイガー', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '秋の始まり', 195, 'normal', 3, 2, '2024-09-08 20:15:00+09'),
('game-019', 'test-user-001', '2024-09-23 16:00:00+09', '雀荘フェニックス', '東風戦', '{"startingPoints": 25000, "uma": "+10 +5 -5 -10", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '秋分の日', 88, 'normal', 1, 0, '2024-09-23 17:28:00+09'),
('game-020', 'test-user-001', '2024-10-12 19:00:00+09', '雀荘ドラゴン', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '秋も深まり', 185, 'normal', 0, 1, '2024-10-12 22:05:00+09'),
('game-021', 'test-user-001', '2024-10-27 15:30:00+09', '雀荘タイガー', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', 'ハロウィーン前', 175, 'normal', 2, 3, '2024-10-27 18:25:00+09'),
('game-022', 'test-user-001', '2024-11-10 18:30:00+09', '雀荘フェニックス', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '晩秋の夜長', 200, 'normal', 1, 1, '2024-11-10 21:50:00+09'),
('game-023', 'test-user-001', '2024-11-24 14:00:00+09', '雀荘ドラゴン', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '勤労感謝の日', 190, 'normal', 0, 0, '2024-11-24 17:10:00+09'),
('game-024', 'test-user-001', '2024-12-08 17:00:00+09', '雀荘タイガー', '東南戦', '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '師走の忙しい中', 165, 'normal', 1, 2, '2024-12-08 19:45:00+09'),
('game-025', 'test-user-001', '2024-12-22 20:00:00+09', '雀荘フェニックス', '東風戦', '{"startingPoints": 25000, "uma": "+10 +5 -5 -10", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}', '冬至の夜', 85, 'normal', 0, 1, '2024-12-22 21:25:00+09');

-- プレイヤー記録の投入（現実的な麻雀の順位分布と得点を反映）
INSERT INTO player_records (
  game_id,
  player_name,
  is_main_account,
  final_score,
  rank,
  starting_position
) VALUES 
-- game-001: 2位でまずまずの成績
('game-001', '麻雀太郎', true, 31200, 2, 'East'),
('game-001', '田中哲夫', false, 35800, 1, 'South'),
('game-001', '佐藤美香', false, 18400, 4, 'West'),
('game-001', '山田次郎', false, 24600, 3, 'North'),

-- game-002: 3位で守備的な戦術
('game-002', '麻雀太郎', true, 24800, 3, 'South'),
('game-002', '鈴木一郎', false, 38200, 1, 'East'),
('game-002', '高橋花子', false, 29000, 2, 'North'),
('game-002', '渡辺三郎', false, 18000, 4, 'West'),

-- game-003: 1位！大三元の威力
('game-003', '麻雀太郎', true, 42300, 1, 'West'),
('game-003', '中村良太', false, 26700, 2, 'East'),
('game-003', '木村さくら', false, 21800, 3, 'South'),
('game-003', '石田健一', false, 19200, 4, 'North'),

-- game-004: 東風戦で4位
('game-004', '麻雀太郎', true, 19500, 4, 'North'),
('game-004', '松本雅美', false, 33200, 1, 'East'),
('game-004', '小林達也', false, 28100, 2, 'South'),
('game-004', '加藤紀子', false, 24200, 3, 'West'),

-- game-005: 2位で安定
('game-005', '麻雀太郎', true, 29800, 2, 'East'),
('game-005', '井上博史', false, 34900, 1, 'South'),
('game-005', '森川愛', false, 23300, 3, 'West'),
('game-005', '藤田光男', false, 22000, 4, 'North'),

-- game-006: 3位
('game-006', '麻雀太郎', true, 22400, 3, 'South'),
('game-006', '清水智子', false, 36800, 1, 'West'),
('game-006', '橋本大輔', false, 27600, 2, 'North'),
('game-006', '片山美穂', false, 23200, 4, 'East'),

-- game-007: 1位！好調継続
('game-007', '麻雀太郎', true, 38600, 1, 'West'),
('game-007', '岡田修一', false, 28400, 2, 'East'),
('game-007', '坂本真理', false, 24000, 3, 'South'),
('game-007', '長谷川浩', false, 19000, 4, 'North'),

-- game-008: 4位で反省
('game-008', '麻雀太郎', true, 17800, 4, 'North'),
('game-008', '野村恵子', false, 39200, 1, 'East'),
('game-008', '村上正樹', false, 31000, 2, 'South'),
('game-008', '菊池雄介', false, 22000, 3, 'West'),

-- game-009: 1位で巻き返し
('game-009', '麻雀太郎', true, 41500, 1, 'East'),
('game-009', '河野直美', false, 27800, 2, 'South'),
('game-009', '西田正義', false, 21700, 3, 'West'),
('game-009', '原田千佳', false, 19000, 4, 'North'),

-- game-010: 東風戦で2位
('game-010', '麻雀太郎', true, 28900, 2, 'South'),
('game-010', '近藤龍一', false, 32100, 1, 'East'),
('game-010', '福田由美', false, 24500, 3, 'West'),
('game-010', '斎藤和也', false, 19500, 4, 'North'),

-- game-011: 3位
('game-011', '麻雀太郎', true, 23800, 3, 'West'),
('game-011', '金子明', false, 35200, 1, 'North'),
('game-011', '今井香織', false, 29000, 2, 'East'),
('game-011', '杉山哲也', false, 22000, 4, 'South'),

-- game-012: 2位で堅実
('game-012', '麻雀太郎', true, 30600, 2, 'East'),
('game-012', '平井良子', false, 36400, 1, 'South'),
('game-012', '内田武志', false, 24000, 3, 'West'),
('game-012', '山口理恵', false, 19000, 4, 'North'),

-- game-013: 1位でナイス
('game-013', '麻雀太郎', true, 37200, 1, 'North'),
('game-013', '大野健二', false, 28800, 2, 'East'),
('game-013', '林美奈子', false, 25000, 3, 'South'),
('game-013', '吉田隆', false, 19000, 4, 'West'),

-- game-014: 4位で課題残る
('game-014', '麻雀太郎', true, 18200, 4, 'South'),
('game-014', '古川文夫', false, 38800, 1, 'West'),
('game-014', '栗原綾', false, 31000, 2, 'North'),
('game-014', '木下裕介', false, 22000, 3, 'East'),

-- game-015: 東風戦で1位
('game-015', '麻雀太郎', true, 34700, 1, 'West'),
('game-015', '江藤昌子', false, 27300, 2, 'North'),
('game-015', '田村慎一', false, 23000, 3, 'East'),
('game-015', '宮本麻衣', false, 20000, 4, 'South'),

-- game-016: 2位で安定感
('game-016', '麻雀太郎', true, 29400, 2, 'North'),
('game-016', '上田雅之', false, 34600, 1, 'East'),
('game-016', '武田優子', false, 26000, 3, 'South'),
('game-016', '松井秀樹', false, 20000, 4, 'West'),

-- game-017: 3位
('game-017', '麻雀太郎', true, 24200, 3, 'East'),
('game-017', '小川真一', false, 36800, 1, 'South'),
('game-017', '中島恵', false, 28000, 2, 'West'),
('game-017', '安田浩司', false, 21000, 4, 'North'),

-- game-018: 1位で好調
('game-018', '麻雀太郎', true, 39800, 1, 'South'),
('game-018', '池田志保', false, 27200, 2, 'West'),
('game-018', '伊藤康夫', false, 23000, 3, 'North'),
('game-018', '横山純子', false, 20000, 4, 'East'),

-- game-019: 東風戦で3位
('game-019', '麻雀太郎', true, 23600, 3, 'North'),
('game-019', '岩崎裕二', false, 31400, 1, 'East'),
('game-019', '谷口里美', false, 28000, 2, 'South'),
('game-019', '前田信也', false, 22000, 4, 'West'),

-- game-020: 2位
('game-020', '麻雀太郎', true, 31800, 2, 'East'),
('game-020', '荒木朋子', false, 35200, 1, 'South'),
('game-020', '森本大介', false, 22000, 3, 'West'),
('game-020', '島田圭子', false, 21000, 4, 'North'),

-- game-021: 4位で落ち込み
('game-021', '麻雀太郎', true, 16500, 4, 'West'),
('game-021', '酒井勝', false, 41500, 1, 'North'),
('game-021', '青木典子', false, 29000, 2, 'East'),
('game-021', '山下英明', false, 23000, 3, 'South'),

-- game-022: 1位で復活
('game-022', '麻雀太郎', true, 40200, 1, 'North'),
('game-022', '白石美和', false, 26800, 2, 'East'),
('game-022', '富田雄一', false, 24000, 3, 'South'),
('game-022', '新井恵美', false, 19000, 4, 'West'),

-- game-023: 3位
('game-023', '麻雀太郎', true, 25600, 3, 'South'),
('game-023', '竹内康雄', false, 37400, 1, 'West'),
('game-023', '小島よし子', false, 28000, 2, 'North'),
('game-023', '三浦誠', false, 19000, 4, 'East'),

-- game-024: 2位で年末を締める
('game-024', '麻雀太郎', true, 32400, 2, 'West'),
('game-024', '植田美智子', false, 36600, 1, 'North'),
('game-024', '大島正治', false, 22000, 3, 'East'),
('game-024', '関根香', false, 19000, 4, 'South'),

-- game-025: 東風戦で1位
('game-025', '麻雀太郎', true, 33800, 1, 'North'),
('game-025', '高田哲郎', false, 27200, 2, 'East'),
('game-025', '石原綾子', false, 24000, 3, 'South'),
('game-025', '久保田俊', false, 20000, 4, 'West');