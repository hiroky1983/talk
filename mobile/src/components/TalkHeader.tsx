import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from './ThemeToggle'
import { useTheme } from '../contexts/ThemeContext'
import { Language } from '../types/types'

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
  onLogout: () => void
}

export const TalkHeader = ({
  user,
  selectedLanguage,
  isConnected,
  onLogout,
}: TalkHeaderProps) => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{t('common:appName')}</Text>
          <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
            {user
              ? t('common:welcome', { username: user.username })
              : t('common:welcomeDefault')}
          </Text>
        </View>

        {user && (
          <View style={styles.actions}>
            <ThemeToggle />

            <View
              style={[
                styles.statusBadge,
                isConnected
                  ? styles.statusConnected
                  : styles.statusDisconnected,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  isConnected
                    ? styles.statusDotConnected
                    : styles.statusDotDisconnected,
                ]}
              />
              <Text style={styles.statusText}>
                {isConnected ? t('common:online') : t('common:offline')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onLogout}
              style={[styles.logoutButton, isDark && styles.logoutButtonDark]}
            >
              <Text
                style={[styles.logoutText, isDark && styles.logoutTextDark]}
              >
                {t('common:logout')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  containerDark: {
    backgroundColor: 'rgba(17, 24, 39, 0.3)',
    borderBottomColor: 'rgba(75, 85, 99, 0.2)',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3B82F6',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  subtitleDark: {
    color: '#D1D5DB',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  statusConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusDisconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotConnected: {
    backgroundColor: '#10B981',
  },
  statusDotDisconnected: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  logoutButtonDark: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  logoutTextDark: {
    color: '#D1D5DB',
  },
})
