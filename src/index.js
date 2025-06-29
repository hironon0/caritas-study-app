import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

        // Math Section Component
        const MathSection = ({ apiStatus, isLoading, currentProblem, generateMathProblem, setCurrentProblem }) => {
            const [selectedGrade, setSelectedGrade] = useState('中2');
            const [selectedUnit, setSelectedUnit] = useState('全分野');
            const [selectedLevel, setSelectedLevel] = useState('基礎');
            const [selectedAI, setSelectedAI] = useState('openai');
            const [showSteps, setShowSteps] = useState(false);
            const [currentStep, setCurrentStep] = useState(0);

            useEffect(() => {
                if (apiStatus.openai.connected) {
                    setSelectedAI('openai');
                } else if (apiStatus.claude.connected) {
                    setSelectedAI('claude');
                }
            }, [apiStatus.claude.connected, apiStatus.openai.connected]);

            const gradeOptions = ['中1', '中2', '中3', '高1'];
            const unitsByGrade = {
                '中1': ['全分野', '正負の数', '文字式', '一次方程式', '比例・反比例'],
                '中2': ['全分野', '式の計算', '連立方程式', '一次関数', '図形の性質'],
                '中3': ['全分野', '式の展開・因数分解', '平方根', '二次方程式', '二次関数'],
                '高1': ['全分野', '数と式', '集合と命題', '二次関数', '図形と計量']
            };
            const levelOptions = [
                { value: '基礎', description: '基本的な計算・公式の確認' },
                { value: '標準', description: '定期テスト・教科書レベル' },
                { value: '応用', description: '思考力・複合問題' },
                { value: '発展', description: '入試レベル・高度な問題' }
            ];

            const handleGenerateClick = () => {
                generateMathProblem(selectedGrade, selectedUnit, selectedLevel, selectedAI);
            };

            const isApiConnected = (selectedAI === 'claude' && apiStatus.claude.connected) || (selectedAI === 'openai' && apiStatus.openai.connected);

            if (isLoading) {
                return (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="text-4xl mb-4 pulse-animation">🤖</div>
                            <div className="text-xl font-bold text-blue-600 mb-2">AIが高品質な問題を生成中<span className="loading-dots"></span></div>
                        </div>
                    </div>
                );
            }

            if (currentProblem) {
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-blue-900">🤖 AI生成問題 - {currentProblem.grade} {currentProblem.unit}</h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    currentProblem.level === '基礎' ? 'bg-green-200 text-green-800' :
                                    currentProblem.level === '標準' ? 'bg-blue-200 text-blue-800' :
                                    currentProblem.level === '応用' ? 'bg-orange-200 text-orange-800' :
                                    'bg-red-200 text-red-800'
                                }`}>{currentProblem.level}レベル</span>
                            </div>
                            <div className="bg-white p-6 rounded border-l-4 border-blue-500">
                                <p className="text-lg font-medium mb-4 whitespace-pre-wrap">{currentProblem.problem}</p>
                                {currentProblem.hint && (
                                    <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                                        <p className="text-sm text-yellow-800">💡 <strong>ヒント:</strong> {currentProblem.hint}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!showSteps ? (
                            <div className="flex gap-4">
                                <button onClick={() => setShowSteps(true)} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2">🧠 AI詳細解説を見る</button>
                                <button onClick={handleGenerateClick} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">🔄 新しい問題を生成</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <h4 className="font-bold text-lg mb-4">🤖 AI生成：6段階詳細解説</h4>
                                    <div className="flex gap-2 mb-6 flex-wrap">
                                        {currentProblem.steps.map((step, idx) => (
                                            <button key={idx} onClick={() => setCurrentStep(idx)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${currentStep === idx ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                                                {idx + 1}. {step.step}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="bg-white p-6 rounded border step-animation">
                                        <h5 className="font-bold text-blue-900 mb-3 text-lg">{currentStep + 1}. {currentProblem.steps[currentStep].step}</h5>
                                        <div className="space-y-4 whitespace-pre-wrap">
                                            <div>
                                                <h6 className="font-semibold text-gray-800 mb-2">📝 内容</h6>
                                                <p className="text-gray-800 bg-gray-50 p-3 rounded">{currentProblem.steps[currentStep].content}</p>
                                            </div>
                                            <div>
                                                <h6 className="font-semibold text-gray-800 mb-2">💡 解説</h6>
                                                <p className="text-yellow-800 bg-yellow-50 p-3 rounded">{currentProblem.steps[currentStep].explanation}</p>
                                            </div>
                                            {currentProblem.steps[currentStep].detail && (
                                                <div>
                                                    <h6 className="font-semibold text-gray-800 mb-2">🔍 詳細</h6>
                                                    <p className="text-blue-800 bg-blue-50 p-3 rounded">{currentProblem.steps[currentStep].detail}</p>
                                                </div>
                                            )}
                                        </div>
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50">⬅️ 前</button>
                                    <button onClick={() => setCurrentStep(Math.min(currentProblem.steps.length - 1, currentStep + 1))} disabled={currentProblem.steps.length - 1 === currentStep} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">次 ➡️</button>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <h4 className="font-bold text-green-900 mb-2">✅ 解答</h4>
                                        <p className="text-green-800 text-lg font-medium">{currentProblem.answer}</p>
                                    </div>
                                    {currentProblem.learning_point && (
                                        <div className="bg-purple-50 p-4 rounded-lg">
                                            <h4 className="font-bold text-purple-900 mb-2">📚 学習ポイント</h4>
                                            <p className="text-purple-800 text-sm">{currentProblem.learning_point}</p>
                                        }
                                    </div>
                                )}
                                <div className="flex gap-4">
                                    <button onClick={() => { setShowSteps(false); setCurrentStep(0); }} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">📋 問題に戻る</button>
                                    <button onClick={handleGenerateClick} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">🔄 新しい問題を生成</button>
                                </div>
                            </div>
                        )
                    </div>
                );
            }

            return (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow border">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">🤖 AI問題生成設定</h4>
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">AIエンジン</label>
                                <select value={selectedAI} onChange={(e) => setSelectedAI(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                                    <option value="claude" disabled={!apiStatus.claude.connected}>Claude</option>
                                    <option value="openai" disabled={!apiStatus.openai.connected}>OpenAI (GPT-4)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">難易度</label>
                                <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                                    {levelOptions.map(level => <option key={level.value} value={level.value}>{level.value} - {level.description}</option>)}                                
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">学年</label>
                                <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                                    {gradeOptions.map(grade => <option key={grade} value={grade}>{grade}</option>)}                                
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">分野</label>
                                <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                                    {unitsByGrade[selectedGrade].map(unit => <option key={unit} value={unit}>{unit}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mb-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${apiStatus.claude.checking ? 'bg-yellow-400' : (apiStatus.claude.connected ? 'bg-green-500' : 'bg-red-500')}`}></div>
                                <span>Claude: {apiStatus.claude.checking ? '...' : (apiStatus.claude.connected ? 'OK' : 'NG')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${apiStatus.openai.checking ? 'bg-yellow-400' : (apiStatus.openai.connected ? 'bg-green-500' : 'bg-red-500')}`}></div>
                                <span>OpenAI: {apiStatus.openai.checking ? '...' : (apiStatus.openai.connected ? 'OK' : 'NG')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-lg">
                        <div className="text-6xl mb-4">🤖</div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">AI問題生成システム</h3>
                        <p className="text-gray-600 mb-6">設定: {selectedGrade} | {selectedUnit} | {selectedLevel}レベル | AI: {selectedAI}</p>
                        <button onClick={handleGenerateClick} disabled={!isApiConnected} className={`px-8 py-4 rounded-lg text-lg font-medium transition-all transform hover:scale-105 ${isApiConnected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-gray-600 cursor-not-allowed'}`}>
                            {isApiConnected ? '🚀 AI問題生成開始' : '❌ AI接続が必要です'}
                        </button>
                        <p className="text-sm text-gray-500 mt-4">
                            {isApiConnected ? '約5-10秒で高品質な問題と詳細解説を生成します' : '利用可能なAIエンジンを選択してください'}
                        </p>
                    </div>
                </div>
            );
        };

        // Main App Component
        const StudyTool = () => {
            const [currentSection, setCurrentSection] = useState('menu');
            const [isLoading, setIsLoading] = useState(false);
            const [apiStatus, setApiStatus] = useState({
                claude: { connected: false, checking: true },
                openai: { connected: false, checking: true },
                version: null,
                environment: null
            });
            const [currentProblem, setCurrentProblem] = useState(null);
            const [mathProgress, setMathProgress] = useState(() => {
                const saved = localStorage.getItem('caritas_mathProgress');
                return saved ? JSON.parse(saved) : { solved: 0 };
            });

            useEffect(() => {
                const checkApiStatus = async () => {
                    try {
                        const response = await fetch('/api/health');
                        if (!response.ok) throw new Error(`API check failed: ${response.status}`);
                        const data = await response.json();
                        setApiStatus({
                            claude: { connected: data.ai_available, checking: false },
                            openai: { connected: data.openai_available, checking: false },
                            version: data.version,
                            environment: data.environment
                        });
                    } catch (error) {
                        console.error('API接続確認エラー:', error);
                        setApiStatus(prev => ({ ...prev, claude: { connected: false, checking: false }, openai: { connected: false, checking: false } }));
                    }
                };
                checkApiStatus();
            }, []);

            useEffect(() => {
                localStorage.setItem('caritas_mathProgress', JSON.stringify(mathProgress));
            }, [mathProgress]);

            const generateMathProblem = useCallback(async (grade, unit, level, aiProvider) => {
                setIsLoading(true);
                setCurrentProblem(null);
                const prompt = `カリタス中学校の体系数学に準拠した数学問題を1問作成してください.\n\n設定:\n- 学年: ${grade}\n- 分野: ${unit === '全分野' ? '該当学年の全分野から選択' : unit}\n- 難易度: ${level}\n\n以下の条件を満たしてください:\n1. ${grade}レベルに適した問題\n2. 思考力を要する良質な問題\n3. カリタス中学校の高度なカリキュラムに対応\n\n回答は以下のJSON形式でお願いします:\n{\n  "grade": "${grade}",\n  "level": "${level}",\n  "unit": "実際に選択した具体的な単元名",\n  "problem": "問題文（数式含む）",\n  "steps": [\n    {\n      "step": "問題理解",\n      "content": "問題の要求と与えられた条件を整理",\n      "explanation": "何を求められているか、どんな条件があるかを明確化",\n      "detail": "より詳しい解説や注意点"\n    },{\n      "step": "解法選択",\n      "content": "この問題に最適な解法を選択",\n      "explanation": "なぜその解法を選ぶのかの理由",\n      "detail": "他の解法との比較や、選択理由の詳細"\n    },{\n      "step": "計算過程",\n      "content": "具体的な計算手順",\n      "explanation": "各計算の意味と目的",\n      "detail": "計算の工夫や注意すべき点"\n    },{\n      "step": "思考の流れ",\n      "content": "論理的な思考プロセス",\n      "explanation": "どのような思考で解答に到達するか",\n      "detail": "つまずきやすいポイントとその対策"\n    },{\n      "step": "検算・確認",\n      "content": "答えの正しさを確認する方法",\n      "explanation": "なぜ検算が重要かの説明",\n      "detail": "具体的な検算手順と確認ポイント"\n    },{\n      "step": "類似問題への応用",\n      "content": "この解法が使える他の問題例",\n      "explanation": "学習した内容の応用範囲",\n      "detail": "発展的な問題や実際の入試での出題例"\n    }\n  ],\n  "answer": "最終的な答案",\n  "hint": "困ったときのヒント",\n  "difficulty_analysis": "この問題の難しさの分析",\n  "learning_point": "この問題で身につく学習内容"\n}\n\nDO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;

                try {
                    const endpoint = aiProvider === 'openai' ? '/api/generate-math-openai' : '/api/generate-math';
                    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
                    const data = await response.json();
                    if (!data.success) throw new Error(data.error || 'APIからエラーが返されました');
                    const problemData = JSON.parse(data.result);
                    setCurrentProblem(problemData);
                    setMathProgress(prev => ({ ...prev, solved: prev.solved + 1 }));
                } catch (error) {
                    console.error('AI問題生成エラー:', error);
                    alert(`問題生成エラー: ${error.message}\n\nサーバーのターミナルログに詳細なエラーが出力されている可能性があります。`);
                    setCurrentProblem(null);
                } finally {
                    setIsLoading(false);
                }
            }, []);

            if (currentSection === 'menu') {
                return (
                    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
                        <div className="max-w-4xl mx-auto">
                            <div className="text-center mb-8">
                                <div className="text-6xl mb-4">🤖</div>
                                <h1 className="text-3xl font-bold text-gray-800 mb-2">カリタス中学校 AI学習ツール</h1>
                                <h2 className="text-xl font-semibold text-purple-700 mb-2">マルチAI搭載版</h2>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow mb-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${apiStatus.claude.checking ? 'bg-yellow-400' : (apiStatus.claude.connected ? 'bg-green-500' : 'bg-red-500')}`}></div>
                                            <span className="text-sm font-medium">Claude: {apiStatus.claude.checking ? 'チェック中...' : (apiStatus.claude.connected ? '接続済み' : '接続エラー')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${apiStatus.openai.checking ? 'bg-yellow-400' : (apiStatus.openai.connected ? 'bg-green-500' : 'bg-red-500')}`}></div>
                                            <span className="text-sm font-medium">OpenAI: {apiStatus.openai.checking ? 'チェック中...' : (apiStatus.openai.connected ? '接続済み' : '接続エラー')}</span>
                                        </div>
                                    </div>
                                    {apiStatus.version && (<span className="text-xs text-gray-500">v{apiStatus.version}</span>)}
                                </div>
                            </div>
                            <div className="grid gap-6">
                                <div onClick={() => setCurrentSection('study')} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 border-blue-500">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="bg-blue-100 p-3 rounded-lg text-3xl">🧮</div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-800">数学（マルチAI版）</h2>
                                            <p className="text-gray-600">体系数学準拠 + Claude/OpenAI 問題生成</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-sm text-blue-600">解答済み: {mathProgress.solved} 問題</div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => { setCurrentSection('menu'); setCurrentProblem(null); }} className="bg-white p-3 rounded-lg shadow hover:shadow-md transition-all">↩️</button>
                            <h1 className="text-2xl font-bold text-gray-800">🤖 AI数学学習</h1>
                        </div>
                        <MathSection
                            apiStatus={apiStatus}
                            isLoading={isLoading}
                            currentProblem={currentProblem}
                            generateMathProblem={generateMathProblem}
                            setCurrentProblem={setCurrentProblem}
                        />
                    </div>
                </div>
            );
        };

        ReactDOM.createRoot(document.getElementById('root')).render(<StudyTool />);
    </script>
</body>
</html>