import React from 'react'
import StepExplanation from './StepExplanation'

/**
 * 数学問題表示コンポーネント
 * 
 * 機能:
 * - 問題文の表示
 * - 学習セッション情報
 * - 解説の表示・非表示
 * - ナビゲーション
 */
const ProblemDisplay = ({
  problem,
  studySettings,
  problemCount,
  showSteps,
  currentStep,
  onToggleSteps,
  onNextStep,
  onPrevStep,
  onSetStep,
  onNextProblem,
  onBackToSetup
}) => {
  // コンポーネントレンダリング確認
  console.log('🔥 [ProblemDisplay] レンダリング確認:', {
    problem: !!problem,
    showSteps: showSteps,
    currentStep: currentStep,
    problemId: problem?.id,
    timestamp: new Date().toISOString()
  })

  if (!problem) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
        <h3 className="font-bold text-red-800 mb-2">❌ 問題データエラー</h3>
        <p className="text-red-700 mb-4">問題データが正しく読み込まれませんでした。</p>
        <button
          onClick={onBackToSetup}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          設定に戻る
        </button>
      </div>
    )
  }

  const hasDetailedSteps = problem.steps && problem.steps.length > 0

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 学習セッション情報 */}
      {studySettings && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">🎯 学習セッション中</h2>
              <p className="text-sm opacity-90">
                {studySettings.grade} | {studySettings.unit} | {studySettings.level}レベル
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xl font-bold">{problemCount}</div>
                <div className="text-xs opacity-80">問題目</div>
              </div>
              <button
                onClick={onBackToSetup}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded text-sm font-medium transition-all focus-ring"
              >
                ⚙️ 設定変更
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 問題表示 */}
      <div className="bg-blue-50 p-4 sm:p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-blue-900">
            {problem.source === 'pool' || problem.source?.includes('pool') ? '📚' : '🤖'} {' '}
            {problem.source === 'pool' || problem.source?.includes('pool') ? 'プール問題' : 'AI生成問題'} - {problem.grade} {problem.unit}
          </h3>
          <span className={`self-start sm:self-auto px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
            problem.level === '基礎' ? 'level-basic' :
            problem.level === '標準' ? 'level-standard' :
            problem.level === '応用' ? 'level-advanced' :
            'level-expert'
          }`}>
            {problem.level}レベル
          </span>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded border-l-4 border-blue-500">
          <p className="text-base sm:text-lg font-medium mb-4 whitespace-pre-wrap leading-relaxed math-expression">
            {problem.problem}
          </p>
          {problem.hint && (
            <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
              <p className="text-sm text-yellow-800">
                💡 <strong>ヒント:</strong> {problem.hint}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 解説表示 */}
      {!showSteps ? (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={() => {
              console.log('🔍 [解説表示] ボタンクリック')
              onToggleSteps()
            }}
            className="bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-2 touch-manipulation font-medium focus-ring"
          >
            🧠 <span className="sm:hidden">解説を見る</span>
            <span className="hidden sm:inline">
              {hasDetailedSteps ? 'AI詳細解説を見る' : '解答を見る'}
            </span>
          </button>
          <button
            onClick={onNextProblem}
            className="bg-green-600 text-white px-4 sm:px-6 py-3 rounded-lg hover:bg-green-700 active:bg-green-800 touch-manipulation font-medium focus-ring"
          >
            🔄 <span className="sm:hidden">次の問題</span>
            <span className="hidden sm:inline">
              次の問題を{studySettings?.usePool ? '取得' : '生成'}
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* デバッグログ追加 */}
          {console.log('🚨 [ProblemDisplay] StepExplanationを呼び出し中:', {
            problem: problem,
            showSteps: showSteps,
            currentStep: currentStep,
            problemSteps: problem.steps,
            stepsLength: problem.steps?.length
          })}
          
          {/* ステップ解説コンポーネント */}
          <StepExplanation
            problem={problem}
            currentStep={currentStep}
            onSetStep={onSetStep}
            onNextStep={onNextStep}
            onPrevStep={onPrevStep}
          />

          {/* ナビゲーションボタン */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={() => {
                onToggleSteps()
                onSetStep(0)
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 active:bg-gray-800 touch-manipulation font-medium text-sm focus-ring"
            >
              📋 問題に戻る
            </button>
            <button
              onClick={onNextProblem}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 active:bg-green-800 touch-manipulation font-medium text-sm focus-ring"
            >
              🔄 次の問題を{studySettings?.usePool ? '取得' : '生成'}
            </button>
          </div>
        </div>
      )}

      {/* デバッグ情報（開発時のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-panel">
          <strong>デバッグ情報:</strong><br />
          問題ID: {problem.id || 'なし'}<br />
          ソース: {problem.source || 'なし'}<br />
          ステップ数: {problem.steps?.length || 0}<br />
          表示状態: {showSteps ? 'true' : 'false'}<br />
          現在ステップ: {currentStep}
        </div>
      )}
    </div>
  )
}

export default ProblemDisplay