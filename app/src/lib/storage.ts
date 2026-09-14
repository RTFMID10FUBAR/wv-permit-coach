import type {
  ConceptMastery,
  LessonCompletion,
  MockResult,
  Settings,
  SignStat,
} from './types';
import { DEFAULT_SETTINGS } from './types';

const DB_NAME = 'wv-permit-coach';
const DB_VERSION = 1;
const STORES = ['mastery', 'mocks', 'lessons', 'signs', 'kv'] as const;
type StoreName = (typeof STORES)[number];

const KEY_PATHS: Record<StoreName, string> = {
  mastery: 'conceptId',
  mocks: 'id',
  lessons: 'lessonId',
  signs: 'key',
  kv: 'key',
};

export interface Backend {
  kind: 'indexeddb' | 'localstorage' | 'memory';
  getAll<T>(store: StoreName): Promise<T[]>;
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  put<T>(store: StoreName, value: T): Promise<void>;
  putMany<T>(store: StoreName, values: T[]): Promise<void>;
  clear(store: StoreName): Promise<void>;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: KEY_PATHS[store] });
        }
      }
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error('IndexedDB open failed'));
    open.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

function idbBackend(db: IDBDatabase): Backend {
  const tx = (store: StoreName, mode: IDBTransactionMode) =>
    db.transaction(store, mode).objectStore(store);
  return {
    kind: 'indexeddb',
    getAll: <T,>(store: StoreName) => request<T[]>(tx(store, 'readonly').getAll() as IDBRequest<T[]>),
    get: <T,>(store: StoreName, key: string) =>
      request<T | undefined>(tx(store, 'readonly').get(key) as IDBRequest<T | undefined>),
    put: async <T,>(store: StoreName, value: T) => {
      await request(tx(store, 'readwrite').put(value as unknown as object));
    },
    putMany: async <T,>(store: StoreName, values: T[]) => {
      if (values.length === 0) return;
      const transaction = db.transaction(store, 'readwrite');
      const objectStore = transaction.objectStore(store);
      for (const value of values) objectStore.put(value as unknown as object);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('write failed'));
        transaction.onabort = () => reject(transaction.error ?? new Error('write aborted'));
      });
    },
    clear: async (store: StoreName) => {
      await request(tx(store, 'readwrite').clear());
    },
  };
}

function webStorageBackend(storage: Storage): Backend {
  const keyFor = (store: StoreName) => `${DB_NAME}:${store}`;
  const read = <T,>(store: StoreName): Record<string, T> => {
    try {
      const raw = storage.getItem(keyFor(store));
      return raw ? (JSON.parse(raw) as Record<string, T>) : {};
    } catch {
      return {};
    }
  };
  const write = <T,>(store: StoreName, data: Record<string, T>) => {
    try {
      storage.setItem(keyFor(store), JSON.stringify(data));
    } catch {
      /* quota or private mode — progress simply does not persist */
    }
  };
  return {
    kind: 'localstorage',
    getAll: async <T,>(store: StoreName) => Object.values(read<T>(store)),
    get: async <T,>(store: StoreName, key: string) => read<T>(store)[key],
    put: async <T,>(store: StoreName, value: T) => {
      const data = read<T>(store);
      const key = (value as Record<string, unknown>)[KEY_PATHS[store]] as string;
      data[key] = value;
      write(store, data);
    },
    putMany: async <T,>(store: StoreName, values: T[]) => {
      const data = read<T>(store);
      for (const value of values) {
        data[(value as Record<string, unknown>)[KEY_PATHS[store]] as string] = value;
      }
      write(store, data);
    },
    clear: async (store: StoreName) => write(store, {}),
  };
}

