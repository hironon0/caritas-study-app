import React from 'react'
import StatusIndicator from './ui/StatusIndicator'
import FeatureCard from './ui/FeatureCard'

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

        {/* API状態表示 */}
        <StatusIndicator
          apiStatus={apiStatus}
          problemPoolStats={problemPoolStats}
          className="mb-4 sm:mb-6"
        />

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

        {/* 機能カードグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* 数学学習 */}
          <FeatureCard
            title="数学（AI + プール）"
            subtitle="体系数学準拠 + AI問題生成"
            icon="🧮"
            borderColor="border-blue-500"
            bgColor="bg-blue-100"
            features={[
              '🤖 AI問題生成（思考力重視）',
              '📚 問題プール（即座に取得）',
              '📝 詳細解説（段階的説明）',
              '🎯 完全対応（学年・分野・難易度）'
            ]}
            stats={[
              { label: '解答済み', value: `${mathProgress.solved} 問題`, color: 'text-blue-600' },
              ...(problemPoolStats ? [{ label: 'プール', value: problemPoolStats.total_problems, color: 'text-green-600' }] : [])
            ]}
            onClick={() => onNavigateToStudy('math')}
          />

          {/* 英語4択テスト */}
          <FeatureCard
            title="英語4択テスト"
            subtitle="Progress 21準拠 + AI問題生成"
            icon="🇬🇧"
            borderColor="border-indigo-500"
            bgColor="bg-indigo-100"
            features={[
              '🤖 AI生成4択問題（思考力重視）',
              '📚 プール機能（復習効率化）',
              '🎯 正答率追跡（学習分析）',
              '🔄 間違い単語管理（復習支援）'
            ]}
            stats={[
              { label: '4択形式', value: 'テスト対策', color: 'text-indigo-600' }
            ]}
            onClick={() => onNavigateToStudy('english_quiz')}
          />

          {/* 管理画面 */}
          <FeatureCard
            title="問題プール管理"
            subtitle="AI問題生成 → プール追加"
            icon="⚙️"
            borderColor="border-purple-500"
            bgColor="bg-purple-100"
            features={[
              '🤖 AI問題を一括生成（1〜10問）',
              '📚 プールに一括追加（データベース構築）',
              '🎯 学年・分野・難易度を指定',
              '📊 統計情報でプール状況確認'
            ]}
            stats={[
              { label: '管理者向け機能', value: '問題データベース構築', color: 'text-purple-600' }
            ]}
            onClick={onNavigateToAdmin}
          />

          {/* 英単語学習 */}
          <FeatureCard
            title="AI英単語学習"
            subtitle="Progress 21準拠 + 語源解説"
            icon="📚"
            borderColor="border-green-500"
            bgColor="bg-green-100"
            features={[
              '🧠 文脈で覚える例文自動生成',
              '🗣️ 発音・語源まで徹底解説',
              '📈 レベル別に効率よく学習',
              '🔄 忘却曲線に基づいた復習'
            ]}
            stats={[
              { label: '学習済み', value: `${englishProgress.words} 単語`, color: 'text-green-600' }
            ]}
            onClick={() => onNavigateToStudy('english_word')}
          />
        </div>

        {/* 特徴説明 */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mt-6 sm:mt-8">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 text-center">
            🤖 AI学習ツールの特徴
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
            <div className="bg-purple-50 p-3 sm:p-4 rounded-lg text-center">
              <div className="text-xl sm:text-2xl mb-2">🧠</div>
              <h4 className="font-bold text-purple-900 mb-1 text-sm">高度な問題生成</h4>
              <p className="text-purple-700 text-xs sm:text-sm">思考力を要する良質な問題</p>
            </div>
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg text-center">
              <div className="text-xl sm:text-2xl mb-2">📚</div>
              <h4 className="font-bold text-blue-900 mb-1 text-sm">問題プール + AI</h4>
              <p className="text-blue-700 text-xs sm:text-sm">即座に取得 + オーダーメイド</p>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg text-center">
              <div className="text-xl sm:text-2xl mb-2">🎯</div>
              <h4 className="font-bold text-green-900 mb-1 text-sm">完全カスタマイズ</h4>
              <p className="text-green-700 text-xs sm:text-sm">個人レベルに最適化</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MainMenu