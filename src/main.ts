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
            <button type="button" id="cancelar" hidden>Cancelar</button>
        </form>
        <ul id="lista"></ul>
    `;

    const form = document.querySelector<HTMLFormElement>('#form-planta')!;
    const lista = document.querySelector<HTMLUListElement>('#lista')!;
    const botonSubmit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const botonCancelar = document.querySelector<HTMLButtonElement>('#cancelar')!;

    let editandoId: number | null = null;

    function renderLista() {
        const res = db.exec('SELECT id, nombre, especie, fecha_siembra FROM plantas');
        const filas = res[0]?.values ?? [];
        lista.innerHTML = filas
            .map(([id, nombre, especie, fecha]) => `
                <li>
                    ${nombre} (${especie ?? ''}) - ${fecha}
                    <button class="editar" data-id="${id}">Editar</button>
                    <button class="eliminar" data-id="${id}">Eliminar</button>
                </li>`)
            .join('');
    }

    function entrarModoEdicion(id: number) {
        const stmt = db.prepare('SELECT nombre, especie, fecha_siembra FROM plantas WHERE id = ?');
        stmt.bind([id]);
        if (stmt.step()) {
            const [nombre, especie, fecha] = stmt.get() as string[];
            form.querySelector<HTMLInputElement>('[name="nombre"]')!.value = nombre ?? '';
            form.querySelector<HTMLInputElement>('[name="especie"]')!.value = especie ?? '';
            form.querySelector<HTMLInputElement>('[name="fecha_siembra"]')!.value = fecha ?? '';
            editandoId = id;
            botonSubmit.textContent = 'Guardar cambios';
            botonCancelar.hidden = false;
        }
        stmt.free();
    }

    function salirModoEdicion() {
        editandoId = null;
        botonSubmit.textContent = 'Agregar planta';
        botonCancelar.hidden = true;
        form.reset();
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const valores = [
            data.get('nombre') as string,
            data.get('especie') as string,
            data.get('fecha_siembra') as string,
        ];

        if (editandoId === null) {
            db.run(
                'INSERT INTO plantas (nombre, especie, fecha_siembra) VALUES (?, ?, ?)',
                valores
            );
        } else {
            db.run(
                'UPDATE plantas SET nombre = ?, especie = ?, fecha_siembra = ? WHERE id = ?',
                [...valores, editandoId]
            );
        }

        guardarDB();
        salirModoEdicion();
        renderLista();
    });

    botonCancelar.addEventListener('click', salirModoEdicion);

    lista.addEventListener('click', (e) => {
        const boton = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (!boton) return;
        const id = Number(boton.dataset.id);

        if (boton.classList.contains('editar')) {
            entrarModoEdicion(id);
        }

        if (boton.classList.contains('eliminar')) {
            db.run('DELETE FROM eventos WHERE planta_id = ?', [id]);
            db.run('DELETE FROM plantas WHERE id = ?', [id]);
            guardarDB();
            if (editandoId === id) salirModoEdicion();
            renderLista();
        }
    });

    renderLista();
}

main();