import React from 'react'

/**
 * ローディング画面コンポーネント
 * 
 * 機能:
 * - アニメーション表示
 * - カスタマイズ可能なメッセージ
 * - キャンセルボタン（オプション）
 * - レスポンシブ対応
 */
const LoadingScreen = ({
  message = 'ロード中',
  subMessage = '',
  icon = '⏳',
  showCancel = false,
  onCancel,
  progress = null, // 0-100 の進捗値（オプション）
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-center min-h-64 p-4 ${className}`}>
      <div className="text-center max-w-sm mx-auto">
        {/* アイコン */}
        <div className="text-4xl sm:text-6xl mb-4 pulse-animation">
          {icon}
        </div>
        
        {/* メインメッセージ */}
        <div className="text-lg sm:text-xl font-bold text-blue-600 mb-2">
          {message}
          <span className="loading-dots"></span>
        </div>
        
        {/* サブメッセージ */}
        {subMessage && (
          <div className="text-xs sm:text-sm text-gray-600 mb-4">
            {subMessage}
          </div>
        )}
        
        {/* 進捗バー */}
        <div className="w-48 sm:w-64 bg-gray-200 rounded-full h-2 mx-auto mb-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: progress !== null ? `${progress}%` : '75%',
              animation: progress === null ? 'pulse 2s infinite' : undefined
            }}
          ></div>
        </div>
        
        {/* キャンセルボタン */}
        {showCancel && onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm focus-ring"
            type="button"
          >
            ⏸️ キャンセル
          </button>
        )}
        
        {/* ローディングスピナー（アクセシビリティ用） */}
        <div 
          className="sr-only" 
          role="status" 
          aria-live="polite"
        >
          {message}
        </div>
      </div>
    </div>
  )
}

/**
 * 数学問題生成専用ローディング
 */
export const MathLoadingScreen = ({ usePool = false, onCancel }) => (
  <LoadingScreen
    message={usePool ? '問題プールから取得中' : 'AIが高品質な問題を生成中'}
    subMessage={usePool ? '問題プールから最適な問題を選択しています' : '体系数学に準拠した思考力問題を作成しています'}
    icon={usePool ? '📚' : '🤖'}
    showCancel={true}
    onCancel={onCancel}
  />
)

/**
 * 英語学習専用ローディング
 */
export const EnglishLoadingScreen = ({ onCancel }) => (
  <LoadingScreen
    message="AIが最適な英単語を生成中"
    subMessage="Progress 21に準拠した単語と詳細解説を作成しています"
    icon="📚"
    showCancel={true}
    onCancel={onCancel}
  />
)

/**
 * 一括処理専用ローディング
 */
export const BatchLoadingScreen = ({ count, currentIndex, operation = '処理', onCancel }) => {
  const progress = count > 0 ? Math.round((currentIndex / count) * 100) : 0
  
  return (
    <LoadingScreen
      message={`${operation}中 (${currentIndex}/${count})`}
      subMessage={`${count}件の${operation}を実行しています...`}
      icon="🚀"
      progress={progress}
      showCancel={true}
      onCancel={onCancel}
    />
  )
}

export default LoadingScreen