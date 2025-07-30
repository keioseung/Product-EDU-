"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FaRobot, FaArrowRight, FaGlobe, FaCode, FaBrain, FaRocket, FaChartLine, FaTrophy, FaLightbulb, FaUsers, FaCalendar, FaBullseye, FaCog, FaChartBar, FaComments, FaDatabase, FaStar } from 'react-icons/fa'

const adminMenus = [
  { 
    href: '/admin/ai-info', 
    label: 'AI 정보 관리', 
    icon: FaBrain, 
    desc: 'AI 정보 등록, 수정, 삭제 등', 
    color: 'from-blue-500 to-cyan-500',
    accent: 'blue',
    size: 'large',
    priority: 'high'
  },

  { 
    href: '/admin/users', 
    label: '회원 관리', 
    icon: FaUsers, 
    desc: '회원 목록 조회, 역할 변경, 삭제 등', 
    color: 'from-purple-500 to-indigo-500',
    accent: 'purple',
    size: 'large',
    priority: 'high'
  },
  { 
    href: '/admin/system', 
    label: '시스템 관리', 
    icon: FaCog, 
    desc: '백업/복원, 시스템 설정 관리', 
    color: 'from-gray-500 to-slate-500',
    accent: 'gray',
    size: 'small',
    priority: 'medium'
  },
  { 
    href: '/admin/stats', 
    label: '사용자 통계', 
    icon: FaChartBar, 
    desc: '전체 사용자 학습/퀴즈 통계 및 대시보드', 
    color: 'from-yellow-500 to-orange-500',
    accent: 'yellow',
    size: 'medium',
    priority: 'high'
  },
  { 
    href: '/admin/logs', 
    label: '로그 관리', 
    icon: FaDatabase, 
    desc: '사용자 활동 로그 및 시스템 이벤트 조회', 
    color: 'from-red-500 to-pink-500',
    accent: 'red',
    size: 'small',
    priority: 'low'
  },
]

