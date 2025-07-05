import React from 'react'
import MathStudy from './study/MathStudy'
import EnglishWordStudy from './study/EnglishWordStudy'
import EnglishStudy from './study/EnglishStudy'

/**
 * 学習セクションコンポーネント
 * 
 * 機能:
 * - 科目別学習画面の切り替え
 * - 共通ヘッダー表示
 * - プロパティの受け渡し
 */
const StudySection = ({
  selectedSubject,
  onNavigateToMenu,
  ...props
}) => {
  const getSubjectTitle = () => {
    switch (selectedSubject) {
      case 'math':
        return '🧮 数学学習'
      case 'english_word':
        return '🇬🇧 英語4択問題'
      case 'english_quiz':
        return '🇬🇧 英語4択テスト'
      default:
        return '📖 学習'
    }
  }

  const getSubjectBadge = () => {
    switch (selectedSubject) {
      case 'math':
        return 'プールベース'
      case 'english_word':
        return 'プールベース'
      case 'english_quiz':
        return 'プールベース'
      default:
        return '学習'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        {/* 共通ヘッダー */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={onNavigateToMenu}
            className="bg-white p-2 sm:p-3 rounded-lg shadow hover:shadow-md transition-all touch-manipulation focus-ring"
            aria-label="メインメニューに戻る"
          >
            ↩️
          </button>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800 min-w-0 flex-1">
            {getSubjectTitle()}
          </h1>
          <div className="text-xs sm:text-sm text-purple-600 bg-purple-100 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">
            {getSubjectBadge()}
          </div>
        </div>

        {/* 科目別コンテンツ */}
        {selectedSubject === 'math' && (
          <MathStudy {...props} />
        )}
        
        {selectedSubject === 'english_word' && (
          <EnglishWordStudy {...props} />
        )}
        
        {selectedSubject === 'english_quiz' && (
          <EnglishStudy {...props} />
        )}
        
        {/* 未対応科目 */}
        {!['math', 'english_word', 'english_quiz'].includes(selectedSubject) && (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-4xl mb-4">🚧</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">準備中</h2>
            <p className="text-gray-600 mb-4">この科目はまだ準備中です。</p>
            <button
              onClick={onNavigateToMenu}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              メインメニューに戻る
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudySection