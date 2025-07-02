import { useState, useEffect } from 'react'

/**
 * LocalStorage永続化カスタムフック
 * 
 * 機能:
 * - 状態の自動保存・復元
 * - JSON形式での保存
 * - エラーハンドリング
 * 
 * @param {string} key - LocalStorageキー
 * @param {*} initialValue - 初期値
 * @returns {Array} [value, setValue] - 状態と更新関数
 */
export const useLocalStorage = (key, initialValue) => {
  // 初期値の設定
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`LocalStorage読み込みエラー (${key}):`, error)
      return initialValue
    }
  })

  /**
   * 値更新関数
   * @param {*} value - 新しい値（関数も可能）
   */
  const setValue = (value) => {
    try {
      // 関数の場合は現在の値を渡して実行
      const valueToStore = value instanceof Function ? value(storedValue) : value
      
      // 状態を更新
      setStoredValue(valueToStore)
      
      // LocalStorageに保存
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
      
      console.log(`📝 LocalStorage保存成功 (${key}):`, valueToStore)
    } catch (error) {
      console.error(`LocalStorage保存エラー (${key}):`, error)
    }
  }

  /**
   * 値を削除する関数
   */
  const removeValue = () => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
      console.log(`🗑️ LocalStorage削除成功 (${key})`)
    } catch (error) {
      console.error(`LocalStorage削除エラー (${key}):`, error)
    }
  }

  /**
   * 値をリセットする関数
   */
  const resetValue = () => {
    setValue(initialValue)
  }

  return [storedValue, setValue, removeValue, resetValue]
}

/**
 * 学習進捗用の専用フック
 * 
 * @param {string} subject - 教科名 ('math' | 'english')
 * @returns {Object} 進捗データと操作関数
 */
export const useStudyProgress = (subject) => {
  const keyName = `caritas_${subject}Progress`
  const initialProgress = {
    solved: 0,
    totalTime: 0,
    lastStudied: null,
    streak: 0, // 連続学習日数
    bestScore: 0,
    sessions: [] // 学習セッション履歴
  }

  const [progress, setProgress, removeProgress, resetProgress] = useLocalStorage(keyName, initialProgress)

  /**
   * 問題解答記録
   * @param {boolean} isCorrect - 正解かどうか
   * @param {number} timeSpent - 所要時間（秒）
   */
  const recordSolution = (isCorrect = true, timeSpent = 0) => {
    setProgress(prev => ({
      ...prev,
      solved: prev.solved + 1,
      totalTime: prev.totalTime + timeSpent,
      lastStudied: new Date().toISOString(),
      bestScore: isCorrect ? Math.max(prev.bestScore, prev.solved + 1) : prev.bestScore,
      sessions: [
        ...prev.sessions.slice(-99), // 最新100件まで保持
        {
          timestamp: new Date().toISOString(),
          isCorrect,
          timeSpent
        }
      ]
    }))
  }

  /**
   * 学習セッション開始記録
   */
  const startSession = () => {
    const today = new Date().toDateString()
    const lastStudiedDate = progress.lastStudied ? new Date(progress.lastStudied).toDateString() : null
    
    // 連続学習日数の計算
    let newStreak = progress.streak
    if (lastStudiedDate !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = yesterday.toDateString()
      
      if (lastStudiedDate === yesterdayString) {
        newStreak += 1 // 昨日も学習していた場合
      } else if (lastStudiedDate !== today) {
        newStreak = 1 // 久しぶりの学習の場合
      }
    }

    setProgress(prev => ({
      ...prev,
      streak: newStreak,
      lastStudied: new Date().toISOString()
    }))
  }

  /**
   * 統計情報取得
   */
  const getStats = () => {
    const sessions = progress.sessions || []
    const recentSessions = sessions.slice(-10) // 最新10セッション
    
    return {
      totalProblems: progress.solved,
      totalTime: progress.totalTime,
      averageTime: progress.solved > 0 ? progress.totalTime / progress.solved : 0,
      streak: progress.streak,
      accuracy: sessions.length > 0 ? sessions.filter(s => s.isCorrect).length / sessions.length : 0,
      recentAccuracy: recentSessions.length > 0 ? recentSessions.filter(s => s.isCorrect).length / recentSessions.length : 0,
      bestScore: progress.bestScore
    }
  }

  return {
    progress,
    setProgress,
    removeProgress,
    resetProgress,
    recordSolution,
    startSession,
    getStats
  }
}