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

// ランダム問題選択（英語用）- 適応学習対応版
const getRandomEnglishProblem = (grade, level, excludeWords = [], priorityWords = []) => {
    const pool = loadProblemPool();
    
    console.log('🔍 [DEBUG] 英語問題プール詳細:', {
        grade,
        level,
        excludeWords: excludeWords.length,
        priorityWords: priorityWords.length,
        poolKeys: Object.keys(pool.english || {}),
        gradeExists: !!pool.english?.[grade],
        levelExists: !!pool.english?.[grade]?.[level],
        problemsLength: pool.english?.[grade]?.[level]?.length || 0
    });
    
    try {
        const problems = pool.english?.[grade]?.[level];
        
        if (!problems || !Array.isArray(problems) || problems.length === 0) {
            console.log('🔍 [DEBUG] 英語問題が見つかりません:', {
                grade,
                level,
                gradeType: typeof grade,
                levelType: typeof level,
                gradeDecoded: decodeURIComponent(grade),
                levelDecoded: decodeURIComponent(level),
                englishDataExists: !!pool.english,
                gradeDataExists: !!pool.english?.[grade],
                levelDataExists: !!pool.english?.[grade]?.[level],
                gradeDecodedExists: !!pool.english?.[decodeURIComponent(grade)],
                levelDecodedExists: !!pool.english?.[decodeURIComponent(grade)]?.[decodeURIComponent(level)],
                availableGrades: pool.english ? Object.keys(pool.english) : [],
                availableLevels: pool.english?.[grade] ? Object.keys(pool.english[grade]) : [],
                availableLevelsDecoded: pool.english?.[decodeURIComponent(grade)] ? Object.keys(pool.english[decodeURIComponent(grade)]) : []
            });
            return null;
        }
        
        // 優先単語がある場合、その中から選択を試行
        if (priorityWords.length > 0) {
            const priorityProblems = problems.filter(problem =>
                priorityWords.includes(problem.word)
            );
            
            if (priorityProblems.length > 0) {
                console.log(`🎯 優先単語から選択: ${priorityProblems.map(p => p.word).join(', ')}`);
                const randomIndex = Math.floor(Math.random() * priorityProblems.length);
                return priorityProblems[randomIndex];
            }
            
            console.log('⚠️ 優先単語がプールに見つからないため、通常選択にフォールバック');
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

// URL エンコーディング設定（日本語対応）
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));

// 全リクエストログ（デバッグ用）
app.use((req, res, next) => {
    console.log('🌐 [DEBUG] リクエスト受信:', {
        method: req.method,
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl
    });
    
    if (req.url.includes('/api/english-quiz/')) {
        console.log('🎯 [DEBUG] 英語クイズAPIリクエスト詳細:', {
            method: req.method,
            path: req.path,
            url: req.url,
            params: req.params,
            query: req.query,
            originalUrl: req.originalUrl,
            pathDecoded: decodeURIComponent(req.path),
            urlDecoded: decodeURIComponent(req.url)
        });
    }
    next();
});

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

        // JSON形式の安定性を向上させるためのプロンプト改善
        const enhancedPrompt = `${prompt}

**重要: 回答は必ず有効なJSON形式で出力してください。**

以下の構造に厳密に従ってください。すべてのフィールドは必須です:
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
}

注意事項:
- 文字列内に改行が含まれる場合は\\nを使用してください
- ダブルクォーテーションを含む場合は\\\"でエスケープしてください
- JSON以外のテキストは出力しないでください
- 必ず有効なJSON形式で回答してください`;

        const messages = [{
            role: 'user',
            content: enhancedPrompt,
        }];
        console.log('OpenAIへのリクエスト:', JSON.stringify(messages, null, 2));

        // gpt-4o-mini統一モデル使用
        console.log('🚀 gpt-4o-mini で問題生成中...');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 3000,
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: messages,
        });
        console.log('✅ gpt-4o-mini 問題生成成功');

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

        // gpt-4o-mini統一モデル使用
        console.log('🚀 gpt-4o-mini で一括問題生成中...');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 16000,  // 複数問題のため大幅に増加
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: messages,
        });
        console.log('✅ gpt-4o-mini 一括問題生成成功');

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

        // JSON形式の安定性を向上させるためのプロンプト改善
        const enhancedPrompt = `${prompt}

**重要: 回答は必ず有効なJSON形式で出力してください。**

以下の構造に厳密に従ってください。すべてのフィールドは必須です:
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
}

注意事項:
- 文字列内に改行が含まれる場合は\\nを使用してください
- ダブルクォーテーションを含む場合は\\\"でエスケープしてください
- JSON以外のテキストは出力しないでください
- 必ず有効なJSON形式で回答してください`;

        const messages = [{
            role: 'user',
            content: enhancedPrompt,
        }];
        console.log('OpenAIへのリクエスト:', JSON.stringify(messages, null, 2));

        // gpt-4o-mini統一モデル使用
        console.log('🚀 gpt-4o-mini で英語単語生成中...');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 2000,
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: messages,
        });
        console.log('✅ gpt-4o-mini 英語単語生成成功');

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

