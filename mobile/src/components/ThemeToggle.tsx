import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[styles.button, theme === 'dark' && styles.buttonDark]}
    >
      <Text style={styles.icon}>{theme === 'dark' ? '🌙' : '☀️'}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDark: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  icon: {
    fontSize: 20,
  },
})
