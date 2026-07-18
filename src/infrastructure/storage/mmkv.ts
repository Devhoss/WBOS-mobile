import { MMKV } from "react-native-mmkv";

export const storage = new MMKV({
  id: "wbos-mobile-storage",
});

export function getString(key: string): string | undefined {
  return storage.getString(key);
}

export function setString(key: string, value: string): void {
  storage.set(key, value);
}

export function getBoolean(key: string): boolean | undefined {
  return storage.getBoolean(key);
}

export function setBoolean(key: string, value: boolean): void {
  storage.set(key, value);
}

export function getNumber(key: string): number | undefined {
  return storage.getNumber(key);
}

export function setNumber(key: string, value: number): void {
  storage.set(key, value);
}

export function getObject<T>(key: string): T | undefined {
  const json = storage.getString(key);
  if (!json) return undefined;
  try {
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
}

export function setObject<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

export function deleteKey(key: string): void {
  storage.delete(key);
}

export function clearAll(): void {
  storage.clearAll();
}
