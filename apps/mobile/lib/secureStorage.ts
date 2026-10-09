import * as SecureStore from "expo-secure-store";

/**
 * A Supabase-compatible storage adapter backed by expo-secure-store.
 *
 * SecureStore caps individual values at roughly 2048 bytes (Android's
 * Keystore-backed implementation enforces this; iOS's Keychain is more
 * generous but there's no reason to rely on that difference). A persisted
 * Supabase session — access token + refresh token + user metadata — can
 * exceed that easily, so values over the threshold are split across
 * several SecureStore entries and reassembled on read, rather than
 * silently failing to persist.
 */

const CHUNK_SIZE = 1800; // safe margin under SecureStore's ~2048-byte limit
const CHUNK_MARKER_PATTERN = /^__chunked__:(\d+)$/;

function chunkKey(key: string, index: number): string {
  return `${key}__chunk_${index}`;
}

async function setChunked(key: string, value: string): Promise<void> {
  const chunkCount = Math.ceil(value.length / CHUNK_SIZE);

  for (let i = 0; i < chunkCount; i++) {
    const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await SecureStore.setItemAsync(chunkKey(key, i), chunk);
  }

  await SecureStore.setItemAsync(key, `__chunked__:${chunkCount}`);
}

async function getChunked(key: string, chunkCount: number): Promise<string> {
  const chunks: string[] = [];

  for (let i = 0; i < chunkCount; i++) {
    const chunk = await SecureStore.getItemAsync(chunkKey(key, i));
    chunks.push(chunk ?? "");
  }

  return chunks.join("");
}

async function removeChunks(key: string, chunkCount: number): Promise<void> {
  for (let i = 0; i < chunkCount; i++) {
    await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
}

export const chunkedSecureStorage = {
  async getItem(key: string): Promise<string | null> {
    const stored = await SecureStore.getItemAsync(key);
    if (stored === null) return null;

    const match = CHUNK_MARKER_PATTERN.exec(stored);
    if (!match) return stored;

    return getChunked(key, Number(match[1]));
  },

  async setItem(key: string, value: string): Promise<void> {
    // Clean up any previous chunks before writing — a value that was
    // previously chunked but is now small enough to store directly would
    // otherwise leave orphaned chunk entries behind.
    const existing = await SecureStore.getItemAsync(key);
    const existingMatch = existing === null ? null : CHUNK_MARKER_PATTERN.exec(existing);
    if (existingMatch) {
      await removeChunks(key, Number(existingMatch[1]));
    }

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
    } else {
      await setChunked(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    const stored = await SecureStore.getItemAsync(key);
    const match = stored === null ? null : CHUNK_MARKER_PATTERN.exec(stored);
    if (match) {
      await removeChunks(key, Number(match[1]));
    }

    await SecureStore.deleteItemAsync(key);
  },
};
