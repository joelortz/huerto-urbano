import './style.css';
import { initDB, guardarDB } from './db';
import type { SqlValue } from 'sql.js';

function mostrarMensaje(texto: string): void {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app) {
        console.error(texto);
        return;
    }

    let mensaje = app.querySelector<HTMLParagraphElement>('[data-mensaje-error]');
    if (!mensaje) {
        mensaje = document.createElement('p');
        mensaje.dataset.mensajeError = 'true';
        mensaje.setAttribute('role', 'alert');
        app.prepend(mensaje);
    }
    mensaje.textContent = texto;
}

function limpiarMensaje(): void {
    document.querySelector('#app [data-mensaje-error]')?.remove();
}

async function main() {
    const { database: db, datosRecuperados } = await initDB();
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app) throw new Error('No se encontró el contenedor principal de la aplicación.');

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

    if (datosRecuperados) {
        mostrarMensaje(
            'Los datos guardados no se pudieron leer. Se guardó una copia en "huerto-db-respaldo" y se inició una base de datos nueva.'
        );
    }

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

    function crearBoton(texto: string, clases: string, id: unknown): HTMLButtonElement {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = `boton-texto ${clases}`;
        boton.dataset.id = String(id);
        boton.textContent = texto;
        return boton;
    }

    function renderLista() {
        const filas = consultar('SELECT id, nombre, especie, fecha_siembra FROM plantas');
        lista.replaceChildren();

        for (const [id, nombre, especie, fecha] of filas) {
            const item = document.createElement('li');
            const detalles = document.createElement('div');
            const titulo = document.createElement('h3');
            titulo.className = 'planta-nombre';

            const icono = document.createElement('span');
            icono.className = 'planta-icono';
            icono.setAttribute('aria-hidden', 'true');
            icono.textContent = '🌱';
            titulo.append(icono, document.createTextNode(String(nombre)));

            const especieElemento = document.createElement('em');
            especieElemento.textContent = String(especie ?? '');

            const fechaElemento = document.createElement('span');
            fechaElemento.className = 'plantas__fecha';
            fechaElemento.textContent = `Sembrada el ${String(fecha)}`;

            detalles.append(titulo, especieElemento, fechaElemento);

            const acciones = document.createElement('div');
            acciones.className = 'acciones';
            acciones.append(
                crearBoton('Ver historial', 'historial', id),
                crearBoton('Editar', 'editar', id),
                crearBoton('Eliminar', 'peligro eliminar', id)
            );

            item.append(detalles, acciones);
            lista.append(item);
        }
    }

    function renderEventos() {
        if (historialId === null) return;
        const filas = consultar(
            'SELECT tipo, fecha, nota FROM eventos WHERE planta_id = ? ORDER BY fecha DESC',
            [historialId]
        );
        listaEventos.replaceChildren();

        if (filas.length === 0) {
            const item = document.createElement('li');
            item.textContent = 'Aún no hay eventos registrados.';
            listaEventos.append(item);
            return;
        }

        for (const [tipo, fecha, nota] of filas) {
            const item = document.createElement('li');
            item.textContent = `${String(fecha)} - ${String(tipo)}${nota ? `: ${String(nota)}` : ''}`;
            listaEventos.append(item);
        }
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
        listaEventos.replaceChildren();
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
        try {
            const data = new FormData(form);
            const nombre = String(data.get('nombre') ?? '').trim();
            if (!nombre) {
                mostrarMensaje('El nombre de la planta no puede quedar vacío.');
                form.querySelector<HTMLInputElement>('[name="nombre"]')!.focus();
                return;
            }

            const valores = [
                nombre,
                String(data.get('especie') ?? ''),
                String(data.get('fecha_siembra') ?? ''),
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

            if (!guardarDB()) {
                mostrarMensaje('El cambio no se guardó en este navegador.');
                return;
            }

            limpiarMensaje();
            salirModoEdicion();
            renderLista();
        } catch (error) {
            console.error('No se pudo guardar la planta.', error);
            mostrarMensaje('No se pudo guardar la planta. Inténtalo de nuevo.');
        }
    });

    botonCancelar.addEventListener('click', salirModoEdicion);

    formEvento.addEventListener('submit', (e) => {
        e.preventDefault();
        if (historialId === null) return;
        try {
            const data = new FormData(formEvento);
            db.run(
                'INSERT INTO eventos (planta_id, tipo, fecha, nota) VALUES (?, ?, ?, ?)',
                [
                    historialId,
                    String(data.get('tipo') ?? ''),
                    String(data.get('fecha') ?? ''),
                    String(data.get('nota') ?? ''),
                ]
            );
            if (!guardarDB()) {
                mostrarMensaje('El cambio no se guardó en este navegador.');
                return;
            }

            limpiarMensaje();
            formEvento.reset();
            renderEventos();
        } catch (error) {
            console.error('No se pudo registrar el evento.', error);
            mostrarMensaje('No se pudo registrar el evento. Inténtalo de nuevo.');
        }
    });

    lista.addEventListener('click', (e) => {
        try {
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
                db.run('BEGIN TRANSACTION');
                try {
                    db.run('DELETE FROM eventos WHERE planta_id = ?', [id]);
                    db.run('DELETE FROM plantas WHERE id = ?', [id]);
                    db.run('COMMIT');
                } catch (error) {
                    try {
                        db.run('ROLLBACK');
                    } catch (errorRollback) {
                        console.error('No se pudo revertir el borrado.', errorRollback);
                    }
                    throw error;
                }

                if (!guardarDB()) {
                    mostrarMensaje('El cambio no se guardó en este navegador.');
                    return;
                }

                limpiarMensaje();
                if (editandoId === id) salirModoEdicion();
                if (historialId === id) cerrarHistorial();
                renderLista();
            }
        } catch (error) {
            console.error('No se pudo completar la acción de la planta.', error);
            mostrarMensaje('No se pudo completar la acción. Inténtalo de nuevo.');
        }
    });

    renderLista();
}

main().catch((error: unknown) => {
    console.error('No se pudo iniciar la aplicación.', error);
    mostrarMensaje(
        error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado al iniciar la aplicación.'
    );
});