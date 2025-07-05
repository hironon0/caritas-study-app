import React, { useState, useEffect, useCallback } from 'react';
import { useApiConnection } from '../../hooks/useApiConnection';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useAdaptiveLearning } from '../../hooks/useAdaptiveLearning';
import AdaptiveLearningDashboard from './AdaptiveLearningDashboard';

const EnglishStudy = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [currentProblem, setCurrentProblem] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [choices, setChoices] = useState([]);
    const [startTime, setStartTime] = useState(null);
    const [showDashboard, setShowDashboard] = useState(false);
    const [studyStats, setStudyStats] = useLocalStorage('englishStudyStats', {
        totalAnswered: 0,
        correctAnswers: 0,
        incorrectWords: [],
        studiedWords: []
    });
    
    // 適応学習システムの統合
    const {
        recordWordLearning,
        getWordsForReview,
        getLearningStats,
        resetAdaptiveData
    } = useAdaptiveLearning();
    const [settings, setSettings] = useLocalStorage('englishStudySettings', {
        grade: '中1',
        level: '基礎'
    });
    
    const { testConnection } = useApiConnection();

    // 4択の選択肢をシャッフルして作成
    const createChoices = (problem) => {
        if (!problem || !problem.wrong_options || !problem.correct_meaning) {
            return [];
        }
        
        const allChoices = [
            { text: problem.correct_meaning, isCorrect: true },
            ...problem.wrong_options.map(option => ({ text: option, isCorrect: false }))
        ];
        
        // Fisher-Yatesアルゴリズムでシャッフル
        for (let i = allChoices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
        }
        
        return allChoices;
    };

    // 新しい問題を取得
    const fetchNewProblem = useCallback(async () => {
        try {
            console.log('🎯 [DEBUG] 英語問題取得開始 - 現在時刻:', new Date().toLocaleString());
            console.log('🔍 [DEBUG] 現在の設定:', { grade: settings.grade, level: settings.level });
            console.log('🔍 [DEBUG] window.CARITAS_API_URL:', window.CARITAS_API_URL);
            
            setIsLoading(true);
            const isConnected = await testConnection();
            
            console.log('🌐 [DEBUG] API接続状態:', isConnected);
            if (!isConnected) {
                throw new Error('サーバーとの接続が確立できません');
            }

            // 適応学習：復習対象単語の優先出題
            const reviewWords = getWordsForReview(10);
            const adaptiveStats = getLearningStats();
            
            console.log('🎯 [DEBUG] 復習対象単語:', reviewWords.map(w => w.word));
            console.log('📊 [DEBUG] 適応学習統計:', adaptiveStats);
            
            // 復習対象がある場合は優先、ない場合は通常ロジック
            let excludeParam = '';
            if (reviewWords.length > 0) {
                // 復習モード：特定の単語を優先出題
                const priorityWords = reviewWords.slice(0, 5).map(w => w.word);
                excludeParam = `?priority=${priorityWords.join(',')}`;
            } else {
                // 通常モード：直近学習単語を除外
                const excludeWords = studyStats.studiedWords.slice(-20);
                excludeParam = excludeWords.length > 0 ? `?exclude=${excludeWords.join(',')}` : '';
            }
            
            console.log('🔗 [DEBUG] 適応学習パラメータ:', excludeParam);
            
            // 【修正】統合4択問題取得エンドポイントを使用 - プール優先+AI生成フォールバック - URL エンコーディング対応
            const encodedGrade = encodeURIComponent(settings.grade);
            const encodedLevel = encodeURIComponent(settings.level);
            const quizUrl = `/api/english-quiz/${encodedGrade}/${encodedLevel}${excludeParam}`;
            console.log('🎯 [DEBUG] 統合4択問題取得URL:', quizUrl);
            console.log('🔍 [DEBUG] エンコード詳細:', {
                original: { grade: settings.grade, level: settings.level },
                encoded: { grade: encodedGrade, level: encodedLevel }
            });
            
            const response = await fetch(`${window.CARITAS_API_URL}${quizUrl}`);
            console.log('📊 [DEBUG] 統合API応答ステータス:', response.status);

            if (!response.ok) {
                throw new Error(`問題取得エラー: ${response.status}`);
            }

            const responseText = await response.text();
            console.log('🔍 [DEBUG] サーバー応答内容:', responseText.substring(0, 500));
            console.log('🔍 [DEBUG] Content-Type:', response.headers.get('content-type'));
            
            const data = JSON.parse(responseText);
            
            if (!data.success) {
                throw new Error(data.error || '問題の取得に失敗しました');
            }

            console.log('📈 [DEBUG] 取得ソース:', data.source);
            console.log('📋 [DEBUG] フォーマット:', data.format);
            
            // 統一された問題オブジェクトを直接使用
            const problem = data.problem;
            setCurrentProblem(problem);
            setChoices(createChoices(problem));
            setSelectedAnswer(null);
            setShowAnswer(false);
            setStartTime(new Date()); // 回答時間計測開始
            
        } catch (error) {
            console.error('問題取得エラー:', error);
            alert(`問題の取得に失敗しました: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [settings.grade, settings.level, studyStats.studiedWords, testConnection]);

    // 回答処理
    const handleAnswerSelect = (choiceIndex) => {
        if (showAnswer) return;
        setSelectedAnswer(choiceIndex);
    };

    // 回答確定
    const handleSubmitAnswer = () => {
        if (selectedAnswer === null || showAnswer) return;
        
        const isCorrect = choices[selectedAnswer].isCorrect;
        const endTime = new Date();
        const responseTime = startTime ? (endTime - startTime) / 1000 : 0; // 秒単位
        
        // 適応学習システムに学習結果を記録
        recordWordLearning(
            currentProblem.word,
            isCorrect,
            responseTime,
            settings.level
        );
        
        // 従来の統計更新も維持（互換性のため）
        setStudyStats(prev => {
            const newStats = {
                ...prev,
                totalAnswered: prev.totalAnswered + 1,
                correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
                studiedWords: [...prev.studiedWords, currentProblem.word]
            };
            
            // 間違った単語を記録
            if (!isCorrect) {
                const incorrectWord = {
                    word: currentProblem.word,
                    correct_meaning: currentProblem.correct_meaning,
                    selected_meaning: choices[selectedAnswer].text,
                    timestamp: new Date().toISOString(),
                    responseTime: responseTime
                };
                
                newStats.incorrectWords = [...prev.incorrectWords, incorrectWord];
                
                // 間違った単語は最大50個まで保持
                if (newStats.incorrectWords.length > 50) {
                    newStats.incorrectWords = newStats.incorrectWords.slice(-50);
                }
            }
            
            // 学習済み単語は最大100個まで保持
            if (newStats.studiedWords.length > 100) {
                newStats.studiedWords = newStats.studiedWords.slice(-100);
            }
            
            return newStats;
        });
        
        console.log(`📈 [DEBUG] 学習記録: ${currentProblem.word} - ${isCorrect ? '正解' : '不正解'} (${responseTime.toFixed(1)}秒)`);
        setShowAnswer(true);
    };

    // 次の問題へ
    const handleNextProblem = () => {
        fetchNewProblem();
    };

    // 設定変更
    const handleSettingsChange = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // 初回読み込み
    useEffect(() => {
        fetchNewProblem();
    }, []);

    // 設定変更時に新しい問題を取得
    useEffect(() => {
        if (currentProblem) {
            fetchNewProblem();
        }
    }, [settings.grade, settings.level]);

    const accuracyRate = studyStats.totalAnswered > 0
        ? Math.round((studyStats.correctAnswers / studyStats.totalAnswered) * 100)
        : 0;
    
    // 適応学習統計の取得
    const adaptiveStats = getLearningStats();

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold mb-4">🇬🇧 英語単語テスト</h1>
                
                {/* 設定パネル */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">学年</label>
                        <select
                            value={settings.grade}
                            onChange={(e) => handleSettingsChange('grade', e.target.value)}
                            className="w-full p-2 rounded border text-gray-900"
                        >
                            <option value="中1">中学1年</option>
                            <option value="中2">中学2年</option>
                            <option value="中3">中学3年</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">難易度</label>
                        <select
                            value={settings.level}
                            onChange={(e) => handleSettingsChange('level', e.target.value)}
                            className="w-full p-2 rounded border text-gray-900"
                        >
                            <option value="基礎">基礎</option>
                            <option value="標準">標準</option>
                            <option value="応用">応用</option>
                            <option value="発展">発展</option>
                        </select>
                    </div>
                </div>
                
                {/* 統計情報 - 適応学習対応 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center bg-white/10 p-4 rounded-lg">
                    <div>
                        <div className="text-2xl font-bold">{studyStats.totalAnswered}</div>
                        <div className="text-sm">回答数</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{Math.round(adaptiveStats.overallAccuracy * 100)}%</div>
                        <div className="text-sm">総合正答率</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{adaptiveStats.masteredWords}</div>
                        <div className="text-sm">習得単語</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{adaptiveStats.needReviewWords}</div>
                        <div className="text-sm">要復習</div>
                    </div>
                </div>
                
                {/* 適応学習インジケーター */}
                <div className="bg-white/5 p-3 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                        <span>学習レベル:</span>
                        <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map(level => (
                                <div
                                    key={level}
                                    className={`w-3 h-3 rounded-full ${
                                        level <= adaptiveStats.currentDifficultyLevel
                                            ? 'bg-yellow-400'
                                            : 'bg-white/20'
                                    }`}
                                />
                            ))}
                            <span className="ml-2">Lv.{adaptiveStats.currentDifficultyLevel}</span>
                        </div>
                    </div>
                </div>
                
                {/* 適応学習ダッシュボードボタン */}
                <div className="text-center">
                    <button
                        onClick={() => setShowDashboard(true)}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                    >
                        📊 学習状況を確認
                    </button>
                </div>
            </div>

            {/* 問題表示エリア */}
            {isLoading ? (
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">問題を読み込み中...</p>
                </div>
            ) : currentProblem ? (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    {/* 問題文 */}
                    <div className="text-center mb-8">
                        <h2 className="text-sm text-gray-500 mb-2">次の英単語の意味として最も適切なものを選んでください</h2>
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                            {currentProblem.word}
                        </div>
                        {currentProblem.pronunciation && (
                            <div className="text-lg text-gray-600">
                                [{currentProblem.pronunciation}]
                            </div>
                        )}
                    </div>

                    {/* 選択肢 */}
                    <div className="space-y-3 mb-6">
                        {choices.map((choice, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(index)}
                                disabled={showAnswer}
                                className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                                    selectedAnswer === index
                                        ? showAnswer
                                            ? choice.isCorrect
                                                ? 'border-green-500 bg-green-50 text-green-800'
                                                : 'border-red-500 bg-red-50 text-red-800'
                                            : 'border-blue-500 bg-blue-50'
                                        : showAnswer && choice.isCorrect
                                            ? 'border-green-500 bg-green-50 text-green-800'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <span className="inline-block w-8 h-8 rounded-full bg-gray-100 text-center mr-3 font-medium">
                                    {String.fromCharCode(65 + index)}
                                </span>
                                {choice.text}
                                {showAnswer && choice.isCorrect && (
                                    <span className="float-right text-green-600">✓ 正解</span>
                                )}
                                {showAnswer && selectedAnswer === index && !choice.isCorrect && (
                                    <span className="float-right text-red-600">✗ 不正解</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* 回答ボタン */}
                    <div className="text-center">
                        {!showAnswer ? (
                            <button
                                onClick={handleSubmitAnswer}
                                disabled={selectedAnswer === null}
                                className={`px-8 py-3 rounded-lg font-medium transition-colors duration-200 ${
                                    selectedAnswer !== null
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                回答する
                            </button>
                        ) : (
                            <div className="space-y-4">
                                {/* 結果表示 */}
                                <div className={`p-4 rounded-lg ${
                                    choices[selectedAnswer]?.isCorrect 
                                        ? 'bg-green-50 border border-green-200' 
                                        : 'bg-red-50 border border-red-200'
                                }`}>
                                    <div className={`text-lg font-medium mb-2 ${
                                        choices[selectedAnswer]?.isCorrect ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                        {choices[selectedAnswer]?.isCorrect ? '🎉 正解！' : '❌ 不正解'}
                                    </div>
                                    <div className="text-sm text-gray-700">
                                        正解: <strong>{currentProblem.correct_meaning}</strong>
                                    </div>
                                </div>

                                {/* 解説 */}
                                {currentProblem.explanation && (
                                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                        <h3 className="font-medium text-blue-800 mb-2">📖 解説</h3>
                                        <p className="text-sm text-blue-700">{currentProblem.explanation}</p>
                                    </div>
                                )}

                                {/* 例文 */}
                                {currentProblem.examples && currentProblem.examples.length > 0 && (
                                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                                        <h3 className="font-medium text-gray-800 mb-2">📝 例文</h3>
                                        <div className="space-y-2">
                                            {currentProblem.examples.map((example, index) => (
                                                <div key={index} className="text-sm">
                                                    <div className="text-gray-700 font-medium">{example.sentence}</div>
                                                    <div className="text-gray-600">{example.translation}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleNextProblem}
                                    className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors duration-200"
                                >
                                    次の問題へ →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                    <p className="text-gray-600 mb-4">問題を読み込めませんでした</p>
                    <button
                        onClick={fetchNewProblem}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                        再試行
                    </button>
                </div>
            )}

            {/* 復習単語リスト */}
            {studyStats.incorrectWords.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">🔄 復習が必要な単語</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {studyStats.incorrectWords.slice(-10).map((item, index) => (
                            <div key={index} className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                <div className="font-medium text-red-800">{item.word}</div>
                                <div className="text-sm text-red-600">
                                    正解: {item.correct_meaning}
                                </div>
                                <div className="text-xs text-red-500">
                                    あなたの回答: {item.selected_meaning}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* 適応学習ダッシュボード */}
            <AdaptiveLearningDashboard
                isOpen={showDashboard}
                onClose={() => setShowDashboard(false)}
            />
        </div>
    );
};

export default EnglishStudy;