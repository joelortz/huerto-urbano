import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const STORAGE_KEY = 'huerto-db';
const BACKUP_KEY = 'huerto-db-respaldo';
let db: Database;

export async function initDB(): Promise<{ database: Database; datosRecuperados: boolean }> {
    const SQL = await initSqlJs({
        locateFile: () => wasmUrl,
    });

    const guardado = localStorage.getItem(STORAGE_KEY);
    let datosRecuperados = false;

    if (guardado === null) {
        db = new SQL.Database();
        prepararDB(db);
    } else {
        let cargada: Database | null = null;

        try {
            cargada = new SQL.Database(base64ToBytes(guardado));
            prepararDB(cargada);
            db = cargada;
        } catch (error) {
            cargada?.close();
            console.error('No se pudieron leer los datos guardados.', error);

            try {
                let claveRespaldo = BACKUP_KEY;
                if (localStorage.getItem(claveRespaldo) !== null) {
                    const fecha = new Date();
                    const fechaLocal = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
                    const horaLocal = `${String(fecha.getHours()).padStart(2, '0')}${String(fecha.getMinutes()).padStart(2, '0')}${String(fecha.getSeconds()).padStart(2, '0')}`;
                    const marcaTiempo = `${fechaLocal}-${horaLocal}`;
                    claveRespaldo = `${BACKUP_KEY}-${marcaTiempo}`;

                    let sufijo = 1;
                    while (localStorage.getItem(claveRespaldo) !== null) {
                        claveRespaldo = `${BACKUP_KEY}-${marcaTiempo}-${sufijo}`;
                        sufijo += 1;
                    }
                }
                localStorage.setItem(claveRespaldo, guardado);
            } catch (errorRespaldo) {
                console.error('No se pudo crear una copia de respaldo.', errorRespaldo);
                throw new Error(
                    'Los datos guardados no se pudieron leer y no fue posible crear una copia de respaldo. No se inició una base vacía.'
                );
            }

            db = new SQL.Database();
            prepararDB(db);
            datosRecuperados = true;
        }
    }

    return { database: db, datosRecuperados };
}

export function guardarDB(): boolean {
    const contenido = bytesToBase64(db.export());

    try {
        localStorage.setItem(STORAGE_KEY, contenido);
        return true;
    } catch (error) {
        console.error('No se pudo guardar la base de datos en este navegador.', error);
        return false;
    }
}

function prepararDB(database: Database): void {
    database.run('PRAGMA foreign_keys = ON;');
    database.run(`
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