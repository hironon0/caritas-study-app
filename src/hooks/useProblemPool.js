import { useState, useCallback } from 'react'

/**
 * 問題プール管理カスタムフック
 * 
 * 機能:
 * - 問題プール統計情報の取得
 * - 問題の追加・取得
 * - 一括処理
 * 
 * @returns {Object} 問題プール操作関数と状態
 */
export const useProblemPool = () => {
  const [problemPoolStats, setProblemPoolStats] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  /**
   * 問題プール統計情報取得
   */
  const fetchProblemPoolStats = useCallback(async () => {
    console.log('📊 [DEBUG] 問題プール統計情報取得開始 - 現在時刻:', new Date().toLocaleString())
    
    const apiUrl = window.CARITAS_API_URL
    console.log('🌐 [DEBUG] API URL状態:', apiUrl)
    
    if (!apiUrl) {
      console.warn('📊 [DEBUG] API URLが設定されていません')
      return null
    }
    
    try {
      const statsUrl = `${apiUrl}/api/problem-pool/stats`
      console.log('🔗 [DEBUG] 統計情報取得URL:', statsUrl)
      
      const response = await fetch(statsUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        credentials: 'omit'
      })
      
      console.log('📊 [DEBUG] 統計情報応答ステータス:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        setProblemPoolStats(data.stats)
        console.log('📊 [DEBUG] 問題プール統計情報取得成功:', data.stats)
        return data.stats
      } else {
        console.warn('📊 [DEBUG] 統計情報取得失敗: HTTPステータス', response.status)
        const errorText = await response.text()
        console.warn('📊 [DEBUG] エラー応答:', errorText)
        return null
      }
    } catch (error) {
      console.warn('📊 [DEBUG] 問題プール統計情報取得エラー:', error.message)
      console.warn('📊 [DEBUG] エラー詳細:', error)
      return null
    }
  }, [])

  /**
   * 問題をプールから取得
   * @param {string} grade - 学年
   * @param {string} unit - 単元
   * @param {string} level - 難易度
   */
  const getProblemFromPool = useCallback(async (grade, unit, level) => {
    const apiUrl = window.CARITAS_API_URL
    if (!apiUrl) {
      throw new Error('API接続が確立されていません')
    }

    setIsLoading(true)
    
    try {
      console.log(`📚 問題プール取得リクエスト: ${grade}/${unit}/${level}`)
      
      const response = await fetch(`${apiUrl}/api/problem-pool/${encodeURIComponent(grade)}/${encodeURIComponent(unit)}/${encodeURIComponent(level)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        credentials: 'omit'
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          const errorData = await response.json()
          console.log('📚 プールに問題なし:', errorData.message)
          throw new Error(`指定された条件の問題が見つかりませんでした。\n\n詳細: ${errorData.message}`)
        }
        throw new Error(`HTTPエラー: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success && data.problem) {
        console.log('✅ 問題プールから取得成功:', data.problem.id)
        return data.problem
      }
      
      throw new Error('プールから問題を取得できませんでした')
      
    } catch (error) {
      console.error('📚 問題プール取得エラー:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 問題をプールに追加
   * @param {Object} problem - 追加する問題データ
   */
  const addProblemToPool = useCallback(async (problem) => {
    const apiUrl = window.CARITAS_API_URL
    if (!apiUrl) {
      throw new Error('API接続が確立されていません')
    }

    try {
      console.log('📝 問題をプールに追加中:', problem.id || 'ID未設定')
      
      const response = await fetch(`${apiUrl}/api/problem-pool/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem }),
        mode: 'cors',
        credentials: 'omit'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTPエラー: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        console.log('✅ 問題プール追加成功:', data.problem_id)
        
        // 統計情報を再取得
        await fetchProblemPoolStats()
        
        return { success: true, problemId: data.problem_id }
      }
      
      throw new Error('問題の追加に失敗しました')
      
    } catch (error) {
      console.error('📝 問題プール追加エラー:', error)
      throw error
    }
  }, [fetchProblemPoolStats])

  /**
   * 複数問題を一括でプールに追加
   * @param {Array} problems - 追加する問題データの配列
   */
  const addBatchToPool = useCallback(async (problems) => {
    const apiUrl = window.CARITAS_API_URL
    if (!apiUrl) {
      throw new Error('API接続が確立されていません')
    }

    try {
      console.log(`🚀 ${problems.length}問の一括プール追加開始`)
      
      const response = await fetch(`${apiUrl}/api/problem-pool/add-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problems })
      })

      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success || (data.success_count && data.success_count > 0)) {
        const successCount = data.success_count || 0
        const failureCount = data.failure_count || 0
        
        console.log(`✅ 一括プール追加完了: 成功${successCount}問, 失敗${failureCount}問`)
        
        // 統計情報を更新
        await fetchProblemPoolStats()
        
        return {
          success: true,
          successCount,
          failureCount,
          results: data.results || []
        }
      } else {
        throw new Error(data.error || data.message || '一括追加に失敗しました')
      }
      
    } catch (error) {
      console.error('🚀 一括プール追加エラー:', error)
      throw error
    }
  }, [fetchProblemPoolStats])

  /**
   * プール統計情報のリアルタイム更新
   */
  const refreshStats = useCallback(async () => {
    console.log('🔄 問題プール統計情報を更新中...')
    return await fetchProblemPoolStats()
  }, [fetchProblemPoolStats])

  /**
   * プール内検索（将来の拡張用）
   * @param {Object} filters - 検索フィルター
   */
  const searchProblems = useCallback(async (filters = {}) => {
    const apiUrl = window.CARITAS_API_URL
    if (!apiUrl) {
      throw new Error('API接続が確立されていません')
    }

    try {
      const queryParams = new URLSearchParams(filters).toString()
      const response = await fetch(`${apiUrl}/api/problem-pool/search?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        credentials: 'omit'
      })

      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`)
      }

      const data = await response.json()
      return data.problems || []
      
    } catch (error) {
      console.error('🔍 プール検索エラー:', error)
      throw error
    }
  }, [])

  return {
    problemPoolStats,
    isLoading,
    fetchProblemPoolStats,
    getProblemFromPool,
    addProblemToPool,
    addBatchToPool,
    refreshStats,
    searchProblems
  }
}