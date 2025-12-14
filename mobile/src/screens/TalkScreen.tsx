import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { TalkHeader } from '../components/TalkHeader'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocketChat } from '../lib/audio/useWebSocketChat'
import { Language } from '../types/types'

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
}

const languageNames = {
  vi: 'Vietnamese (Tiếng Việt)',
  ja: 'Japanese (日本語)',
  en: 'English',
} as const

export const TalkScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { user, logout } = useAuth()

  const characters: Character[] = [
    {
      id: 'friend',
      name: t('common:characters.friend.name'),
      description: t('common:characters.friend.description'),
      emoji: '👨',
    },
    {
      id: 'parent',
      name: t('common:characters.parent.name'),
      description: t('common:characters.parent.description'),
      emoji: '👩',
    },
    {
      id: 'sister',
      name: t('common:characters.sister.name'),
      description: t('common:characters.sister.description'),
      emoji: '👧',
    },
  ]

  const [selectedCharacter, setSelectedCharacter] = useState<string>('friend')
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    Language.EN
  )
  const [conversation, setConversation] = useState<ConversationMessage[]>([])

  const isDark = theme === 'dark'

  // WebSocket chat hook
  const {
    isConnected,
    isStreaming,
    error,
    connect,
    disconnect,
    startStreaming,
    stopStreaming,
  } = useWebSocketChat({
    username: user?.username || 'Guest',
    language: selectedLanguage,
    character: selectedCharacter,
    onMessageReceived: (message) => {
      console.log('Received message:', message)
      // Add message to conversation
      if (typeof message === 'string') {
        setConversation((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'ai',
            content: message,
            timestamp: new Date(),
          },
        ])
      }
    },
  })

  const handleLogout = async () => {
    disconnect()
    await logout()
  }

  const handleToggleStreaming = () => {
    if (isStreaming) {
      stopStreaming()
    } else {
      // Connect if not connected
      if (!isConnected) {
        connect()
      }
      startStreaming()
    }
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <TalkHeader
        user={
          user ? { username: user.username, language: selectedLanguage } : null
        }
        selectedLanguage={selectedLanguage}
        selectedCharacter={selectedCharacter}
        isConnected={isConnected}
        languageNames={languageNames}
        characters={characters}
        onLanguageChange={setSelectedLanguage}
        onCharacterChange={setSelectedCharacter}
        onLogout={handleLogout}
      />

      <View style={styles.content}>
        <View style={[styles.chatCard, isDark && styles.chatCardDark]}>
          <ScrollView
            style={styles.chatArea}
            contentContainerStyle={styles.chatContent}
          >
            {conversation.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyEmoji}>🎙️</Text>
                </View>
                <Text
                  style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}
                >
                  {t('common:startConversation')}
                </Text>
                <Text
                  style={[styles.emptyText, isDark && styles.emptyTextDark]}
                >
                  {t('common:startPrompt')}
                </Text>
              </View>
            ) : (
              conversation.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    message.sender === 'user'
                      ? styles.messageContainerUser
                      : styles.messageContainerAI,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      message.sender === 'user'
                        ? styles.messageBubbleUser
                        : styles.messageBubbleAI,
                      isDark &&
                        message.sender === 'ai' &&
                        styles.messageBubbleAIDark,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        message.sender === 'user'
                          ? styles.messageTextUser
                          : styles.messageTextAI,
                        isDark &&
                          message.sender === 'ai' &&
                          styles.messageTextAIDark,
                      ]}
                    >
                      {message.content}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={[styles.footer, isDark && styles.footerDark]}>
            <TouchableOpacity
              style={[
                styles.micButton,
                isStreaming ? styles.micButtonStreaming : styles.micButtonIdle,
              ]}
              onPress={handleToggleStreaming}
            >
              <Text style={styles.micEmoji}>{isStreaming ? '⏹️' : '🎙️'}</Text>
            </TouchableOpacity>

            <View style={styles.statusInfo}>
              <Text
                style={[
                  styles.statusTitle,
                  isStreaming && styles.statusTitleStreaming,
                  isDark && styles.statusTitleDark,
                ]}
              >
                {isStreaming
                  ? t('common:liveConversation')
                  : t('common:tapToStart')}
              </Text>
              <Text
                style={[
                  styles.statusSubtitle,
                  isDark && styles.statusSubtitleDark,
                ]}
              >
                {isStreaming
                  ? t('common:clickToStop')
                  : t('common:realTimeChat')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE9FE',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  chatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  chatCardDark: {
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 24,
    gap: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    backgroundColor: '#DBEAFE',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptyTitleDark: {
    color: '#D1D5DB',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyTextDark: {
    color: '#9CA3AF',
  },
  messageContainer: {
    marginVertical: 8,
  },
  messageContainerUser: {
    alignItems: 'flex-end',
  },
  messageContainerAI: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: '#3B82F6',
    borderTopRightRadius: 4,
  },
  messageBubbleAI: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopLeftRadius: 4,
  },
  messageBubbleAIDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  messageTextUser: {
    color: '#fff',
  },
  messageTextAI: {
    color: '#1F2937',
  },
  messageTextAIDark: {
    color: '#F9FAFB',
  },
  footer: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    padding: 24,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  footerDark: {
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    borderTopColor: 'rgba(75, 85, 99, 0.3)',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  micButtonIdle: {
    backgroundColor: '#3B82F6',
  },
  micButtonStreaming: {
    backgroundColor: '#EF4444',
  },
  micEmoji: {
    fontSize: 32,
  },
  statusInfo: {
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  statusTitleStreaming: {
    color: '#DC2626',
  },
  statusTitleDark: {
    color: '#D1D5DB',
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusSubtitleDark: {
    color: '#9CA3AF',
  },
})
