"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FaBrain, FaArrowLeft, FaPlus, FaEdit, FaTrash, FaRobot, FaFileAlt, FaCopy, FaSave, FaTimes, FaDownload, FaUpload } from 'react-icons/fa'
import { aiInfoAPI, promptAPI, baseContentAPI } from '@/lib/api'

interface TermItem {
  term: string
  description: string
}

interface AIInfoItem {
  title: string
  content: string
  terms?: TermItem[]
}

interface ServerPrompt {
  id: number
  title: string
  content: string
  category: string
  created_at: string
}

interface ServerBaseContent {
  id: number
  title: string
  content: string
  category: string
  created_at: string
}

export default function AdminAIInfoPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [date, setDate] = useState('')
  const [inputs, setInputs] = useState([{ title: '', content: '', terms: [] as TermItem[] }])
  const [editId, setEditId] = useState<boolean>(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 프롬프트 관리 상태
  const [promptTitle, setPromptTitle] = useState('')
  const [promptContent, setPromptContent] = useState('')
  const [promptEditId, setPromptEditId] = useState<number | null>(null)

  // 기반 내용 관리 상태
  const [baseTitle, setBaseTitle] = useState('')
  const [baseContent, setBaseContent] = useState('')
  const [baseEditId, setBaseEditId] = useState<number | null>(null)
  const [showBaseContent, setShowBaseContent] = useState<number | null>(null)

  // 프롬프트+기반내용 합치기 상태
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null)
  const [selectedBaseId, setSelectedBaseId] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  // 전문용어 일괄 입력 상태
  const [bulkTermsText, setBulkTermsText] = useState('')
  const [showBulkInput, setShowBulkInput] = useState<number | null>(null)

  // 서버에서 날짜별 AI 정보 목록 불러오기
  const { data: dates = [], refetch: refetchDates } = useQuery({
    queryKey: ['ai-info-dates'],
    queryFn: async () => {
      const res = await aiInfoAPI.getAllDates()
      return res.data as string[]
    }
  })

  // 선택한 날짜의 AI 정보 불러오기
  const { data: aiInfos = [], refetch: refetchAIInfo, isFetching } = useQuery({
    queryKey: ['ai-info', date],
    queryFn: async () => {
      if (!date) return []
      const res = await aiInfoAPI.getByDate(date)
      return res.data as AIInfoItem[]
    },
    enabled: !!date,
  })

  // 서버에서 프롬프트 목록 불러오기
  const { data: prompts = [], refetch: refetchPrompts } = useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const res = await promptAPI.getAll()
      return res.data as ServerPrompt[]
    }
  })

  // 서버에서 기반 내용 목록 불러오기
  const { data: baseContents = [], refetch: refetchBaseContents } = useQuery({
    queryKey: ['baseContents'],
    queryFn: async () => {
      const res = await baseContentAPI.getAll()
      return res.data as ServerBaseContent[]
    }
  })

  // AI 정보 등록/수정
  const addOrUpdateMutation = useMutation({
    mutationFn: async () => {
      return aiInfoAPI.add({ date, infos: inputs })
    },
    onMutate: () => {
      setError('')
      setSuccess('')
    },
    onSuccess: () => {
      refetchAIInfo()
      refetchDates()
      setInputs([{ title: '', content: '', terms: [] }])
      setDate('')
      setEditId(false)
      setSuccess('등록이 완료되었습니다!')
    },
    onError: () => {
      setError('등록에 실패했습니다. 다시 시도해주세요.')
    }
  })

  // AI 정보 삭제
  const deleteMutation = useMutation({
    mutationFn: async (date: string) => {
      return aiInfoAPI.delete(date)
    },
    onSuccess: () => {
      refetchAIInfo()
      refetchDates()
      setInputs([{ title: '', content: '', terms: [] }])
      setDate('')
      setEditId(false)
      setSuccess('삭제가 완료되었습니다!')
    },
    onError: () => {
      setError('삭제에 실패했습니다. 다시 시도해주세요.')
    }
  })

  // 프롬프트 추가/수정
  const promptMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; id?: number }) => {
      console.log('Sending prompt data:', data)
      if (data.id) {
        return promptAPI.update(data.id, { title: data.title, content: data.content, category: 'default' })
      } else {
        return promptAPI.add({ title: data.title, content: data.content, category: 'default' })
      }
    },
    onSuccess: () => {
      refetchPrompts()
      setPromptTitle('')
      setPromptContent('')
      setPromptEditId(null)
      setSuccess('프롬프트가 저장되었습니다!')
    },
    onError: (error: any) => {
      console.error('Prompt error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        url: error?.config?.url,
        method: error?.config?.method,
        data: error?.config?.data
      })
      
      let errorMessage = '프롬프트 저장에 실패했습니다.'
      
      if (error?.response?.data?.detail) {
        errorMessage = `프롬프트 저장 실패: ${error.response.data.detail}`
      } else if (error?.response?.data?.error) {
        errorMessage = `프롬프트 저장 실패: ${error.response.data.error}`
      } else if (error?.message) {
        errorMessage = `프롬프트 저장 실패: ${error.message}`
      }
      
      setError(errorMessage)
    }
  })

  // 프롬프트 삭제
  const promptDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return promptAPI.delete(id)
    },
    onSuccess: () => {
      refetchPrompts()
      setSuccess('프롬프트가 삭제되었습니다!')
    },
    onError: (error: any) => {
      console.error('Prompt delete error:', error)
      console.error('Error response:', error?.response)
      console.error('Error data:', error?.response?.data)
      
      let errorMessage = '프롬프트 삭제에 실패했습니다.'
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      setError(`프롬프트 삭제 실패: ${errorMessage}`)
    }
  })

  // 기반 내용 추가/수정
  const baseContentMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; id?: number }) => {
      if (data.id) {
        return baseContentAPI.update(data.id, { title: data.title, content: data.content, category: 'default' })
      } else {
        return baseContentAPI.add({ title: data.title, content: data.content, category: 'default' })
      }
    },
    onSuccess: () => {
      refetchBaseContents()
      setBaseTitle('')
      setBaseContent('')
      setBaseEditId(null)
      setSuccess('기반 내용이 저장되었습니다!')
    },
    onError: () => {
      setError('기반 내용 저장에 실패했습니다.')
    }
  })

  // 기반 내용 삭제
  const baseContentDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return baseContentAPI.delete(id)
    },
    onSuccess: () => {
      refetchBaseContents()
      setSuccess('기반 내용이 삭제되었습니다!')
    },
    onError: () => {
      setError('기반 내용 삭제에 실패했습니다.')
    }
  })

  const handleInputChange = (idx: number, field: 'title' | 'content', value: string) => {
    setInputs(inputs => inputs.map((input, i) => i === idx ? { ...input, [field]: value } : input))
  }

  const handleAddInput = () => {
    if (inputs.length < 3) {
      setInputs([...inputs, { title: '', content: '', terms: [] }])
    }
  }

  const handleRemoveInput = (idx: number) => {
    setInputs(inputs => inputs.length === 1 ? inputs : inputs.filter((_, i) => i !== idx))
  }

  // 용어 관리 핸들러
  const handleAddTerm = (infoIdx: number) => {
    setInputs(inputs => inputs.map((input, i) => 
      i === infoIdx 
        ? { ...input, terms: [...input.terms, { term: '', description: '' }] }
        : input
    ))
  }

  // 전문용어 일괄 입력 파싱 함수
  const parseTermsFromText = (text: string): TermItem[] => {
    const lines = text.trim().split('\n')
    const terms: TermItem[] = []
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue
      
      // 탭으로 구분된 경우
      if (trimmedLine.includes('\t')) {
        const [term, description] = trimmedLine.split('\t').map(s => s.trim())
        if (term && description) {
          terms.push({ term, description })
        }
      }
      // 공백으로 구분된 경우 (탭이 없는 경우)
      else {
        const parts = trimmedLine.split(/\s{2,}/) // 2개 이상의 공백으로 구분
        if (parts.length >= 2) {
          const term = parts[0].trim()
          const description = parts.slice(1).join(' ').trim()
          if (term && description) {
            terms.push({ term, description })
          }
        }
      }
    }
    
    return terms
  }

  // 전문용어 일괄 입력 핸들러
  const handleBulkTermsInput = (infoIdx: number) => {
    setShowBulkInput(infoIdx)
    setBulkTermsText('')
  }

  const handleBulkTermsSubmit = (infoIdx: number) => {
    if (bulkTermsText.trim()) {
      const parsedTerms = parseTermsFromText(bulkTermsText)
      if (parsedTerms.length > 0) {
        setInputs(inputs => inputs.map((input, i) => 
          i === infoIdx 
            ? { ...input, terms: [...input.terms, ...parsedTerms] }
            : input
        ))
        alert(`${parsedTerms.length}개의 용어가 추가되었습니다!`)
      } else {
        alert('파싱할 수 있는 용어가 없습니다. 형식을 확인해주세요.')
      }
    }
    setShowBulkInput(null)
    setBulkTermsText('')
  }

  const handleBulkTermsCancel = () => {
    setShowBulkInput(null)
    setBulkTermsText('')
  }

  const handleRemoveTerm = (infoIdx: number, termIdx: number) => {
    setInputs(inputs => inputs.map((input, i) => 
      i === infoIdx 
        ? { ...input, terms: input.terms.filter((_, j) => j !== termIdx) }
        : input
    ))
  }

  const handleTermChange = (infoIdx: number, termIdx: number, field: 'term' | 'description', value: string) => {
    setInputs(inputs => inputs.map((input, i) => 
      i === infoIdx 
        ? { 
            ...input, 
            terms: input.terms.map((term, j) => 
              j === termIdx ? { ...term, [field]: value } : term
            )
          }
        : input
    ))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!date) {
      setError('날짜를 선택하세요.')
      return
    }
    if (inputs.some(input => !input.title.trim() || !input.content.trim())) {
      setError('모든 제목과 내용을 입력하세요.')
      return
    }
    addOrUpdateMutation.mutate()
  }

  const handleEdit = (info: AIInfoItem, idx: number) => {
    setEditId(true)
    setInputs([{ title: info.title, content: info.content, terms: info.terms || [] }])
  }

  const handleDelete = (date: string) => {
    deleteMutation.mutate(date)
  }

  // 프롬프트 관리 핸들러
  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!promptTitle || !promptContent) return
    
    promptMutation.mutate({
      title: promptTitle,
      content: promptContent,
      id: promptEditId || undefined
    })
  }

  const handlePromptEdit = (p: ServerPrompt) => {
    setPromptEditId(p.id)
    setPromptTitle(p.title)
    setPromptContent(p.content)
  }

  const handlePromptDelete = (id: number) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      promptDeleteMutation.mutate(id)
      if (promptEditId === id) {
        setPromptEditId(null)
        setPromptTitle('')
        setPromptContent('')
      }
    }
  }

  // 기반 내용 관리 핸들러
  const handleBaseSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!baseTitle || !baseContent) return
    
    baseContentMutation.mutate({
      title: baseTitle,
      content: baseContent,
      id: baseEditId || undefined
    })
  }

  const handleBaseEdit = (b: ServerBaseContent) => {
    setBaseEditId(b.id)
    setBaseTitle(b.title)
    setBaseContent(b.content)
  }

  const handleBaseDelete = (id: number) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      baseContentDeleteMutation.mutate(id)
      if (baseEditId === id) {
        setBaseEditId(null)
        setBaseTitle('')
        setBaseContent('')
      }
    }
  }

  // 프롬프트+기반내용 합치기
  const getCombinedText = () => {
    const prompt = prompts.find(p => p.id === selectedPromptId)
    const base = baseContents.find(b => b.id === selectedBaseId)
    return [prompt?.content || '', base ? `\n\n[기반 내용]\n${base.content}` : ''].join('')
  }

  const handleCopyAndGo = () => {
    const text = getCombinedText()
    navigator.clipboard.writeText(text)
    setCopied(true)
    window.open('https://chat.openai.com/', '_blank')
    setTimeout(() => setCopied(false), 2000)
  }

  // 데이터 백업/복원 함수들
  const exportData = async () => {
    try {
      const [promptsRes, baseContentsRes] = await Promise.all([
        promptAPI.getAll(),
        baseContentAPI.getAll()
      ])
      
      const data = {
        prompts: promptsRes.data,
        baseContents: baseContentsRes.data,
        exportDate: new Date().toISOString(),
        version: "2.0"
      }
      
      const dataStr = JSON.stringify(data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(dataBlob)
      link.download = `ai_info_backup_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      
      setSuccess('데이터가 백업되었습니다!')
    } catch (error) {
      setError('백업 중 오류가 발생했습니다.')
    }
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        if (data.prompts && data.baseContents) {
          // 서버에 데이터 업로드
          const promises = []
          
          // 프롬프트 업로드
          for (const prompt of data.prompts) {
            promises.push(promptAPI.add({
              title: prompt.title,
              content: prompt.content,
              category: prompt.category || 'default'
            }))
          }
          
          // 기반 내용 업로드
          for (const base of data.baseContents) {
            promises.push(baseContentAPI.add({
              title: base.title,
              content: base.content,
              category: base.category || 'default'
            }))
          }
          
          await Promise.all(promises)
          
          // 데이터 새로고침
          refetchPrompts()
          refetchBaseContents()
          
          setSuccess(`데이터가 복원되었습니다!\n프롬프트: ${data.prompts.length}개\n기반 내용: ${data.baseContents.length}개`)
        } else {
          setError('올바르지 않은 백업 파일입니다.')
        }
      } catch (error) {
        setError('파일을 읽는 중 오류가 발생했습니다.')
        console.error('Import error:', error)
      }
    }
    reader.readAsText(file)
    
    // 파일 입력 초기화
    event.target.value = ''
  }

  // 프롬프트+기반내용 합치기 영역 선택 기능
  const combinedRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        if (document.activeElement === combinedRef.current) {
          e.preventDefault()
          const range = document.createRange()
          range.selectNodeContents(combinedRef.current!)
          const sel = window.getSelection()
          sel?.removeAllRanges()
          sel?.addRange(range)
        }
      }
    }
    const node = combinedRef.current
    if (node) node.addEventListener('keydown', handleKeyDown)
    return () => { if (node) node.removeEventListener('keydown', handleKeyDown) }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* 배경 효과 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,119,198,0.15),transparent_50%)]" />

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
              <FaBrain className="text-blue-400" />
              AI 정보 관리 (DB 저장)
            </h1>
            <p className="text-white/70 mt-1">AI 정보, 프롬프트, 기반 내용을 데이터베이스에 저장하여 관리합니다</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          {/* 성공/오류 메시지 */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3 text-red-400">
                <FaTimes />
                <span>{error}</span>
              </div>
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3 text-green-400">
                <FaSave />
                <span>{success}</span>
              </div>
            </div>
          )}

          {/* AI 정보 관리 */}
          <section className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <FaBrain className="text-blue-400" />
              AI 정보 관리
            </h2>
            
            <form onSubmit={handleSubmit} className="mb-8 bg-white/5 rounded-xl p-6 border border-white/10 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="font-semibold text-white/80">날짜</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    className="p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                  />
                </div>
              </div>
              
              <div className="grid gap-6">
                {inputs.map((input, idx) => (
                  <div key={idx} className="bg-white/5 rounded-xl border border-white/10 p-6 flex flex-col gap-3 relative">
                    <div className="flex flex-col gap-2">
                      <label className="font-semibold text-white/80">제목</label>
                      <input 
                        type="text" 
                        placeholder={`제목 ${idx+1}`} 
                        value={input.title} 
                        onChange={e => handleInputChange(idx, 'title', e.target.value)} 
                        className="p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-semibold text-white/80">내용</label>
                      <textarea 
                        placeholder={`내용 ${idx+1}`} 
                        value={input.content} 
                        onChange={e => handleInputChange(idx, 'content', e.target.value)} 
                        className="p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" 
                        rows={3} 
                      />
                    </div>
                    
                    {/* 용어 입력 섹션 */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-white/80">관련 용어</label>
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={() => handleBulkTermsInput(idx)} 
                            className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg font-medium hover:bg-purple-500/30 transition text-sm border border-purple-500/30"
                            title="전문용어를 복사해서 붙여넣기"
                          >
                            📋 일괄 입력
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleAddTerm(idx)} 
                            className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg font-medium hover:bg-green-500/30 transition text-sm border border-green-500/30"
                          >
                            + 용어 추가
                          </button>
                        </div>
                      </div>
                      
                      {/* 일괄 입력 모달 */}
                      {showBulkInput === idx && (
                        <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl p-4 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-yellow-300">📋 전문용어 일괄 입력</h4>
                            <button 
                              type="button" 
                              onClick={handleBulkTermsCancel}
                              className="text-yellow-400 hover:text-yellow-200"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="mb-3">
                            <p className="text-sm text-yellow-200 mb-2">
                              전문용어를 복사해서 붙여넣으세요. 탭(→) 또는 공백으로 구분됩니다.
                            </p>
                            <div className="text-xs text-yellow-300 bg-yellow-500/20 p-2 rounded mb-2">
                              <strong>예시:</strong><br/>
                              LLM	GPT 같은 대형 언어 모델<br/>
                              자연어	우리가 일상에서 쓰는 언어<br/>
                              DSL	특정 분야 전용 프로그래밍 언어
                            </div>
                          </div>
                          <textarea
                            value={bulkTermsText}
                            onChange={(e) => setBulkTermsText(e.target.value)}
                            placeholder="용어	뜻&#10;LLM	GPT 같은 대형 언어 모델&#10;자연어	우리가 일상에서 쓰는 언어"
                            className="w-full p-3 bg-white/10 border border-yellow-500/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-sm resize-none"
                            rows={6}
                          />
                          <div className="flex gap-2 mt-3">
                            <button 
                              type="button" 
                              onClick={() => handleBulkTermsSubmit(idx)}
                              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition text-sm"
                            >
                              용어 추가
                            </button>
                            <button 
                              type="button" 
                              onClick={handleBulkTermsCancel}
                              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition text-sm"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {input.terms.map((term, termIdx) => (
                        <div key={termIdx} className="flex gap-2 items-start">
                          <div className="flex-1 flex gap-2">
                            <input 
                              type="text" 
                              placeholder="용어" 
                              value={term.term} 
                              onChange={e => handleTermChange(idx, termIdx, 'term', e.target.value)} 
                              className="flex-1 p-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm" 
                            />
                            <input 
                              type="text" 
                              placeholder="용어 설명" 
                              value={term.description} 
                              onChange={e => handleTermChange(idx, termIdx, 'description', e.target.value)} 
                              className="flex-1 p-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm" 
                            />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveTerm(idx, termIdx)} 
                            className="px-2 py-1 bg-red-500/20 text-red-300 rounded font-medium hover:bg-red-500/30 transition text-sm border border-red-500/30"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {inputs.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveInput(idx)} 
                        className="absolute top-4 right-4 px-3 py-1 bg-gray-500/20 text-gray-300 rounded font-medium hover:bg-gray-500/30 transition border border-gray-500/30"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button 
                type="button" 
                onClick={handleAddInput} 
                disabled={inputs.length >= 3} 
                className={`px-4 py-2 rounded-xl font-medium transition w-fit flex items-center gap-2 ${
                  inputs.length >= 3 
                    ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed border border-gray-500/30' 
                    : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30'
                }`}
              >
                <FaPlus className="w-4 h-4" />
                정보 추가
              </button>
              
              <button 
                type="submit" 
                disabled={addOrUpdateMutation.isPending} 
                className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FaSave className="w-4 h-4" />
                {addOrUpdateMutation.isPending ? '등록 중...' : (editId ? '수정' : '등록')}
              </button>
            </form>
            
            <div className="grid gap-4">
              {dates.length === 0 && <div className="text-white/50 text-center">등록된 AI 정보가 없습니다.</div>}
              {dates.map(dateItem => (
                <div key={dateItem} className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-blue-400 font-medium">{dateItem}</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setDate(dateItem); refetchAIInfo(); }} 
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        <FaEdit className="w-4 h-4" />
                        불러오기
                      </button>
                      <button 
                        onClick={() => handleDelete(dateItem)} 
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        <FaTrash className="w-4 h-4" />
                        삭제
                      </button>
                    </div>
                  </div>
                  
                  {isFetching && date === dateItem ? (
                    <div className="text-white/50">불러오는 중...</div>
                  ) : (
                    aiInfos.length > 0 && date === dateItem ? (
                      aiInfos.map((info, idx) => (
                        <div key={idx} className="mb-4 last:mb-0 bg-white/5 rounded-lg p-4">
                          <div className="font-bold text-lg text-white mb-2">{info.title}</div>
                          <div className="text-white/70 text-sm whitespace-pre-line mb-3">{info.content}</div>
                          <button 
                            onClick={() => handleEdit(info, idx)} 
                            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                          >
                            <FaEdit className="w-4 h-4" />
                            수정
                          </button>
                        </div>
                      ))
                    ) : null
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 프롬프트 관리 */}
          <section className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FaRobot className="text-pink-400" />
                프롬프트 관리 (DB 저장)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={exportData}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                >
                  <FaDownload className="w-4 h-4" />
                  백업
                </button>
                <label className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition flex items-center gap-2 cursor-pointer">
                  <FaUpload className="w-4 h-4" />
                  복원
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            
            <form onSubmit={handlePromptSubmit} className="mb-8 bg-white/5 rounded-xl p-6 border border-white/10 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-white/80">프롬프트 제목</label>
                  <input 
                    type="text" 
                    placeholder="프롬프트 제목" 
                    value={promptTitle} 
                    onChange={e => setPromptTitle(e.target.value)} 
                    className="p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-white/80">프롬프트 내용</label>
                  <textarea 
                    placeholder="프롬프트 내용" 
                    value={promptContent} 
                    onChange={e => setPromptContent(e.target.value)} 
                    className="p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none" 
                    rows={3} 
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  disabled={promptMutation.isPending}
                  className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
                >
                  <FaSave className="w-4 h-4" />
                  {promptMutation.isPending ? '저장 중...' : (promptEditId ? '수정' : '등록')}
                </button>
                {promptEditId && (
                  <button 
                    type="button" 
                    onClick={() => { setPromptEditId(null); setPromptTitle(''); setPromptContent('') }} 
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition"
                  >
                    취소
                  </button>
                )}
              </div>
            </form>
            
            <div className="grid gap-4">
              {prompts.length === 0 && <div className="text-white/50 text-center">등록된 프롬프트가 없습니다.</div>}
              {prompts.map(p => (
                <div key={p.id} className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-bold text-lg text-white">{p.title}</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handlePromptEdit(p)} 
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        <FaEdit className="w-4 h-4" />
                        수정
                      </button>
                      <button 
                        onClick={() => handlePromptDelete(p.id)} 
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        <FaTrash className="w-4 h-4" />
                        삭제
                      </button>
                    </div>
                  </div>
                  <div className="text-white/70 text-sm whitespace-pre-line bg-white/5 rounded-lg p-4">{p.content}</div>
                  <div className="text-white/50 text-xs mt-2">
                    생성일: {new Date(p.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 기반 내용 관리 */}
          <section className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <FaFileAlt className="text-green-400" />
              기반 내용 관리 (DB 저장)
            </h2>
            
            <form onSubmit={handleBaseSubmit} className="mb-8 bg-white/5 rounded-xl p-6 border border-white/10 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-white/80">기반 내용 제목</label>
                  <input 
                    type="text" 
                    placeholder="기반 내용 제목" 
                    value={baseTitle} 
                    onChange={e => setBaseTitle(e.target.value)} 
                    className="p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500/50" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-white/80">기반 내용</label>
                  <textarea 
                    placeholder="기반 내용" 
                    value={baseContent} 
                    onChange={e => setBaseContent(e.target.value)} 
                    className="p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none" 
                    rows={3} 
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  disabled={baseContentMutation.isPending}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
                >
                  <FaSave className="w-4 h-4" />
                  {baseContentMutation.isPending ? '저장 중...' : (baseEditId ? '수정' : '등록')}
                </button>
                {baseEditId && (
                  <button 
                    type="button" 
                    onClick={() => { setBaseEditId(null); setBaseTitle(''); setBaseContent('') }} 
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition"
                  >
                    취소
                  </button>
                )}
              </div>
            </form>
            
            <div className="grid gap-4">
              {baseContents.length === 0 && <div className="text-white/50 text-center">등록된 기반 내용이 없습니다.</div>}
              {baseContents.map(b => (
                <div key={b.id} className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-bold text-lg text-white">{b.title}</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowBaseContent(showBaseContent === b.id ? null : b.id)} 
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        {showBaseContent === b.id ? '내용 숨기기' : '내용 보기'}
                      </button>
                      <button 
                        onClick={() => handleBaseEdit(b)} 
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        <FaEdit className="w-4 h-4" />
                        수정
                      </button>
                      <button 
                        onClick={() => handleBaseDelete(b.id)} 
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        <FaTrash className="w-4 h-4" />
                        삭제
                      </button>
                    </div>
                  </div>
                  {showBaseContent === b.id && (
                    <div className="text-white/70 text-sm whitespace-pre-line bg-white/5 rounded-lg p-4 mb-4">{b.content}</div>
                  )}
                  <div className="text-white/50 text-xs mt-2">
                    생성일: {new Date(b.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 프롬프트+기반내용 합치기 */}
          <section className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <FaCopy className="text-cyan-400" />
              ChatGPT 프롬프트 생성
            </h2>
            
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 flex flex-col gap-4">
              <div className="text-white/80 font-medium">ChatGPT에 물어볼 프롬프트와 기반 내용을 선택하세요.</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-white/80">프롬프트 선택</label>
                  <select 
                    value={selectedPromptId || ''} 
                    onChange={e => setSelectedPromptId(e.target.value ? Number(e.target.value) : null)} 
                    className="p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="" className="bg-gray-800">프롬프트 선택</option>
                    {prompts.map(p => <option key={p.id} value={p.id} className="bg-gray-800">{p.title}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-white/80">기반 내용 선택 (선택사항)</label>
                  <select 
                    value={selectedBaseId || ''} 
                    onChange={e => setSelectedBaseId(e.target.value ? Number(e.target.value) : null)} 
                    className="p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="" className="bg-gray-800">기반 내용 선택(선택사항)</option>
                    {baseContents.map(b => <option key={b.id} value={b.id} className="bg-gray-800">{b.title}</option>)}
                  </select>
                </div>
              </div>
              
              <button 
                onClick={handleCopyAndGo} 
                disabled={!selectedPromptId} 
                className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-500 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <FaCopy className="w-4 h-4" />
                ChatGPT에 물어보기
              </button>
              
              {copied && <div className="text-green-400 text-center bg-green-500/10 border border-green-500/30 rounded-lg p-3">프롬프트+기반내용이 복사되었습니다!</div>}
              
              <div 
                ref={combinedRef} 
                tabIndex={0} 
                className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 whitespace-pre-line outline-none min-h-[100px]" 
                style={{userSelect:'text'}}
              >
                {getCombinedText() || '선택된 프롬프트와 기반 내용이 여기에 미리보기로 표시됩니다.'}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
} 