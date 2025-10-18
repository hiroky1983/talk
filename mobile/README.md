# Talk Mobile

This directory contains the React Native mobile client built with Expo.

## Getting started

1. Install dependencies:

   ```bash
   cd mobile
   npm install
   ```

2. Start the Expo development server:

   ```bash
   npm run start
   ```

3. Follow the Expo CLI prompts to open the project in the desired simulator or device.

   You can also target specific platforms directly from the command line:

   ```bash
   npm run android
   npm run ios
   npm run web
   ```

   The Expo server will hot reload changes as you edit files in this directory.

## Testing

Run the Jest test suite (configured with `jest-expo`):

```bash
npm test
```

## TypeScript

The project extends Expo's base TypeScript configuration and enables strict type-checking. Update `tsconfig.json` if you need to adjust compiler options.
