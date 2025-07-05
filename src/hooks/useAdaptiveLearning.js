import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * 適応学習システム専用フック
 * 
 * 機能:
 * - 単語別習熟度追跡
 * - 弱点分野特定
 * - 復習スケジューリング
 * - 間隔反復学習アルゴリズム
 * - 適応的難易度調整
 */
export const useAdaptiveLearning = () => {
    // 適応学習データの構造
    const initialAdaptiveData = {
        wordMastery: {}, // 単語別習熟度データ
        weaknessAreas: [], // 弱点分野
        reviewSchedule: [], // 復習スケジュール
        difficultyAdjustment: { // 難易度調整
            currentLevel: 1,
            consecutiveCorrect: 0,
            consecutiveIncorrect: 0
        },
        learningMetrics: { // 学習指標
            totalStudyTime: 0,
            sessionsCount: 0,
            lastSessionDate: null,
            averageAccuracy: 0,
            improvementTrend: 'stable'
        }
    };

    const [adaptiveData, setAdaptiveData] = useLocalStorage('englishAdaptiveLearning', initialAdaptiveData);

    /**
     * 単語の習熟度データ構造
     * {
     *   word: string,
     *   correctCount: number,
     *   incorrectCount: number,
     *   totalAttempts: number,
     *   accuracy: number,
     *   masteryLevel: number (0-5),
     *   lastStudied: string (ISO date),
     *   nextReview: string (ISO date),
     *   difficulty: string,
     *   timeSpent: number (総学習時間),
     *   streakCount: number (連続正解数)
     * }
     */

    /**
     * 単語学習結果を記録
     * @param {string} word - 学習した単語
     * @param {boolean} isCorrect - 正解かどうか
     * @param {number} responseTime - 回答時間（秒）
     * @param {string} difficulty - 問題の難易度
     */
    const recordWordLearning = useCallback((word, isCorrect, responseTime = 0, difficulty = '基礎') => {
        setAdaptiveData(prev => {
            const newData = { ...prev };
            const now = new Date().toISOString();
            
            // 単語別習熟度データの更新
            if (!newData.wordMastery[word]) {
                newData.wordMastery[word] = {
                    word,
                    correctCount: 0,
                    incorrectCount: 0,
                    totalAttempts: 0,
                    accuracy: 0,
                    masteryLevel: 0,
                    lastStudied: now,
                    nextReview: null,
                    difficulty,
                    timeSpent: 0,
                    streakCount: 0
                };
            }
            
            const wordData = newData.wordMastery[word];
            wordData.totalAttempts += 1;
            wordData.timeSpent += responseTime;
            wordData.lastStudied = now;
            
            if (isCorrect) {
                wordData.correctCount += 1;
                wordData.streakCount += 1;
            } else {
                wordData.incorrectCount += 1;
                wordData.streakCount = 0;
            }
            
            // 正答率の計算
            wordData.accuracy = wordData.correctCount / wordData.totalAttempts;
            
            // 習熟度レベルの更新（0-5スケール）
            wordData.masteryLevel = calculateMasteryLevel(wordData);
            
            // 次回復習日の計算（間隔反復アルゴリズム）
            wordData.nextReview = calculateNextReview(wordData, isCorrect);
            
            // 弱点分野の更新
            newData.weaknessAreas = updateWeaknessAreas(newData.wordMastery);
            
            // 復習スケジュールの更新
            newData.reviewSchedule = updateReviewSchedule(newData.wordMastery);
            
            // 難易度調整の更新
            newData.difficultyAdjustment = updateDifficultyAdjustment(
                newData.difficultyAdjustment, 
                isCorrect
            );
            
            return newData;
        });
    }, [setAdaptiveData]);

    /**
     * 習熟度レベル計算（0-5スケール）
     * @param {Object} wordData - 単語データ
     * @returns {number} 習熟度レベル
     */
    const calculateMasteryLevel = (wordData) => {
        const { accuracy, totalAttempts, streakCount } = wordData;
        
        // 基本スコア（正答率ベース）
        let score = accuracy * 100;
        
        // 回答回数による信頼度補正
        if (totalAttempts >= 3) score += 10;
        if (totalAttempts >= 5) score += 10;
        if (totalAttempts >= 10) score += 10;
        
        // 連続正解ボーナス
        if (streakCount >= 3) score += 15;
        if (streakCount >= 5) score += 15;
        
        // レベル判定
        if (score >= 90) return 5; // マスター
        if (score >= 75) return 4; // 上級
        if (score >= 60) return 3; // 中級
        if (score >= 45) return 2; // 初級
        if (score >= 30) return 1; // 要復習
        return 0; // 要集中学習
    };

    /**
     * 次回復習日計算（間隔反復アルゴリズム）
     * @param {Object} wordData - 単語データ
     * @param {boolean} isCorrect - 今回の正誤
     * @returns {string} 次回復習日（ISO日付）
     */
    const calculateNextReview = (wordData, isCorrect) => {
        const now = new Date();
        const { masteryLevel, streakCount } = wordData;
        
        let intervalDays;
        
        if (!isCorrect) {
            // 間違えた場合は短期間で復習
            intervalDays = 1;
        } else {
            // 正解した場合は習熟度に応じて間隔を調整
            switch (masteryLevel) {
                case 0:
                case 1:
                    intervalDays = Math.max(1, streakCount); // 1-3日
                    break;
                case 2:
                    intervalDays = Math.max(2, streakCount * 2); // 2-6日
                    break;
                case 3:
                    intervalDays = Math.max(4, streakCount * 3); // 4-15日
                    break;
                case 4:
                    intervalDays = Math.max(7, streakCount * 5); // 7-25日
                    break;
                case 5:
                    intervalDays = Math.max(14, streakCount * 7); // 14日以上
                    break;
                default:
                    intervalDays = 1;
            }
        }
        
        // 最大30日に制限
        intervalDays = Math.min(intervalDays, 30);
        
        const nextReview = new Date(now);
        nextReview.setDate(now.getDate() + intervalDays);
        
        return nextReview.toISOString();
    };

    /**
     * 弱点分野の更新
     * @param {Object} wordMastery - 全単語の習熟度データ
     * @returns {Array} 弱点分野リスト
     */
    const updateWeaknessAreas = (wordMastery) => {
        const weakWords = Object.values(wordMastery)
            .filter(word => word.masteryLevel <= 2 && word.totalAttempts >= 2)
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, 20); // 最大20単語
        
        return weakWords.map(word => ({
            word: word.word,
            accuracy: word.accuracy,
            masteryLevel: word.masteryLevel,
            priority: calculateWeaknessPriority(word)
        }));
    };

    /**
     * 弱点優先度計算
     * @param {Object} wordData - 単語データ
     * @returns {number} 優先度（高いほど重要）
     */
    const calculateWeaknessPriority = (wordData) => {
        const { accuracy, totalAttempts, masteryLevel } = wordData;
        
        // 基本優先度（低い正答率ほど高優先度）
        let priority = (1 - accuracy) * 100;
        
        // 回答回数が多いほど優先度アップ
        priority += totalAttempts * 5;
        
        // 習熟度が低いほど優先度アップ
        priority += (5 - masteryLevel) * 10;
        
        return Math.round(priority);
    };

    /**
     * 復習スケジュール更新
     * @param {Object} wordMastery - 全単語の習熟度データ
     * @returns {Array} 復習スケジュール
     */
    const updateReviewSchedule = (wordMastery) => {
        const now = new Date();
        const reviewWords = Object.values(wordMastery)
            .filter(word => {
                if (!word.nextReview) return false;
                const reviewDate = new Date(word.nextReview);
                return reviewDate <= now;
            })
            .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview))
            .slice(0, 50); // 最大50単語
        
        return reviewWords;
    };

    /**
     * 難易度調整更新
     * @param {Object} currentAdjustment - 現在の調整データ
     * @param {boolean} isCorrect - 今回の正誤
     * @returns {Object} 更新された調整データ
     */
    const updateDifficultyAdjustment = (currentAdjustment, isCorrect) => {
        const newAdjustment = { ...currentAdjustment };
        
        if (isCorrect) {
            newAdjustment.consecutiveCorrect += 1;
            newAdjustment.consecutiveIncorrect = 0;
            
            // 連続正解で難易度アップ
            if (newAdjustment.consecutiveCorrect >= 5) {
                newAdjustment.currentLevel = Math.min(newAdjustment.currentLevel + 1, 5);
                newAdjustment.consecutiveCorrect = 0;
            }
        } else {
            newAdjustment.consecutiveIncorrect += 1;
            newAdjustment.consecutiveCorrect = 0;
            
            // 連続間違いで難易度ダウン
            if (newAdjustment.consecutiveIncorrect >= 3) {
                newAdjustment.currentLevel = Math.max(newAdjustment.currentLevel - 1, 1);
                newAdjustment.consecutiveIncorrect = 0;
            }
        }
        
        return newAdjustment;
    };

    /**
     * 復習が必要な単語を取得
     * @param {number} limit - 取得数制限
     * @returns {Array} 復習対象単語リスト
     */
    const getWordsForReview = useCallback((limit = 10) => {
        const reviewWords = adaptiveData.reviewSchedule || [];
        const weaknessWords = adaptiveData.weaknessAreas || [];
        
        // 復習対象と弱点単語をマージして優先度順にソート
        const combined = [...reviewWords, ...weaknessWords]
            .reduce((acc, word) => {
                const key = word.word;
                if (!acc[key] || word.priority > acc[key].priority) {
                    acc[key] = word;
                }
                return acc;
            }, {});
        
        return Object.values(combined)
            .sort((a, b) => (b.priority || 0) - (a.priority || 0))
            .slice(0, limit);
    }, [adaptiveData]);

    /**
     * 学習統計の取得
     * @returns {Object} 学習統計データ
     */
    const getLearningStats = useCallback(() => {
        const words = Object.values(adaptiveData.wordMastery || {});
        const totalWords = words.length;
        const masteredWords = words.filter(w => w.masteryLevel >= 4).length;
        const needReviewWords = words.filter(w => w.masteryLevel <= 2).length;
        
        const totalAttempts = words.reduce((sum, w) => sum + w.totalAttempts, 0);
        const totalCorrect = words.reduce((sum, w) => sum + w.correctCount, 0);
        const overallAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
        
        return {
            totalWords,
            masteredWords,
            needReviewWords,
            overallAccuracy,
            currentDifficultyLevel: adaptiveData.difficultyAdjustment?.currentLevel || 1,
            reviewWordsCount: (adaptiveData.reviewSchedule || []).length,
            weaknessWordsCount: (adaptiveData.weaknessAreas || []).length
        };
    }, [adaptiveData]);

    /**
     * データリセット
     */
    const resetAdaptiveData = useCallback(() => {
        setAdaptiveData(initialAdaptiveData);
    }, [setAdaptiveData]);

    return {
        adaptiveData,
        recordWordLearning,
        getWordsForReview,
        getLearningStats,
        resetAdaptiveData
    };
};