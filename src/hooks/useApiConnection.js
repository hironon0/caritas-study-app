import { useState, useEffect } from 'react'

/**
 * API接続管理カスタムフック
 * 
 * 機能:
 * - 複数ポートでのAPI接続試行
 * - 接続状態の監視
 * - ブラウザ別エラーハンドリング
 * 
 * @returns {Object} API接続状態と関数
 */
export const useApiConnection = () => {
  const [apiStatus, setApiStatus] = useState({
    connected: false,
    checking: true,
    error: null,
    apiUrl: null,
    port: null,
    version: null,
    environment: null
  })

  /**
   * API接続確認関数
   * 複数ポートを順番に試行して接続を確立
   */
  const checkApiConnection = async () => {
    const tryPorts = [3001, 3002, 3000]
    let lastError = null

    console.log('🚀 [DEBUG] API接続確認開始 - 現在時刻:', new Date().toLocaleString())
    setApiStatus(prev => ({ ...prev, checking: true, error: null }))

    // 各ポートを順番に試行
    for (const port of tryPorts) {
      const testUrl = `http://localhost:${port}`
      try {
        console.log(`🔍 [DEBUG] API接続テスト開始: ${testUrl}/api/health`)
        
        const response = await fetch(`${testUrl}/api/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          mode: 'cors',
          credentials: 'omit', // Safari/Brave対応
          signal: AbortSignal.timeout(5000) // 5秒タイムアウト
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        // 接続成功
        window.CARITAS_API_URL = testUrl
        
        setApiStatus({
          connected: data.openai_available,
          checking: false,
          version: data.version,
          environment: data.environment,
          apiUrl: testUrl,
          port: port,
          error: null
        })

        console.log(`✅ [DEBUG] API接続成功: ${testUrl}`)
        console.log(`📊 [DEBUG] API応答データ:`, data)
        console.log(`🌐 [DEBUG] window.CARITAS_API_URL設定:`, window.CARITAS_API_URL)
        return true

      } catch (error) {
        console.log(`❌ [DEBUG] ポート${port}接続失敗:`, error.message)
        console.log(`🔍 [DEBUG] エラー詳細:`, error)
        lastError = error
        continue // 次のポートを試行
      }
    }

    // すべてのポートで失敗
    console.error('📡 [DEBUG] すべてのポートで接続失敗:', lastError)
    console.log(`🔍 [DEBUG] 試行したポート:`, tryPorts)

    // ブラウザ判定とエラーメッセージ
    const userAgent = navigator.userAgent
    const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome')
    const isBrave = userAgent.includes('Brave') || userAgent.includes('Chromium')

    let errorMessage = `API接続エラー: ${lastError?.message || '不明なエラー'}`

    if (isSafari) {
      errorMessage += '\n\n🦁 Safari使用時の解決方法:\n1. Safari > 開発 > セキュリティ制限を無効にする\n2. Safari > 開発 > Cross-Origin制限を無効にする\n3. Chrome/Firefoxの使用を推奨'
    } else if (isBrave) {
      errorMessage += '\n\n🛡️ Brave使用時の解決方法:\n1. Brave設定 > セキュリティとプライバシー > シールドを下げる\n2. このサイトで広告・トラッカーブロックを無効にする\n3. Chrome/Firefoxの使用を推奨'
    }

    setApiStatus({
      connected: false,
      checking: false,
      error: errorMessage,
      testedPorts: tryPorts,
      apiUrl: null,
      port: null,
      version: null,
      environment: null
    })

    return false
  }

  /**
   * API接続リトライ関数
   */
  const retryConnection = () => {
    console.log('🔄 API接続をリトライします...')
    checkApiConnection()
  }

  /**
   * API URL取得関数
   */
  const getApiUrl = () => {
    return window.CARITAS_API_URL || apiStatus.apiUrl
  }

  /**
   * ブラウザ情報取得関数
   */
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent
    
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return { name: 'Safari', compatible: false }
    } else if (userAgent.includes('Brave') || userAgent.includes('Chromium')) {
      return { name: 'Brave', compatible: false }
    } else if (userAgent.includes('Chrome')) {
      return { name: 'Chrome', compatible: true }
    } else if (userAgent.includes('Firefox')) {
      return { name: 'Firefox', compatible: true }
    } else if (userAgent.includes('Edge')) {
      return { name: 'Edge', compatible: true }
    } else {
      return { name: 'Unknown', compatible: false }
    }
  }

  return {
    apiStatus,
    checkApiConnection,
    testConnection: checkApiConnection, // 【追加】エイリアス - 後方互換性確保
    retryConnection,
    getApiUrl,
    getBrowserInfo
  }
}