"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FaCog, FaDownload, FaUpload, FaDatabase, FaTrash, FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaSave, FaPalette, FaGlobe, FaHistory } from 'react-icons/fa'
import { systemAPI } from '@/lib/api'

interface BackupHistoryItem {
  id: number
  filename: string
  file_size: number
  backup_type: string
  description: string
  created_by: string
  created_at: string
  tables_included: string[]
}

interface SystemInfo {
  version: string
  table_stats: Record<string, number>
  total_records: number
  latest_backup: {
    filename: string
    created_at: string
    created_by: string
  } | null
}

export default function SystemManagementPage() {
  const router = useRouter()
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([])
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState({
    theme: 'dark',
    language: 'ko',
    autoBackup: true,
    backupInterval: '24', // hours
    maxBackups: 10,
    enableNotifications: true,
    enableAnalytics: true
  })

  // 데이터베이스 관리 상태
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [isInitializingDb, setIsInitializingDb] = useState(false)
  const [dbError, setDbError] = useState('')
  const [dbSuccess, setDbSuccess] = useState('')

  // 데이터베이스 상태 확인
  const loadDatabaseStatus = async () => {
    try {
      setDbError('')
      const status = await systemAPI.getDatabaseStatus()
      setDbStatus(status)
    } catch (error: any) {
      setDbError(error.response?.data?.detail || '데이터베이스 상태 확인 실패')
    }
  }

  // 데이터베이스 초기화
  const initializeDatabase = async () => {
    if (!window.confirm('데이터베이스 테이블을 초기화하시겠습니까? 누락된 테이블이 생성됩니다.')) {
      return
    }

    try {
      setIsInitializingDb(true)
      setDbError('')
      setDbSuccess('')
      
      const result = await systemAPI.initDatabase()
      setDbSuccess(`데이터베이스 초기화 완료! 총 ${result.total_tables}개 테이블 확인됨`)
      
      // 상태 새로고침
      await loadDatabaseStatus()
      
    } catch (error: any) {
      setDbError(error.response?.data?.detail || '데이터베이스 초기화 실패')
    } finally {
      setIsInitializingDb(false)
    }
  }

  // 데이터 로드
  const loadData = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      // 시스템 정보와 백업 히스토리를 동시에 가져오기
      const [systemInfoResponse, backupHistoryResponse] = await Promise.all([
        systemAPI.getSystemInfo(),
        systemAPI.getBackupHistory()
      ])
      
      setSystemInfo(systemInfoResponse)
      setBackupHistory(backupHistoryResponse.backups || [])
      
    } catch (error: any) {
      console.error('Failed to load system data:', error)
      if (error.response?.status === 403) {
        setError('관리자 권한이 필요합니다.')
        setTimeout(() => router.push('/admin'), 2000)
      } else {
        setError('시스템 정보를 불러오는데 실패했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
    
    // 로컬 설정 로드
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('systemSettings')
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    }
  }

  useEffect(() => {
    loadData()
    loadDatabaseStatus()
  }, [])

  // 백업 생성
  const createBackup = async () => {
    setIsBackingUp(true)
    
    try {
      const description = prompt('백업 설명을 입력하세요 (선택사항):')
      
      await systemAPI.createBackup({
        description: description || undefined
      })

      // 백업 히스토리 새로고침
      await loadData()

      alert('백업이 성공적으로 생성되고 다운로드되었습니다!')
    } catch (error: any) {
      console.error('Backup failed:', error)
      if (error.response?.status === 403) {
        setError('관리자 권한이 필요합니다.')
      } else {
      alert('백업 생성 중 오류가 발생했습니다.')
      }
    } finally {
      setIsBackingUp(false)
    }
  }

  // 백업 복원
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      alert('JSON 파일만 업로드할 수 있습니다.')
      return
    }

    const confirmRestore = window.confirm(
      `백업 파일 (${file.name})을 복원하시겠습니까?\n\n현재 모든 데이터가 백업 파일의 데이터로 덮어씌워집니다.\n\n이 작업은 되돌릴 수 없습니다!`
    )

    if (!confirmRestore) return

    setIsRestoring(true)
    
      try {
      const result = await systemAPI.restoreBackup(file)
      
      alert(`백업이 성공적으로 복원되었습니다!\n\n복원된 테이블: ${result.restored_tables.join(', ')}`)
      
      // 데이터 새로고침
      await loadData()
      
      // 페이지 새로고침으로 세션 갱신
      setTimeout(() => {
          window.location.reload()
      }, 1000)
      
    } catch (error: any) {
        console.error('Restore failed:', error)
      if (error.response?.status === 403) {
        setError('관리자 권한이 필요합니다.')
      } else if (error.response?.status === 400) {
        alert('유효하지 않은 백업 파일입니다. 파일을 확인해주세요.')
      } else {
        alert('백업 복원 중 오류가 발생했습니다.')
      }
      } finally {
        setIsRestoring(false)
      // 파일 input 리셋
      event.target.value = ''
    }
  }

  // 모든 데이터 삭제
  const clearAllData = async () => {
    const confirmClear = window.confirm(
      '모든 시스템 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!\n(현재 관리자 계정은 보존됩니다)'
    )

    if (confirmClear) {
      const secondConfirm = window.confirm('정말로 모든 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!')
      
      if (secondConfirm) {
        try {
          await systemAPI.clearAllData()
          
          alert('모든 데이터가 삭제되었습니다.\n관리자 계정은 보존되었습니다.')
          
          // 데이터 새로고침
          await loadData()
          
        } catch (error: any) {
          console.error('Clear data failed:', error)
          if (error.response?.status === 403) {
            setError('관리자 권한이 필요합니다.')
          } else {
            alert('데이터 삭제 중 오류가 발생했습니다.')
          }
        }
      }
    }
  }

  // 설정 저장
  const saveSettings = () => {
    localStorage.setItem('systemSettings', JSON.stringify(settings))
    alert('설정이 저장되었습니다!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* 배경 효과 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]" />

      <div className="relative z-10 p-6">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <FaArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FaCog className="text-gray-400" />
              시스템 관리
            </h1>
            <p className="text-white/70 mt-1">시스템 백업, 복원 및 설정을 관리할 수 있습니다</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 백업 및 복원 */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
              <FaDatabase className="text-blue-400" />
              데이터 관리
            </h2>

            <div className="space-y-4">
              {/* 백업 생성 */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">백업 생성</h3>
                <p className="text-white/70 text-sm mb-4">
                  모든 사용자 데이터, AI 정보, 설정을 JSON 파일로 백업합니다.
                </p>
                <button
                  onClick={createBackup}
                  disabled={isBackingUp}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <FaDownload className="w-4 h-4" />
                  {isBackingUp ? '백업 생성 중...' : '백업 생성'}
                </button>
              </div>

              {/* 백업 복원 */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">백업 복원</h3>
                <p className="text-white/70 text-sm mb-4">
                  이전에 생성한 백업 파일을 업로드하여 데이터를 복원합니다.
                </p>
                <label className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <FaUpload className="w-4 h-4" />
                  {isRestoring ? '복원 중...' : '백업 파일 선택'}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isRestoring}
                  />
                </label>
              </div>

              {/* 데이터 삭제 */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <h3 className="text-red-300 font-semibold mb-3 flex items-center gap-2">
                  <FaExclamationTriangle className="w-4 h-4" />
                  위험 영역
                </h3>
                <p className="text-white/70 text-sm mb-4">
                  모든 사용자 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                </p>
                <button
                  onClick={clearAllData}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <FaTrash className="w-4 h-4" />
                  모든 데이터 삭제
                </button>
              </div>
            </div>

            {/* 백업 히스토리 */}
            {backupHistory.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-white font-semibold mb-4">최근 백업</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {backupHistory.slice(0, 5).map((backup, index) => (
                    <div key={index} className="text-white/70 text-sm bg-white/5 p-2 rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{backup.filename}</span>
                        <span className="text-xs text-white/50">
                          {new Date(backup.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <div className="text-xs mt-1 text-white/40">
                        {backup.description || backup.backup_type} • {backup.created_by}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 시스템 설정 */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
              <FaPalette className="text-purple-400" />
              시스템 설정
            </h2>

            <div className="space-y-6">
              {/* 테마 설정 */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">테마</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="dark" className="bg-gray-800">다크 모드</option>
                  <option value="light" className="bg-gray-800">라이트 모드</option>
                  <option value="auto" className="bg-gray-800">시스템 설정</option>
                </select>
              </div>

              {/* 언어 설정 */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">언어</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="ko" className="bg-gray-800">한국어</option>
                  <option value="en" className="bg-gray-800">English</option>
                  <option value="ja" className="bg-gray-800">日本語</option>
                </select>
              </div>

              {/* 자동 백업 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white/80 text-sm font-medium">자동 백업</label>
                  <p className="text-white/50 text-xs">정기적으로 자동 백업을 생성합니다</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, autoBackup: !settings.autoBackup })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.autoBackup ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.autoBackup ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* 백업 주기 */}
              {settings.autoBackup && (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">백업 주기 (시간)</label>
                  <select
                    value={settings.backupInterval}
                    onChange={(e) => setSettings({ ...settings, backupInterval: e.target.value })}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="6" className="bg-gray-800">6시간</option>
                    <option value="12" className="bg-gray-800">12시간</option>
                    <option value="24" className="bg-gray-800">24시간</option>
                    <option value="168" className="bg-gray-800">7일</option>
                  </select>
                </div>
              )}

              {/* 최대 백업 수 */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">최대 백업 보관 수</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.maxBackups}
                  onChange={(e) => setSettings({ ...settings, maxBackups: parseInt(e.target.value) || 10 })}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              {/* 알림 설정 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white/80 text-sm font-medium">알림 활성화</label>
                  <p className="text-white/50 text-xs">시스템 알림을 받습니다</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, enableNotifications: !settings.enableNotifications })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.enableNotifications ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.enableNotifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* 분석 데이터 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white/80 text-sm font-medium">사용자 분석</label>
                  <p className="text-white/50 text-xs">익명화된 사용 데이터를 수집합니다</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, enableAnalytics: !settings.enableAnalytics })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.enableAnalytics ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.enableAnalytics ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* 설정 저장 */}
              <button
                onClick={saveSettings}
                className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                <FaSave className="w-4 h-4" />
                설정 저장
              </button>
            </div>
          </div>
        </div>

        {/* 데이터베이스 관리 */}
        <div className="mt-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
            <FaDatabase className="text-blue-400" />
            데이터베이스 관리
          </h2>

          {/* 오류/성공 메시지 */}
          {dbError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 text-red-400">
                <FaExclamationTriangle />
                <span>{dbError}</span>
              </div>
            </div>
          )}

          {dbSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 text-green-400">
                <FaCheckCircle />
                <span>{dbSuccess}</span>
              </div>
            </div>
          )}

          {/* 데이터베이스 상태 */}
          {dbStatus && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">데이터베이스 상태</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/60 text-sm">연결 상태</div>
                  <div className="text-white font-medium">{dbStatus.database_url}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/60 text-sm">테이블 현황</div>
                  <div className="text-white font-medium">{dbStatus.total_existing}/{dbStatus.total_expected} 테이블</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-white font-medium">테이블 상세:</h4>
                {Object.entries(dbStatus.tables).map(([tableName, tableInfo]: [string, any]) => (
                  <div key={tableName} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${tableInfo.exists ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-white">{tableName}</span>
                    </div>
                    <span className="text-white/60 text-sm">
                      {tableInfo.exists ? `${tableInfo.rows}행` : '없음'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={loadDatabaseStatus}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <FaDatabase className="w-4 h-4" />
              상태 새로고침
            </button>

            <button
              onClick={initializeDatabase}
              disabled={isInitializingDb}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <FaSave className="w-4 h-4" />
              {isInitializingDb ? '초기화 중...' : '테이블 초기화'}
            </button>
          </div>

          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <div className="flex items-start gap-3 text-yellow-200">
              <FaExclamationTriangle className="mt-1 flex-shrink-0" />
              <div className="text-sm">
                <strong>참고:</strong> 테이블 초기화는 누락된 테이블만 생성하며, 기존 데이터는 보존됩니다.
                로그 관리에서 "activity_logs" 테이블 오류가 발생하면 이 기능을 사용하세요.
              </div>
            </div>
          </div>
        </div>

        {/* 시스템 정보 */}
        <div className="mt-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
          <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
            <FaGlobe className="text-cyan-400" />
            시스템 정보
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('users') || '[]').length : 0}
              </div>
              <div className="text-white/70 text-sm">총 사용자</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aiInfos') || '[]').length : 0}
              </div>
              <div className="text-white/70 text-sm">AI 정보</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{backupHistory.length}</div>
              <div className="text-white/70 text-sm">백업 수</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">1.0.0</div>
              <div className="text-white/70 text-sm">버전</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 