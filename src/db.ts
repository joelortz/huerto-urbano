import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let db: Database;

export async function initDB(): Promise<Database> {
    const SQL = await initSqlJs({
    locateFile: () => wasmUrl,
});

db = new SQL.Database();

db.run(`
    CREATE TABLE IF NOT EXISTS plantas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        especie TEXT,
        fecha_siembra TEXT
    );
    CREATE TABLE IF NOT EXISTS eventos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        planta_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        fecha TEXT,
        nota TEXT,
        FOREIGN KEY (planta_id) REFERENCES plantas(id)
    );
`);

    return db;
}