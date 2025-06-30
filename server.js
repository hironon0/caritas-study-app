// server.js - カリタス中学校 AI試験対策ツール バックエンド
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const https = require('https');
const fs = require('fs');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3001;

// セキュリティとパフォーマンス
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      connectSrc: ["'self'", "https://api.openai.com", "http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*"],
      imgSrc: ["'self'", "data:", "https:"],
      workerSrc: ["'self'", "blob:", "'unsafe-inline'"],
    },
  },
  crossOriginResourcePolicy: false, // ブラウザ対応: CORP無効化
  crossOriginOpenerPolicy: false,   // ブラウザ対応: COOP無効化
  strictTransportSecurity: false,   // HTTP対応: HSTS無効化
}));

app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://caritas-study-app.vercel.app', 'https://your-custom-domain.com', 'http://localhost:3001']
    : [
        'http://localhost:3000', 
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'null' // Safari file:// プロトコル対応
      ],
  credentials: false, // Safari対応: 認証情報を使わない
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Cache-Control'],
  optionsSuccessStatus: 200 // Safari対応: OPTIONSリクエストの成功ステータス
}));

app.use(express.json({ limit: '10mb' }));

// 静的ファイル配信（index.htmlなど）
app.use(express.static('./'));

// OpenAI API 初期化
let openai = null;
if (process.env.OPENAI_API_KEY) {
    try {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        console.log('✅ OpenAI API 接続成功');
    } catch (error) {
        console.error('❌ OpenAI API 初期化エラー:', error.message);
    }
} else {
    console.warn('⚠️ OPENAI_API_KEY が設定されていません');
}


// ルート - フロントエンド配信
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ヘルスチェックAPI
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    openai_available: !!openai,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// 数学問題生成API (OpenAI)
app.post('/api/generate-math', async (req, res) => {
    if (!openai) {
        return res.status(503).json({
            success: false,
            error: 'OpenAI API機能が利用できません。環境変数を確認してください。',
        });
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'プロンプトが指定されていません',
            });
        }

        console.log('📝 数学問題生成リクエスト (OpenAI)');
        console.log('リクエストボディ:', JSON.stringify(req.body, null, 2));

        // OpenAI APIの要求に合わせて「json」を含むプロンプトに修正
        const enhancedPrompt = `${prompt}

回答は必ずJSON形式で出力してください。以下の構造に従ってください:
{
  "grade": "学年",
  "level": "難易度", 
  "unit": "単元名",
  "problem": "問題文",
  "steps": [
    {
      "step": "ステップ名",
      "content": "内容",
      "explanation": "解説",
      "detail": "詳細"
    }
  ],
  "answer": "答え",
  "hint": "ヒント",
  "difficulty_analysis": "難易度分析",
  "learning_point": "学習ポイント"
}`;

        const messages = [{
            role: 'user',
            content: enhancedPrompt,
        }];
        console.log('OpenAIへのリクエスト:', JSON.stringify(messages, null, 2));

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 3000,
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: messages,
        });

        const result = response.choices[0].message.content;

        // JSON形式の検証
        try {
            const problemData = JSON.parse(result);

            // 必要フィールドの検証
            const requiredFields = ['grade', 'level', 'unit', 'problem', 'steps', 'answer'];
            const missingFields = requiredFields.filter(field => !problemData[field]);

            if (missingFields.length > 0) {
                throw new Error(`必要フィールドが不足: ${missingFields.join(', ')}`);
            }

            console.log('✅ 数学問題生成成功 (OpenAI)');
            res.json({ success: true, result });

        } catch (parseError) {
            console.error('JSON解析エラー (OpenAI):', parseError.message);
            res.status(400).json({
                success: false,
                error: 'AI応答の形式が不正です',
                details: parseError.message,
                raw_response: result.substring(0, 500) + '...'
            });
        }

    } catch (error) {
        console.error('数学問題生成エラー (OpenAI):', error);
        if (error instanceof OpenAI.APIError) {
            return res.status(error.status || 500).json({
                success: false,
                error: 'OpenAI APIとの通信中にエラーが発生しました。',
                details: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: 'AI問題生成中にサーバー内部でエラーが発生しました',
            details: error.message,
        });
    }
});


