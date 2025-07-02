import React, { useState, useEffect } from 'react'
import { useMathProblemGenerator } from '../../hooks/useMathProblemGenerator'
import ProblemSetup from './math/ProblemSetup'
import ProblemDisplay from './math/ProblemDisplay'
import LoadingScreen from '../ui/LoadingScreen'

/**
 * 数学学習メインコンポーネント
 * 
 * 機能:
 * - 学習モード管理
 * - 問題生成・取得
 * - 学習進捗追跡
 * - 状態管理
 */
const MathStudy = ({
  apiStatus,
  problemPoolStats,
  mathProgress,
  setMathProgress,
  showAlert,
  showConfirm,
  getProblemFromPool,
  fetchProblemPoolStats
}) => {
  // 学習状態管理
  const [studyMode, setStudyMode] = useState('setup') // 'setup' | 'studying'
  const [studySettings, setStudySettings] = useState(null)
  const [currentProblem, setCurrentProblem] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [problemCount, setProblemCount] = useState(1)
  
  // 解説表示状態
  const [showSteps, setShowSteps] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // 数学問題生成フック
  const { generateMathProblem } = useMathProblemGenerator()

  // デバッグ：状態変化を監視
  useEffect(() => {
    console.log('🔍 [MathStudy] 状態変化:', {
      studyMode,
      currentProblem: !!currentProblem,
      isLoading,
      studySettings: !!studySettings,
      problemCount
    })
  }, [studyMode, currentProblem, isLoading, studySettings, problemCount])

  /**
   * 学習セッション開始
   */
  const startStudySession = async (settings) => {
    if (isLoading || studyMode === 'studying') {
      console.log('⚠️ [重複防止] 学習開始処理が既に実行中')
      return
    }

    console.log('🚀 [学習開始] 設定:', settings)
    
    try {
      // 状態初期化
      setStudySettings(settings)
      setStudyMode('studying')
      setProblemCount(1)
      setCurrentProblem(null)
      setShowSteps(false)
      setCurrentStep(0)

      // 最初の問題を取得
      const success = await getNextProblem(settings)
      if (!success) {
        backToSetup()
        showAlert('学習開始エラー', '最初の問題の取得に失敗しました。')
      }
    } catch (error) {
      console.error('❌ [学習開始] エラー:', error)
      backToSetup()
      showAlert('学習開始エラー', `学習開始に失敗しました。\n\nエラー: ${error.message}`)
    }
  }

  /**
   * 次の問題取得
   */
  const getNextProblem = async (settings = studySettings) => {
    if (isLoading) {
      console.log('⚠️ [重複防止] 問題取得が既に実行中')
      return false
    }

    if (!settings) {
      console.error('❌ [問題取得] 設定が不正:', settings)
      return false
    }

    console.log('📥 [問題取得] 開始:', settings.usePool ? 'プール' : 'AI生成')
    
    setIsLoading(true)
    setCurrentProblem(null)
    setShowSteps(false)
    setCurrentStep(0)
    
    // 問題カウント更新
    setProblemCount(prev => prev + 1)

    try {
      let problem = null

      if (settings.usePool) {
        problem = await getProblemFromPool(settings.grade, settings.unit, settings.level)
      } else {
        problem = await generateMathProblem(settings.grade, settings.unit, settings.level)
      }

      if (problem) {
        setCurrentProblem(problem)
        
        // 進捗更新
        setMathProgress(prev => ({
          ...prev,
          solved: prev.solved + 1
        }))
        
        console.log('✅ [問題取得] 成功:', problem.id || 'ID未設定')
        return true
      } else {
        console.log('❌ [問題取得] 失敗: problemがnull')
        return false
      }
    } catch (error) {
      console.error('❌ [問題取得] エラー:', error)
      showAlert('問題取得エラー', `問題の取得に失敗しました。\n\nエラー: ${error.message}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 設定画面に戻る
   */
  const backToSetup = () => {
    console.log('🔄 [設定復帰] 設定画面に戻ります')
    setStudyMode('setup')
    setCurrentProblem(null)
    setShowSteps(false)
    setCurrentStep(0)
    setStudySettings(null)
    setProblemCount(1)
    setIsLoading(false)
  }

  /**
   * 解説表示切り替え
   */
  const toggleSteps = () => {
    setShowSteps(prev => !prev)
    setCurrentStep(0)
  }

  // レンダリング条件判定
  console.log('🎨 [レンダリング] 条件判定:', {
    studyMode,
    currentProblem: !!currentProblem,
    isLoading
  })

  // ローディング画面
  if (isLoading) {
    return (
      <LoadingScreen
        message={studySettings?.usePool ? '問題プールから取得中' : 'AIが高品質な問題を生成中'}
        subMessage={studySettings?.usePool ? '問題プールから最適な問題を選択しています' : '体系数学に準拠した思考力問題を作成しています'}
        icon={studySettings?.usePool ? '📚' : '🤖'}
        showCancel={studyMode === 'studying'}
        onCancel={backToSetup}
      />
    )
  }

  // 問題表示画面
  if (studyMode === 'studying' && currentProblem) {
    return (
      <ProblemDisplay
        problem={currentProblem}
        studySettings={studySettings}
        problemCount={problemCount - 1}
        showSteps={showSteps}
        currentStep={currentStep}
        onToggleSteps={toggleSteps}
        onNextStep={() => setCurrentStep(prev => Math.min(currentProblem.steps?.length - 1 || 0, prev + 1))}
        onPrevStep={() => setCurrentStep(prev => Math.max(0, prev - 1))}
        onSetStep={setCurrentStep}
        onNextProblem={() => getNextProblem()}
        onBackToSetup={backToSetup}
      />
    )
  }

  // 学習中で問題がない場合（エラー状態）
  if (studyMode === 'studying' && !currentProblem && !isLoading) {
    return (
      <div className="space-y-4">
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
                  <div className="text-xl font-bold">{problemCount - 1}</div>
                  <div className="text-xs opacity-80">問題目</div>
                </div>
                <button
                  onClick={backToSetup}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded text-sm font-medium transition-all"
                >
                  ⚙️ 設定変更
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* エラー表示 */}
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
          <h3 className="font-bold text-yellow-800 mb-2">⚠️ 問題取得エラー</h3>
          <p className="text-yellow-700 mb-4">問題の取得に失敗しました。再試行するか設定を変更してください。</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => getNextProblem()}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              🔄 再試行
            </button>
            <button
              onClick={backToSetup}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              ⚙️ 設定を変更
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 設定画面（デフォルト）
  return (
    <ProblemSetup
      apiStatus={apiStatus}
      problemPoolStats={problemPoolStats}
      onStartStudy={startStudySession}
    />
  )
}

export default MathStudy