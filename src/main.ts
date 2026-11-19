import { initDB, guardarDB } from './db';
import type { SqlValue } from 'sql.js';

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
        <section id="historial" hidden>
            <h2 id="historial-titulo"></h2>
            <form id="form-evento">
                <select name="tipo">
                    <option value="riego">Riego</option>
                    <option value="crecimiento">Crecimiento</option>
                    <option value="plaga">Plaga</option>
                </select>
                <input name="fecha" type="date" required />
                <input name="nota" placeholder="Nota" />
                <button type="submit">Registrar evento</button>
            </form>
            <ul id="lista-eventos"></ul>
        </section>
    `;

    const form = document.querySelector<HTMLFormElement>('#form-planta')!;
    const lista = document.querySelector<HTMLUListElement>('#lista')!;
    const botonSubmit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const botonCancelar = document.querySelector<HTMLButtonElement>('#cancelar')!;
    const seccionHistorial = document.querySelector<HTMLElement>('#historial')!;
    const tituloHistorial = document.querySelector<HTMLHeadingElement>('#historial-titulo')!;
    const formEvento = document.querySelector<HTMLFormElement>('#form-evento')!;
    const listaEventos = document.querySelector<HTMLUListElement>('#lista-eventos')!;

    let editandoId: number | null = null;
    let historialId: number | null = null;

    function consultar(sql: string, params: SqlValue[] = []): unknown[][] {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const filas: unknown[][] = [];
        while (stmt.step()) {
            filas.push(stmt.get());
        }
        stmt.free();
        return filas;
    }

    function renderLista() {
        const filas = consultar('SELECT id, nombre, especie, fecha_siembra FROM plantas');
        lista.innerHTML = filas
            .map(([id, nombre, especie, fecha]) => `
                <li>
                    ${nombre} (${especie ?? ''}) - ${fecha}
                    <button class="historial" data-id="${id}">Historial</button>
                    <button class="editar" data-id="${id}">Editar</button>
                    <button class="eliminar" data-id="${id}">Eliminar</button>
                </li>`)
            .join('');
    }

    function renderEventos() {
        if (historialId === null) return;
        const filas = consultar(
            'SELECT tipo, fecha, nota FROM eventos WHERE planta_id = ? ORDER BY fecha DESC',
            [historialId]
        );
        listaEventos.innerHTML = filas.length
            ? filas.map(([tipo, fecha, nota]) => `<li>${fecha} - ${tipo}${nota ? ': ' + nota : ''}</li>`).join('')
            : '<li>Aún no hay eventos registrados.</li>';
    }

    function abrirHistorial(id: number) {
        const [fila] = consultar('SELECT nombre FROM plantas WHERE id = ?', [id]);
        if (!fila) return;
        historialId = id;
        tituloHistorial.textContent = `Historial de ${fila[0]}`;
        seccionHistorial.hidden = false;
        formEvento.reset();
        renderEventos();
    }

    function cerrarHistorial() {
        historialId = null;
        seccionHistorial.hidden = true;
        listaEventos.innerHTML = '';
    }

    function entrarModoEdicion(id: number) {
        const [fila] = consultar('SELECT nombre, especie, fecha_siembra FROM plantas WHERE id = ?', [id]);
        if (!fila) return;
        const [nombre, especie, fecha] = fila as string[];
        form.querySelector<HTMLInputElement>('[name="nombre"]')!.value = nombre ?? '';
        form.querySelector<HTMLInputElement>('[name="especie"]')!.value = especie ?? '';
        form.querySelector<HTMLInputElement>('[name="fecha_siembra"]')!.value = fecha ?? '';
        editandoId = id;
        botonSubmit.textContent = 'Guardar cambios';
        botonCancelar.hidden = false;
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

    formEvento.addEventListener('submit', (e) => {
        e.preventDefault();
        if (historialId === null) return;
        const data = new FormData(formEvento);
        db.run(
            'INSERT INTO eventos (planta_id, tipo, fecha, nota) VALUES (?, ?, ?, ?)',
            [
                historialId,
                data.get('tipo') as string,
                data.get('fecha') as string,
                data.get('nota') as string,
            ]
        );
        guardarDB();
        formEvento.reset();
        renderEventos();
    });

    lista.addEventListener('click', (e) => {
        const boton = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (!boton) return;
        const id = Number(boton.dataset.id);

        if (boton.classList.contains('historial')) {
            abrirHistorial(id);
        }

        if (boton.classList.contains('editar')) {
            entrarModoEdicion(id);
        }

        if (boton.classList.contains('eliminar')) {
            db.run('DELETE FROM eventos WHERE planta_id = ?', [id]);
            db.run('DELETE FROM plantas WHERE id = ?', [id]);
            guardarDB();
            if (editandoId === id) salirModoEdicion();
            if (historialId === id) cerrarHistorial();
            renderLista();
        }
    });

    renderLista();
}

main();