export default function AdminPage() {
  const router = useRouter()
  
  // 타이핑 애니메이션 상태
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const fullText = "관리자 대시보드"
  
  // 환영 메시지 애니메이션
  const [currentWelcome, setCurrentWelcome] = useState(0)
  const welcomeMessages = [
    "AI Mastery Hub를 관리하세요! 🚀",
    "사용자들의 학습을 지원해보세요! 💡",
    "함께 성장하는 플랫폼을 만들어가요! 🌟"
  ]

  // 카드 애니메이션 상태
  const [cardsVisible, setCardsVisible] = useState(false)

  // 타이핑 애니메이션
  useEffect(() => {
    if (currentIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setTypedText(fullText.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, 150)
      return () => clearTimeout(timeout)
    } else {
      setIsTyping(false)
      // 타이핑 완료 후 카드 애니메이션 시작
      setTimeout(() => setCardsVisible(true), 500)
    }
  }, [currentIndex, fullText])

  // 환영 메시지 순환
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWelcome((prev) => (prev + 1) % welcomeMessages.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [welcomeMessages.length])

  // 카드 크기 클래스 정의
  const getCardSizeClass = (size: string) => {
    switch (size) {
      case 'large':
        return 'col-span-2 sm:col-span-1 md:col-span-2 min-h-[200px] md:min-h-[240px]'
      case 'medium':
        return 'col-span-1 min-h-[160px] md:min-h-[180px]'
      case 'small':
        return 'col-span-1 min-h-[140px] md:min-h-[160px]'
      default:
        return 'col-span-1 min-h-[160px] md:min-h-[180px]'
    }
  }

  // 카드 우선도별 스타일
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'ring-2 ring-white/20 shadow-2xl'
      case 'medium':
        return 'shadow-xl'
      case 'low':
        return 'shadow-lg'
      default:
        return 'shadow-lg'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* 고급스러운 배경 효과 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,119,198,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,255,0.15),transparent_50%)]" />
      
      {/* 움직이는 파티클 효과 */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        {/* 헤더 섹션 */}
        <div className="flex flex-col items-center justify-center pt-6 sm:pt-8 md:pt-12 pb-8 sm:pb-12">
          {/* 상단 아이콘과 제목 */}
          <div className="flex flex-col items-center gap-4 sm:gap-6 mb-8 sm:mb-12 text-center">
            <div className="relative">
              <div className="relative">
                <span className="text-5xl sm:text-6xl md:text-7xl text-purple-400 drop-shadow-2xl animate-bounce-slow">
                  <FaCog />
                </span>
                <div className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-ping" />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent drop-shadow-2xl tracking-tight leading-tight">
                {typedText}
                {isTyping && <span className="animate-blink">|</span>}
              </h1>
              <div className="h-6 sm:h-8 mt-3 sm:mt-4">
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-purple-300 font-medium animate-fade-in-out">
                  {welcomeMessages[currentWelcome]}
                </p>
              </div>
            </div>
          </div>

          {/* 개선된 관리자 메뉴 카드들 - 스태거드 레이아웃 */}
          <div className="w-full max-w-7xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 auto-rows-auto">
              {adminMenus.map((menu, index) => (
                <button
                  key={menu.href}
                  onClick={() => router.push(menu.href)}
                  className={`
                    group glass-card 
                    ${getCardSizeClass(menu.size)} 
                    ${getPriorityStyle(menu.priority)}
                    ${cardsVisible ? 'animate-slide-up' : 'opacity-0 translate-y-8'}
                    p-4 sm:p-6 md:p-8 
                    border border-white/10 
                    text-left flex flex-col 
                    transition-all duration-500 
                    hover:scale-105 hover:rotate-1
                    hover:shadow-2xl hover:shadow-purple-500/25
                    active:scale-95
                    backdrop-blur-xl
                    relative overflow-hidden
                  `}
                  style={{ 
                    animationDelay: cardsVisible ? `${index * 100}ms` : '0ms',
                    transformOrigin: index % 2 === 0 ? 'bottom left' : 'bottom right'
                  }}
                >
                  {/* 카드 배경 그라데이션 효과 */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${menu.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
                  
                  {/* 카드 내용 */}
                  <div className="relative z-10 flex flex-col h-full">
                    {/* 아이콘과 우선도 표시 */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-r ${menu.color} flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg`}>
                        <menu.icon className="text-white text-lg sm:text-xl md:text-2xl" />
                      </div>
                      {menu.priority === 'high' && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <FaStar className="text-xs sm:text-sm" />
                        </div>
                      )}
                    </div>
                    
                    {/* 제목 */}
                    <h3 className="gradient-text font-bold text-sm sm:text-base md:text-lg lg:text-xl mb-2 sm:mb-3 leading-tight group-hover:text-white transition-colors duration-300">
                      {menu.label}
                    </h3>
                    
                    {/* 설명 (large 카드에만 표시) */}
                    {menu.size === 'large' && (
                      <p className="text-gray-300 text-xs sm:text-sm md:text-base leading-relaxed mb-3 sm:mb-4 flex-grow opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                        {menu.desc}
                      </p>
                    )}
                    
                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-2 mt-auto text-purple-300 group-hover:text-purple-200 transition-colors duration-300">
                      <span className="text-xs sm:text-sm md:text-base font-semibold">관리하기</span>
                      <FaArrowRight className="text-xs sm:text-sm md:text-base group-hover:translate-x-2 transition-transform duration-300" />
                    </div>
                  </div>

                  {/* 호버 시 빛나는 효과 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                </button>
              ))}
            </div>
          </div>

          {/* 하단 통계 - 개선된 디자인 */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 md:gap-8 mt-8 sm:mt-12 md:mt-16">
            <div className="flex items-center gap-2 sm:gap-3 text-white/60 text-xs sm:text-sm md:text-base bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
              <FaGlobe className="text-purple-400" />
              <span>관리자 전용 대시보드</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-white/60 text-xs sm:text-sm md:text-base bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
              <FaRocket className="text-pink-400" />
              <span>AI Mastery Hub 관리</span>
            </div>
          </div>
        </div>
      </div>

      {/* 커스텀 애니메이션 스타일 */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.2; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s infinite;
        }
        @keyframes fade-in-out {
          0%, 100% { opacity: 0; transform: translateY(10px); }
          20%, 80% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 4s ease-in-out infinite;
        }
        @keyframes slide-up {
          from { 
            opacity: 0; 
            transform: translateY(30px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        .animate-slide-up {
          animation: slide-up 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        .gradient-text {
          background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #cbd5e1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        /* 모바일 터치 피드백 향상 */
        @media (max-width: 768px) {
          .glass-card:active {
            transform: scale(0.98) !important;
            transition: transform 0.1s ease-out;
          }
        }
      `}</style>
    </div>
  )
} 