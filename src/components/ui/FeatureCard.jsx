import React from 'react'

/**
 * 機能カードコンポーネント
 * 
 * 機能:
 * - クリック可能な機能カード
 * - アイコン、タイトル、説明の表示
 * - 統計情報表示
 * - レスポンシブ対応
 */
const FeatureCard = ({
  title,
  subtitle,
  icon,
  borderColor = 'border-gray-300',
  bgColor = 'bg-gray-100',
  features = [],
  stats = [],
  onClick,
  disabled = false,
  comingSoon = false,
  className = ''
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
    }
  }

  const cardClasses = `
    bg-white p-4 sm:p-6 rounded-lg shadow-lg transition-all cursor-pointer border-l-4 touch-manipulation
    ${borderColor}
    ${disabled 
      ? 'opacity-50 cursor-not-allowed' 
      : 'hover:shadow-xl card-hover active:scale-95'
    }
    ${className}
  `.trim()

  return (
    <div 
      onClick={handleClick}
      className={cardClasses}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      {/* ヘッダー */}
      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className={`${bgColor} p-2 sm:p-3 rounded-lg text-2xl sm:text-3xl`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">{title}</h2>
          <p className="text-sm sm:text-base text-gray-600 truncate">{subtitle}</p>
        </div>
      </div>

      {/* 機能リスト */}
      {features.length > 0 && (
        <ul className="text-xs sm:text-sm text-gray-700 space-y-1 mb-3 sm:mb-4">
          {features.map((feature, index) => (
            <li key={index}>• {feature}</li>
          ))}
        </ul>
      )}

      {/* Coming Soon バッジ */}
      {comingSoon && (
        <div className="text-center mb-3 sm:mb-4">
          <span className="bg-gray-300 text-gray-600 px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm">
            Coming Soon
          </span>
        </div>
      )}

      {/* 統計情報 */}
      {stats.length > 0 && (
        <div className="flex items-center justify-between text-xs sm:text-sm flex-wrap gap-2">
          {stats.map((stat, index) => (
            <span key={index} className={stat.color || 'text-gray-600'}>
              {stat.label}: {stat.value}
            </span>
          ))}
        </div>
      )}

      {/* ホバーエフェクト用のオーバーレイ */}
      {!disabled && (
        <div className="absolute inset-0 rounded-lg transition-all opacity-0 hover:opacity-5 bg-blue-500 pointer-events-none" />
      )}
    </div>
  )
}

export default FeatureCard