/*
  # ダミーデータ投入スクリプト

  麻雀記録アプリ用の現実的なダミーデータを投入します。

  1. アカウントデータ
    - メインアカウント（麻雀太郎）とテストユーザー10名
    - プレミアム・フリープランの混合
    
  2. 対局記録
    - 過去12ヶ月分（25局）の対局データ
    - 現実的な得点分布と順位
    
  3. プレイヤー記録
    - 各対局の4名分プレイヤーデータ
    - メインアカウントの詳細統計

  4. セキュリティ
    - 既存データを保護（INSERT ONLYで安全）
    - UUIDの重複チェック
*/

-- 一時的にRLSを無効化（管理者として実行）
SET session_replication_role = replica;

-- メインアカウント用のダミーユーザーID（実際の認証ユーザーIDと置き換え可能）
DO $$
DECLARE
    main_user_id uuid := '4aa0938b-3d69-40e1-b0d0-85c923ad0353';
    game_ids uuid[];
    player_names text[] := ARRAY['田中哲夫', '佐藤美香', '山田次郎', '鈴木一郎', '高橋花子', '渡辺三郎', '中村良太', '木村さくら', '石田健一', '松本雅美'];
    locations text[] := ARRAY['雀荘ドラゴン', '雀荘フェニックス', '雀荘タイガー', '雀荘イーグル', 'マージャン倶楽部'];
    game_types text[] := ARRAY['東南戦', '東風戦'];
    i integer;
    game_date timestamptz;
    selected_players text[];
    scores integer[];
    ranks integer[];
    temp_score integer;
    temp_rank integer;
    j integer;
    k integer;
BEGIN
    -- メインアカウントを挿入（既存の場合はスキップ）
    INSERT INTO accounts (id, username, created_at, is_premium, purchase_date, monthly_game_count, last_reset_date)
    VALUES (
        main_user_id,
        '麻雀太郎',
        '2024-01-15T10:00:00+09:00'::timestamptz,
        true,
        '2024-02-01T12:00:00+09:00'::timestamptz,
        45,
        '2024-12-01T00:00:00+09:00'::timestamptz
    )
    ON CONFLICT (id) DO NOTHING;

    -- 25局分の対局データを生成
    FOR i IN 1..25 LOOP
        -- ランダムな日付（2024年1月〜12月）
        game_date := '2024-01-01T14:00:00+09:00'::timestamptz + 
                    (random() * interval '365 days') + 
                    (random() * interval '8 hours');

        -- ゲーム記録を挿入
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
            final_honba
        ) VALUES (
            gen_random_uuid(),
            main_user_id,
            game_date,
            locations[1 + floor(random() * array_length(locations, 1))::integer],
            game_types[1 + floor(random() * array_length(game_types, 1))::integer],
            '{"startingPoints": 25000, "uma": "+15 +5 -5 -15", "oka": 5000, "riichiStick": 1000, "honbaValue": 300}'::jsonb,
            CASE 
                WHEN random() < 0.3 THEN '調子良し。リーチ判断が的確だった'
                WHEN random() < 0.6 THEN 'ドラが悪く、守備重視で凌いだ'
                WHEN random() < 0.8 THEN '大三元をツモって逆転勝利！'
                ELSE '流れが悪く、ツキに見放された感じ'
            END,
            CASE 
                WHEN game_types[1 + floor(random() * array_length(game_types, 1))::integer] = '東南戦' 
                THEN 150 + floor(random() * 60)::integer
                ELSE 80 + floor(random() * 30)::integer
            END,
            'normal',
            floor(random() * 4)::integer,
            floor(random() * 4)::integer
        ) RETURNING id INTO game_ids[i];

        -- プレイヤー3名をランダム選択
        selected_players := ARRAY['麻雀太郎'];
        FOR j IN 1..3 LOOP
            selected_players := selected_players || player_names[1 + floor(random() * array_length(player_names, 1))::integer];
        END LOOP;

        -- 現実的な得点分布を生成
        scores := ARRAY[
            25000 + (-15000 + floor(random() * 30000)::integer),
            25000 + (-15000 + floor(random() * 30000)::integer),
            25000 + (-15000 + floor(random() * 30000)::integer),
            25000 + (-15000 + floor(random() * 30000)::integer)
        ];
        
        -- 最低0点以上に調整
        FOR j IN 1..4 LOOP
            IF scores[j] < 0 THEN
                scores[j] := 1000 + floor(random() * 5000)::integer;
            END IF;
        END LOOP;

        -- 得点順で順位を計算（バブルソート）
        ranks := ARRAY[1, 2, 3, 4];
        FOR j IN 1..3 LOOP
            FOR k IN 1..4-j LOOP
                IF scores[k] < scores[k+1] THEN
                    -- 得点を交換
                    temp_score := scores[k];
                    scores[k] := scores[k+1];
                    scores[k+1] := temp_score;
                    -- 順位も交換
                    temp_rank := ranks[k];
                    ranks[k] := ranks[k+1];
                    ranks[k+1] := temp_rank;
                END IF;
            END LOOP;
        END LOOP;

        -- プレイヤー記録を挿入
        FOR j IN 1..4 LOOP
            INSERT INTO player_records (
                id,
                game_id,
                player_name,
                is_main_account,
                final_score,
                rank,
                starting_position
            ) VALUES (
                gen_random_uuid(),
                game_ids[i],
                selected_players[j],
                (j = 1), -- 最初のプレイヤーがメインアカウント
                scores[j],
                j, -- ソート済みなので j が順位
                CASE j
                    WHEN 1 THEN 'East'
                    WHEN 2 THEN 'South'
                    WHEN 3 THEN 'West'
                    ELSE 'North'
                END
            );
        END LOOP;

        -- 局記録のサンプルを1つ追加（東1局）
        INSERT INTO round_records (
            id,
            game_id,
            round,
            honba,
            riichi_sticks,
            winner,
            loser,
            hand_type,
            points,
            han,
            fu,
            yakuman
        ) VALUES (
            gen_random_uuid(),
            game_ids[i],
            '東1局',
            0,
            0,
            1 + floor(random() * 4)::integer, -- 1-4のプレイヤー
            CASE WHEN random() < 0.7 THEN 1 + floor(random() * 4)::integer ELSE NULL END,
            CASE 
                WHEN random() < 0.6 THEN 'ron'
                WHEN random() < 0.9 THEN 'tsumo'
                ELSE 'draw'
            END,
            CASE 
                WHEN random() < 0.6 THEN '[8000, -2000, -3000, -3000]'::jsonb
                WHEN random() < 0.9 THEN '[12000, -4000, -4000, -4000]'::jsonb
                ELSE '[0, 0, 0, 0]'::jsonb
            END,
            CASE WHEN random() < 0.9 THEN 1 + floor(random() * 5)::integer ELSE NULL END,
            CASE WHEN random() < 0.9 THEN 30 + floor(random() * 40)::integer ELSE NULL END,
            (random() < 0.05) -- 5%の確率で役満
        );

    END LOOP;

    RAISE NOTICE '25局分のダミーデータを投入しました';
    RAISE NOTICE 'メインアカウントID: %', main_user_id;
    RAISE NOTICE '対局記録数: %', array_length(game_ids, 1);
