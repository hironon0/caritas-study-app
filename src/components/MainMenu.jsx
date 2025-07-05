import React from 'react'
import StatusIndicator from './ui/StatusIndicator'
import FeatureCard from './ui/FeatureCard'
import { useStudyProgress } from '../hooks/useLocalStorage'

/**
 * メインメニューコンポーネント
 * 
 * 機能:
 * - 学習セクション選択
 * - API状態表示
 * - 問題プール統計表示
 * - 管理画面アクセス
 */
const MainMenu = ({
  apiStatus,
  problemPoolStats,
  mathProgress,
  englishProgress,
  onNavigateToStudy,
  onNavigateToAdmin
}) => {
  // LocalStorageから統計情報を取得
  const { getStats: getMathStats } = useStudyProgress('math')
  const { getStats: getEnglishStats } = useStudyProgress('english')
  const { getStats: getEnglishWordStats } = useStudyProgress('english_word')

  const mathStats = getMathStats()
  const englishStats = getEnglishStats()
  const englishWordStats = getEnglishWordStats()
  const browserInfo = () => {
    const userAgent = navigator.userAgent
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Safari'
    } else if (userAgent.includes('Brave') || userAgent.includes('Chromium')) {
      return 'Brave'
    }
    return null
  }

  const isSafariOrBrave = browserInfo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🤖</div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800 mb-2">
            カリタス中学校 AI学習ツール [DEBUG: v2024.1.4-UPDATED]
          </h1>
          <h2 className="text-lg sm:text-xl font-semibold text-purple-700 mb-2">
            完全AI搭載版
          </h2>
          <p className="text-sm sm:text-base text-gray-600">体系数学・Progress 21準拠 + 本格AI問題生成</p>
          
          {/* 機能バッジ */}
          <div className="mt-3 sm:mt-4 flex flex-wrap justify-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <span className="bg-purple-100 text-purple-800 px-2 sm:px-3 py-1 rounded-full">
              🤖 OpenAI
            </span>
            <span className="bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full">
              📝 詳細解説
            </span>
            <span className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full">
              🎯 完全準拠
            </span>
          </div>
        </div>

        {/* Safari/Brave警告 */}
        {!apiStatus.connected && isSafariOrBrave && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <div className="text-orange-500 text-xl">⚠️</div>
              <div>
                <h4 className="font-bold text-orange-800 mb-2">{isSafariOrBrave}接続エラー</h4>
                <p className="text-orange-700 text-sm mb-3">
                  {isSafariOrBrave} の厳格なセキュリティ設定により、localhost への接続が制限されています。
                </p>
                <div className="text-orange-700 text-sm space-y-2">
                  <p><strong>解決方法：</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>{isSafariOrBrave} &gt; 開発メニュー &gt; 「セキュリティで保護されていないリクエストを許可」を有効にする</li>
                    <li>Chrome、Firefox、Edge など他のブラウザをご利用ください（推奨）</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 数学学習セクション */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
            🧮 数学学習
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <FeatureCard
              title="数学（AI + プール）"
              subtitle="体系数学準拠 + AI問題生成"
              icon="🧮"
              borderColor="border-blue-500"
              bgColor="bg-blue-100"
              onClick={() => onNavigateToStudy('math')}
              stats={[
                { label: '問題数', value: problemPoolStats?.problems_by_subject?.math || 0, color: 'text-blue-600' },
                { label: '回答数', value: mathStats.totalProblems, color: 'text-blue-600' },
                { label: '正解数', value: Math.round(mathStats.totalProblems * mathStats.accuracy), color: 'text-green-600' },
                { label: '正解率', value: `${Math.round(mathStats.accuracy * 100)}%`, color: 'text-green-600' }
              ]}
            />
          </div>
        </div>

        {/* 英語学習セクション */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
            🇬🇧 英語学習
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* 英語4択テスト */}
            <FeatureCard
              title="英語4択テスト"
              subtitle="Progress 21準拠 + AI問題生成"
              icon="🇬🇧"
              borderColor="border-indigo-500"
              bgColor="bg-indigo-100"
              onClick={() => onNavigateToStudy('english_quiz')}
              stats={[
                { label: '問題数', value: problemPoolStats?.problems_by_subject?.english || 0, color: 'text-indigo-600' },
                { label: '回答数', value: englishStats.totalProblems, color: 'text-indigo-600' },
                { label: '正解数', value: Math.round(englishStats.totalProblems * englishStats.accuracy), color: 'text-green-600' },
                { label: '正解率', value: `${Math.round(englishStats.accuracy * 100)}%`, color: 'text-green-600' }
              ]}
            />

            {/* AI英単語学習 */}
            <FeatureCard
              title="AI英単語学習"
              subtitle="Progress 21準拠 + 語源解説"
              icon="📚"
              borderColor="border-green-500"
              bgColor="bg-green-100"
              onClick={() => onNavigateToStudy('english_word')}
              stats={[
                { label: '学習済み単語数', value: englishWordStats.totalProblems, color: 'text-green-600' },
                { label: '正解率', value: `${Math.round(englishWordStats.accuracy * 100)}%`, color: 'text-green-600' }
              ]}
            />
          </div>
        </div>

        {/* 問題プール管理セクション */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 text-center">
            ⚙️ 問題プール管理
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <FeatureCard
              title="問題プール管理"
              subtitle="AI問題生成 → プール追加"
              icon="⚙️"
              borderColor="border-purple-500"
              bgColor="bg-purple-100"
              onClick={onNavigateToAdmin}
              stats={[
                { label: '総問題数', value: (problemPoolStats?.problems_by_subject?.math || 0) + (problemPoolStats?.problems_by_subject?.english || 0), color: 'text-purple-600' },
                { label: '数学', value: problemPoolStats?.problems_by_subject?.math || 0, color: 'text-blue-600' },
                { label: '英語', value: problemPoolStats?.problems_by_subject?.english || 0, color: 'text-indigo-600' }
              ]}
            />
          </div>
        </div>

        {/* API状態表示 */}
        <StatusIndicator
          apiStatus={apiStatus}
          problemPoolStats={problemPoolStats}
          className="mt-6 sm:mt-8"
        />
      </div>
    </div>
  )
}

export default MainMenu