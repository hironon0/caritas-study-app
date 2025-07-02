import React from 'react'

/**
 * ステップ解説表示コンポーネント
 * 
 * 機能:
 * - 段階的解説の表示
 * - ステップナビゲーション
 * - 解答・学習ポイント表示
 * - レスポンシブ対応
 */
const StepExplanation = ({
  problem,
  currentStep,
  onSetStep,
  onNextStep,
  onPrevStep
}) => {
  const hasDetailedSteps = problem.steps && problem.steps.length > 0

  console.log('🔍 [StepExplanation] レンダリング:', {
    hasDetailedSteps,
    stepsLength: problem.steps?.length,
    currentStep
  })

  return (
    <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
      <h4 className="font-bold text-base sm:text-lg mb-4">
        {problem.source === 'pool' || problem.source?.includes('pool') ? '📚 プール問題：' : '🤖 AI生成：'}詳細解説
        {hasDetailedSteps && `（${problem.steps.length}段階）`}
      </h4>
      
      {hasDetailedSteps ? (
        /* 詳細ステップ解説がある場合 */
        <>
          {/* ステップ選択ナビゲーション */}
          <div className="grid grid-cols-2 sm:flex gap-2 mb-4 sm:mb-6">
            {problem.steps.map((step, idx) => {
              const stepLabels = [
                '理解', '方針', '準備', '計算', '推論', '検算', 'まとめ'
              ]
              return (
                <button
                  key={idx}
                  onClick={() => onSetStep(idx)}
                  className={`px-2 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium transition-all touch-manipulation focus-ring ${
                    currentStep === idx 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400'
                  }`}
                  title={step.step}
                >
                  <span className="sm:hidden">{idx + 1}</span>
                  <span className="hidden sm:inline">
                    {idx + 1}. {stepLabels[idx] || `ステップ${idx + 1}`}
                  </span>
                </button>
              )
            })}
          </div>
          
          {/* 現在のステップ表示 */}
          <div className="bg-white p-4 sm:p-6 rounded border step-animation">
            <h5 className="font-bold text-blue-900 mb-3 text-base sm:text-lg">
              {currentStep + 1}. {problem.steps[currentStep].step}
            </h5>
            
            <div className="space-y-3 sm:space-y-4">
              {/* 内容 */}
              <div>
                <h6 className="font-semibold text-gray-800 mb-2 text-sm">📝 内容</h6>
                <p className="text-gray-800 bg-gray-50 p-3 rounded text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                  {problem.steps[currentStep].content}
                </p>
              </div>
              
              {/* 解説 */}
              <div>
                <h6 className="font-semibold text-gray-800 mb-2 text-sm">💡 解説</h6>
                <p className="text-yellow-800 bg-yellow-50 p-3 rounded text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                  {problem.steps[currentStep].explanation}
                </p>
              </div>
              
              {/* 詳細（ある場合のみ） */}
              {problem.steps[currentStep].detail && (
                <div>
                  <h6 className="font-semibold text-gray-800 mb-2 text-sm">🔍 詳細</h6>
                  <p className="text-blue-800 bg-blue-50 p-3 rounded text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                    {problem.steps[currentStep].detail}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ステップナビゲーション */}
          <div className="flex gap-2 mt-4 sm:mt-6">
            <button
              onClick={onPrevStep}
              disabled={currentStep === 0}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation font-medium text-sm focus-ring"
            >
              ⬅️ <span className="sm:hidden">前</span><span className="hidden sm:inline">前のステップ</span>
            </button>
            <button
              onClick={onNextStep}
              disabled={currentStep === problem.steps.length - 1}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation font-medium text-sm focus-ring"
            >
              <span className="sm:hidden">次</span><span className="hidden sm:inline">次のステップ</span> ➡️
            </button>
          </div>

          {/* 解答と学習ポイント（AI生成問題のみ） */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
              <h4 className="font-bold text-green-900 mb-2 text-sm sm:text-base">✅ 解答</h4>
              <p className="text-green-800 text-base sm:text-lg font-medium whitespace-pre-wrap">
                {problem.answer}
              </p>
            </div>
            
            {problem.learning_point && (
              <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                <h4 className="font-bold text-purple-900 mb-2 text-sm sm:text-base">📚 学習ポイント</h4>
                <p className="text-purple-800 text-xs sm:text-sm leading-relaxed">
                  {problem.learning_point}
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* 詳細解説データがない場合 */
        <div className="bg-orange-50 border border-orange-200 p-4 sm:p-6 rounded-lg">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-orange-500 text-xl">⚠️</div>
            <div className="flex-1">
              <h5 className="font-bold text-orange-900 mb-2">詳細解説データなし</h5>
              <p className="text-orange-800 text-sm mb-3">
                この問題には段階的な詳細解説データが含まれていません。
                基本的な解答情報のみ表示します。
              </p>
            </div>
          </div>
          
          {/* 基本的な解答情報 */}
          <div className="bg-green-50 p-3 sm:p-4 rounded-lg mb-4">
            <h4 className="font-bold text-green-900 mb-2 text-sm sm:text-base">✅ 解答</h4>
            <p className="text-green-800 text-base sm:text-lg font-medium whitespace-pre-wrap">
              {problem.answer}
            </p>
          </div>
          
          {/* ヒント（ある場合） */}
          {problem.hint && (
            <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg mb-4">
              <h4 className="font-bold text-yellow-900 mb-2 text-sm sm:text-base">💡 ヒント</h4>
              <p className="text-yellow-800 text-sm sm:text-base leading-relaxed">
                {problem.hint}
              </p>
            </div>
          )}
          
          {/* 推奨事項 */}
          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
            <p>💡 <strong>より詳細な解説が必要な場合は：</strong></p>
            <p>設定画面で「AI新規生成」モードに切り替えると、段階的な詳細解説付きの問題が生成されます。</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default StepExplanation