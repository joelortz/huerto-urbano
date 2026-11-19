import { initDB } from './db';

async function main() {
    const db = await initDB();

db.run(
    'INSERT INTO plantas (nombre, especie, fecha_siembra) VALUES (?, ?, ?)',
    ['Albahaca', 'Ocimum basilicum', '2026-11-18']
);

const resultado = db.exec('SELECT * FROM plantas');
console.log(resultado);

document.querySelector<HTMLDivElement>('#app')!.innerHTML =
    `<pre>${JSON.stringify(resultado, null, 2)}</pre>`;
}

main();