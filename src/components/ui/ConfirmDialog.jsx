import React from 'react'

/**
 * 確認ダイアログコンポーネント
 * 
 * 機能:
 * - モーダル表示
 * - 確認・キャンセル処理
 * - レスポンシブ対応
 * 
 * @param {boolean} show - 表示状態
 * @param {Object} config - ダイアログ設定
 * @param {Function} onClose - 閉じる処理
 */
const ConfirmDialog = ({ show, config, onClose }) => {
  if (!show) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleConfirm = () => {
    if (config.onConfirm) {
      config.onConfirm()
    }
    onClose()
  }

  const handleCancel = () => {
    if (config.onCancel) {
      config.onCancel()
    }
    onClose()
  }

  const isAlert = !config.onCancel

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 will-change-transform">
        <div className="p-6">
          {/* タイトル */}
          <h3 
            id="dialog-title"
            className="text-lg font-bold text-gray-900 mb-3"
          >
            {config.title || (isAlert ? 'お知らせ' : '確認')}
          </h3>
          
          {/* メッセージ */}
          <div className="text-gray-700 mb-6 whitespace-pre-line leading-relaxed">
            {config.message}
          </div>
          
          {/* ボタン */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            {!isAlert && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium focus-ring"
                type="button"
              >
                キャンセル
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-lg transition-colors font-medium focus-ring ${
                isAlert 
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              type="button"
              autoFocus
            >
              {isAlert ? 'OK' : '実行する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog