import React, { useState } from 'react'
import { useMathProblemGenerator } from '../hooks/useMathProblemGenerator'
import { useEnglishProblemGenerator } from '../hooks/useEnglishProblemGenerator'
import { BatchLoadingScreen } from './ui/LoadingScreen'

/**
 * 管理画面コンポーネント
 * 
 * 機能:
 * - AI問題一括生成（数学・英語4択）
 * - 問題プール管理
 * - 統計情報表示
 * - 一括プール追加
 */
const AdminSection = ({
  apiStatus,
  problemPoolStats,
  showAlert,
  showConfirm,
  addProblemToPool,
  fetchProblemPoolStats,
  onNavigateToMenu
}) => {
  // 生成設定
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedGrade, setSelectedGrade] = useState('全学年')
  const [selectedUnit, setSelectedUnit] = useState('全分野')
  const [selectedLevel, setSelectedLevel] = useState('全難易度')
  const [batchCount, setBatchCount] = useState(5)

  // 生成された問題
  const [generatedProblems, setGeneratedProblems] = useState([])
  
  // 問題生成フック
  const { generateBatchMathProblems, isGenerating: isMathGenerating } = useMathProblemGenerator()
  const { generateBatchEnglishProblems, isGenerating: isEnglishGenerating } = useEnglishProblemGenerator()
  
  // 生成状態の統合
  const isGenerating = isMathGenerating || isEnglishGenerating

  // 選択肢データ
  const gradeOptions = ['全学年', '中1', '中2', '中3', '高1']
  const subjectOptions = [
    { value: 'all', label: '🎯 全科目' },
    { value: 'math', label: '🧮 数学問題' },
    { value: 'english_quiz', label: '🇬🇧 英語4択問題' }
  ]
  const mathUnitsByGrade = {
    '全学年': ['全分野', '正負の数', '文字式', '一次方程式', '比例・反比例', '式の計算', '連立方程式', '一次関数', '図形の性質', '式の展開・因数分解', '平方根', '二次方程式', '二次関数', '数と式', '集合と命題', '図形と計量'],
    '中1': ['全分野', '正負の数', '文字式', '一次方程式', '比例・反比例'],
    '中2': ['全分野', '式の計算', '連立方程式', '一次関数', '図形の性質'],
    '中3': ['全分野', '式の展開・因数分解', '平方根', '二次方程式', '二次関数'],
    '高1': ['全分野', '数と式', '集合と命題', '二次関数', '図形と計量']
  }
  const levelOptions = [
    { value: '全難易度', description: '全ての難易度レベルの問題' },
    { value: '基礎', description: '基本的な計算・公式の確認' },
    { value: '標準', description: '定期テスト・教科書レベル' },
    { value: '応用', description: '思考力・複合問題' },
    { value: '発展', description: '入試レベル・高度な問題' }
  ]

  /**
   * 想定される総問題数を計算
   */
  const calculateExpectedProblemCount = () => {
    if (selectedSubject === 'all') {
      return calculateCombinationCount('math') + calculateCombinationCount('english_quiz')
    }
    return calculateCombinationCount(selectedSubject)
  }

  /**
   * 組み合わせ数を計算
   */
  const calculateCombinationCount = (subject) => {
    const grades = selectedGrade === '全学年' ? ['中1', '中2', '中3', '高1'] : [selectedGrade]
    const levels = selectedLevel === '全難易度' ? ['基礎', '標準', '応用', '発展'] : [selectedLevel]
    
    if (subject === 'math') {
      let totalUnits = 0
      for (const grade of grades) {
        const units = selectedUnit === '全分野'
          ? mathUnitsByGrade[grade].filter(u => u !== '全分野')
          : [selectedUnit]
        totalUnits += units.length
      }
      return totalUnits * levels.length * batchCount
    } else if (subject === 'english_quiz') {
      return grades.length * levels.length * batchCount
    }
    return 0
  }

  /**
   * 一括問題生成処理
   */
  const handleBatchGenerate = async () => {
    if (!apiStatus.connected) {
      showAlert('AI接続エラー', 'AI接続が必要です。APIキーの設定を確認してください。')
      return
    }

    // 想定される総問題数を計算
    const expectedCount = calculateExpectedProblemCount()
    
    // 「全科目」選択時の処理
    if (selectedSubject === 'all') {
      await handleAllSubjectGeneration(expectedCount)
      return
    }

    const subjectName = selectedSubject === 'math' ? '数学' : '英語4択'
    const settingsText = selectedSubject === 'math'
      ? `・学年: ${selectedGrade}\n・分野: ${selectedUnit}\n・難易度: ${selectedLevel}レベル`
      : `・学年: ${selectedGrade}\n・難易度: ${selectedLevel}レベル`
    
    // 全選択肢の場合の警告メッセージ
    const isFullCombination = selectedGrade === '全学年' || selectedLevel === '全難易度' ||
                             (selectedSubject === 'math' && selectedUnit === '全分野')
    
    const warningText = isFullCombination
      ? `\n⚠️ 全選択肢による組み合わせ生成のため、想定問題数: ${expectedCount}問\n大量の問題が生成されます。`
      : ''
    
    const confirmMessage = `${subjectName}問題を一括生成します。\n\n設定詳細:\n${settingsText}\n・設定問題数: ${batchCount}問/組み合わせ\n・想定総問題数: ${expectedCount}問${warningText}\n\n※生成には時間がかかります`
    
    showConfirm(
      '🤖 AI一括問題生成の確認',
      confirmMessage,
      async () => {
        try {
          let problems = []
          
          if (selectedSubject === 'math') {
            problems = await generateMathProblemsForSelection(selectedGrade, selectedUnit, selectedLevel, batchCount)
          } else if (selectedSubject === 'english_quiz') {
            problems = await generateEnglishProblemsForSelection(selectedGrade, selectedLevel, batchCount)
          }
          
          if (problems && problems.length > 0) {
            setGeneratedProblems(prev => [...problems, ...prev])
            showAlert('生成完了', `🎉 ${problems.length}問の${subjectName}問題生成が完了しました！\n\n生成された問題をプールに追加できます。`)
          }
        } catch (error) {
          showAlert('生成エラー', `${subjectName}問題生成に失敗しました。\n\nエラー: ${error.message}`)
        }
      }
    )
  }

  /**
   * 全科目選択時の処理
   */
  const handleAllSubjectGeneration = async (expectedCount) => {
    const mathExpectedCount = calculateCombinationCount('math')
    const englishExpectedCount = calculateCombinationCount('english_quiz')
    
    // 全選択肢の場合の警告メッセージ
    const isFullCombination = selectedGrade === '全学年' || selectedLevel === '全難易度' || selectedUnit === '全分野'
    
    const warningText = isFullCombination
      ? `\n⚠️ 全選択肢による組み合わせ生成のため、大量の問題が生成されます。`
      : ''
    
    const confirmMessage = `数学と英語の問題を一括生成します。\n\n設定詳細:\n・学年: ${selectedGrade}\n・分野: ${selectedUnit}\n・難易度: ${selectedLevel}レベル\n・設定問題数: ${batchCount}問/組み合わせ\n・想定総問題数: ${expectedCount}問\n・数学想定: ${mathExpectedCount}問\n・英語想定: ${englishExpectedCount}問${warningText}\n\n※生成には時間がかかります`
    
    showConfirm(
      '🤖 AI一括問題生成の確認（全科目）',
      confirmMessage,
      async () => {
        try {
          let allProblems = []
          
          // 数学問題生成
          const mathProblems = await generateMathProblemsForSelection(selectedGrade, selectedUnit, selectedLevel, batchCount)
          allProblems = [...allProblems, ...mathProblems]
          
          // 英語問題生成
          const englishProblems = await generateEnglishProblemsForSelection(selectedGrade, selectedLevel, batchCount)
          allProblems = [...allProblems, ...englishProblems]
          
          if (allProblems && allProblems.length > 0) {
            setGeneratedProblems(prev => [...allProblems, ...prev])
            showAlert('生成完了', `🎉 ${allProblems.length}問の問題生成が完了しました！\n\n数学: ${mathProblems.length}問\n英語: ${englishProblems.length}問\n\n生成された問題をプールに追加できます。`)
          }
        } catch (error) {
          showAlert('生成エラー', `問題生成に失敗しました。\n\nエラー: ${error.message}`)
        }
      }
    )
  }

  /**
   * 数学問題生成（全学年・全分野・全難易度対応）
   */
  const generateMathProblemsForSelection = async (grade, unit, level, count) => {
    const grades = grade === '全学年' ? ['中1', '中2', '中3', '高1'] : [grade]
    const levels = level === '全難易度' ? ['基礎', '標準', '応用', '発展'] : [level]
    
    let allProblems = []
    
    for (const currentGrade of grades) {
      const units = unit === '全分野' ? mathUnitsByGrade[currentGrade].filter(u => u !== '全分野') : [unit]
      
      for (const currentUnit of units) {
        for (const currentLevel of levels) {
          const problemsPerCombination = Math.ceil(count / (grades.length * units.length * levels.length))
          if (problemsPerCombination > 0) {
            const problems = await generateBatchMathProblems(currentGrade, currentUnit, currentLevel, problemsPerCombination)
            allProblems = [...allProblems, ...problems]
          }
        }
      }
    }
    
    // 指定された数まで調整
    return allProblems.slice(0, count)
  }

  /**
   * 英語問題生成（全学年・全難易度対応）
   */
  const generateEnglishProblemsForSelection = async (grade, level, count) => {
    const grades = grade === '全学年' ? ['中1', '中2', '中3', '高1'] : [grade]
    const levels = level === '全難易度' ? ['基礎', '標準', '応用', '発展'] : [level]
    
    let allProblems = []
    
    for (const currentGrade of grades) {
      for (const currentLevel of levels) {
        const problemsPerCombination = Math.ceil(count / (grades.length * levels.length))
        if (problemsPerCombination > 0) {
          const problems = await generateBatchEnglishProblems(currentGrade, currentLevel, problemsPerCombination)
          allProblems = [...allProblems, ...problems]
        }
      }
    }
    
    // 指定された数まで調整
    return allProblems.slice(0, count)
  }

  /**
   * 個別問題をプールに追加
   */
  const handleAddToPool = async (problem) => {
    try {
      const apiUrl = window.CARITAS_API_URL
      let response
      
      // 【修正】英語問題判定ロジックの改善
      const isEnglishProblem = problem.word && problem.correct_meaning && problem.wrong_options
      
      if (isEnglishProblem) {
        // 英語問題の場合
        console.log('📝 英語問題をプールに追加:', problem.word)
        response = await fetch(`${apiUrl}/api/english-pool/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problem })
        })
      } else {
        // 数学問題の場合
        console.log('📝 数学問題をプールに追加:', problem.id || '新規問題')
        response = await fetch(`${apiUrl}/api/problem-pool/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problem })
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTPエラー: ${response.status}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '問題の追加に失敗しました')
      }
      
      // 追加済みマークを付ける
      setGeneratedProblems(prev =>
        prev.map(p => p === problem ? { ...p, addedToPool: true } : p)
      )
      
      const subject = problem.word ? '英語問題' : '数学問題'
      showAlert('追加完了', `${subject}をプールに追加しました！`)
      
      // 統計情報を更新
      await fetchProblemPoolStats()
      
    } catch (error) {
      console.error('問題追加エラー:', error)
      showAlert('追加エラー', `問題の追加に失敗しました。\n\nエラー: ${error.message}`)
    }
  }

  /**
   * 一括プール追加処理
   */
  const handleBatchAddToPool = async (problems) => {
    try {
      console.log(`🚀 ${problems.length}問の一括プール追加開始`)
      
      const apiUrl = window.CARITAS_API_URL
      
      // 【修正】英語問題判定ロジックの改善 - より確実な判定条件
      const isEnglishProblems = problems.length > 0 &&
                                problems[0].word &&
                                problems[0].correct_meaning &&
                                problems[0].wrong_options
      const endpoint = isEnglishProblems ? '/api/english-pool/add-batch' : '/api/problem-pool/add-batch'
      const subject = isEnglishProblems ? '英語' : '数学'
      
      console.log(`📝 ${subject}問題として処理: ${endpoint}`)
      console.log(`🔍 判定根拠: word=${!!problems[0]?.word}, correct_meaning=${!!problems[0]?.correct_meaning}, wrong_options=${!!problems[0]?.wrong_options}`)
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problems })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTPエラー: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success || (data.success_count && data.success_count > 0)) {
        const successCount = data.success_count || 0
        const failureCount = data.failure_count || 0
        
        console.log(`✅ ${subject}問題一括プール追加完了: 成功${successCount}問, 失敗${failureCount}問`)
        
        // 成功した問題に追加済みマークを付ける
        if (data.results && Array.isArray(data.results)) {
          const successfulResults = data.results.filter(r => r.success)
          const successfulIndices = successfulResults.map(r => r.index)
          
          setGeneratedProblems(prev =>
            prev.map((p, globalIndex) => {
              const localIndex = problems.findIndex(prob => prob === p)
              if (localIndex !== -1 && successfulIndices.includes(localIndex)) {
                return { ...p, addedToPool: true }
              }
              return p
            })
          )
        }

        // 統計情報を更新
        await fetchProblemPoolStats()
        
        // 結果メッセージ
        const message = failureCount > 0
          ? `${subject}問題一括追加完了\n\n成功: ${successCount}問\n失敗: ${failureCount}問\n\n一部の問題で追加に失敗しました。`
          : `🎉 ${successCount}問の${subject}問題一括追加が完了しました！\n\n問題プールで利用できるようになりました。`
        
        showAlert('一括追加結果', message)
        
      } else {
        throw new Error(data.error || data.message || '一括追加に失敗しました')
      }
      
    } catch (error) {
      console.error('一括プール追加エラー:', error)
      showAlert('一括追加エラー', `一括プール追加に失敗しました。\n\nエラー詳細:\n${error.message}\n\nサーバー接続を確認してください。`)
    }
  }

  /**
   * 全問題をプールに追加
   */
  const handleAddAllToPool = async () => {
    const unadded = generatedProblems.filter(p => !p.addedToPool)
    if (unadded.length === 0) {
      showAlert('追加できません', '追加可能な問題がありません。\n先に問題を生成してください。')
      return
    }

    const confirmMessage = `生成された${unadded.length}問をプールに一括追加します。\n\n追加される問題:\n${unadded.map((p, i) => `${i+1}. ${p.word ? p.word : p.grade + ' ' + p.unit} (${p.level})`).join('\n')}\n\nプールに追加すると、今後の学習で利用できるようになります。`
    
    showConfirm(
      '📚 プール一括追加の確認',
      confirmMessage,
      async () => {
        await handleBatchAddToPool(unadded)
      }
    )
  }

  if (isGenerating) {
    return (
      <BatchLoadingScreen
        count={batchCount}
        currentIndex={Math.floor(batchCount * 0.7)} // 仮の進捗
        operation="問題生成"
        onCancel={() => {
          // 生成キャンセル処理は簡易実装
          showAlert('キャンセル', '生成処理をキャンセルしました。')
        }}
      />
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 管理画面ヘッダー */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 sm:p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">⚙️ 問題プール管理画面 v2.0</h2>
            <p className="text-sm sm:text-base opacity-90">AI問題生成 → プール追加で問題データベースを構築（数学・英語対応）</p>
          </div>
          {/* 【追加】ナビゲーションボタン */}
          <div className="flex gap-2">
            <button
              onClick={onNavigateToMenu}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              🏠 メインに戻る
            </button>
          </div>
        </div>
      </div>

      {/* 統計情報 */}
      {problemPoolStats && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow border">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            📊 現在のプール統計
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{problemPoolStats.total_problems}</div>
              <div className="text-sm text-blue-600">総問題数</div>
            </div>
            {Object.entries(problemPoolStats.problems_by_level || {}).map(([level, count]) => (
              <div key={level} className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xl font-bold text-gray-700">{count}</div>
                <div className="text-sm text-gray-600">{level}レベル</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 問題生成設定 */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow border">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          🤖 問題生成設定（組み合わせ網羅生成対応）
        </h3>
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 全選択肢を選ぶと、選択した組み合わせの全パターンで問題を生成します。
            例：全学年×全科目×全分野×全難易度 = 大量の問題生成
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📚 科目選択</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2 sm:p-3 border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm focus-ring bg-white"
            >
              {subjectOptions.map(subject => (
                <option key={subject.value} value={subject.value}>{subject.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🎓 学年</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm focus-ring"
            >
              {gradeOptions.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
          
          {(selectedSubject === 'math' || selectedSubject === 'all') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📖 分野</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm focus-ring"
              >
                {mathUnitsByGrade[selectedGrade]?.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                )) || mathUnitsByGrade['中2'].map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          )}
          
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">⭐ 難易度</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm focus-ring"
            >
              {levelOptions.map(level => (
                <option key={level.value} value={level.value}>
                  {level.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 生成数設定と実行ボタン */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              生成数（組み合わせ毎）
            </label>
            <select
              value={batchCount}
              onChange={(e) => setBatchCount(parseInt(e.target.value))}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm focus-ring"
            >
              <option value={1}>1問</option>
              <option value={2}>2問</option>
              <option value={3}>3問</option>
              <option value={5}>5問</option>
              <option value={10}>10問</option>
              <option value={20}>20問</option>
              <option value={50}>50問</option>
            </select>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-gray-600 text-right">
              想定総問題数: <span className="font-bold text-purple-600">{calculateExpectedProblemCount()}問</span>
            </div>
            <button
              onClick={handleBatchGenerate}
              disabled={!apiStatus.connected || isGenerating}
              className={`px-6 py-3 rounded-lg font-medium transition-all focus-ring ${
                apiStatus.connected && !isGenerating
                  ? 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <>🔄 生成中...</>
              ) : (
                <>🚀 問題生成開始</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 生成された問題リスト */}
      {generatedProblems.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              📝 生成された問題 ({generatedProblems.length}問)
            </h3>
            <button
              onClick={handleAddAllToPool}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium focus-ring"
            >
              📚 全てをプールに追加
            </button>
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
            {generatedProblems.map((problem, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">
                      {problem.word ? (
                        `🇬🇧 ${problem.grade} / ${problem.level} / ${problem.word}`
                      ) : (
                        `🧮 ${problem.grade} / ${problem.unit} / ${problem.level}`
                      )}
                    </span>
                    {problem.addedToPool && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                        ✅ 追加済み
                      </span>
                    )}
                  </div>
                  {!problem.addedToPool && (
                    <button
                      onClick={() => handleAddToPool(problem)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 focus-ring"
                    >
                      📚 プールに追加
                    </button>
                  )}
                </div>
                
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {problem.word ? (
                    // 英語問題の表示
                    <>
                      <p className="font-medium text-gray-800 mb-2">🇬🇧 英単語:</p>
                      <p className="text-lg font-bold text-blue-700 mb-2">{problem.word}</p>
                      {problem.pronunciation && (
                        <p className="text-gray-600 text-sm mb-2">[{problem.pronunciation}]</p>
                      )}
                      <p className="font-medium text-gray-800 mb-1">正答:</p>
                      <p className="text-green-700 font-medium mb-2">{problem.correct_meaning}</p>
                      <p className="font-medium text-gray-800 mb-1">選択肢:</p>
                      <ul className="text-gray-700 text-sm space-y-1">
                        <li>• {problem.correct_meaning} <span className="text-green-600">(正解)</span></li>
                        {problem.wrong_options?.map((option, i) => (
                          <li key={i}>• {option}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    // 数学問題の表示
                    <>
                      <p className="font-medium text-gray-800 mb-2">🧮 問題:</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{problem.problem}</p>
                      {problem.answer && (
                        <>
                          <p className="font-medium text-gray-800 mt-3 mb-1">解答:</p>
                          <p className="text-green-700 font-medium">{problem.answer}</p>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSection