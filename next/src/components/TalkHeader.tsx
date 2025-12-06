'use client'

import { Language } from '@/types/types'
import { useTranslations } from 'next-intl'
import React from 'react'
import { ThemeToggle } from './ThemeToggle'

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

interface TalkHeaderProps {
  user: User | null
  selectedLanguage: Language
  selectedCharacter: string
  isConnected: boolean
  languageNames: Record<string, string>
  characters: Character[]
  onLanguageChange: (language: Language) => void
  onCharacterChange: (character: string) => void
  onStartConversation: () => void
  onLogout: () => void
}

export const TalkHeader = ({
  user,
  selectedLanguage,
  selectedCharacter,
  isConnected,
  languageNames,
  characters,
  onLanguageChange,
  onCharacterChange,
  onStartConversation,
  onLogout,
}: TalkHeaderProps) => {
  const t = useTranslations('common')

  return (
    <div className="bg-white/30 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {t('appName')}
            </h1>
            <p className="text-sm text-gray-600 font-medium">
              {user
                ? t('welcome', { username: user.username })
                : t('welcomeDefault')}
            </p>
          </div>

          {user ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Language Selector */}
              <div className="relative group">
                <select
                  value={selectedLanguage}
                  onChange={(e) => onLanguageChange(e.target.value as Language)}
                  title={t('selectLanguage')}
                  className="appearance-none pl-3 pr-8 py-2 bg-white/50 border border-white/30 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-sm transition-all"
                >
                  {Object.entries(languageNames).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>

              {/* Character Selector */}
              <div className="relative group">
                <select
                  value={selectedCharacter}
                  onChange={(e) => onCharacterChange(e.target.value)}
                  title={t('selectCharacter')}
                  className="appearance-none pl-3 pr-8 py-2 bg-white/50 border border-white/30 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer shadow-sm transition-all"
                >
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.emoji} {character.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>

              {/* Status Indicator */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium shadow-sm transition-all ${
                  isConnected
                    ? 'bg-green-100/80 text-green-700 border border-green-200'
                    : 'bg-red-100/80 text-red-700 border border-red-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
                ></span>
                {isConnected ? t('online') : t('offline')}
              </div>

              {/* Action Buttons */}
              {!isConnected && (
                <button
                  type="button"
                  onClick={onStartConversation}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                >
                  {t('connect')}
                </button>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="bg-white/50 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-white/30 hover:border-red-200 px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all"
              >
                {t('logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-10 bg-white/40 rounded-xl animate-pulse w-32"></div>
              <div className="h-10 bg-white/40 rounded-xl animate-pulse w-24"></div>
              <div className="h-10 bg-white/40 rounded-xl animate-pulse w-20"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
