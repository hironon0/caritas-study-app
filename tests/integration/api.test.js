/**
 * API統合テスト
 * 
 * 複数のコンポーネントが連携する機能をテスト
 * - API エンドポイントの統合テスト
 * - データフローの検証
 * - エラーハンドリングの確認
 */

const request = require('supertest');
const app = require('../../server');

describe('API統合テスト', () => {
    
    beforeAll(async () => {
        // 統合テスト前の準備
        console.log('統合テスト開始');
    });

    afterAll(async () => {
        // 統合テスト後のクリーンアップ
        console.log('統合テスト完了');
        
        // すべてのタイマーとリスナーを適切にクリーンアップ
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    describe('数学問題生成ワークフロー', () => {
        test('ヘルスチェック → 数学問題生成のフロー', async () => {
            // 1. ヘルスチェック
            const healthResponse = await request(app).get('/api/health');
            expect(healthResponse.status).toBe(200);
            expect(healthResponse.body.status).toBe('OK');

            // 2. 数学問題生成（API設定に依存）
            const mathPrompt = 'テスト用の簡単な算数問題を1問作成してください。';
            const mathResponse = await request(app)
                .post('/api/generate-math')
                .send({ prompt: mathPrompt });

            // APIが利用可能な場合の統合テスト
            if (healthResponse.body.openai_available) {
                expect(mathResponse.status).toBe(200);
                expect(mathResponse.body.success).toBe(true);
                
                // レスポンス形式の検証
                const result = JSON.parse(mathResponse.body.result);
                expect(result).toHaveProperty('problem');
                expect(result).toHaveProperty('answer');
                expect(result).toHaveProperty('steps');
            } else {
                // API未設定の場合
                expect(mathResponse.status).toBe(503);
                expect(mathResponse.body.success).toBe(false);
            }
        }, 20000); // 20秒のタイムアウト（統合テスト用）
    });

    describe('英語学習ワークフロー', () => {
        test('英語単語生成のフロー', async () => {
            const englishPrompt = 'テスト用の英単語を1つ生成してください。';
            const response = await request(app)
                .post('/api/generate-english')
                .send({ prompt: englishPrompt });

            // API設定状況に応じた検証
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                const result = JSON.parse(response.body.result);
                expect(result).toHaveProperty('word');
                expect(result).toHaveProperty('meaning');
                expect(result).toHaveProperty('examples');
            } else if (response.status === 503) {
                expect(response.body.success).toBe(false);
                expect(response.body.error).toContain('API');
            }
        }, 15000); // 15秒のタイムアウト
    });

    describe('エラーハンドリング統合テスト', () => {
        test('不正なJSONデータでのエラーレスポンス', async () => {
            const response = await request(app)
                .post('/api/generate-math')
                .send('invalid json');

            expect(response.status).toBe(400);
        });

        test('存在しないエンドポイントでの404エラー', async () => {
            const response = await request(app).get('/api/nonexistent');
            expect(response.status).toBe(404);
        });
    });
});

/**
 * 統合テストのベストプラクティス:
 * 
 * 1. 実際の使用シナリオに基づいたテスト
 * 2. 外部依存（API）への適切な対応
 * 3. エラーケースの網羅的なテスト
 * 4. テスト環境のセットアップとクリーンアップ
 */ 