function memoryBackend(): Backend {
  const data = new Map<StoreName, Map<string, unknown>>();
  const bucket = (store: StoreName) => {
    const existing = data.get(store);
    if (existing) return existing;
    const created = new Map<string, unknown>();
    data.set(store, created);
    return created;
  };
  return {
    kind: 'memory',
    getAll: async <T,>(store: StoreName) => [...bucket(store).values()] as T[],
    get: async <T,>(store: StoreName, key: string) => bucket(store).get(key) as T | undefined,
    put: async <T,>(store: StoreName, value: T) => {
      bucket(store).set((value as Record<string, unknown>)[KEY_PATHS[store]] as string, value);
    },
    putMany: async <T,>(store: StoreName, values: T[]) => {
      for (const value of values) {
        bucket(store).set((value as Record<string, unknown>)[KEY_PATHS[store]] as string, value);
      }
    },
    clear: async (store: StoreName) => {
      bucket(store).clear();
    },
  };
}

export async function createBackend(): Promise<Backend> {
  if (typeof indexedDB !== 'undefined') {
    try {
      return idbBackend(await openDatabase());
    } catch {
      /* fall through to web storage */
    }
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${DB_NAME}:probe`, '1');
      localStorage.removeItem(`${DB_NAME}:probe`);
      return webStorageBackend(localStorage);
    }
  } catch {
    /* fall through to memory */
  }
  return memoryBackend();
}

interface KvRow<T> {
  key: string;
  value: T;
}

export interface ProgressStore {
  kind: Backend['kind'];
  getMastery(): Promise<Record<string, ConceptMastery>>;
  putMastery(record: ConceptMastery): Promise<void>;
  putManyMastery(records: ConceptMastery[]): Promise<void>;
  getMocks(): Promise<MockResult[]>;
  addMock(result: MockResult): Promise<void>;
  getLessons(): Promise<LessonCompletion[]>;
  putLesson(completion: LessonCompletion): Promise<void>;
  getSignStats(): Promise<SignStat[]>;
  putSignStat(stat: SignStat): Promise<void>;
  getSettings(): Promise<Settings>;
  setSettings(settings: Settings): Promise<void>;
  /** Questions this learner has ever answered — powers first-attempt accuracy. */
  getSeenQuestions(): Promise<string[]>;
  setSeenQuestions(ids: string[]): Promise<void>;
  clearProgress(): Promise<void>;
}

export function wrapBackend(backend: Backend): ProgressStore {
  return {
    kind: backend.kind,
    async getMastery() {
      const rows = await backend.getAll<ConceptMastery>('mastery');
      return Object.fromEntries(rows.map((r) => [r.conceptId, r]));
    },
    putMastery: (record) => backend.put('mastery', record),
    putManyMastery: (records) => backend.putMany('mastery', records),
    getMocks: () =>
      backend
        .getAll<MockResult>('mocks')
        .then((rows) => rows.sort((a, b) => a.finishedAt - b.finishedAt)),
    addMock: (result) => backend.put('mocks', result),
    getLessons: () => backend.getAll<LessonCompletion>('lessons'),
    putLesson: (completion) => backend.put('lessons', completion),
    getSignStats: () => backend.getAll<SignStat>('signs'),
    putSignStat: (stat) => backend.put('signs', stat),
    async getSettings() {
      const row = await backend.get<KvRow<Settings>>('kv', 'settings');
      return { ...DEFAULT_SETTINGS, ...(row?.value ?? {}) };
    },
    setSettings: (settings) => backend.put<KvRow<Settings>>('kv', { key: 'settings', value: settings }),
    async getSeenQuestions() {
      const row = await backend.get<KvRow<string[]>>('kv', 'seenQuestions');
      return Array.isArray(row?.value) ? row.value : [];
    },
    setSeenQuestions: (ids) =>
      backend.put<KvRow<string[]>>('kv', { key: 'seenQuestions', value: ids }),
    async clearProgress() {
      await backend.clear('mastery');
      await backend.clear('mocks');
      await backend.clear('lessons');
      await backend.clear('signs');
      await backend.put<KvRow<string[]>>('kv', { key: 'seenQuestions', value: [] });
    },
  };
}

export async function openProgressStore(): Promise<ProgressStore> {
  return wrapBackend(await createBackend());
}