// 英語単語生成API
app.post('/api/generate-english', async (req, res) => {
    if (!openai) {
        return res.status(503).json({
            success: false,
            error: 'OpenAI API機能が利用できません。環境変数を確認してください。',
        });
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'プロンプトが指定されていません',
            });
        }

        console.log('📝 英語単語生成リクエスト (OpenAI)');
        console.log('リクエストボディ:', JSON.stringify(req.body, null, 2));

        // OpenAI APIの要求に合わせて「json」を含むプロンプトに修正
        const enhancedPrompt = `${prompt}

回答は必ずJSON形式で出力してください。以下の構造に従ってください:
{
  "word": "英単語",
  "meaning": "日本語での意味",
  "level": "レベル",
  "examples": [
    {
      "sentence": "例文",
      "translation": "日本語訳"
    }
  ]
}`;

        const messages = [{
            role: 'user',
            content: enhancedPrompt,
        }];
        console.log('OpenAIへのリクエスト:', JSON.stringify(messages, null, 2));

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 2000,
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: messages,
        });

        const result = response.choices[0].message.content;

        try {
            const wordData = JSON.parse(result);

            // 必要フィールドの検証
            const requiredFields = ['word', 'meaning', 'level', 'examples'];
            const missingFields = requiredFields.filter(field => !wordData[field]);

            if (missingFields.length > 0) {
                throw new Error(`必要フィールドが不足: ${missingFields.join(', ')}`);
            }

            console.log('✅ 英語単語生成成功 (OpenAI)');
            res.json({ success: true, result });

        } catch (parseError) {
            console.error('JSON解析エラー (OpenAI):', parseError.message);
            res.status(400).json({
                success: false,
                error: 'AI応答の形式が不正です',
                details: parseError.message,
                raw_response: result.substring(0, 500) + '...'
            });
        }

    } catch (error) {
        console.error('英語単語生成エラー (OpenAI):', error);
        if (error instanceof OpenAI.APIError) {
            return res.status(error.status || 500).json({
                success: false,
                error: 'OpenAI APIとの通信中にエラーが発生しました。',
                details: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: 'AI英語単語生成中にサーバー内部でエラーが発生しました',
            details: error.message,
        });
    }
});

// OpenAI APIキーテスト用エンドポイント
app.get('/api/test-openai', async (req, res) => {
    if (!openai) {
        return res.status(503).json({ success: false, error: 'OpenAI API not initialized' });
    }
    try {
        console.log('🧪 OpenAI API キーの有効性をテスト中...');
        const response = await openai.models.list();
        console.log('✅ OpenAI API キーは有効です。');
        res.json({ success: true, models: response.data.length });
    } catch (error) {
        console.error('❌ OpenAI API キーのテスト中にエラーが発生しました:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// エラーハンドリング
app.use((error, req, res, next) => {
  console.error('サーバーエラー:', error);
  res.status(500).json({
    success: false,
    error: 'サーバー内部エラー',
    timestamp: new Date().toISOString()
  });
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'エンドポイントが見つかりません',
    path: req.path
  });
});

// サーバー起動（テスト時は起動しない）
if (require.main === module) {
    const server = app.listen(port, () => {
        console.log(`🚀 カリタスAI学習ツール起動`);
        console.log(`📍 URL: http://localhost:${port}`);
        console.log(`📊 環境: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🤖 OpenAI: ${openai ? '✅ 接続済み' : '❌ 未設定'}`);
        console.log(`⏰ 起動時刻: ${new Date().toLocaleString('ja-JP')}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('🛑 SIGTERM受信 - サーバーを安全に停止中...');
        server.close(() => {
            console.log('✅ サーバー停止完了');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        console.log('🛑 SIGINT受信 - サーバーを安全に停止中...');
        server.close(() => {
            console.log('✅ サーバー停止完了');
            process.exit(0);
        });
    });
}

// テスト用にappをエクスポート
module.exports = app;
