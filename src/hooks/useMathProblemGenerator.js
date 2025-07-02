import { useState } from 'react'

/**
 * 数学問題生成カスタムフック
 * 
 * 機能:
 * - AI問題生成
 * - 一括問題生成
 * - エラーハンドリング
 * - ブラウザ別対応
 */
export const useMathProblemGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false)

  /**
   * 単一数学問題生成
   * @param {string} grade - 学年
   * @param {string} unit - 単元
   * @param {string} level - 難易度
   */
  const generateMathProblem = async (grade, unit, level) => {
    const apiUrl = window.CARITAS_API_URL
    if (!apiUrl) {
      throw new Error('API接続が確立されていません')
    }

    setIsGenerating(true)

    const prompt = `
カリタス中学校の体系数学に準拠した数学問題を1問作成してください。

設定:
- 学年: ${grade}
- 分野: ${unit === '全分野' ? '該当学年の全分野から選択' : unit}
- 難易度: ${level}

以下の条件を満たしてください:
1. ${grade}レベルに適した問題
2. 思考力を要する良質な問題
3. カリタス中学校の高度なカリキュラムに対応

**解説は絶対に省略せず、中学生が理解できるよう一つ一つの手順を丁寧に説明してください。**

回答は以下のJSON形式でお願いします:
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

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.
    `

    try {
      console.log(`🤖 問題生成リクエスト: ${apiUrl}/api/generate-math`)
      
      const response = await fetch(`${apiUrl}/api/generate-math`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ prompt }),
        mode: 'cors',
        credentials: 'omit' // Safari対応
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'サーバーから有効なJSON応答がありません' }))
        const error = new Error(errorData.error || `HTTPエラー: ${response.status}`)
        error.response = response
        throw error
      }

      const data = await response.json()

      if (!data.success) {
        const error = new Error(data.error || 'API エラー')
        error.response = response
        throw error
      }

      const problemData = JSON.parse(data.result)
      
      // 問題にメタデータを追加
      problemData.id = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      problemData.source = 'ai_generated'
      problemData.timestamp = new Date().toISOString()
      
      console.log('✅ AI問題生成成功:', problemData.id)
      return problemData

    } catch (error) {
      console.error('❌ AI問題生成エラー:', error)
      
      let errorMessage = error.message
      
      // Safari特有のエラー対応
      const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')
      if (isSafari && (error.message.includes('Load failed') || error.message.includes('NetworkError'))) {
        errorMessage = `Safari接続エラーが発生しました。\n\n解決方法:\n1. Safari > 開発 > セキュリティポリシーを無効にする\n2. Chrome、Firefox、Edgeなどの他ブラウザをご利用ください\n3. HTTP接続が許可されているか確認してください`
      }
      
      if (error.response) {
        try {
          const errorData = await error.response.json()
          console.error('サーバーからのエラー詳細:', errorData)
          if (!isSafari) { // Safari以外では詳細エラーを表示
            errorMessage += `\n\nサーバー詳細: ${errorData.details || JSON.stringify(errorData)}`
          }
        } catch (e) {
          console.error('サーバーエラーの解析に失敗:', e.message)
        }
      }
      
      throw new Error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * 一括数学問題生成
   * @param {string} grade - 学年
   * @param {string} unit - 単元
   * @param {string} level - 難易度
   * @param {number} count - 生成数
   */
  const generateBatchMathProblems = async (grade, unit, level, count) => {
    const apiUrl = window.CARITAS_API_URL
    if (!apiUrl) {
      throw new Error('API接続が確立されていません')
    }

    setIsGenerating(true)
    
    try {
      console.log(`🚀 ${count}問の一括生成開始`)
      
      const response = await fetch(`${apiUrl}/api/generate-math-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          unit,
          level,
          count
        })
      })

      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '一括生成に失敗しました')
      }

      // レスポンスをパース
      const batchResult = JSON.parse(data.result)
      if (!batchResult.problems || !Array.isArray(batchResult.problems)) {
        throw new Error('一括生成の応答形式が不正です')
      }

      console.log(`✅ ${batchResult.problems.length}問の一括生成成功`)

      // 生成された問題にメタデータを追加
      const problems = batchResult.problems.map(problem => ({
        ...problem,
        id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: 'ai_generated_batch',
        timestamp: new Date().toISOString(),
        addedToPool: false
      }))

      return problems

    } catch (error) {
      console.error('❌ 一括問題生成エラー:', error)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generateMathProblem,
    generateBatchMathProblems,
    isGenerating
  }
}