import React, { useState } from 'react'
import LoadingScreen from '../ui/LoadingScreen'

/**
 * 英語4択問題学習コンポーネント
 *
 * 機能:
 * - 英語4択問題取得（プールベース）
 * - 問題表示・解答
 * - 学習進捗追跡
 */
const EnglishWordStudy = ({
  apiStatus,
  englishProgress,
  setEnglishProgress,
  showAlert,
  problemPoolStats
}) => {
  const [selectedGrade, setSelectedGrade] = useState('中2')
  const [selectedLevel, setSelectedLevel] = useState('標準')
  const [currentProblem, setCurrentProblem] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [shuffledOptions, setShuffledOptions] = useState([])

  /**
   * 英語4択問題取得（プールベース）
   */
  const getEnglishProblem = async (grade, level) => {
    const apiUrl = window.CARITAS_API_URL
    if (!apiUrl) {
      showAlert('API接続エラー', 'API接続が確立されていません。')
      return
    }

    setIsLoading(true)
    setCurrentProblem(null)
    setSelectedAnswer('')
    setShowResult(false)
    setIsCorrect(false)
    setShuffledOptions([])

    try {
      const response = await fetch(`${apiUrl}/api/english-quiz/${encodeURIComponent(grade)}/${encodeURIComponent(level)}`)
      
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`)
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '問題取得に失敗しました')
      }
      
      setCurrentProblem(data.problem)
      
      // 選択肢をシャッフルして固定
      const options = [
        data.problem.correct_meaning,
        ...(data.problem.wrong_options || [])
      ]
      // Fisher-Yatesアルゴリズムでシャッフル
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      setShuffledOptions(options)
      
      // 進捗更新
      setEnglishProgress(prev => ({
        ...prev,
        words: prev.words + 1
      }))

    } catch (error) {
      console.error('英語問題取得エラー:', error)
      showAlert('問題取得エラー', `英語問題の取得に失敗しました。\n\nエラー詳細:\n${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 解答チェック
   */
  const checkAnswer = () => {
    if (!selectedAnswer || !currentProblem) return
    
    const correct = selectedAnswer === currentProblem.correct_meaning
    setIsCorrect(correct)
    setShowResult(true)
    
    // 進捗更新
    setEnglishProgress(prev => ({
      ...prev,
      totalAnswered: prev.totalAnswered + 1,
      correctAnswered: prev.correctAnswered + (correct ? 1 : 0)
    }))
  }

  /**
   * 次の問題へ
   */
  const nextProblem = () => {
    getEnglishProblem(selectedGrade, selectedLevel)
  }

  if (isLoading) {
    return (
      <LoadingScreen
        message="英語問題取得中"
        subMessage="問題プールから英語4択問題を取得しています"
        icon="🇬🇧"
        showCancel={true}
        onCancel={() => setIsLoading(false)}
      />
    )
  }

  if (!currentProblem) {
    return (
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-2">🇬🇧 英語4択問題</h2>
          <p className="opacity-90">問題プールから英単語4択問題を取得して学習しましょう</p>
        </div>

        {/* 設定セクション */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            📚 学習設定
          </h4>
          
          {/* プール統計情報 */}
          {problemPoolStats && (
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h5 className="font-semibold text-green-900 mb-3 text-base">📊 利用可能な英語問題</h5>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-xl font-bold text-green-700">{problemPoolStats.problems_by_subject?.english || 0}</div>
                  <div className="text-sm text-green-600">英語問題数</div>
                </div>
                {Object.entries(problemPoolStats.problems_by_level || {}).map(([level, count]) => (
                  <div key={level} className="bg-white p-3 rounded-lg">
                    <div className="text-lg font-bold text-green-700">{count}</div>
                    <div className="text-sm text-green-600">{level}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
                <option value="基礎">基礎</option>
                <option value="標準">標準</option>
                <option value="応用">応用</option>
                <option value="発展">発展</option>
              </select>
            </div>
          </div>
          
          {/* 学習開始ボタン */}
          <div className="text-center">
            <button
              onClick={() => getEnglishProblem(selectedGrade, selectedLevel)}
              className="px-8 py-4 rounded-lg text-lg font-medium transition-all transform btn-scale focus-ring bg-green-600 text-white hover:bg-green-700"
            >
              🇬🇧 英語学習開始
            </button>
          </div>
        </div>

        {/* 進捗表示 */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-4 text-center">📈 学習進捗</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{englishProgress.words}</div>
              <div className="text-sm text-green-600">挑戦問題数</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{englishProgress.correctAnswered || 0}</div>
              <div className="text-sm text-blue-600">正解数</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">
                {englishProgress.totalAnswered > 0 ? Math.round((englishProgress.correctAnswered || 0) / englishProgress.totalAnswered * 100) : 0}%
              </div>
              <div className="text-sm text-purple-600">正答率</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 問題表示 */}
      <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-green-500">
        <div className="text-center mb-6">
          <h3 className="text-5xl font-bold text-gray-800 mb-2">{currentProblem.word}</h3>
          {currentProblem.pronunciation && (
            <p className="text-lg text-gray-600 mb-4">[{currentProblem.pronunciation}]</p>
          )}
          <p className="text-xl text-gray-700">この英単語の意味は？</p>
        </div>

        {/* 選択肢 */}
        <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto mb-6">
          {shuffledOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => setSelectedAnswer(option)}
              disabled={showResult}
              className={`p-4 text-left border-2 rounded-lg transition-all ${
                selectedAnswer === option
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-green-300 bg-white'
              } ${showResult && option === currentProblem.correct_meaning
                ? 'border-green-500 bg-green-100'
                : ''
              } ${showResult && selectedAnswer === option && option !== currentProblem.correct_meaning
                ? 'border-red-500 bg-red-100'
                : ''
              }`}
            >
              <span className="font-medium">{String.fromCharCode(65 + index)}. {option}</span>
            </button>
          ))}
        </div>

        {/* 解答ボタン */}
        {!showResult && (
          <div className="text-center">
            <button
              onClick={checkAnswer}
              disabled={!selectedAnswer}
              className={`px-8 py-3 rounded-lg text-lg font-medium transition-all ${
                selectedAnswer
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
            >
              解答する
            </button>
          </div>
        )}

        {/* 結果表示 */}
        {showResult && (
          <div className={`p-6 rounded-lg text-center ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
            <div className={`text-2xl font-bold mb-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '🎉 正解！' : '❌ 不正解'}
            </div>
            <p className="text-lg mb-4">
              正解: <span className="font-bold text-green-700">{currentProblem.correct_meaning}</span>
            </p>
            
            {/* 解説 */}
            {currentProblem.explanation && (
              <div className="text-left bg-white p-4 rounded-lg mb-4">
                <h4 className="font-bold text-gray-800 mb-2">💡 解説</h4>
                <p className="text-sm text-gray-700">{currentProblem.explanation}</p>
              </div>
            )}

            {/* 例文 */}
            {currentProblem.examples && currentProblem.examples.length > 0 && (
              <div className="text-left bg-white p-4 rounded-lg mb-4">
                <h4 className="font-bold text-gray-800 mb-2">📝 例文</h4>
                {currentProblem.examples.map((ex, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-medium text-gray-800">{ex.sentence}</p>
                    <p className="text-sm text-gray-600">{ex.translation}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={nextProblem}
              className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-green-700 transition-all"
            >
              🔄 次の問題へ
            </button>
          </div>
        )}
      </div>

      {/* 学習情報 */}
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <p className="text-sm text-gray-600">
          挑戦問題数: <span className="font-bold text-green-700">{englishProgress.words}</span> |
          正解: <span className="font-bold text-blue-700">{englishProgress.correctAnswered || 0}</span> |
          正答率: <span className="font-bold text-purple-700">
            {englishProgress.totalAnswered > 0 ? Math.round((englishProgress.correctAnswered || 0) / englishProgress.totalAnswered * 100) : 0}%
          </span>
        </p>
      </div>
    </div>
  )
}

export default EnglishWordStudy