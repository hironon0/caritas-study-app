import React from 'react'

/**
 * API状態インジケーターコンポーネント
 * 
 * 機能:
 * - API接続状態表示
 * - 問題プール統計表示
 * - レスポンシブ対応
 */
const StatusIndicator = ({ apiStatus, problemPoolStats, className = '' }) => {
  const getStatusIcon = () => {
    if (apiStatus.checking) return '🔄'
    return apiStatus.connected ? '✅' : '❌'
  }

  const getStatusText = () => {
    if (apiStatus.checking) return 'チェック中...'
    return apiStatus.connected ? '接続済み' : '接続エラー'
  }

  const getStatusColor = () => {
    if (apiStatus.checking) return 'status-checking'
    return apiStatus.connected ? 'status-connected' : 'status-disconnected'
  }

  return (
    <div className={`bg-white p-3 sm:p-4 rounded-lg shadow border ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        {/* API状態 */}
        <div className="flex items-center gap-2">
          <div className={`status-indicator ${getStatusColor()}`}></div>
          <span className="text-xs sm:text-sm font-medium">
            AI状態: {getStatusIcon()} {getStatusText()}
          </span>
        </div>
        
        {/* バージョン情報 */}
        {apiStatus.version && (
          <span className="text-xs text-gray-500">v{apiStatus.version}</span>
        )}
      </div>
      
      {/* 接続URL */}
      {apiStatus.apiUrl && (
        <div className="text-xs text-gray-500 mt-1 truncate">
          接続URL: {apiStatus.apiUrl}
        </div>
      )}
      
      {/* 問題プール統計 */}
      {problemPoolStats && (
        <div className="text-xs text-blue-600 mt-1">
          📚 問題プール: {problemPoolStats.total_problems}問題利用可能
          {problemPoolStats.problems_by_level && (
            <span className="ml-2">
              (基礎: {problemPoolStats.problems_by_level.基礎 || 0}, 
              標準: {problemPoolStats.problems_by_level.標準 || 0}, 
              応用: {problemPoolStats.problems_by_level.応用 || 0}, 
              発展: {problemPoolStats.problems_by_level.発展 || 0})
            </span>
          )}
        </div>
      )}
      
      {/* エラー詳細 */}
      {!apiStatus.connected && apiStatus.error && (
        <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border-l-2 border-red-200">
          <details>
            <summary className="cursor-pointer font-medium">エラー詳細を表示</summary>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-xs">
              {apiStatus.error}
            </pre>
          </details>
        </div>
      )}
      
      {/* 試行ポート情報 */}
      {!apiStatus.connected && apiStatus.testedPorts && (
        <div className="text-xs text-gray-500 mt-1">
          試行ポート: {apiStatus.testedPorts.join(', ')}
        </div>
      )}
    </div>
  )
}

export default StatusIndicator