**重要事項:**
- 回答は必ず有効なJSON形式で出力してください
- 文字列内に改行が含まれる場合は\\nを使用してください
- ダブルクォーテーションを含む場合は\\\"でエスケープしてください
- JSON以外のテキストは出力しないでください
- すべてのフィールドが必須です

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.
        `;

        const messages = [{
            role: 'user',
            content: prompt,
        }];

        // gpt-4o-mini統一モデル使用
        console.log('🚀 gpt-4o-mini で英単語4択問題生成中...');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 2000,
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: messages,
        });
        console.log('✅ gpt-4o-mini 英単語4択問題生成成功');

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
**重要事項:**
- 回答は必ず有効なJSON形式で出力してください
- 文字列内に改行が含まれる場合は\\nを使用してください
- ダブルクォーテーションを含む場合は\\\"でエスケープしてください
- JSON以外のテキストは出力しないでください
- すべてのフィールドが必須です
        `;

        const messages = [{
            role: 'user',
            content: prompt,
        }];

        // gpt-4o-mini統一モデル使用
        console.log('🚀 gpt-4o-mini で英単語4択問題一括生成中...');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 16000,  // 複数問題のため大幅に増加
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: messages,
        });
        console.log('✅ gpt-4o-mini 英単語4択問題一括生成成功');

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

