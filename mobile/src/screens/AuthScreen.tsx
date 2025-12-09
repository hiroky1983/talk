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
  Image,
  Dimensions,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

type AuthMode = 'signin' | 'signup'

const { width } = Dimensions.get('window')

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

  // Web's gradient colors
  const gradientColors = isDark
    ? ['#312e81', '#111827', '#4c0519'] // indigo-950, gray-900, pink-950
    : ['#e0e7ff', '#faf5ff', '#fce7f3'] // indigo-100, purple-50, pink-100

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, isDark && styles.cardDark]}>
            <View style={styles.header}>
              <View style={styles.imageContainer}>
                <Image
                  source={require('../../assets/language_learning_hero.jpg')}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              </View>
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
                <View
                  style={[
                    styles.errorContainer,
                    isDark && styles.errorContainerDark,
                  ]}
                >
                  <Text
                    style={[styles.errorText, isDark && styles.errorTextDark]}
                  >
                    ⚠️ {error}
                  </Text>
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
                <View
                  style={[styles.dividerLine, isDark && styles.dividerLineDark]}
                />
                <Text
                  style={[styles.dividerText, isDark && styles.dividerTextDark]}
                >
                  Or continue with
                </Text>
                <View
                  style={[styles.dividerLine, isDark && styles.dividerLineDark]}
                />
              </View>

              <View style={styles.socialButtons}>
                <TouchableOpacity
                  style={[
                    styles.socialButton,
                    isDark && styles.socialButtonDark,
                  ]}
                  disabled={isLoading}
                >
                  <FontAwesome
                    name="google"
                    size={20}
                    color={isDark ? '#fff' : '#4285F4'}
                  />
                  <Text
                    style={[
                      styles.socialButtonText,
                      isDark && styles.socialButtonTextDark,
                    ]}
                  >
                    Google
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialButton, styles.socialButtonApple]}
                  disabled={isLoading}
                >
                  <FontAwesome name="apple" size={20} color="#fff" />
                  <Text style={styles.socialButtonTextWhite}>Apple</Text>
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

            <View style={[styles.features, isDark && styles.featuresDark]}>
              <Text
                style={[
                  styles.featuresTitle,
                  isDark && styles.featuresTitleDark,
                ]}
              >
                {t('auth:featuresTitle')}
              </Text>
              <View style={styles.featuresGrid}>
                <View style={styles.featureItem}>
                  <View
                    style={[styles.featureDot, { backgroundColor: '#10B981' }]}
                  />
                  <Text
                    style={[
                      styles.featureText,
                      isDark && styles.featureTextDark,
                    ]}
                  >
                    {t('auth:featureVoice')}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <View
                    style={[styles.featureDot, { backgroundColor: '#3B82F6' }]}
                  />
                  <Text
                    style={[
                      styles.featureText,
                      isDark && styles.featureTextDark,
                    ]}
                  >
                    {t('auth:featureRealtime')}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <View
                    style={[styles.featureDot, { backgroundColor: '#A855F7' }]}
                  />
                  <Text
                    style={[
                      styles.featureText,
                      isDark && styles.featureTextDark,
                    ]}
                  >
                    {t('auth:featureMultilang')}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <View
                    style={[styles.featureDot, { backgroundColor: '#EC4899' }]}
                  />
                  <Text
                    style={[
                      styles.featureText,
                      isDark && styles.featureTextDark,
                    ]}
                  >
                    {t('auth:featureFeedback')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cardDark: {
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imageContainer: {
    width: 120,
    height: 120,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: 'transparent', // Gradient text hack not supported easily in RN, use solid color
    // but here we can't do gradient text easily.
    marginBottom: 8,
    color: '#3B82F6', // Fallback
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
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  inputDark: {
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderColor: '#374151',
    color: '#F9FAFB',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorContainerDark: {
    backgroundColor: 'rgba(127, 29, 29, 0.4)',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  errorTextDark: {
    color: '#FCA5A5',
  },
  button: {
    backgroundColor: '#3B82F6', // Indigo-like gradient replacement
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerLineDark: {
    backgroundColor: '#374151',
  },
  dividerText: {
    paddingHorizontal: 12,
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
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  socialButtonDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  socialButtonApple: {
    backgroundColor: '#000',
    borderWidth: 0,
  },
  socialButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  socialButtonTextDark: {
    color: '#D1D5DB',
  },
  socialButtonTextWhite: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  toggleMode: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  toggleModeText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  features: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  featuresDark: {
    borderTopColor: '#374151',
  },
  featuresTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 16,
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
    width: '47%', // Slightly less than 50% to account for gap
    marginBottom: 8,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  featureTextDark: {
    color: '#9CA3AF',
  },
})
