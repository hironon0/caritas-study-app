// server.js - カリタス中学校 AI試験対策ツール バックエンド
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// セキュリティとパフォーマンス
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      connectSrc: ["'self'", "https://api.anthropic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://caritas-study-app.vercel.app', 'https://your-custom-domain.com']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Claude API 初期化
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  try {
    const { Anthropic } = require('@anthropic-ai/sdk');
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    console.log('✅ Claude API 接続成功');
  } catch (error) {
    console.error('❌ Claude API 初期化エラー:', error.message);
  }
} else {
  console.warn('⚠️ ANTHROPIC_API_KEY が設定されていません');
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
    ai_available: !!anthropic,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// 数学問題生成API
app.post('/api/generate-math', async (req, res) => {
  if (!anthropic) {
    return res.status(503).json({
      success: false,
      error: 'AI機能が利用できません。環境変数を確認してください。',
      demo: true
    });
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'プロンプトが指定されていません'
      });
    }

    console.log('📝 数学問題生成リクエスト');

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 3000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = response.content[0].text;

    // JSON形式の検証
    try {
      const problemData = JSON.parse(result);
      
      // 必要フィールドの検証
      const requiredFields = ['grade', 'level', 'unit', 'problem', 'steps', 'answer'];
      const missingFields = requiredFields.filter(field => !problemData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`必要フィールドが不足: ${missingFields.join(', ')}`);
      }

      console.log('✅ 数学問題生成成功');
      res.json({ success: true, result });

    } catch (parseError) {
      console.error('JSON解析エラー:', parseError.message);
      res.status(400).json({
        success: false,
        error: 'AI応答の形式が不正です',
        details: parseError.message,
        raw_response: result.substring(0, 500) + '...'
      });
    }

  } catch (error) {
    console.error('数学問題生成エラー:', error);
    
    if (error.name === 'APIError') {
      res.status(402).json({
        success: false,
        error: 'API利用制限に達しました',
        details: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'AI問題生成中にエラーが発生しました',
        details: error.message
      });
    }
  }
});

// 英語単語生成API
app.post('/api/generate-english', async (req, res) => {
  if (!anthropic) {
    return res.status(503).json({
      success: false,
      error: 'AI機能が利用できません。環境変数を確認してください。',
      demo: true
    });
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'プロンプトが指定されていません'
      });
    }

    console.log('📚 英語単語生成リクエスト');

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = response.content[0].text;

    try {
      const wordData = JSON.parse(result);
      
      // 必要フィールドの検証
      const requiredFields = ['word', 'meaning', 'level', 'examples'];
      const missingFields = requiredFields.filter(field => !wordData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`必要フィールドが不足: ${missingFields.join(', ')}`);
      }

      console.log('✅ 英語単語生成成功');
      res.json({ success: true, result });

    } catch (parseError) {
      console.error('JSON解析エラー:', parseError.message);
      res.status(400).json({
        success: false,
        error: 'AI応答の形式が不正です',
        details: parseError.message,
        raw_response: result.substring(0, 500) + '...'
      });
    }

  } catch (error) {
    console.error('英語単語生成エラー:', error);
    
    if (error.name === 'APIError') {
      res.status(402).json({
        success: false,
        error: 'API利用制限に達しました',
        details: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'AI単語生成中にエラーが発生しました',
        details: error.message
      });
    }
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

// サーバー起動
app.listen(port, () => {
  console.log(`🚀 カリタス学習ツール サーバー起動`);
  console.log(`📡 ポート: ${port}`);
  console.log(`🤖 AI機能: ${anthropic ? '✅ 有効' : '❌ 無効'}`);
  console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://localhost:${port}`);
});

// 優雅な終了処理
process.on('SIGTERM', () => {
  console.log('📴 サーバー終了中...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 サーバー終了中...');
  process.exit(0);
});