END $$;

-- 追加のテストユーザーアカウント（オプション）
INSERT INTO accounts (id, username, created_at, is_premium, monthly_game_count, last_reset_date)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', '田中プロ', '2024-01-10T09:00:00+09:00', true, 28, '2024-12-01T00:00:00+09:00'),
    ('550e8400-e29b-41d4-a716-446655440002', '佐藤初心者', '2024-03-15T15:30:00+09:00', false, 8, '2024-12-01T00:00:00+09:00'),
    ('550e8400-e29b-41d4-a716-446655440003', '山田中級者', '2024-02-20T11:15:00+09:00', false, 15, '2024-12-01T00:00:00+09:00'),
    ('550e8400-e29b-41d4-a716-446655440004', '鈴木ベテラン', '2024-01-05T14:45:00+09:00', true, 52, '2024-12-01T00:00:00+09:00'),
    ('550e8400-e29b-41d4-a716-446655440005', '高橋学生', '2024-04-01T16:20:00+09:00', false, 6, '2024-12-01T00:00:00+09:00')
ON CONFLICT (id) DO NOTHING;

-- RLSを再有効化
SET session_replication_role = DEFAULT;

-- 投入結果の確認クエリ
SELECT 
    'accounts' as table_name, 
    count(*) as record_count 
FROM accounts
UNION ALL
SELECT 
    'games' as table_name, 
    count(*) as record_count 
FROM games
UNION ALL
SELECT 
    'player_records' as table_name, 
    count(*) as record_count 
FROM player_records
UNION ALL
SELECT 
    'round_records' as table_name, 
    count(*) as record_count 
FROM round_records;

-- メインアカウントの統計確認
SELECT 
    p.player_name,
    COUNT(*) as total_games,
    AVG(p.rank::decimal) as avg_rank,
    AVG(p.final_score) as avg_score,
    COUNT(CASE WHEN p.rank = 1 THEN 1 END) as first_place_count
FROM player_records p
JOIN games g ON p.game_id = g.id
WHERE p.is_main_account = true
GROUP BY p.player_name;