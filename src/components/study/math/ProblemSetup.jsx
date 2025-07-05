import React, { useState } from 'react'

/**
 * 数学問題設定画面コンポーネント
 * 
 * 機能:
 * - 学年・分野・難易度選択
 * - 問題取得方法選択（プール/AI生成）
 * - 学習セッション開始
 */
const ProblemSetup = ({ apiStatus, problemPoolStats, onStartStudy }) => {
  const [selectedGrade, setSelectedGrade] = useState('中2')
  const [selectedUnit, setSelectedUnit] = useState('全分野')
  const [selectedLevel, setSelectedLevel] = useState('基礎')
  // プール使用のみに統一

  // 選択肢データ
  const gradeOptions = ['中1', '中2', '中3', '高1']
  
  const unitsByGrade = {
    '中1': ['全分野', '正負の数', '文字式', '一次方程式', '比例・反比例'],
    '中2': ['全分野', '式の計算', '連立方程式', '一次関数', '図形の性質'],
    '中3': ['全分野', '式の展開・因数分解', '平方根', '二次方程式', '二次関数'],
    '高1': ['全分野', '数と式', '集合と命題', '二次関数', '図形と計量']
  }
  
  const levelOptions = [
    { value: '基礎', description: '基本的な計算・公式の確認' },
    { value: '標準', description: '定期テスト・教科書レベル' },
    { value: '応用', description: '思考力・複合問題' },
    { value: '発展', description: '入試レベル・高度な問題' }
  ]

  /**
   * 学習開始処理
   */
  const handleStartStudy = () => {
    const settings = {
      grade: selectedGrade,
      unit: selectedUnit,
      level: selectedLevel,
      usePool: true, // 常にプール使用
      startTime: new Date()
    }

    console.log('🚀 [ProblemSetup] 学習開始:', settings)
    onStartStudy(settings)
  }

  /**
   * ボタンの有効性判定
   */
  const isStartButtonEnabled = () => {
    return true // プール使用のみなので常に有効
  }

  return (
    <div className="space-y-6">
      {/* 学習設定ヘッダー */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 sm:p-6 rounded-lg">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">🎯 学習設定</h2>
        <p className="text-sm sm:text-base opacity-90">問題プールから最適な問題を取得して学習を開始しましょう</p>
      </div>

      {/* 問題プール情報 */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow border">
        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
          📚 問題プールシステム
        </h4>
        
        {/* プール統計情報 */}
        {problemPoolStats && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h5 className="font-semibold text-blue-900 mb-3 text-base">📊 利用可能な問題</h5>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="bg-white p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{problemPoolStats.total_problems}</div>
                <div className="text-sm text-blue-600">総問題数</div>
              </div>
              {Object.entries(problemPoolStats.problems_by_level || {}).map(([level, count]) => (
                <div key={level} className="bg-white p-3 rounded-lg">
                  <div className="text-xl font-bold text-blue-700">{count}</div>
                  <div className="text-sm text-blue-600">{level}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">
            ⚡ 最適化システム: gpt-4o-miniで生成された高品質な問題を即座に取得します
          </p>
        </div>

        {/* 学習設定グリッド */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* 学年選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">学年</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm focus-ring"
            >
              {gradeOptions.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
          
          {/* 分野選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分野</label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm focus-ring"
            >
              {unitsByGrade[selectedGrade].map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
          
          {/* 難易度選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">難易度</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm focus-ring"
            >
              {levelOptions.map(level => (
                <option key={level.value} value={level.value}>
                  <span className="sm:hidden">{level.value}</span>
                  <span className="hidden sm:inline">{level.value} - {level.description}</span>
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* ステータス表示 */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {problemPoolStats && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">
                プール: {problemPoolStats.total_problems}問題利用可能
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 学習開始セクション */}
      <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-8 rounded-lg">
        <div className="text-4xl sm:text-6xl mb-4">📚</div>
        <h3 className="text-lg sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-4">
          問題プールシステム
        </h3>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          設定: {selectedGrade} | {selectedUnit} | {selectedLevel}レベル
        </p>
        
        {/* 学習開始ボタン */}
        <button
          onClick={handleStartStudy}
          disabled={!isStartButtonEnabled()}
          className={`w-full px-8 py-4 rounded-lg text-lg font-bold transition-all transform hover:scale-105 active:scale-95 touch-manipulation focus-ring ${
            isStartButtonEnabled()
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
          }`}
        >
          🚀 学習開始
          <span className="block text-sm font-normal mt-1 opacity-80">
            📚 プールから継続出題
          </span>
        </button>
        
        {/* 説明テキスト */}
        <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4">
          {problemPoolStats ? (
            `${problemPoolStats.total_problems}問題から即座に取得します`
          ) : (
            '問題プールから瞬時に問題を取得'
          )}
        </p>
      </div>
    </div>
  )
}

export default ProblemSetup