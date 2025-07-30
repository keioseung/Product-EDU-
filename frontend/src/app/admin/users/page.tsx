"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FaUsers, FaEdit, FaTrash, FaArrowLeft, FaUserShield, FaUser, FaSearch, FaPlus, FaExclamationTriangle } from 'react-icons/fa'
import { authAPI } from '@/lib/api'

interface User {
  id: number
  username: string
  email?: string
  role: 'admin' | 'user'
  is_active: boolean
  created_at: string
}

export default function UserManagementPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // 사용자 목록 로드
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const userData = await authAPI.getAllUsers()
      setUsers(userData)
      setError('')
    } catch (error: any) {
      console.error('Failed to load users:', error)
      setError('사용자 목록을 불러오는데 실패했습니다.')
      
      // 권한 없음 에러인 경우 관리자 페이지로 리다이렉트
      if (error.response?.status === 403) {
        alert('관리자 권한이 필요합니다.')
        router.push('/admin')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 검색 필터링
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // 사용자 삭제
  const handleDeleteUser = (user: User) => {
    setUserToDelete(user)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      try {
        await authAPI.deleteUser(userToDelete.id)
        await loadUsers() // 목록 새로고침
        setError('')
      } catch (error: any) {
        console.error('Failed to delete user:', error)
        if (error.response?.data?.detail) {
          setError(error.response.data.detail)
        } else {
          setError('사용자 삭제에 실패했습니다.')
        }
      }
    }
    setIsDeleteModalOpen(false)
    setUserToDelete(null)
  }

  // 사용자 역할 변경
  const handleRoleChange = async (userId: number, newRole: 'admin' | 'user') => {
    try {
      await authAPI.updateUserRole(userId, newRole)
      await loadUsers() // 목록 새로고침
      setError('')
    } catch (error: any) {
      console.error('Failed to update user role:', error)
      if (error.response?.data?.detail) {
        setError(error.response.data.detail)
      } else {
        setError('사용자 역할 변경에 실패했습니다.')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">사용자 목록을 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* 배경 효과 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]" />

      <div className="relative z-10 p-3 sm:p-6 lg:p-8">
        {/* 헤더 - 모바일에서 컴팩트하게 */}
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/admin')}
              className="w-8 h-8 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300"
            >
              <FaArrowLeft className="text-sm sm:text-base" />
            </button>
            <div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <FaUsers className="text-sm sm:text-xl text-white" />
                </div>
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                회원 관리
              </h1>
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-1 hidden sm:block">시스템 사용자를 관리하고 권한을 설정하세요</p>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 - 모바일에서 패딩 축소 */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-6 mb-4 sm:mb-6 border border-white/20">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/50 text-sm sm:text-base" />
            <input
              type="text"
                placeholder="사용자명 또는 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm sm:text-base"
            />
            </div>
          </div>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3 text-red-400">
              <FaExclamationTriangle className="text-sm sm:text-base" />
              <span className="text-sm sm:text-base">{error}</span>
            </div>
          </div>
        )}

        {/* 사용자 목록 */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 overflow-hidden">
          <div className="p-3 sm:p-6 border-b border-white/10">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <FaUsers className="text-purple-400 text-sm sm:text-base" />
              전체 사용자 ({filteredUsers.length}명)
            </h2>
            </div>
          
          {/* 데스크톱 테이블 뷰 */}
          <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-white/80 font-medium">사용자</th>
                  <th className="text-left py-4 px-6 text-white/80 font-medium">이메일</th>
                  <th className="text-left py-4 px-6 text-white/80 font-medium">역할</th>
                  <th className="text-left py-4 px-6 text-white/80 font-medium">가입일</th>
                  <th className="text-left py-4 px-6 text-white/80 font-medium">상태</th>
                  <th className="text-center py-4 px-6 text-white/80 font-medium">관리</th>
                  </tr>
                </thead>
                <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          user.role === 'admin' 
                            ? 'bg-gradient-to-r from-red-500 to-pink-500' 
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}>
                          {user.role === 'admin' ? <FaUserShield className="text-white" /> : <FaUser className="text-white" />}
                          </div>
                        <div>
                          <div className="text-white font-medium">{user.username}</div>
                          <div className="text-white/60 text-sm">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-white/80">
                      {user.email || '-'}
                      </td>
                    <td className="py-4 px-6">
                        <select
                          value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'user')}
                          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        >
                        <option value="user">일반 사용자</option>
                        <option value="admin">관리자</option>
                        </select>
                      </td>
                    <td className="py-4 px-6 text-white/80 text-sm">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.is_active 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {user.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDeleteUser(user)}
                          className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg flex items-center justify-center text-red-400 hover:text-red-300 transition-all"
                          >
                          <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>

          {/* 모바일 카드 뷰 - 더 컴팩트하게 */}
          <div className="lg:hidden divide-y divide-white/10">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-3 sm:p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${
                      user.role === 'admin' 
                        ? 'bg-gradient-to-r from-red-500 to-pink-500' 
                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}>
                      {user.role === 'admin' ? <FaUserShield className="text-white text-xs sm:text-base" /> : <FaUser className="text-white text-xs sm:text-base" />}
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm sm:text-lg">{user.username}</div>
                      <div className="text-white/60 text-xs sm:text-sm">ID: {user.id}</div>
                      {user.email && (
                        <div className="text-white/70 text-xs sm:text-sm">{user.email}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="w-6 h-6 sm:w-8 sm:h-8 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg flex items-center justify-center text-red-400 hover:text-red-300 transition-all"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div>
                    <label className="text-white/60 text-xs font-medium">역할</label>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'user')}
                      className="w-full mt-1 bg-white/10 border border-white/20 rounded-lg px-2 sm:px-3 py-1 sm:py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="user">일반 사용자</option>
                      <option value="admin">관리자</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-white/60 text-xs font-medium">상태</label>
                    <div className="mt-1">
                      <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                        user.is_active 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {user.is_active ? '활성' : '비활성'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-white/60 text-xs sm:text-sm">
                  가입일: {new Date(user.created_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
            
            {filteredUsers.length === 0 && (
            <div className="text-center py-8 sm:py-12 text-white/60 text-sm sm:text-base">
                검색 결과가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 max-w-md w-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <FaExclamationTriangle className="text-red-400 text-xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">사용자 삭제</h3>
                <p className="text-white/60">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            
            <p className="text-white/80 mb-6">
              <strong>{userToDelete.username}</strong> 사용자를 정말 삭제하시겠습니까?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
              >
                취소
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 rounded-xl text-white font-medium transition-all"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 