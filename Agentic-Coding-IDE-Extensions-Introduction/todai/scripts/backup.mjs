import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
const source = process.env.TODAI_DB_PATH || resolve('data/todai.sqlite');
if (!existsSync(source)) throw new Error('No database yet. Start todAI and open it before creating a backup.');
const destination = resolve(process.argv[2] || `backups/todai-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
if (existsSync(destination)) throw new Error('Choose a new backup filename; existing files will not be overwritten.');
mkdirSync(dirname(destination), { recursive: true });
const database = new DatabaseSync(source, { readOnly: true });
try { await backup(database, destination); console.log(`Consistent database backup saved to ${destination}`); }
finally { database.close(); }
