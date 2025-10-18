module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo|expo-.*|@expo-.*|@unimodules|unimodules-.*|sentry-expo|native-base)'
  ],
};
