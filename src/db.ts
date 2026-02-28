import { openDB, IDBPDatabase } from 'idb';
import { Project } from './types';

const DB_NAME = 'ai-ghost-animator';
const STORE_NAME = 'projects';

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function saveProject(project: Project) {
  const db = await initDB();
  await db.put(STORE_NAME, { ...project, lastModified: Date.now() });
}

export async function getProjects(): Promise<Project[]> {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function deleteProject(id: string) {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
}
