import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDevHost = () => {
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    Constants.expoConfig?.debuggerHost ??
    Constants.manifest?.debuggerHost ??
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
  return 'http://10.170.15.47:4000';
})();