// カテゴリ毎一括問題生成API（最適化版）
app.post('/api/generate-category-batch', async (req, res) => {
    if (!openai) {
        return res.status(503).json({
            success: false,
            error: 'OpenAI API機能が利用できません。環境変数を確認してください。',
        });
    }

    try {
        const { subject, grade, unit, level, count } = req.body;

        if (!subject || !grade || !level || !count) {
            return res.status(400).json({
                success: false,
                error: '必要なパラメータが不足しています（subject, grade, level, count）',
                required: ['subject', 'grade', 'level', 'count'],
                optional: ['unit (数学のみ)']
            });
        }

        console.log(`📝 カテゴリ毎一括生成リクエスト: ${subject} ${count}問`);
        console.log('パラメータ:', JSON.stringify(req.body, null, 2));

        let prompt = '';
        let batchSystemMessage = '';

        if (subject === 'math') {
            // 数学問題用プロンプト（最適化版）
            if (!unit) {
                return res.status(400).json({
                    success: false,
                    error: '数学問題では分野（unit）パラメータが必要です'
                });
            }

            batchSystemMessage = `あなたはカリタス中学校の数学教師として、高品質な問題を効率的に大量生成する専門家です。一度に${count}問の多様で教育的価値の高い問題を作成してください。`;

            prompt = `
${batchSystemMessage}

カリタス中学校の体系数学に準拠した数学問題を${count}問、一括で効率的に作成してください。

## 生成設定:
- 学年: ${grade}
- 分野: ${unit}
- 難易度: ${level}
- 生成数: ${count}問

## 効率化要件:
1. ${count}問すべてが異なる内容・アプローチで多様性を確保
2. 同一分野内での様々な観点・難易度幅を含む
3. 段階的な学習進行を考慮した問題配列
4. 計算量・思考プロセスの多様化

## 品質基準:
- ${grade}レベルに完全適合
- カリタス中学校の高度カリキュラム対応
- 入試対策にも活用可能な良質問題
- 各問題が独立して完結

**解説は省略せず、中学生の理解を深める詳細な説明を含めてください。**

回答は以下のJSON形式で、厳密に${count}問の配列を返してください:
{
  "problems": [
    {
      "grade": "${grade}",
      "level": "${level}",
      "unit": "具体的な単元名",
      "problem": "問題文（数式・図表含む）",
      "steps": [
        {
          "step": "ステップタイトル",
          "content": "実行内容",
          "explanation": "詳細解説",
          "detail": "学習ポイント"
        }
      ],
      "answer": "最終答案",
      "hint": "解法ヒント",
      "difficulty_analysis": "難易度分析",
      "learning_point": "学習効果",
      "estimated_time": "想定解答時間（分）",
      "category_tag": "問題分類タグ"
    }
  ]
}`;

        } else if (subject === 'english') {
            // 英語問題用プロンプト（最適化版）
            batchSystemMessage = `あなたはカリタス中学校の英語教師として、Progress 21に準拠した高品質な4択問題を効率的に大量生成する専門家です。語彙の多様性と学習効果を最大化した${count}問を一括作成してください。`;

            prompt = `
${batchSystemMessage}

カリタス中学校のProgress 21に準拠した英単語4択問題を${count}問、一括で効率的に作成してください。

## 生成設定:
- 学年: ${grade}
- 難易度: ${level}
- 生成数: ${count}問

## 効率化要件:
1. ${count}問すべて異なる単語で重複完全排除
2. Progress 21の重要語彙を幅広くカバー
3. 紛らわしい選択肢で思考力を育成
4. 語彙レベルの段階的な配置

## 品質基準:
- ${grade}${level}レベル完全適合
- 実用的で覚えやすい語彙選択
- 文法・語法も考慮した例文
- 記憶定着を促進する解説

回答は以下のJSON形式で、厳密に${count}問の配列を返してください:
{
  "problems": [
    {
      "word": "英単語（小文字）",
      "pronunciation": "発音記号",
      "grade": "${grade}",
      "level": "${level}",
      "correct_meaning": "正しい日本語の意味",
      "wrong_options": [
        "紛らわしい選択肢1",
        "紛らわしい選択肢2",
        "紛らわしい選択肢3"
      ],
      "explanation": "単語の詳細解説（語源・使い方・注意点）",
      "examples": [
        {
          "sentence": "実用的な英語例文1",
          "translation": "自然な日本語訳1"
        },
        {
          "sentence": "実用的な英語例文2",
          "translation": "自然な日本語訳2"
        }
      ],
      "difficulty_analysis": "この単語の習得難易度分析",
      "learning_point": "効果的な覚え方・学習ポイント",
      "word_frequency": "使用頻度（高/中/低）",
      "category_tag": "語彙分類（動詞/名詞/形容詞等）"
    }
  ]
}`;

        } else {
            return res.status(400).json({
                success: false,
                error: 'サポートされていない科目です',
                supported_subjects: ['math', 'english']
            });
        }

        const messages = [{
            role: 'system',
            content: batchSystemMessage
        }, {
            role: 'user',
            content: prompt
        }];

        // gpt-4o-mini統一モデル使用（最適化されたトークン制限）
        const maxTokens = Math.min(15000, count * 600);  // gpt-4o-mini用
        
        console.log(`🚀 gpt-4o-mini でカテゴリ一括生成中... (${maxTokens}トークン, ${count}問)`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: maxTokens,
            temperature: 0.7, // 多様性のため
            response_format: { type: "json_object" },
            messages: messages,
        });
        console.log('✅ gpt-4o-mini カテゴリ一括生成成功');

        const result = response.choices[0].message.content;

        try {
            const batchData = JSON.parse(result);

            // problems配列の検証
            if (!batchData.problems || !Array.isArray(batchData.problems)) {
                throw new Error('problems配列が見つかりません');
            }

            if (batchData.problems.length !== parseInt(count)) {
                console.warn(`要求数: ${count}, 実際生成数: ${batchData.problems.length}`);
            }

            // 科目別フィールド検証
            const requiredFields = subject === 'math'
                ? ['grade', 'level', 'unit', 'problem', 'steps', 'answer']
                : ['word', 'grade', 'level', 'correct_meaning', 'wrong_options', 'explanation'];

            batchData.problems.forEach((problem, index) => {
                const missingFields = requiredFields.filter(field => !problem[field]);
                if (missingFields.length > 0) {
                    throw new Error(`問題${index + 1}で必要フィールドが不足: ${missingFields.join(', ')}`);
                }

                // 英語問題の追加検証
                if (subject === 'english') {
                    if (!Array.isArray(problem.wrong_options) || problem.wrong_options.length !== 3) {
                        throw new Error(`問題${index + 1}のwrong_optionsは3個の配列である必要があります`);
                    }
                }
            });

            // 成功統計
            const generatedCount = batchData.problems.length;
            const efficiency = Math.round((generatedCount / count) * 100);
            
            console.log(`✅ カテゴリ毎一括生成成功: ${subject} ${generatedCount}問 (効率率: ${efficiency}%)`);
            
            res.json({
                success: true,
                result,
                metadata: {
                    subject,
                    grade,
                    unit: unit || null,
                    level,
                    requested_count: parseInt(count),
                    generated_count: generatedCount,
                    efficiency_rate: efficiency,
                    generation_time: new Date().toISOString(),
                    cost_optimization: `${Math.floor((20 - 1) / 20 * 100)}%削減（1回のAPI呼び出し）`
                }
            });

        } catch (parseError) {
            console.error('JSON解析エラー (カテゴリ一括生成):', parseError.message);
            res.status(400).json({
                success: false,
                error: 'AI応答の形式が不正です',
                details: parseError.message,
                raw_response: result.substring(0, 500) + '...'
            });
        }

    } catch (error) {
        console.error('カテゴリ毎一括生成エラー:', error);
        if (error instanceof OpenAI.APIError) {
            return res.status(error.status || 500).json({
                success: false,
                error: 'OpenAI APIとの通信中にエラーが発生しました。',
                details: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: 'カテゴリ毎一括生成中にサーバー内部でエラーが発生しました',
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

// 英語問題プールから問題取得API - 適応学習対応版
app.get('/api/english-pool/:grade/:level', (req, res) => {
    try {
        const { grade, level } = req.params;
        const { exclude, priority } = req.query; // 除外する単語リスト、優先単語リスト（カンマ区切り）
        
        console.log(`📚 英語問題プール取得リクエスト: ${grade}/${level}`);
        
        const excludeWords = exclude ? exclude.split(',') : [];
        const priorityWords = priority ? priority.split(',') : [];
        
        console.log('🎯 [適応学習] 除外単語:', excludeWords);
        console.log('🎯 [適応学習] 優先単語:', priorityWords);
        
        const problem = getRandomEnglishProblem(grade, level, excludeWords, priorityWords);
        
        if (!problem) {
            return res.status(404).json({
                success: false,
                error: '該当する問題が見つかりません',
                message: `${grade}の${level}レベルの英語問題がプールに存在しません`,
                suggestion: 'AI生成機能を使用して英語問題を作成し、プールに追加してください'
            });
        }
        
        const isPriorityWord = priorityWords.includes(problem.word);
        console.log(`✅ 英語問題プールから取得成功: ${problem.word} ${isPriorityWord ? '(復習対象)' : ''}`);
        
        res.json({
            success: true,
            problem: problem,
            source: 'pool',
            adaptive_info: {
                is_priority_word: isPriorityWord,
                priority_words_available: priorityWords.length,
                exclude_words_count: excludeWords.length
            }
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

// 【NEW】英語4択問題統合取得API - プール優先 + AI生成フォールバック + 適応学習対応
app.get('/api/english-quiz/:grade/:level', async (req, res) => {
    try {
        // URL エンコードされたパラメータをデコード
        const grade = decodeURIComponent(req.params.grade);
        const level = decodeURIComponent(req.params.level);
        const { exclude, priority } = req.query;
        
        console.log('🎯 [DEBUG] 英語4択問題統合取得リクエスト詳細:', {
            rawParams: req.params,
            gradeRaw: req.params.grade,
            levelRaw: req.params.level,
            gradeDecoded: grade,
            levelDecoded: level,
            query: req.query,
            url: req.url
        });
        
        const excludeWords = exclude ? exclude.split(',') : [];
        const priorityWords = priority ? priority.split(',') : [];
        
        console.log('🎯 [適応学習] 除外単語:', excludeWords);
        console.log('🎯 [適応学習] 優先単語:', priorityWords);
        
        // ステップ1: プールから取得を試行（適応学習対応）
        let poolProblem = null;
        try {
            poolProblem = getRandomEnglishProblem(grade, level, excludeWords, priorityWords);
        } catch (error) {
            console.log('📚 プール取得スキップ:', error.message);
        }
        
        if (poolProblem) {
            const isPriorityWord = priorityWords.includes(poolProblem.word);
            console.log(`✅ プールから4択問題取得成功: ${poolProblem.word} ${isPriorityWord ? '(復習対象)' : ''}`);
            return res.json({
                success: true,
                problem: poolProblem,
                source: 'pool',
                format: '4choice',
                adaptive_info: {
                    is_priority_word: isPriorityWord,
                    priority_words_available: priorityWords.length,
                    exclude_words_count: excludeWords.length
                }
            });
        }
        
        // ステップ2: プールに問題がない場合、AI生成
        if (!openai) {
            return res.status(503).json({
                success: false,
                error: 'OpenAI API機能が利用できず、プールにも問題がありません'
            });
        }
        
        console.log('🤖 プールに問題なし - AI生成で4択問題作成（適応学習対応）');
        
        // 適応学習：優先単語がある場合、AI生成時にヒントとして使用
        let priorityHint = '';
        if (priorityWords.length > 0) {
            priorityHint = `
            
【重要】以下の単語は学習者が復習を必要としている単語です。可能であればこれらの単語から選択してください:
${priorityWords.join(', ')}`;
        }
        
        let excludeHint = '';
        if (excludeWords.length > 0) {
            excludeHint = `
            
以下の単語は最近学習済みのため除外してください:
${excludeWords.join(', ')}`;
        }
        
        const prompt = `
カリタス中学校のProgress 21に準拠した英単語4択問題を1問作成してください。

設定:
- 学年: ${grade}
- 難易度レベル: ${level}

以下の条件を満たしてください:
1. ${grade}レベルに適した英単語
2. Progress 21で学習する重要な語彙
3. 紛らわしい選択肢で思考力を要する問題
4. 中学生が理解できる詳細な解説${priorityHint}${excludeHint}

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
  "explanation": "この単語の詳細な解説",
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

**重要事項:**
- 回答は必ず有効なJSON形式で出力してください
- 文字列内に改行が含まれる場合は\\nを使用してください
- ダブルクォーテーションを含む場合は\\\"でエスケープしてください
- JSON以外のテキストは出力しないでください
- すべてのフィールドが必須です`;

        // フォールバック機能付きのAI呼び出し
        let response;
        try {
            console.log('🚀 gpt-3.5-turbo で英語4択問題統合生成を試行中...');
            response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                max_tokens: 2000,
                temperature: 0.5,
                response_format: { type: "json_object" },
                messages: [{ role: 'user', content: prompt }],
            });
            console.log('✅ gpt-3.5-turbo 成功');
        } catch (turboError) {
            console.warn('⚠️ gpt-3.5-turbo 失敗 - gpt-4o-mini にフォールバック:', turboError.message);
            response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                max_tokens: 2000,
                temperature: 0.5,
                response_format: { type: "json_object" },
                messages: [{ role: 'user', content: prompt }],
            });
            console.log('✅ gpt-4o-mini フォールバック成功');
        }

        const aiResult = response.choices[0].message.content;
        const aiProblem = JSON.parse(aiResult);
        
        // 必要フィールドの検証
        const requiredFields = ['word', 'correct_meaning', 'wrong_options'];
        const missingFields = requiredFields.filter(field => !aiProblem[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`生成された問題で必要フィールドが不足: ${missingFields.join(', ')}`);
        }
        
        if (!Array.isArray(aiProblem.wrong_options) || aiProblem.wrong_options.length !== 3) {
            throw new Error('wrong_optionsは3個の配列である必要があります');
        }

        const isPriorityWord = priorityWords.includes(aiProblem.word);
        console.log(`✅ AI生成4択問題成功: ${aiProblem.word} ${isPriorityWord ? '(復習対象単語を生成)' : ''}`);
        
        res.json({
            success: true,
            problem: aiProblem,
            source: 'ai_generated',
            format: '4choice',
            adaptive_info: {
                is_priority_word: isPriorityWord,
                priority_words_requested: priorityWords.length,
                exclude_words_count: excludeWords.length,
                ai_followed_priority: isPriorityWord
            }
        });
        
    } catch (error) {
        console.error('英語4択問題統合取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '英語4択問題の取得中にエラーが発生しました',
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

// SPA用のキャッチオール（APIルート以外のみ）
app.get('*', (req, res) => {
  // APIルートの場合は404を返す
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'APIエンドポイントが見つかりません',
      path: req.path
    });
  }
  
  // それ以外は静的ファイル（SPA）
  res.sendFile(path.join(__dirname, 'index.html'));
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
