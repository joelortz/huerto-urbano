import './style.css';
import { initDB, guardarDB } from './db';
import type { SqlValue } from 'sql.js';

async function main() {
    const db = await initDB();
    const app = document.querySelector<HTMLDivElement>('#app')!;

    app.innerHTML = `
        <a class="saltar" href="#contenido">Ir al contenido</a>
        <header class="hero">
            <div class="hero__inner">
                <div class="hero__texto">
                    <h1>Huerto Urbano Virtual</h1>
                    <p>Registra tus plantas y lleva un historial de sus cuidados.</p>
                </div>
            </div>
        </header>
        <main id="contenido">
            <section aria-labelledby="plantas-titulo">
                <h2 id="plantas-titulo">Mis plantas</h2>
                <ul id="lista" class="plantas"></ul>
            </section>
            <section id="nueva" aria-labelledby="nueva-titulo">
                <h2 id="nueva-titulo">Agregar planta</h2>
                <form id="form-planta" class="formulario">
                    <div class="campo campo--ancho">
                        <label for="nombre">Nombre de la planta</label>
                        <input id="nombre" name="nombre" placeholder="Por ejemplo, Albahaca" required />
                    </div>
                    <div class="campo">
                        <label for="especie">Especie</label>
                        <input id="especie" name="especie" placeholder="Opcional" />
                    </div>
                    <div class="campo">
                        <label for="fecha-siembra">Fecha de siembra</label>
                        <div class="fecha-control">
                            <input id="fecha-siembra" name="fecha_siembra" type="date" required />
                            <span class="fecha-placeholder" aria-hidden="true">dd/mm/aaaa</span>
                        </div>
                    </div>
                    <div class="acciones campo--ancho">
                        <button class="boton-principal" type="submit">Agregar planta</button>
                        <button class="boton-texto" type="button" id="cancelar" hidden>Cancelar edición</button>
                    </div>
                </form>
            </section>
            <section id="historial" aria-labelledby="historial-titulo" hidden>
                <h2 id="historial-titulo">Historial</h2>
                <form id="form-evento" class="formulario">
                    <div class="campo">
                        <label for="tipo-evento">Tipo de evento</label>
                        <select id="tipo-evento" name="tipo">
                            <option value="riego">Riego</option>
                            <option value="crecimiento">Crecimiento</option>
                            <option value="plaga">Plaga</option>
                        </select>
                    </div>
                    <div class="campo">
                        <label for="fecha-evento">Fecha</label>
                        <div class="fecha-control">
                            <input id="fecha-evento" name="fecha" type="date" required />
                            <span class="fecha-placeholder" aria-hidden="true">dd/mm/aaaa</span>
                        </div>
                    </div>
                    <div class="campo campo--ancho">
                        <label for="nota-evento">Nota</label>
                        <input id="nota-evento" name="nota" placeholder="Detalles del evento" />
                    </div>
                    <button class="boton-principal" type="submit">Registrar evento</button>
                </form>
                <ul id="lista-eventos" class="plantas"></ul>
            </section>
        </main>
        <footer>
            <p>Las plantas y sus historiales se guardan en este navegador.</p>
        </footer>
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
                    <div>
                        <h3>${nombre}</h3>
                        <em>${especie ?? ''}</em>
                        <span class="plantas__fecha">Sembrada el ${fecha}</span>
                    </div>
                    <div class="acciones">
                        <button class="boton-texto historial" data-id="${id}">Ver historial</button>
                        <button class="boton-texto editar" data-id="${id}">Editar</button>
                        <button class="boton-texto peligro eliminar" data-id="${id}">Eliminar</button>
                    </div>
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