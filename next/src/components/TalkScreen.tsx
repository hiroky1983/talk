'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { TalkHeader } from './TalkHeader'
import { Language } from '@/types/types'
import { useWebSocketChat } from '@/lib/audio/useWebSocketChat'

interface User {
  username: string
  language: Language
}

interface Character {
  id: string
  name: string
  description: string
  emoji: string
}

interface ConversationMessage {
  id: string
  sender: 'user' | 'ai'
  content: string
  timestamp: Date
  audioUrl?: string
}

const languageNames = {
  vi: 'Vietnamese (Tiếng Việt)',
  ja: 'Japanese (日本語)',
  en: 'English',
} as const

export const TalkScreen = () => {
  const t = useTranslations('common')
  const locale = useLocale()
  const normalizedLocale = (
    Object.values(Language) as readonly string[]
  ).includes(locale)
    ? (locale as Language)
    : Language.EN

  const characters: Character[] = [
    {
      id: 'friend',
      name: t('characters.friend.name'),
      description: t('characters.friend.description'),
      emoji: '👨',
    },
    {
      id: 'parent',
      name: t('characters.parent.name'),
      description: t('characters.parent.description'),
      emoji: '👩',
    },
    {
      id: 'sister',
      name: t('characters.sister.name'),
      description: t('characters.sister.description'),
      emoji: '👧',
    },
  ]

  const [user, setUser] = useState<User | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<string>('friend')
  const [selectedLanguage, setSelectedLanguage] =
    useState<Language>(normalizedLocale)
  const [conversation, setConversation] = useState<ConversationMessage[]>([])

  const router = useRouter()
  const conversationEndRef = useRef<HTMLDivElement>(null)

  // Use WebSocket Chat hook
  const {
    isConnected,
    isStreaming,
    error,
    connect,
    disconnect,
    startStreaming,
    stopStreaming,
  } = useWebSocketChat({
    username: user?.username || '',
    language: selectedLanguage,
    character: selectedCharacter,
  })

  // Auto-connect when user is present
  useEffect(() => {
    if (user) {
      connect()
    }
    return () => {
      disconnect()
    }
  }, [user, connect, disconnect])

  const scrollToBottom = () => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation])

  useEffect(() => {
    const parsedUser = {
      username: 'user',
      language: selectedLanguage,
    }
    setUser(parsedUser)
    if (parsedUser.language) {
      setSelectedLanguage(parsedUser.language)
    }
  }, [router, locale])

  const handleCharacterChange = async (newCharacter: string) => {
    if (newCharacter === selectedCharacter) return
    if (isStreaming) {
      stopStreaming()
    }
    setSelectedCharacter(newCharacter)
    setConversation([])
  }

  const handleLanguageChange = async (newLanguage: Language) => {
    if (newLanguage === selectedLanguage) return
    if (isStreaming) {
      stopStreaming()
    }
    setSelectedLanguage(newLanguage)
    setConversation([])
    setUser((previousUser) => {
      if (!previousUser) return previousUser
      const updatedUser = { ...previousUser, language: newLanguage }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      return updatedUser
    })
    router.push(`/${newLanguage}/talk`)
  }

  const handleToggleStreaming = async () => {
    if (isStreaming) {
      stopStreaming()
    } else {
      await startStreaming()
    }
  }

  const logout = async () => {
    localStorage.removeItem('user')
    if (isStreaming) {
      stopStreaming()
    }
    router.push(`/${locale}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-indigo-950 dark:via-gray-900 dark:to-pink-950 flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 dark:bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-400 dark:bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-400 dark:bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      <TalkHeader
        user={user}
        selectedLanguage={selectedLanguage}
        selectedCharacter={selectedCharacter}
        isConnected={isConnected}
        languageNames={languageNames}
        characters={characters}
        onLanguageChange={handleLanguageChange}
        onCharacterChange={handleCharacterChange}
        onStartConversation={handleToggleStreaming}
        onLogout={logout}
      />

      {error && (
        <div className="max-w-4xl mx-auto w-full px-4 py-2 z-20">
          <div className="bg-red-50/90 dark:bg-red-900/40 backdrop-blur-sm border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-xl shadow-lg flex items-center animate-fadeIn">
            <svg
              className="w-5 h-5 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            {error}
          </div>
        </div>
      )}

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col h-[calc(100vh-80px)]">
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 rounded-3xl shadow-2xl flex-1 flex flex-col overflow-hidden relative">
          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
            {!user ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mb-4"></div>
                <p>{t('loadingProfile')}</p>
              </div>
            ) : conversation.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 opacity-70">
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-6">
                  <span className="text-4xl">🎙️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                  {t('startConversation')}
                </h3>
                <p>{t('startPrompt')}</p>
              </div>
            ) : (
              conversation.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  } animate-slideUp`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-5 shadow-sm relative group transition-all duration-200 hover:shadow-md ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {message.sender === 'ai' && (
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0 text-lg shadow-inner">
                          {characters.find((c) => c.id === selectedCharacter)
                            ?.emoji || '🤖'}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="text-base whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div
                            className={`text-xs ${
                              message.sender === 'user'
                                ? 'text-blue-100/80'
                                : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {message.audioUrl && message.sender === 'user' && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <audio
                          controls
                          className="w-full h-8 opacity-90 hover:opacity-100 transition-opacity"
                          style={{ filter: 'invert(1) hue-rotate(180deg)' }}
                        >
                          <source src={message.audioUrl} type="audio/wav" />
                        </audio>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={conversationEndRef} />
          </div>

          {/* Footer / Controls */}
          <div className="p-6 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border-t border-white/30 dark:border-gray-700/30">
            {user ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleStreaming}
                  disabled={!user}
                  aria-label={
                    isStreaming ? 'Stop conversation' : 'Start conversation'
                  }
                  className={`relative group p-6 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                    isStreaming
                      ? 'bg-gradient-to-r from-red-500 to-pink-600 ring-4 ring-red-200 animate-pulse'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                  }`}
                >
                  <div
                    className={`absolute inset-0 rounded-full opacity-30 ${isStreaming ? 'animate-ping bg-red-400' : ''}`}
                  ></div>
                  <svg
                    className="w-8 h-8 text-white relative z-10"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    {isStreaming ? (
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a2 2 0 114 0v4a2 2 0 11-4 0V7z"
                        clipRule="evenodd"
                      />
                    ) : (
                      <path
                        fillRule="evenodd"
                        d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                        clipRule="evenodd"
                      />
                    )}
                  </svg>
                </button>

                <div className="text-center">
                  <div
                    className={`font-bold text-lg ${isStreaming ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {isStreaming ? t('liveConversation') : t('tapToStart')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase">
                    {isStreaming ? t('clickToStop') : t('realTimeChat')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4 opacity-60">
                <div className="p-4 rounded-full bg-gray-200 dark:bg-gray-700">
                  <svg
                    className="w-6 h-6 text-gray-400 dark:text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-400 dark:text-gray-500">
                    {t('pleaseWait')}
                  </div>
                  <div className="text-sm text-gray-400 dark:text-gray-500">
                    {t('loadingAudio')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
