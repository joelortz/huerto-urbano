import { initDB, guardarDB } from './db';

async function main() {
    const db = await initDB();
    const app = document.querySelector<HTMLDivElement>('#app')!;

    app.innerHTML = `
        <h1>Huerto Urbano Virtual</h1>
        <form id="form-planta">
            <input name="nombre" placeholder="Nombre" required />
            <input name="especie" placeholder="Especie" />
            <input name="fecha_siembra" type="date" required />
            <button type="submit">Agregar planta</button>
        </form>
        <ul id="lista"></ul>
    `;

    const form = document.querySelector<HTMLFormElement>('#form-planta')!;
    const lista = document.querySelector<HTMLUListElement>('#lista')!;

    function renderLista() {
        const res = db.exec('SELECT id, nombre, especie, fecha_siembra FROM plantas');
        const filas = res[0]?.values ?? [];
        lista.innerHTML = filas
            .map(([id, nombre, especie, fecha]) => `
                <li>
                    ${nombre} (${especie ?? ''}) - ${fecha}
                    <button class="eliminar" data-id="${id}">Eliminar</button>
                </li>`)
            .join('');
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(form);
        db.run(
            'INSERT INTO plantas (nombre, especie, fecha_siembra) VALUES (?, ?, ?)',
            [data.get('nombre') as string, data.get('especie') as string, data.get('fecha_siembra') as string]
        );
        guardarDB();
        form.reset();
        renderLista();
    });

    lista.addEventListener('click', (e) => {
        const boton = (e.target as HTMLElement).closest<HTMLButtonElement>('button.eliminar');
        if (!boton) return;
        const id = Number(boton.dataset.id);
        db.run('DELETE FROM eventos WHERE planta_id = ?', [id]);
        db.run('DELETE FROM plantas WHERE id = ?', [id]);
        guardarDB();
        renderLista();
    });

    renderLista();
}

main();