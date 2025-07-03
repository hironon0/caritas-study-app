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

// 問題プール管理
const PROBLEM_POOL_FILE = './problem-pool.json';

// 問題プール読み込み
const loadProblemPool = () => {
    try {
        if (fs.existsSync(PROBLEM_POOL_FILE)) {
            const data = fs.readFileSync(PROBLEM_POOL_FILE, 'utf8');
            return JSON.parse(data);
        }
        return { math: {}, english: {}, stats: { total_problems: 0 } };
    } catch (error) {
        console.error('問題プール読み込みエラー:', error);
        return { math: {}, english: {}, stats: { total_problems: 0 } };
    }
};

// 問題プール保存
const saveProblemPool = (pool) => {
    try {
        fs.writeFileSync(PROBLEM_POOL_FILE, JSON.stringify(pool, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('問題プール保存エラー:', error);
        return false;
    }
};

// ランダム問題選択（数学用）
const getRandomMathProblem = (grade, unit, level) => {
    const pool = loadProblemPool();
    
    try {
        let problems = [];
        
        if (unit === '全分野') {
            // 全分野の場合、該当学年のすべての単元から問題を集める
            const gradeData = pool.math[grade];
            if (gradeData) {
                Object.values(gradeData).forEach(unitData => {
                    if (unitData[level] && Array.isArray(unitData[level])) {
                        problems.push(...unitData[level]);
                    }
                });
            }
        } else {
            // 特定分野の場合
            const unitProblems = pool.math[grade]?.[unit]?.[level];
            if (unitProblems && Array.isArray(unitProblems)) {
                problems = unitProblems;
            }
        }
        
        if (problems.length === 0) {
            return null;
        }
        
        // ランダム選択
        const randomIndex = Math.floor(Math.random() * problems.length);
        return problems[randomIndex];
    } catch (error) {
        console.error('ランダム数学問題選択エラー:', error);
        return null;
    }
};

// ランダム問題選択（英語用）
const getRandomEnglishProblem = (grade, level, excludeWords = []) => {
    const pool = loadProblemPool();
    
    try {
        const problems = pool.english?.[grade]?.[level];
        if (!problems || !Array.isArray(problems) || problems.length === 0) {
            return null;
        }
        
        // 除外単語がある場合、それを除いた問題リストを作成
        let availableProblems = problems;
        if (excludeWords.length > 0) {
            availableProblems = problems.filter(problem => !excludeWords.includes(problem.word));
        }
        
        if (availableProblems.length === 0) {
            // 除外後に問題がない場合は、除外なしで選択
            availableProblems = problems;
        }
        
        // ランダム選択
        const randomIndex = Math.floor(Math.random() * availableProblems.length);
        return availableProblems[randomIndex];
    } catch (error) {
        console.error('ランダム英語問題選択エラー:', error);
        return null;
    }
};

// 旧関数名の互換性維持
const getRandomProblem = getRandomMathProblem;

// 数学問題をプールに追加
const addMathProblemToPool = (problem) => {
    const pool = loadProblemPool();
    
    try {
        // データ構造を確保
        if (!pool.math[problem.grade]) {
            pool.math[problem.grade] = {};
        }
        if (!pool.math[problem.grade][problem.unit]) {
            pool.math[problem.grade][problem.unit] = {
                基礎: [], 標準: [], 応用: [], 発展: []
            };
        }
        if (!pool.math[problem.grade][problem.unit][problem.level]) {
            pool.math[problem.grade][problem.unit][problem.level] = [];
        }
        
        // 重複チェック（IDが同じ問題は追加しない）
        const existingProblems = pool.math[problem.grade][problem.unit][problem.level];
        if (existingProblems.some(p => p.id === problem.id)) {
            return false; // 重複
        }
        
        // 問題追加
        problem.created_at = new Date().toISOString();
        pool.math[problem.grade][problem.unit][problem.level].push(problem);
        
        // 統計更新
        if (!pool.stats) {
            pool.stats = { total_problems: 0, problems_by_grade: {} };
        }
        pool.stats.total_problems++;
        pool.stats.last_updated = new Date().toISOString();
        if (!pool.stats.problems_by_grade[problem.grade]) {
            pool.stats.problems_by_grade[problem.grade] = 0;
        }
        pool.stats.problems_by_grade[problem.grade]++;
        
        return saveProblemPool(pool);
    } catch (error) {
        console.error('数学問題追加エラー:', error);
        return false;
    }
};

// 英語問題をプールに追加
const addEnglishProblemToPool = (problem) => {
    const pool = loadProblemPool();
    
    try {
        // データ構造を確保
        if (!pool.english) {
            pool.english = {};
        }
        if (!pool.english[problem.grade]) {
            pool.english[problem.grade] = {
                基礎: [], 標準: [], 応用: [], 発展: []
            };
        }
        if (!pool.english[problem.grade][problem.level]) {
            pool.english[problem.grade][problem.level] = [];
        }
        
        // 単語重複チェック（同じ単語は追加しない）
        const existingProblems = pool.english[problem.grade][problem.level];
        if (existingProblems.some(p => p.word === problem.word)) {
            console.log(`単語重複検出: ${problem.word} (${problem.grade}/${problem.level})`);
            return false; // 重複
        }
        
        // 問題追加
        problem.created_at = new Date().toISOString();
        pool.english[problem.grade][problem.level].push(problem);
        
        // 統計更新
        if (!pool.stats) {
            pool.stats = { total_problems: 0, problems_by_grade: {} };
        }
        pool.stats.total_problems++;
        pool.stats.last_updated = new Date().toISOString();
        if (!pool.stats.problems_by_grade[problem.grade]) {
            pool.stats.problems_by_grade[problem.grade] = 0;
        }
        pool.stats.problems_by_grade[problem.grade]++;
        
        return saveProblemPool(pool);
    } catch (error) {
        console.error('英語問題追加エラー:', error);
        return false;
    }
};

// 旧関数名の互換性維持（数学用）
const addProblemToPool = addMathProblemToPool;

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

// 開発環境用のシンプルで確実なCORS設定
app.use(cors({
  origin: true, // 開発環境では全てのオリジンを許可
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept', 'Cache-Control', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
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


// 数学問題一括生成API
app.post('/api/generate-math-batch', async (req, res) => {
    if (!openai) {
        return res.status(503).json({
            success: false,
            error: 'OpenAI API機能が利用できません。環境変数を確認してください。',
        });
    }

    try {
        const { grade, unit, level, count } = req.body;

        if (!grade || !unit || !level || !count) {
            return res.status(400).json({
                success: false,
                error: '必要なパラメータが不足しています（grade, unit, level, count）',
            });
        }

        console.log(`📝 数学問題一括生成リクエスト (OpenAI): ${count}問`);
        console.log('リクエストボディ:', JSON.stringify(req.body, null, 2));

        const prompt = `
カリタス中学校の体系数学に準拠した数学問題を${count}問作成してください。

設定:
- 学年: ${grade}
- 分野: ${unit}
- 難易度: ${level}

以下の条件を満たしてください:
1. ${grade}レベルに適した問題
2. 思考力を要する良質な問題
3. カリタス中学校の高度なカリキュラムに対応
4. ${count}問すべてが異なる内容で、バラエティに富んだ問題構成
5. 問題の重複を避け、多様なアプローチを含む

**解説は絶対に省略せず、中学生が理解できるよう一つ一つの手順を丁寧に説明してください。**

回答は以下のJSON形式で、${count}問の配列でお願いします:
{
  "problems": [
    {
      "grade": "${grade}",
      "level": "${level}",
      "unit": "実際に選択した具体的な単元名",
      "problem": "問題文（数式含む）",
      "steps": [
        {
          "step": "問題理解・条件整理",
          "content": "問題文から読み取れる情報を全て整理し、求めるものを明確にする",
          "explanation": "なぜこの情報が重要なのか、どのように問題を解釈するかを詳しく説明",
          "detail": "見落としがちなポイントや、問題文の読み方のコツ"
        },
        {
          "step": "解法の選択と方針決定",
          "content": "複数の解法から最適なものを選択し、なぜその方法が良いかを判断する",
          "explanation": "解法選択の根拠を論理的に説明し、他の方法との比較も行う",
          "detail": "初学者が迷いがちな解法選択のポイントと、効率的な解き方の理由"
        },
        {
          "step": "式の変形・計算の準備",
          "content": "解法に必要な公式や定理を確認し、計算の準備を整える",
          "explanation": "使用する公式がなぜ適用できるのか、条件を満たしているかを確認",
          "detail": "公式を覚えるコツや、条件確認の重要性について"
        },
        {
          "step": "計算過程（詳細ステップ）",
          "content": "一行一行の計算を省略せず、すべての変形過程を丁寧に示す",
          "explanation": "各変形の理由と、なぜその計算が必要なのかを詳しく説明",
          "detail": "計算ミスを防ぐコツ、計算の工夫、符号や分数の扱い方"
        },
        {
          "step": "論理的思考と推論",
          "content": "計算結果から結論を導く論理的プロセスを明確に示す",
          "explanation": "なぜその結論が正しいと言えるのか、推論の根拠を説明",
          "detail": "数学的推論の進め方、証明的な考え方のポイント"
        },
        {
          "step": "検算と解の妥当性確認",
          "content": "複数の方法で答えを確認し、解が問題の条件を満たすかチェック",
          "explanation": "検算の具体的手順と、解の意味が現実的かどうかの確認方法",
          "detail": "見落としがちな検算ポイント、解の範囲や単位の確認"
        },
        {
          "step": "まとめと応用・発展",
          "content": "解答プロセス全体のまとめと、類似問題への応用方法",
          "explanation": "この問題で学んだことの本質と、他の問題でも使える考え方",
          "detail": "発展的な問題例、入試でよく出る類似パターン、覚えておくべきポイント"
        }
      ],
      "answer": "最終的な答案",
      "hint": "困ったときのヒント",
      "difficulty_analysis": "この問題の難しさの分析",
      "learning_point": "この問題で身につく学習内容"
    }
  ]
}`;

        const messages = [{
            role: 'user',
            content: prompt,
        }];

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 16000,  // 複数問題のため大幅に増加
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: messages,
        });

        const result = response.choices[0].message.content;

        try {
            const batchData = JSON.parse(result);

            // problems配列の検証
            if (!batchData.problems || !Array.isArray(batchData.problems)) {
                throw new Error('problems配列が見つかりません');
            }

            if (batchData.problems.length !== parseInt(count)) {
                console.warn(`要求数: ${count}, 生成数: ${batchData.problems.length}`);
            }

            // 各問題の必要フィールドを検証
            const requiredFields = ['grade', 'level', 'unit', 'problem', 'steps', 'answer'];
            batchData.problems.forEach((problem, index) => {
                const missingFields = requiredFields.filter(field => !problem[field]);
                if (missingFields.length > 0) {
                    throw new Error(`問題${index + 1}で必要フィールドが不足: ${missingFields.join(', ')}`);
                }
            });

            console.log(`✅ 数学問題一括生成成功 (OpenAI): ${batchData.problems.length}問`);
            res.json({ success: true, result });

        } catch (parseError) {
            console.error('JSON解析エラー (OpenAI 一括生成):', parseError.message);
            res.status(400).json({
                success: false,
                error: 'AI応答の形式が不正です',
                details: parseError.message,
                raw_response: result.substring(0, 500) + '...'
            });
        }

    } catch (error) {
        console.error('数学問題一括生成エラー (OpenAI):', error);
        if (error instanceof OpenAI.APIError) {
            return res.status(error.status || 500).json({
                success: false,
                error: 'OpenAI APIとの通信中にエラーが発生しました。',
                details: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: 'AI問題一括生成中にサーバー内部でエラーが発生しました',
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

// 英単語4択問題生成API
app.post('/api/generate-english-quiz', async (req, res) => {
    if (!openai) {
        return res.status(503).json({
            success: false,
            error: 'OpenAI API機能が利用できません。環境変数を確認してください。',
        });
    }

    try {
        const { grade, level } = req.body;

        if (!grade || !level) {
            return res.status(400).json({
                success: false,
                error: '学年と難易度が必要です（grade, level）',
            });
        }

        console.log('📝 英単語4択問題生成リクエスト (OpenAI)');
        console.log('リクエストボディ:', JSON.stringify(req.body, null, 2));

        const prompt = `
カリタス中学校のProgress 21に準拠した英単語4択問題を1問作成してください。

設定:
- 学年: ${grade}
- 難易度レベル: ${level}

以下の条件を満たしてください:
1. ${grade}レベルに適した英単語
2. Progress 21で学習する重要な語彙
3. 紛らわしい選択肢で思考力を要する問題
4. 中学生が理解できる詳細な解説

回答は以下のJSON形式でお願いします:
{
  "word": "英単語（小文字）",
  "pronunciation": "発音記号",
  "grade": "${grade}",
  "level": "${level}",
  "correct_meaning": "正しい日本語の意味",
  "wrong_options": [
    "間違い選択肢1",
    "間違い選択肢2",
    "間違い選択肢3"
  ],
  "explanation": "この単語の詳細な解説（語源、使い方、注意点など）",
  "examples": [
    {
      "sentence": "英語例文1",
      "translation": "日本語訳1"
    },
    {
      "sentence": "英語例文2",
      "translation": "日本語訳2"
    }
  ],
  "difficulty_analysis": "この問題の難易度分析",
  "learning_point": "この単語の学習ポイント"
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.
        `;

        const messages = [{
            role: 'user',
            content: prompt,
        }];

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 2000,
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: messages,
        });

        const result = response.choices[0].message.content;

        try {
            const quizData = JSON.parse(result);

            // 必要フィールドの検証
            const requiredFields = ['word', 'correct_meaning', 'wrong_options', 'explanation'];
            const missingFields = requiredFields.filter(field => !quizData[field]);

            if (missingFields.length > 0) {
                throw new Error(`必要フィールドが不足: ${missingFields.join(', ')}`);
            }

            // wrong_optionsが配列で3個あるかチェック
            if (!Array.isArray(quizData.wrong_options) || quizData.wrong_options.length !== 3) {
                throw new Error('wrong_optionsは3個の配列である必要があります');
            }

            console.log('✅ 英単語4択問題生成成功 (OpenAI)');
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
        console.error('英単語4択問題生成エラー (OpenAI):', error);
        if (error instanceof OpenAI.APIError) {
            return res.status(error.status || 500).json({
                success: false,
                error: 'OpenAI APIとの通信中にエラーが発生しました。',
                details: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: 'AI英単語4択問題生成中にサーバー内部でエラーが発生しました',
            details: error.message,
        });
    }
});

// 英単語4択問題一括生成API
app.post('/api/generate-english-quiz-batch', async (req, res) => {
    if (!openai) {
        return res.status(503).json({
            success: false,
            error: 'OpenAI API機能が利用できません。環境変数を確認してください。',
        });
    }

    try {
        const { grade, level, count } = req.body;

        if (!grade || !level || !count) {
            return res.status(400).json({
                success: false,
                error: '必要なパラメータが不足しています（grade, level, count）',
            });
        }

        console.log(`📝 英単語4択問題一括生成リクエスト (OpenAI): ${count}問`);
        console.log('リクエストボディ:', JSON.stringify(req.body, null, 2));

        const prompt = `
カリタス中学校のProgress 21に準拠した英単語4択問題を${count}問作成してください。

設定:
- 学年: ${grade}
- 難易度レベル: ${level}

以下の条件を満たしてください:
1. ${grade}レベルに適した英単語
2. Progress 21で学習する重要な語彙
3. ${count}問すべてが異なる単語で、重複を避ける
4. 紛らわしい選択肢で思考力を要する問題
5. 中学生が理解できる詳細な解説

回答は以下のJSON形式で、${count}問の配列でお願いします:
{
  "problems": [
    {
      "word": "英単語（小文字）",
      "pronunciation": "発音記号",
      "grade": "${grade}",
      "level": "${level}",
      "correct_meaning": "正しい日本語の意味",
      "wrong_options": [
        "間違い選択肢1",
        "間違い選択肢2",
        "間違い選択肢3"
      ],
      "explanation": "この単語の詳細な解説（語源、使い方、注意点など）",
      "examples": [
        {
          "sentence": "英語例文1",
          "translation": "日本語訳1"
        },
        {
          "sentence": "英語例文2",
          "translation": "日本語訳2"
        }
      ],
      "difficulty_analysis": "この問題の難易度分析",
      "learning_point": "この単語の学習ポイント"
    }
  ]
}
        `;

        const messages = [{
            role: 'user',
            content: prompt,
        }];

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 16000,  // 複数問題のため大幅に増加
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: messages,
        });

        const result = response.choices[0].message.content;

        try {
            const batchData = JSON.parse(result);

            // problems配列の検証
            if (!batchData.problems || !Array.isArray(batchData.problems)) {
                throw new Error('problems配列が見つかりません');
            }

            if (batchData.problems.length !== parseInt(count)) {
                console.warn(`要求数: ${count}, 生成数: ${batchData.problems.length}`);
            }

            // 各問題の必要フィールドを検証
            const requiredFields = ['word', 'correct_meaning', 'wrong_options', 'explanation'];
            batchData.problems.forEach((problem, index) => {
                const missingFields = requiredFields.filter(field => !problem[field]);
                if (missingFields.length > 0) {
                    throw new Error(`問題${index + 1}で必要フィールドが不足: ${missingFields.join(', ')}`);
                }
                
                // wrong_optionsが配列で3個あるかチェック
                if (!Array.isArray(problem.wrong_options) || problem.wrong_options.length !== 3) {
                    throw new Error(`問題${index + 1}のwrong_optionsは3個の配列である必要があります`);
                }
            });

            console.log(`✅ 英単語4択問題一括生成成功 (OpenAI): ${batchData.problems.length}問`);
            res.json({ success: true, result });

        } catch (parseError) {
            console.error('JSON解析エラー (OpenAI 一括生成):', parseError.message);
            res.status(400).json({
                success: false,
                error: 'AI応答の形式が不正です',
                details: parseError.message,
                raw_response: result.substring(0, 500) + '...'
            });
        }

    } catch (error) {
        console.error('英単語4択問題一括生成エラー (OpenAI):', error);
        if (error instanceof OpenAI.APIError) {
            return res.status(error.status || 500).json({
                success: false,
                error: 'OpenAI APIとの通信中にエラーが発生しました。',
                details: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: 'AI英単語4択問題一括生成中にサーバー内部でエラーが発生しました',
            details: error.message,
        });
    }
});

// 数学問題プールから問題取得API
app.get('/api/problem-pool/:grade/:unit/:level', (req, res) => {
    try {
        const { grade, unit, level } = req.params;
        
        console.log(`📚 数学問題プール取得リクエスト: ${grade}/${unit}/${level}`);
        
        const problem = getRandomMathProblem(grade, unit, level);
        
        if (!problem) {
            return res.status(404).json({
                success: false,
                error: '該当する問題が見つかりません',
                message: `${grade}の${unit}（${level}レベル）の問題がプールに存在しません`,
                suggestion: 'AI生成機能を使用して問題を作成し、プールに追加してください'
            });
        }
        
        console.log(`✅ 数学問題プールから取得成功: ${problem.id}`);
        res.json({
            success: true,
            problem: problem,
            source: 'pool'
        });
        
    } catch (error) {
        console.error('数学問題プール取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '問題プールの取得中にエラーが発生しました',
            details: error.message
        });
    }
});

// 英語問題プールから問題取得API
app.get('/api/english-pool/:grade/:level', (req, res) => {
    try {
        const { grade, level } = req.params;
        const { exclude } = req.query; // 除外する単語リスト（カンマ区切り）
        
        console.log(`📚 英語問題プール取得リクエスト: ${grade}/${level}`);
        
        const excludeWords = exclude ? exclude.split(',') : [];
        const problem = getRandomEnglishProblem(grade, level, excludeWords);
        
        if (!problem) {
            return res.status(404).json({
                success: false,
                error: '該当する問題が見つかりません',
                message: `${grade}の${level}レベルの英語問題がプールに存在しません`,
                suggestion: 'AI生成機能を使用して英語問題を作成し、プールに追加してください'
            });
        }
        
        console.log(`✅ 英語問題プールから取得成功: ${problem.word}`);
        res.json({
            success: true,
            problem: problem,
            source: 'pool'
        });
        
    } catch (error) {
        console.error('英語問題プール取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '英語問題プールの取得中にエラーが発生しました',
            details: error.message
        });
    }
});

// 問題プール統計情報取得API
app.get('/api/problem-pool/stats', (req, res) => {
    try {
        const pool = loadProblemPool();
        
        // 詳細な統計情報を計算
        const stats = {
            total_problems: pool.stats?.total_problems || 0,
            last_updated: pool.stats?.last_updated || null,
            problems_by_grade: pool.stats?.problems_by_grade || {},
            problems_by_level: {},
            problems_by_unit: {},
            problems_by_subject: { math: 0, english: 0 },
            available_combinations: []
        };
        
        // 数学：学年・レベル・単元別の統計を計算
        Object.entries(pool.math || {}).forEach(([grade, gradeData]) => {
            Object.entries(gradeData).forEach(([unit, unitData]) => {
                Object.entries(unitData).forEach(([level, problems]) => {
                    if (Array.isArray(problems) && problems.length > 0) {
                        stats.problems_by_subject.math += problems.length;
                        
                        // レベル別統計
                        if (!stats.problems_by_level[level]) {
                            stats.problems_by_level[level] = 0;
                        }
                        stats.problems_by_level[level] += problems.length;
                        
                        // 単元別統計
                        if (!stats.problems_by_unit[unit]) {
                            stats.problems_by_unit[unit] = 0;
                        }
                        stats.problems_by_unit[unit] += problems.length;
                        
                        // 利用可能な組み合わせ
                        stats.available_combinations.push({
                            subject: 'math',
                            grade,
                            unit,
                            level,
                            count: problems.length
                        });
                    }
                });
            });
        });
        
        // 英語：学年・レベル別の統計を計算
        Object.entries(pool.english || {}).forEach(([grade, gradeData]) => {
            Object.entries(gradeData).forEach(([level, problems]) => {
                if (Array.isArray(problems) && problems.length > 0) {
                    stats.problems_by_subject.english += problems.length;
                    
                    // レベル別統計
                    if (!stats.problems_by_level[level]) {
                        stats.problems_by_level[level] = 0;
                    }
                    stats.problems_by_level[level] += problems.length;
                    
                    // 利用可能な組み合わせ
                    stats.available_combinations.push({
                        subject: 'english',
                        grade,
                        level,
                        count: problems.length
                    });
                }
            });
        });
        
        console.log('📊 問題プール統計情報取得成功');
        res.json({ success: true, stats });
        
    } catch (error) {
        console.error('問題プール統計情報取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '統計情報の取得中にエラーが発生しました',
            details: error.message
        });
    }
});

// AI生成数学問題をプールに追加API
app.post('/api/problem-pool/add', (req, res) => {
    try {
        const { problem } = req.body;
        
        if (!problem) {
            return res.status(400).json({
                success: false,
                error: '問題データが指定されていません'
            });
        }
        
        // 必要フィールドの検証
        const requiredFields = ['grade', 'level', 'unit', 'problem', 'answer'];
        const missingFields = requiredFields.filter(field => !problem[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: '必要フィールドが不足しています',
                missing_fields: missingFields
            });
        }
        
        // ユニークIDを生成（既に存在しない場合）
        if (!problem.id) {
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000);
            problem.id = `math_${problem.grade.replace(/[^a-zA-Z0-9]/g, '')}_${problem.unit.replace(/[^a-zA-Z0-9]/g, '')}_${problem.level}_${timestamp}_${random}`;
        }
        
        console.log(`📝 数学問題プール追加リクエスト: ${problem.id}`);
        
        const success = addMathProblemToPool(problem);
        
        if (!success) {
            return res.status(409).json({
                success: false,
                error: '問題の追加に失敗しました',
                reason: '同じIDの問題が既に存在するか、保存処理でエラーが発生しました'
            });
        }
        
        console.log(`✅ 数学問題プール追加成功: ${problem.id}`);
        res.json({
            success: true,
            message: '数学問題をプールに追加しました',
            problem_id: problem.id
        });
        
    } catch (error) {
        console.error('数学問題プール追加エラー:', error);
        res.status(500).json({
            success: false,
            error: '問題の追加中にエラーが発生しました',
            details: error.message
        });
    }
});

// AI生成英語問題をプールに追加API
app.post('/api/english-pool/add', (req, res) => {
    try {
        const { problem } = req.body;
        
        if (!problem) {
            return res.status(400).json({
                success: false,
                error: '英語問題データが指定されていません'
            });
        }
        
        // 必要フィールドの検証
        const requiredFields = ['grade', 'level', 'word', 'correct_meaning', 'wrong_options'];
        const missingFields = requiredFields.filter(field => !problem[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: '必要フィールドが不足しています',
                missing_fields: missingFields
            });
        }
        
        // wrong_optionsの検証
        if (!Array.isArray(problem.wrong_options) || problem.wrong_options.length !== 3) {
            return res.status(400).json({
                success: false,
                error: 'wrong_optionsは3個の配列である必要があります'
            });
        }
        
        console.log(`📝 英語問題プール追加リクエスト: ${problem.word} (${problem.grade}/${problem.level})`);
        
        const success = addEnglishProblemToPool(problem);
        
        if (!success) {
            return res.status(409).json({
                success: false,
                error: '英語問題の追加に失敗しました',
                reason: '同じ単語の問題が既に存在するか、保存処理でエラーが発生しました'
            });
        }
        
        console.log(`✅ 英語問題プール追加成功: ${problem.word}`);
        res.json({
            success: true,
            message: '英語問題をプールに追加しました',
            word: problem.word,
            grade: problem.grade,
            level: problem.level
        });
        
    } catch (error) {
        console.error('英語問題プール追加エラー:', error);
        res.status(500).json({
            success: false,
            error: '英語問題の追加中にエラーが発生しました',
            details: error.message
        });
    }
});

// AI生成数学問題をプールに一括追加API
app.post('/api/problem-pool/add-batch', (req, res) => {
    try {
        const { problems } = req.body;
        
        if (!problems || !Array.isArray(problems) || problems.length === 0) {
            return res.status(400).json({
                success: false,
                error: '問題データ配列が指定されていません'
            });
        }
        
        console.log(`📝 数学問題プール一括追加リクエスト: ${problems.length}問`);
        
        const results = [];
        let successCount = 0;
        let failureCount = 0;
        
        for (let i = 0; i < problems.length; i++) {
            const problem = problems[i];
            
            try {
                // 必要フィールドの検証
                const requiredFields = ['grade', 'level', 'unit', 'problem', 'answer'];
                const missingFields = requiredFields.filter(field => !problem[field]);
                
                if (missingFields.length > 0) {
                    throw new Error(`必要フィールドが不足: ${missingFields.join(', ')}`);
                }
                
                // ユニークIDを生成（既に存在しない場合）
                if (!problem.id) {
                    const timestamp = Date.now();
                    const random = Math.floor(Math.random() * 1000);
                    problem.id = `math_${problem.grade.replace(/[^a-zA-Z0-9]/g, '')}_${problem.unit.replace(/[^a-zA-Z0-9]/g, '')}_${problem.level}_${timestamp}_${random}_${i}`;
                }
                
                const success = addMathProblemToPool(problem);
                
                if (success) {
                    results.push({
                        index: i,
                        success: true,
                        problem_id: problem.id,
                        message: '追加成功'
                    });
                    successCount++;
                } else {
                    throw new Error('プール追加処理が失敗しました');
                }
                
            } catch (error) {
                console.error(`数学問題${i + 1}の追加エラー:`, error.message);
                results.push({
                    index: i,
                    success: false,
                    error: error.message,
                    problem_info: `${problem.grade || '不明'} ${problem.unit || '不明'} ${problem.level || '不明'}`
                });
                failureCount++;
            }
        }
        
        const overallSuccess = failureCount === 0;
        const message = `数学問題一括追加完了: 成功${successCount}問, 失敗${failureCount}問`;
        
        console.log(`✅ ${message}`);
        
        res.json({
            success: overallSuccess,
            message: message,
            total_count: problems.length,
            success_count: successCount,
            failure_count: failureCount,
            results: results
        });
        
    } catch (error) {
        console.error('数学問題プール一括追加エラー:', error);
        res.status(500).json({
            success: false,
            error: '一括追加中にサーバーエラーが発生しました',
            details: error.message
        });
    }
});

// AI生成英語問題をプールに一括追加API
app.post('/api/english-pool/add-batch', (req, res) => {
    try {
        const { problems } = req.body;
        
        if (!problems || !Array.isArray(problems) || problems.length === 0) {
            return res.status(400).json({
                success: false,
                error: '英語問題データ配列が指定されていません'
            });
        }
        
        console.log(`📝 英語問題プール一括追加リクエスト: ${problems.length}問`);
        
        const results = [];
        let successCount = 0;
        let failureCount = 0;
        
        for (let i = 0; i < problems.length; i++) {
            const problem = problems[i];
            
            try {
                // 必要フィールドの検証
                const requiredFields = ['grade', 'level', 'word', 'correct_meaning', 'wrong_options'];
                const missingFields = requiredFields.filter(field => !problem[field]);
                
                if (missingFields.length > 0) {
                    throw new Error(`必要フィールドが不足: ${missingFields.join(', ')}`);
                }
                
                // wrong_optionsの検証
                if (!Array.isArray(problem.wrong_options) || problem.wrong_options.length !== 3) {
                    throw new Error('wrong_optionsは3個の配列である必要があります');
                }
                
                const success = addEnglishProblemToPool(problem);
                
                if (success) {
                    results.push({
                        index: i,
                        success: true,
                        word: problem.word,
                        message: '追加成功'
                    });
                    successCount++;
                } else {
                    throw new Error('プール追加処理が失敗しました（単語重複の可能性）');
                }
                
            } catch (error) {
                console.error(`英語問題${i + 1}の追加エラー:`, error.message);
                results.push({
                    index: i,
                    success: false,
                    error: error.message,
                    problem_info: `${problem.word || '不明'} (${problem.grade || '不明'}/${problem.level || '不明'})`
                });
                failureCount++;
            }
        }
        
        const overallSuccess = failureCount === 0;
        const message = `英語問題一括追加完了: 成功${successCount}問, 失敗${failureCount}問`;
        
        console.log(`✅ ${message}`);
        
        res.json({
            success: overallSuccess,
            message: message,
            total_count: problems.length,
            success_count: successCount,
            failure_count: failureCount,
            results: results
        });
        
    } catch (error) {
        console.error('英語問題プール一括追加エラー:', error);
        res.status(500).json({
            success: false,
            error: '一括追加中にサーバーエラーが発生しました',
            details: error.message
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
