import AsyncStorage from '@react-native-async-storage/async-storage';

export const save = async (key: string, value: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('storage save error', e);
    return false;
  }
};

export const load = async (key: string, fallback: any = null) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('storage load error', e);
    return fallback;
  }
};

export const remove = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
