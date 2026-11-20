# Huerto Urbano Virtual

Laboratorio 3: Proyecto Creativo — SQLite, GitHub y Vercel.

Simulador web interactivo para registrar y dar seguimiento al crecimiento de las plantas de un huerto. Permite administrar plantas y guardar eventos importantes, como riegos, crecimiento y aparición de plagas.

## Despliegue en vivo

[https://huerto-urbano-indol.vercel.app](https://huerto-urbano-indol.vercel.app)

## Características principales

- Gestión de plantas: crear, consultar, editar y eliminar plantas.
- Estado de riego: cada planta muestra cuánto tiempo pasó desde su último riego, con un aviso cuando necesita agua.
- Riego rápido: el botón "Regar hoy" registra un riego con la fecha de hoy en un solo clic.
- Registro de eventos: añadir fechas y notas sobre riegos, crecimiento o plagas para cada planta.
- Persistencia de datos: utiliza SQLite mediante `sql.js` en el navegador y guarda la base de datos en `localStorage` para conservar los datos al recargar la página.
- Interfaz responsiva y fácil de usar.

## Uso

1. Agrega una planta con su nombre, especie y fecha de siembra.
2. Pulsa "Regar hoy" cada vez que riegues la planta.
3. Pulsa "Historial" para ver y registrar riegos, crecimiento o plagas con fecha y nota.
4. Pulsa "Editar" para cambiar los datos de la planta, o "Eliminar" para quitarla junto con su historial.

## Tecnologías

- HTML5, CSS3 y TypeScript.
- Vite.
- SQLite en el navegador mediante `sql.js`.
- Vercel para el despliegue.

## Base de datos en Vercel

Vercel utiliza un sistema de archivos de solo lectura en producción, por lo que la aplicación no depende de un archivo SQLite tradicional en el servidor. En su lugar, `sql.js` ejecuta SQLite en el navegador y `localStorage` conserva los datos en el dispositivo del usuario.

## Ejecución local

1. Clona el repositorio:

   ```bash
   git clone https://github.com/joelortz/huerto-urbano.git
   ```

2. Entra al directorio e instala las dependencias:

   ```bash
   cd huerto-urbano
   npm install
   ```

3. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

4. Abre en el navegador la dirección que indique Vite, normalmente `http://localhost:5173`.
