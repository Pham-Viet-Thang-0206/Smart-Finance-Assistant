import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDevHost = () => {
  const expoConfig = Constants.expoConfig as (typeof Constants.expoConfig & {
    debuggerHost?: string;
  }) | null;
  const manifest = (Constants as typeof Constants & {
    manifest?: { debuggerHost?: string };
  }).manifest;
  const debuggerHost =
    expoConfig?.hostUri ??
    expoConfig?.debuggerHost ??
    manifest?.debuggerHost ??
    '';

  const host = debuggerHost.split(':')[0];
  if (!host) return null;
  return `http://${host}:4000`;
};

export const API_BASE_URL = (() => {
  const envUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL;
  const envWebUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL_WEB ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL_WEB;
  if (Platform.OS === 'web') {
    return envWebUrl || 'http://localhost:4000';
  }
  if (envUrl) {
    return envUrl;
  }
  return getDevHost() || 'http://127.0.0.1:4000';
})();

// Patch global fetch to bypass ngrok warning
const originalFetch = global.fetch;
global.fetch = async (url: string | URL | Request, config?: RequestInit) => {
  const newConfig = { ...config };
  newConfig.headers = {
    ...newConfig.headers,
    'ngrok-skip-browser-warning': 'true',
  };
  return originalFetch(url, newConfig);
};
