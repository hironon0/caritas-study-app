import { useState } from 'react'

/**
 * 英語問題生成カスタムフック
 * 
 * 機能:
 * - AI英語4択問題一括生成
 * - API通信管理
 * - エラーハンドリング
 */
export const useEnglishProblemGenerator = () => {
    const [isGenerating, setIsGenerating] = useState(false)

    /**
     * 英語4択問題一括生成
     */
    const generateBatchEnglishProblems = async (grade, level, count) => {
        setIsGenerating(true)
        
        try {
            const apiUrl = window.CARITAS_API_URL
            if (!apiUrl) {
                throw new Error('API接続が確立されていません')
            }

            console.log(`🚀 英語4択問題一括生成開始: ${count}問 (${grade}/${level})`)

            const response = await fetch(`${apiUrl}/api/generate-english-quiz-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grade,
                    level,
                    count
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `HTTPエラー: ${response.status}`)
            }

            const data = await response.json()
            
            if (!data.success) {
                throw new Error(data.error || '英語問題生成に失敗しました')
            }

            // AI応答をパース
            const batchData = JSON.parse(data.result)
            
            if (!batchData.problems || !Array.isArray(batchData.problems)) {
                throw new Error('生成された英語問題の形式が正しくありません')
            }

            const problems = batchData.problems

            // 各問題にメタデータを追加
            const enhancedProblems = problems.map((problem, index) => ({
                ...problem,
                id: `english_${grade.replace(/[^a-zA-Z0-9]/g, '')}_${level}_${Date.now()}_${index}`,
                timestamp: new Date().toISOString(),
                source: 'ai_generated'
            }))

            console.log(`✅ 英語4択問題一括生成完了: ${enhancedProblems.length}問`)

            return enhancedProblems

        } catch (error) {
            console.error('英語問題一括生成エラー:', error)
            throw new Error(`英語問題生成に失敗しました: ${error.message}`)
        } finally {
            setIsGenerating(false)
        }
    }

    /**
     * 単一英語4択問題生成
     */
    const generateSingleEnglishProblem = async (grade, level) => {
        setIsGenerating(true)
        
        try {
            const apiUrl = window.CARITAS_API_URL
            if (!apiUrl) {
                throw new Error('API接続が確立されていません')
            }

            console.log(`🚀 英語4択問題生成開始: (${grade}/${level})`)

            const response = await fetch(`${apiUrl}/api/generate-english-quiz`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grade,
                    level
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `HTTPエラー: ${response.status}`)
            }

            const data = await response.json()
            
            if (!data.success) {
                throw new Error(data.error || '英語問題生成に失敗しました')
            }

            // AI応答をパース
            const problem = JSON.parse(data.result)

            // メタデータを追加
            const enhancedProblem = {
                ...problem,
                id: `english_${grade.replace(/[^a-zA-Z0-9]/g, '')}_${level}_${Date.now()}`,
                timestamp: new Date().toISOString(),
                source: 'ai_generated'
            }

            console.log(`✅ 英語4択問題生成完了: ${enhancedProblem.word}`)

            return enhancedProblem

        } catch (error) {
            console.error('英語問題生成エラー:', error)
            throw new Error(`英語問題生成に失敗しました: ${error.message}`)
        } finally {
            setIsGenerating(false)
        }
    }

    return {
        generateBatchEnglishProblems,
        generateSingleEnglishProblem,
        isGenerating
    }
}