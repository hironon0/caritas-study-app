/**
 * サーバーのユニットテスト
 * 
 * テスト哲学:
 * - 単一責任原則（SRP）に基づいた小さなテスト
 * - 明確な命名・コメント
 * - テスト容易性・自動化を重視
 */

const request = require('supertest');
const app = require('../../server');

describe('サーバー基本機能テスト', () => {
    
    describe('GET /', () => {
        test('ルートパスが正常に応答する', async () => {
            const response = await request(app).get('/');
            expect(response.status).toBe(200);
            expect(response.type).toBe('text/html');
        });
    });

    describe('GET /api/health', () => {
        test('ヘルスチェックが正常に応答する', async () => {
            const response = await request(app).get('/api/health');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('version', '1.0.0');
        });

        test('レスポンスに必要なフィールドが含まれる', async () => {
            const response = await request(app).get('/api/health');
            expect(response.body).toHaveProperty('openai_available');
            expect(response.body).toHaveProperty('environment');
        });
    });

    describe('POST /api/generate-math', () => {
        test('プロンプトなしでエラーを返す', async () => {
            const response = await request(app)
                .post('/api/generate-math')
                .send({});
            
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('プロンプト');
        });

        test('有効なプロンプトで正常に応答する（要API設定）', async () => {
            // 注意: このテストは実際のOpenAI APIキーが必要
            const validPrompt = 'テスト用の簡単な数学問題を生成してください';
            
            const response = await request(app)
                .post('/api/generate-math')
                .send({ prompt: validPrompt });
            
            // API未設定の場合は503エラーを期待
            if (response.status === 503) {
                expect(response.body.success).toBe(false);
                expect(response.body.error).toContain('OpenAI API');
            } else {
                // API設定済みの場合の正常レスポンス
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                
                // JSON形式の検証
                const result = JSON.parse(response.body.result);
                expect(result).toHaveProperty('problem');
                expect(result).toHaveProperty('answer');
                expect(result).toHaveProperty('steps');
            }
        }, 15000); // 15秒のタイムアウト（APIレスポンス時間を考慮）
    });
});

// KISS原則: シンプルで理解しやすいテスト
// DRY原則: 共通処理は別ファイルに切り出し可能
// テスト容易性: モックを使用してAPIに依存しないテストも可能 