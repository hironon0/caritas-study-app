import React, { useState, useEffect, useCallback } from 'react';
import { useApiConnection } from '../../hooks/useApiConnection';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const EnglishStudy = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [currentProblem, setCurrentProblem] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [choices, setChoices] = useState([]);
    const [studyStats, setStudyStats] = useLocalStorage('englishStudyStats', {
        totalAnswered: 0,
        correctAnswers: 0,
        incorrectWords: [],
        studiedWords: []
    });
    const [settings, setSettings] = useLocalStorage('englishStudySettings', {
        grade: '中1',
        level: '基礎'
    });
    
    const { testConnection } = useApiConnection();

    // 4択の選択肢をシャッフルして作成
    const createChoices = useCallback((problem) => {
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
    }, []);

    // 新しい問題を取得
    const fetchNewProblem = useCallback(async () => {
        try {
            setIsLoading(true);
            const isConnected = await testConnection();
            
            if (!isConnected) {
                throw new Error('サーバーとの接続が確立できません');
            }

            // 既に学習済みの単語を除外
            const excludeWords = studyStats.studiedWords.slice(-20); // 直近20単語を除外
            const excludeParam = excludeWords.length > 0 ? `?exclude=${excludeWords.join(',')}` : '';
            
            // まずプールから取得を試行
            let response = await fetch(`/api/english-pool/${settings.grade}/${settings.level}${excludeParam}`);
            
            if (!response.ok) {
                console.log('プールに問題がないため、AI生成を使用');
                // プールに問題がない場合は、AI生成を使用
                response = await fetch('/api/generate-english-quiz', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        grade: settings.grade,
                        level: settings.level
                    }),
                });
            }

            if (!response.ok) {
                throw new Error(`問題取得エラー: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '問題の取得に失敗しました');
            }

            const problem = data.problem || JSON.parse(data.result);
            setCurrentProblem(problem);
            setChoices(createChoices(problem));
            setSelectedAnswer(null);
            setShowAnswer(false);
            
        } catch (error) {
            console.error('問題取得エラー:', error);
            alert(`問題の取得に失敗しました: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [settings.grade, settings.level, studyStats.studiedWords, testConnection, createChoices]);

    // 回答処理
    const handleAnswerSelect = (choiceIndex) => {
        if (showAnswer) return;
        setSelectedAnswer(choiceIndex);
    };

    // 回答確定
    const handleSubmitAnswer = () => {
        if (selectedAnswer === null || showAnswer) return;
        
        const isCorrect = choices[selectedAnswer].isCorrect;
        
        // 統計更新
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
                    timestamp: new Date().toISOString()
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
                
                {/* 統計情報 */}
                <div className="grid grid-cols-3 gap-4 text-center bg-white/10 p-4 rounded-lg">
                    <div>
                        <div className="text-2xl font-bold">{studyStats.totalAnswered}</div>
                        <div className="text-sm">回答数</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{accuracyRate}%</div>
                        <div className="text-sm">正答率</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{studyStats.incorrectWords.length}</div>
                        <div className="text-sm">復習単語</div>
                    </div>
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
        </div>
    );
};

export default EnglishStudy;