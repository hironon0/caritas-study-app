import React, { useState } from 'react'
import { EnglishLoadingScreen } from '../ui/LoadingScreen'

/**
 * 英単語学習コンポーネント
 * 
 * 機能:
 * - AI英単語生成
 * - 単語詳細表示
 * - 学習進捗追跡
 */
const EnglishWordStudy = ({
  apiStatus,
  englishProgress,
  setEnglishProgress,
  showAlert
}) => {
  const [selectedGrade, setSelectedGrade] = useState('中2')
  const [selectedLevel, setSelectedLevel] = useState('標準')
  const [currentWord, setCurrentWord] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  /**
   * AI英単語生成
   */
  const generateEnglishWord = async (grade, level) => {
    const apiUrl = window.CARITAS_API_URL
    if (!apiUrl) {
      showAlert('API接続エラー', 'API接続が確立されていません。')
      return
    }

    setIsLoading(true)
    setCurrentWord(null)
    
    const prompt = `
カリタス中学校のProgress 21に準拠した英単語を1つ提案してください。

設定:
- 学年: ${grade}
- レベル: ${level}

以下のJSON形式で、必ず全てのフィールドを含めて回答してください:
{
  "word": "英単語",
  "meaning": "日本語の意味",
  "pronunciation": "発音記号",
  "level": "${level}",
  "etymology": "語源や成り立ちの簡単な解説",
  "examples": [
    { "sentence": "例文1", "translation": "その和訳" },
    { "sentence": "例文2", "translation": "その和訳" }
  ],
  "synonyms": ["類義語1", "類義語2"]
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.
    `

    try {
      const response = await fetch(`${apiUrl}/api/generate-english`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`)
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error)
      }
      
      const wordData = JSON.parse(data.result)
      
      // メタデータを追加
      wordData.id = `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      wordData.timestamp = new Date().toISOString()
      
      setCurrentWord(wordData)
      
      // 進捗更新
      setEnglishProgress(prev => ({
        ...prev,
        words: prev.words + 1
      }))

    } catch (error) {
      console.error('AI英単語生成エラー:', error)
      showAlert('英単語生成エラー', `AI英単語生成に失敗しました。\n\nエラー詳細:\n${error.message}\n\nAPI接続状況を確認してください。`)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <EnglishLoadingScreen onCancel={() => setIsLoading(false)} />
  }

  if (!currentWord) {
    return (
      <div className="space-y-6">
        {/* 設定セクション */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            📚 AI英単語生成設定
          </h4>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">学年</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus-ring"
              >
                <option value="中1">中1</option>
                <option value="中2">中2</option>
                <option value="中3">中3</option>
                <option value="高1">高1</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">レベル</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus-ring"
              >
                <option value="基本">基本</option>
                <option value="標準">標準</option>
                <option value="発展">発展</option>
              </select>
            </div>
          </div>
          
          {/* 学習開始ボタン */}
          <div className="text-center">
            <button
              onClick={() => generateEnglishWord(selectedGrade, selectedLevel)}
              disabled={!apiStatus.connected}
              className={`px-8 py-4 rounded-lg text-lg font-medium transition-all transform btn-scale focus-ring ${
                apiStatus.connected 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
            >
              {apiStatus.connected ? '🌱 新しい単語を学習' : '❌ AI接続が必要です'}
            </button>
          </div>
        </div>

        {/* 進捗表示 */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-4 text-center">📈 学習進捗</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{englishProgress.words}</div>
              <div className="text-sm text-green-600">学習済み単語数</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{Math.floor(englishProgress.totalTime / 60)}</div>
              <div className="text-sm text-blue-600">総学習時間（分）</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 単語表示 */}
      <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-green-500">
        <h3 className="text-4xl font-bold text-gray-800 mb-2">{currentWord.word}</h3>
        <p className="text-lg text-gray-600 mb-4">{currentWord.pronunciation}</p>
        <p className="text-xl font-semibold text-green-700">{currentWord.meaning}</p>
      </div>

      {/* 例文 */}
      <div className="bg-green-50 p-6 rounded-lg">
        <h4 className="font-bold text-green-900 mb-3">📝 例文</h4>
        <ul className="space-y-3">
          {currentWord.examples?.map((ex, i) => (
            <li key={i} className="border-l-2 border-green-300 pl-4">
              <p className="font-medium text-gray-800">{ex.sentence}</p>
              <p className="text-sm text-gray-600">{ex.translation}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* 語源と類義語 */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h4 className="font-bold text-blue-900 mb-3">🔍 語源</h4>
          <p className="text-sm text-blue-800 leading-relaxed">{currentWord.etymology}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h4 className="font-bold text-purple-900 mb-3">🔗 類義語</h4>
          <div className="flex flex-wrap gap-2">
            {currentWord.synonyms?.map(s => (
              <span key={s} className="bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-sm">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 次の単語ボタン */}
      <div className="text-center">
        <button
          onClick={() => generateEnglishWord(selectedGrade, selectedLevel)}
          className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-medium btn-scale focus-ring"
        >
          🔄 次の単語へ
        </button>
      </div>

      {/* 学習情報 */}
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <p className="text-sm text-gray-600">
          学習済み: <span className="font-bold text-green-700">{englishProgress.words}</span> 単語
        </p>
      </div>
    </div>
  )
}

export default EnglishWordStudy