import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

type AuthMode = 'signin' | 'signup'

export const AuthScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { login, register } = useAuth()

  const [mode, setMode] = useState<AuthMode>('signin')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const isDark = theme === 'dark'

  const handleAuth = async () => {
    // Validation
    if (mode === 'signup' && !username.trim()) {
      setError(t('auth:usernameRequired'))
      return
    }
    if (!email.trim()) {
      setError(t('auth:emailRequired'))
      return
    }
    if (!password.trim()) {
      setError(t('auth:passwordRequired'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (mode === 'signin') {
        await login(email, password)
      } else {
        await register(email, password, username)
      }
      // Navigation will be handled by App.tsx based on auth state
    } catch (err: any) {
      setError(err.message || t('auth:errorGeneric'))
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError(null)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={styles.header}>
            <Text style={styles.heroEmoji}>🗣️</Text>
            <Text style={styles.title}>
              {mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </Text>
            <Text style={[styles.tagline, isDark && styles.taglineDark]}>
              {t('common:tagline')}
            </Text>
          </View>

          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  Username <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text)
                    if (error) setError(null)
                  }}
                  placeholder="Enter your username"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>
                {mode === 'signin' ? 'Username or Email' : 'Email'}{' '}
                <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text)
                  if (error) setError(null)
                }}
                placeholder={
                  mode === 'signin'
                    ? 'Enter username or email'
                    : 'Enter your email'
                }
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>
                Password <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={password}
                onChangeText={(text) => {
                  setPassword(text)
                  if (error) setError(null)
                }}
                placeholder="Enter your password"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Start Learning</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={[styles.dividerText, isDark && styles.dividerTextDark]}>
                Or continue with
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[styles.socialButton, isDark && styles.socialButtonDark]}
                disabled={isLoading}
              >
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.socialButtonApple]}
                disabled={isLoading}
              >
                <Text style={styles.socialButtonTextWhite}>Apple</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.socialButtonFacebook]}
                disabled={isLoading}
              >
                <Text style={styles.socialButtonTextWhite}>Facebook</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={toggleMode} style={styles.toggleMode}>
              <Text style={styles.toggleModeText}>
                {mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.features}>
            <Text style={[styles.featuresTitle, isDark && styles.featuresTitleDark]}>
              {t('auth:featuresTitle')}
            </Text>
            <View style={styles.featuresGrid}>
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                  {t('auth:featureVoice')}
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                  {t('auth:featureRealtime')}
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: '#A855F7' }]} />
                <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                  {t('auth:featureMultilang')}
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: '#EC4899' }]} />
                <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                  {t('auth:featureFeedback')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE9FE',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardDark: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  taglineDark: {
    color: '#D1D5DB',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  labelDark: {
    color: '#D1D5DB',
  },
  required: {
    color: '#F87171',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  inputDark: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderColor: '#374151',
    color: '#F9FAFB',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 8,
    color: '#6B7280',
    fontSize: 12,
  },
  dividerTextDark: {
    color: '#9CA3AF',
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  socialButtonDark: {
    backgroundColor: '#1F2937',
    borderColor: '#4B5563',
  },
  socialButtonApple: {
    backgroundColor: '#000',
  },
  socialButtonFacebook: {
    backgroundColor: '#1877F2',
  },
  socialButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  socialButtonTextWhite: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleMode: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  toggleModeText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  features: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  featuresTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  featuresTitleDark: {
    color: '#6B7280',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: 8,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
  },
  featureTextDark: {
    color: '#9CA3AF',
  },
})
