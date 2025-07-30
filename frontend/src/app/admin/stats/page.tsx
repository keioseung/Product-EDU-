"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaChartBar, FaUsers, FaBrain, FaClipboard, FaBookOpen, FaComments, FaDatabase, FaArrowLeft, FaCalendar, FaTrophy, FaFire, FaEye, FaSpinner } from 'react-icons/fa'
import { systemAPI } from '@/lib/api'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalQuizzes: number
  totalContent: number
  recentActivity: { user: string; action: string; time: string }[]
  popularTopics: { name: string; count: number }[]
  weeklyProgress: { day: string; users: number; quizzes: number }[]
}

export default function AdminStatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalQuizzes: 0,
    totalContent: 0,
    recentActivity: [],
    popularTopics: [],
    weeklyProgress: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    setError('')
    
    try {
      console.log('📊 관리자 통계 데이터 로딩 중...')
      console.log('🔐 현재 토큰:', localStorage.getItem('access_token') ? '있음' : '없음')
      console.log('👤 현재 사용자:', localStorage.getItem('currentUser'))
      
      const response = await systemAPI.getAdminStats()
      console.log('📡 API 응답 전체:', response)
      
      if (response.success) {
        console.log('✅ DB 연결 통계 데이터:', response.stats)
        setStats(response.stats)
      } else {
        console.warn('⚠️ API 응답에 success가 false:', response)
        throw new Error('API returned success: false')
      }
    } catch (err: any) {
      console.error('❌ 관리자 통계 로딩 실패:', err)
      console.error('📄 에러 상세:', err.response)
      console.error('🔍 상태 코드:', err.response?.status)
      console.error('📝 에러 메시지:', err.response?.data)
      
      // 에러가 발생했을 때 기본값으로 폴백
      const fallbackStats = {
        totalUsers: 0,
        activeUsers: 0,
        totalQuizzes: 0,
        totalContent: 0,
        recentActivity: [{ user: '에러', action: 'API 호출 실패', time: '방금 전' }],
        popularTopics: [{ name: 'API 연결 실패', count: 0 }],
        weeklyProgress: [{ day: '오류', users: 0, quizzes: 0 }]
      }
      setStats(fallbackStats)
      
      setError(err.response?.data?.detail || err.message || '통계를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 간단한 프로그레스 바 컴포넌트
  const ProgressBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
    <div className="w-full bg-white/10 rounded-full h-2">
      <div 
        className={`h-2 rounded-full ${color}`} 
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
  )

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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FaChartBar className="text-yellow-400" />
              사용자 통계 & 대시보드
              {loading && <FaSpinner className="w-5 h-5 text-blue-400 animate-spin" />}
            </h1>
            <p className="text-white/70 mt-1">
              {loading ? '실시간 DB 데이터를 불러오는 중...' : '실시간 DB 연결 - 전체 시스템 현황과 사용자 활동'}
            </p>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-all flex items-center gap-2"
          >
            {loading ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaDatabase className="w-4 h-4" />}
            {loading ? '로딩 중...' : '새로고침'}
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-red-200 font-medium">통계 로딩 실패</span>
            </div>
            <p className="text-red-300 mt-2 text-sm">{error}</p>
            <button
              onClick={loadStats}
              className="mt-3 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-all"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 메인 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
                <div className="text-white/70 text-sm">총 사용자</div>
              </div>
              <FaUsers className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-green-400 text-sm">+{Math.floor(stats.totalUsers * 0.1)} 이번 주</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold text-white">{stats.activeUsers}</div>
                <div className="text-white/70 text-sm">활성 사용자</div>
              </div>
              <FaFire className="w-8 h-8 text-orange-400" />
            </div>
            <div className="text-blue-400 text-sm">최근 7일</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold text-white">{stats.totalQuizzes}</div>
                <div className="text-white/70 text-sm">총 퀴즈</div>
              </div>
              <FaClipboard className="w-8 h-8 text-indigo-400" />
            </div>
            <div className="text-purple-400 text-sm">다양한 주제</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold text-white">{stats.totalContent}</div>
                <div className="text-white/70 text-sm">총 컨텐츠</div>
              </div>
              <FaBookOpen className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-cyan-400 text-sm">학습 자료</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 인기 토픽 */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
              <FaTrophy className="text-yellow-400" />
              인기 토픽
            </h2>
            <div className="space-y-4">
              {stats.popularTopics.map((topic, index) => (
                <div key={topic.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-white/20 text-white'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-white font-medium">{topic.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <ProgressBar value={topic.count} max={60} color="bg-gradient-to-r from-yellow-400 to-orange-500" />
                    </div>
                    <span className="text-white/70 text-sm w-8">{topic.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 주간 활동 */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
              <FaCalendar className="text-blue-400" />
              주간 활동
            </h2>
            <div className="space-y-4">
              {stats.weeklyProgress.map((day) => (
                <div key={day.day} className="flex items-center justify-between">
                  <span className="text-white font-medium w-8">{day.day}</span>
                  <div className="flex-1 mx-4">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="text-xs text-white/70 mb-1">사용자</div>
                        <ProgressBar value={day.users} max={25} color="bg-gradient-to-r from-purple-400 to-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-white/70 mb-1">퀴즈</div>
                        <ProgressBar value={day.quizzes} max={40} color="bg-gradient-to-r from-blue-400 to-blue-600" />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-purple-400 text-sm">{day.users}</div>
                    <div className="text-blue-400 text-sm">{day.quizzes}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
          <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
            <FaEye className="text-cyan-400" />
            실시간 활동
          </h2>
          <div className="space-y-4">
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-purple-300 font-medium">{activity.user}</span>
                  <span className="text-white/70">{activity.action}</span>
                </div>
                <span className="text-white/50 text-sm">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 