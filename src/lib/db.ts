import fs from 'fs'
import path from 'path'

type SQLiteStatement = {
  run: (...args: unknown[]) => { changes?: number; lastInsertRowid?: number | bigint }
  get: (...args: unknown[]) => Record<string, unknown> | undefined
  all: (...args: unknown[]) => Array<Record<string, unknown>>
}

type SQLiteDatabase = {
  exec: (sql: string) => void
  prepare: (sql: string) => SQLiteStatement
}

type SQLiteModule = {
  DatabaseSync: new (filename: string) => SQLiteDatabase
}

type ProcessWithBuiltinModule = NodeJS.Process & {
  getBuiltinModule?: (id: string) => unknown
}

let dbSingleton: SQLiteDatabase | null = null
let sqliteModule: SQLiteModule | null = null
let resolvedDbPath: string | null = null

function getSqliteModule() {
  if (sqliteModule) return sqliteModule
  try {
    const getBuiltinModule = (process as ProcessWithBuiltinModule).getBuiltinModule
    if (typeof getBuiltinModule !== 'function') {
      throw new Error('process.getBuiltinModule is unavailable')
    }
    const loaded = getBuiltinModule('node:sqlite') as SQLiteModule | undefined
    if (!loaded || typeof loaded.DatabaseSync !== 'function') {
      throw new Error('node:sqlite DatabaseSync API is unavailable')
    }
    sqliteModule = loaded
    return loaded
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error)
    throw new Error(
      `SQLite runtime is unavailable on ${process.version}. ${details}. Use Node.js 22.13+ or enable --experimental-sqlite on older 22.x.`
    )
  }
}

function migrate(db: SQLiteDatabase) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      discord_username TEXT UNIQUE,
      twitter_username TEXT UNIQUE,
      wallet_address TEXT UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_identities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_uid TEXT NOT NULL,
      identifier TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(provider, provider_uid)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_uid TEXT NOT NULL,
      identifier TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_codes (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interaction_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      value INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auth_identities_user_id
      ON auth_identities(user_id);
    CREATE INDEX IF NOT EXISTS idx_interactions_user_type_time
      ON interaction_events(user_id, type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_expires
      ON sessions(user_id, expires_at);
  `)
}

function normalizePath(p: string) {
  const trimmed = p.trim()
  if (!trimmed) return ''
  return path.isAbsolute(trimmed) ? trimmed : path.join(process.cwd(), trimmed)
}

function canWriteDir(dirPath: string) {
  try {
    fs.mkdirSync(dirPath, { recursive: true })
    fs.accessSync(dirPath, fs.constants.W_OK)
    const probePath = path.join(dirPath, '.siggy-write-test')
    fs.writeFileSync(probePath, 'ok', 'utf8')
    fs.unlinkSync(probePath)
    return true
  } catch {
    return false
  }
}

function resolveDbPath() {
  if (resolvedDbPath) return resolvedDbPath

  const explicitPath = process.env.PROFILE_DB_PATH?.trim()
  if (explicitPath) {
    const fullPath = normalizePath(explicitPath)
    const explicitDir = path.dirname(fullPath)
    if (canWriteDir(explicitDir)) {
      resolvedDbPath = fullPath
      return resolvedDbPath
    }
    throw new Error(`PROFILE_DB_PATH directory is not writable: ${explicitDir}`)
  }

  const cwdData = path.join(process.cwd(), 'data')
  const tmpData = '/tmp/siggy-data'
  const configuredDir = process.env.PROFILE_DB_DIR?.trim() || ''

  const candidateDirs = [
    configuredDir ? normalizePath(configuredDir) : '',
    cwdData,
    tmpData,
  ].filter(Boolean)

  for (const dirPath of candidateDirs) {
    if (!canWriteDir(dirPath)) continue
    resolvedDbPath = path.join(dirPath, 'profile.sqlite')
    if (dirPath !== cwdData) {
      console.warn(`[profile-db] Using writable fallback path: ${resolvedDbPath}`)
    }
    return resolvedDbPath
  }

  resolvedDbPath = ':memory:'
  console.warn('[profile-db] No writable filesystem path found, using in-memory sqlite database.')
  return resolvedDbPath
}

export function getDb() {
  if (dbSingleton) return dbSingleton

  const sqlite = getSqliteModule()
  const dbPath = resolveDbPath()
  const db = new sqlite.DatabaseSync(dbPath)
  migrate(db)
  dbSingleton = db
  return db
}
