// Recorded audio is too large for localStorage, so the blobs live in IndexedDB on this device.
const DB = 'music-share-audio'
const STORE = 'clips'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const saveClip = (id: string, blob: Blob) => run('readwrite', (s) => s.put(blob, id)).then(() => undefined)
export const loadClip = (id: string) => run<Blob | undefined>('readonly', (s) => s.get(id))
export const deleteClip = (id: string) => run('readwrite', (s) => s.delete(id)).then(() => undefined)
