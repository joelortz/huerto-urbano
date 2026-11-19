import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const STORAGE_KEY = 'huerto-db';
let db: Database;

export async function initDB(): Promise<Database> {
    const SQL = await initSqlJs({
        locateFile: () => wasmUrl,
    });

    const guardado = localStorage.getItem(STORAGE_KEY);
    db = guardado ? new SQL.Database(base64ToBytes(guardado)) : new SQL.Database();

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

export function guardarDB(): void {
    localStorage.setItem(STORAGE_KEY, bytesToBase64(db.export()));
}

function bytesToBase64(bytes: Uint8Array): string {
    let binario = '';
    bytes.forEach((b) => (binario += String.fromCharCode(b)));
    return btoa(binario);
}

function base64ToBytes(base64: string): Uint8Array {
    const binario = atob(base64);
    return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}   