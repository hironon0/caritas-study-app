import React from 'react';
import { useAdaptiveLearning } from '../../hooks/useAdaptiveLearning';

/**
 * 適応学習ダッシュボードコンポーネント
 * 学習状況の可視化と復習管理機能を提供
 */
const AdaptiveLearningDashboard = ({ isOpen, onClose }) => {
    const { adaptiveData, getWordsForReview, getLearningStats, resetAdaptiveData } = useAdaptiveLearning();
    
    if (!isOpen) return null;
    
    const stats = getLearningStats();
    const reviewWords = getWordsForReview(15);
    const wordMasteryEntries = Object.values(adaptiveData.wordMastery || {})
        .sort((a, b) => b.lastStudied.localeCompare(a.lastStudied))
        .slice(0, 20);

    // 習熟度レベルに応じた色とラベル
    const getMasteryInfo = (level) => {
        switch (level) {
            case 5: return { color: 'bg-green-500', label: 'マスター', textColor: 'text-green-800' };
            case 4: return { color: 'bg-blue-500', label: '上級', textColor: 'text-blue-800' };
            case 3: return { color: 'bg-yellow-500', label: '中級', textColor: 'text-yellow-800' };
            case 2: return { color: 'bg-orange-500', label: '初級', textColor: 'text-orange-800' };
            case 1: return { color: 'bg-red-500', label: '要復習', textColor: 'text-red-800' };
            default: return { color: 'bg-gray-500', label: '要集中', textColor: 'text-gray-800' };
        }
    };

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
                {/* ヘッダー */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">🧠 適応学習ダッシュボード</h2>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>
                    
                    {/* 総合統計 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="bg-white/10 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold">{stats.totalWords}</div>
                            <div className="text-sm">学習単語数</div>
                        </div>
                        <div className="bg-white/10 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold">{stats.masteredWords}</div>
                            <div className="text-sm">習得単語</div>
                        </div>
                        <div className="bg-white/10 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold">{Math.round(stats.overallAccuracy * 100)}%</div>
                            <div className="text-sm">総合正答率</div>
                        </div>
                        <div className="bg-white/10 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold">Lv.{stats.currentDifficultyLevel}</div>
                            <div className="text-sm">現在のレベル</div>
                        </div>
                    </div>
                </div>
                
                {/* コンテンツエリア */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* 復習が必要な単語 */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                🔄 復習が必要な単語 ({reviewWords.length}個)
                            </h3>
                            
                            {reviewWords.length > 0 ? (
                                <div className="space-y-2">
                                    {reviewWords.map((word, index) => {
                                        const masteryInfo = getMasteryInfo(word.masteryLevel || 0);
                                        return (
                                            <div key={word.word || index} className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-red-800">{word.word}</div>
                                                        <div className="text-sm text-red-600">
                                                            正答率: {Math.round((word.accuracy || 0) * 100)}%
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${masteryInfo.color} text-white`}>
                                                            {masteryInfo.label}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            優先度: {word.priority || 0}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                                    <div className="text-green-800 font-medium">🎉 復習が必要な単語はありません</div>
                                    <div className="text-sm text-green-600 mt-1">素晴らしい学習状況です！</div>
                                </div>
                            )}
                        </div>
                        
                        {/* 最近の学習単語 */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                📚 最近の学習単語
                            </h3>
                            
                            {wordMasteryEntries.length > 0 ? (
                                <div className="space-y-2">
                                    {wordMasteryEntries.map((word, index) => {
                                        const masteryInfo = getMasteryInfo(word.masteryLevel);
                                        return (
                                            <div key={word.word || index} className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-gray-800">{word.word}</div>
                                                        <div className="text-sm text-gray-600">
                                                            {word.totalAttempts}回学習 | 正答率: {Math.round(word.accuracy * 100)}%
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${masteryInfo.color} text-white`}>
                                                            {masteryInfo.label}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {formatDate(word.lastStudied)}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* 習熟度プログレスバー */}
                                                <div className="mt-2">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className={`h-2 rounded-full ${masteryInfo.color}`}
                                                                style={{ width: `${(word.masteryLevel / 5) * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-500">
                                                            {word.masteryLevel}/5
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                                    <div className="text-gray-600">まだ学習データがありません</div>
                                    <div className="text-sm text-gray-500 mt-1">英語学習を開始して記録を蓄積しましょう</div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* 習熟度分布 */}
                    <div className="mt-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 習熟度分布</h3>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                            {[0, 1, 2, 3, 4, 5].map(level => {
                                const masteryInfo = getMasteryInfo(level);
                                const count = Object.values(adaptiveData.wordMastery || {})
                                    .filter(word => word.masteryLevel === level).length;
                                
                                return (
                                    <div key={level} className="bg-white border border-gray-200 p-3 rounded-lg text-center">
                                        <div className={`w-4 h-4 rounded-full ${masteryInfo.color} mx-auto mb-2`}></div>
                                        <div className="text-2xl font-bold text-gray-800">{count}</div>
                                        <div className="text-xs text-gray-600">{masteryInfo.label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* アクションボタン */}
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                            学習を続ける
                        </button>
                        
                        <button
                            onClick={() => {
                                if (confirm('学習データをリセットしますか？この操作は取り消せません。')) {
                                    resetAdaptiveData();
                                    alert('学習データをリセットしました。');
                                }
                            }}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                        >
                            データリセット
                        </button>
                        
                        <div className="flex-1 text-right">
                            <div className="text-sm text-gray-500">
                                総学習単語: {stats.totalWords} | 
                                復習予定: {stats.reviewWordsCount} | 
                                弱点単語: {stats.weaknessWordsCount}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdaptiveLearningDashboard;