import React, { useState, useEffect } from 'react'
import { useApiConnection } from './hooks/useApiConnection'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useProblemPool } from './hooks/useProblemPool'
import MainMenu from './components/MainMenu'
import StudySection from './components/StudySection'
import AdminSection from './components/AdminSection'
import ConfirmDialog from './components/ui/ConfirmDialog'
import './App.css'

/**
 * カリタス中学校AI学習ツール - メインアプリケーション
 * 
 * 機能:
 * - AI問題生成と問題プール管理
 * - 数学・英語学習セッション
 * - 学習進捗管理
 * - 管理画面（問題生成・プール追加）
 */
function App() {
  // 現在のセクション管理
  const [currentSection, setCurrentSection] = useState('menu') // 'menu', 'study', 'admin'
  const [selectedSubject, setSelectedSubject] = useState(null) // 'math', 'english_word'
  
  // API接続状態
  const { apiStatus, checkApiConnection } = useApiConnection()
  
  // 学習進捗データ（LocalStorage永続化）
  const [mathProgress, setMathProgress] = useLocalStorage('caritas_mathProgress', {
    solved: 0,
    totalTime: 0
  })
  
  const [englishProgress, setEnglishProgress] = useLocalStorage('caritas_englishProgress', {
    words: 0,
    totalTime: 0
  })
  
  // 問題プール管理
  const {
    problemPoolStats,
    fetchProblemPoolStats,
    addProblemToPool,
    getProblemFromPool
  } = useProblemPool()
  
  // 確認ダイアログ状態
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  })
  
  // 初期化処理
  useEffect(() => {
    checkApiConnection()
  }, [])
  
  // API接続成功時の問題プール統計取得
  useEffect(() => {
    if (apiStatus.connected) {
      fetchProblemPoolStats()
    }
  }, [apiStatus.connected])
  
  // 確認ダイアログ表示関数
  const showConfirm = (title, message, onConfirm, onCancel = null) => {
    setConfirmConfig({ title, message, onConfirm, onCancel })
    setShowConfirmDialog(true)
  }
  
  // アラートダイアログ表示関数
  const showAlert = (title, message) => {
    setConfirmConfig({ 
      title, 
      message, 
      onConfirm: () => {}, 
      onCancel: null 
    })
    setShowConfirmDialog(true)
  }
  
  // ナビゲーション関数
  const navigateToStudy = (subject) => {
    setSelectedSubject(subject)
    setCurrentSection('study')
  }
  
  const navigateToAdmin = () => {
    setCurrentSection('admin')
  }
  
  const navigateToMenu = () => {
    setCurrentSection('menu')
    setSelectedSubject(null)
  }
  
  // 共通プロパティ
  const commonProps = {
    apiStatus,
    problemPoolStats,
    showAlert,
    showConfirm,
    mathProgress,
    setMathProgress,
    englishProgress,
    setEnglishProgress,
    addProblemToPool,
    getProblemFromPool,
    fetchProblemPoolStats
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* メインコンテンツ */}
      {currentSection === 'menu' && (
        <MainMenu
          {...commonProps}
          onNavigateToStudy={navigateToStudy}
          onNavigateToAdmin={navigateToAdmin}
        />
      )}
      
      {currentSection === 'study' && (
        <StudySection
          {...commonProps}
          selectedSubject={selectedSubject}
          onNavigateToMenu={navigateToMenu}
        />
      )}
      
      {currentSection === 'admin' && (
        <AdminSection
          {...commonProps}
          onNavigateToMenu={navigateToMenu}
        />
      )}
      
      {/* 確認ダイアログ */}
      <ConfirmDialog
        show={showConfirmDialog}
        config={confirmConfig}
        onClose={() => setShowConfirmDialog(false)}
      />
    </div>
  )
}

export default App