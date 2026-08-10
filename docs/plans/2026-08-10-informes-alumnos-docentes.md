# Plan e implementacion: Informes por alumno

Fecha: 2026-08-10

## Estado de implementacion

Estado: implementado, desplegable y validado en produccion.

Resumen de la sesion:

- Se agrego el modulo de informes por alumno en `children/{childId}/reports/{reportId}`.
- Coordinacion y superadmin pueden subir y borrar informes.
- Familias responsables pueden ver y descargar informes desde `/portal/familia/hijos`.
- Docentes, talleristas, familias no responsables y usuarios no autenticados quedan fuera del acceso.
- No se guarda `downloadURL`/`archivoURL`; solo se guarda `storagePath`.
- La descarga se resuelve en el momento con Firebase Storage y respeta reglas.
- Se configuro CORS del bucket real `puerto-nuevo-montessori.firebasestorage.app` para permitir descargas desde `https://montessoripuertonuevo.com.ar`.
- Coordinacion probo subida correctamente y familia probo descarga correctamente.

Archivos implementados o modificados:

- `src/services/studentReports.service.js`
- `src/components/studentReports/StudentReports.jsx`
- `src/components/children/ChildCard.jsx`
- `src/components/children/ChildForm.jsx`
- `src/pages/admin/ChildrenManager.jsx`
- `src/pages/family/ChildProfile.jsx`
- `src/styles/components.css`
- `firestore.rules`
- `storage.rules`
- `storage.cors.json`
- `tests/rules/firestore.rules.test.js`
- `tests/rules/storage.rules.test.js`

Verificaciones realizadas:

- `npm run lint`: OK
- `npm run build`: OK
- Suite completa de reglas Firestore/Storage: OK
- Prueba real de descarga familiar luego de aplicar CORS: OK

## Objetivo

Permitir que coordinacion y superadmin carguen informes periodicos asociados a cada alumno. Los informes deben incluir periodo y año, admitir archivo adjunto, y quedar visibles en la ficha del alumno para familias responsables solo en modo lectura/descarga.

## Alcance funcional

- Coordinacion y superadmin pueden subir informes a un alumno.
- Coordinacion y superadmin pueden borrar cualquier informe.
- Familias responsables pueden ver y descargar informes de sus hijos.
- Familias no pueden crear, editar ni borrar informes.
- Cada informe debe indicar periodo y año.
- La frecuencia queda libre: semestral, cuatrimestral, anual u otra etiqueta definida por la escuela.
- No hay flujo de aprobacion en esta version: la aprobacion queda implicita porque solo coordinacion/superadmin pueden publicar el informe.

## Decision de arquitectura

Crear una entidad propia de informes del alumno, separada del modulo de documentos institucionales.

No conviene reutilizar `/documents`, porque ese modulo funciona por roles y alcance general/ambiente. Esta feature necesita autorizacion por alumno y por responsables.

Modelo recomendado:

```txt
children/{childId}/reports/{reportId}
```

Archivo en Storage:

```txt
private/children/{childId}/reports/{reportId}/{fileName}
```

Esta estructura mantiene el informe cerca de la ficha del alumno y simplifica reglas de acceso para familias.

Importante: no copiar la regla amplia actual de `children/{childId}`. La ficha de alumno hoy permite lectura a cualquier `family` autenticada; para informes la regla familiar debe validar responsabilidad real con `isResponsibleFamilyForChild(childId, request.auth.uid)`.

## Modelo de datos

Documento `children/{childId}/reports/{reportId}`:

```js
{
  childId: string,
  periodo: string,
  anio: number,
  archivoNombre: string,
  archivoTamanoBytes: number,
  archivoTipo: string,
  storagePath: string,
  uploadedBy: string,
  uploadedByEmail: string,
  createdAt: timestamp
}
```

Campos requeridos:

- `periodo`
- `anio`
- `archivoNombre`
- `storagePath`
- `uploadedBy`

No guardar `archivoURL`/`downloadURL` en Firestore. Guardar solo `storagePath` y resolver la descarga en el momento de uso, para no persistir tokens de descarga permanentes en datos legibles por usuarios.

Formatos iniciales permitidos:

- PDF
- Word: `.doc`, `.docx`
- Imagenes: `.jpg`, `.jpeg`, `.png`

Limite sugerido:

- 10 MB por archivo.

## Cambios en permisos

Archivos:

- `firestore.rules`
- `storage.rules`

No hace falta agregar un permiso nuevo en `constants.js` para la primera version: el conjunto de escritura es exactamente `superadmin` + `coordinacion`, que ya existe como `isAdmin()` en reglas.

Reglas Firestore para `children/{childId}/reports/{reportId}`:

- Lectura:
  - `superadmin` y `coordinacion`
  - `family` solo si `isResponsibleFamilyForChild(childId, request.auth.uid)`
- Creacion:
  - solo `superadmin` y `coordinacion`
  - `uploadedBy` debe coincidir con `request.auth.uid`
  - `childId` debe coincidir con el path
- Actualizacion:
  - no permitir en primera version
- Eliminacion:
  - solo `superadmin` y `coordinacion`
  - family nunca

La regla de lectura familiar no debe incluir `|| isFamily()`. Ese patron seria inseguro para informes porque habilitaria a cualquier familia autenticada a leer informes de cualquier alumno.

Reglas Storage para `private/children/{childId}/reports/{reportId}/{fileName}`:

- Lectura:
  - admin/coordinacion
  - family responsable del alumno
- Escritura:
  - solo admin/coordinacion
  - validar tamano y tipo de archivo
- Eliminacion:
  - solo admin/coordinacion

Para borrar, el servicio debe intentar eliminar primero el objeto en Storage y luego borrar el documento Firestore. Si Storage falla, el documento queda vivo y el usuario puede reintentar desde el mismo boton. Si Storage responde `storage/object-not-found`, se ignora ese caso y se borra la metadata para evitar que un informe con archivo faltante quede imborrable.

Las reglas de lectura de Storage dependen de que exista el informe en Firestore. Esta defensa evita que un archivo huerfano o una ruta vieja sean descargables por una familia aunque conozca el path.

## Servicio frontend

Crear:

```txt
src/services/studentReports.service.js
```

Metodos:

```js
getReportsByChild(childId)
uploadReport(childId, file, metadata)
downloadReport(report)
deleteReport(childId, reportId, storagePath)
```

Patrones a reutilizar:

- `src/services/documents.service.js`
- `src/services/children.service.js`
- `src/components/common/FileUploadSelector.jsx`

Responsabilidades del servicio:

- Consultar informes ordenados por `anio` y `createdAt`.
- Subir archivo a Storage.
- Resolver descarga en el momento de uso desde `storagePath`, sin persistir `downloadURL`.
- Crear metadata en Firestore.
- Borrar primero el objeto Storage y luego el documento Firestore.
- Normalizar errores para la UI.

## UI administracion

Crear:

```txt
src/components/studentReports/StudentReports.jsx
```

Modificar:

- `src/pages/admin/ChildrenManager.jsx`

La gestion debe integrarse en la ficha/panel de alumno existente para admin/coordinacion y tambien en la pantalla de edicion del alumno.

Ubicacion vigente:

- En `/portal/admin/alumnos`, el panel de detalle muestra `Informes` dentro de la ficha.
- En `Editar alumno`, `Informes` aparece dentro del formulario despues de los datos personales iniciales y antes de las secciones largas.
- En `Nuevo alumno` no aparece hasta guardar, porque todavia no existe `childId`.

UI:

- Seccion de informes existentes.
- Boton `Subir informe`.
- Formulario con:
  - periodo
  - año
  - archivo
- Accion borrar para informes existentes.

Estados necesarios:

- cargando alumnos
- sin alumnos
- cargando informes
- sin informes
- subiendo archivo
- error de formato
- error de permisos
- confirmacion antes de borrar

## UI familia

Modificar:

- `src/pages/family/ChildProfile.jsx`
- `src/components/children/ChildCard.jsx`

Agregar a cada ficha una seccion `Informes`.

La familia debe ver:

- periodo y año
- fecha de carga
- nombre del archivo
- boton `Ver` o `Descargar`

La familia no debe ver:

- boton subir
- boton borrar
- campos editables

## Componentes sugeridos

Crear un componente unico inicialmente:

```txt
src/components/studentReports/StudentReports.jsx
```

Props sugeridas:

```js
{
  childId,
  canUpload,
  canDelete,
  readonly
}
```

Separar en `List`, `Uploader` e `Item` solo si el componente empieza a crecer demasiado.

## Tests

Agregar casos en:

- `tests/rules/firestore.rules.test.js`
- `tests/rules/storage.rules.test.js`

Firestore:

- coordinacion puede crear informe.
- superadmin puede crear informe.
- coordinacion puede borrar cualquier informe.
- familia responsable puede leer informe del hijo.
- familia no responsable no puede leer informe ajeno.
- familia no puede crear informe.
- familia no puede borrar informe.
- docente no puede crear informe.
- docente no puede borrar informe.
- no autenticado no puede leer ni escribir.

Storage:

- coordinacion puede subir archivo de informe.
- familia responsable puede descargar archivo.
- familia no responsable no puede descargar archivo.
- familia no puede subir archivo.
- docente no puede subir archivo.
- archivo con tipo invalido falla.
- archivo sobre limite falla.

Comandos de verificacion:

```bash
npm run test:rules
npm run lint
npm run build
```

## Criterios de aceptacion

- Coordinacion o superadmin entra a la gestion de alumnos.
- Selecciona un alumno.
- Carga un informe con periodo, año y archivo.
- El informe aparece en la lista del alumno.
- Coordinacion o superadmin puede borrar el informe.
- La familia responsable entra a `/portal/familia/hijos`.
- Ve el informe dentro de la ficha del alumno.
- Puede abrirlo o descargarlo.
- No puede modificarlo ni borrarlo.
- Otra familia no puede acceder al informe ni al archivo.

## Riesgos y decisiones pendientes

- Definir lista exacta de periodos sugeridos en UI si la escuela quiere limitar opciones. La version actual permite escribir cualquier periodo y ofrece atajos frecuentes.
- Definir si se permite mas de un informe por alumno para el mismo periodo/año.
- Definir si docentes tendran una vista de solo lectura a futuro. En esta version quedan fuera del circuito de carga/borrado.
- Si a futuro se permite carga docente, agregar flujo `draft`/`published` con aprobacion explicita de coordinacion.

## Estimacion original

Esta estimacion queda como referencia historica. La implementacion de esta version ya fue completada durante la sesion del 2026-08-10.

Implementacion completa con reglas y tests:

- 3 a 5 jornadas.

Distribucion sugerida:

- Datos, servicio y reglas: 1 a 1.5 jornadas.
- UI administracion: 0.5 a 1 jornada.
- UI familia: 0.5 a 1 jornada.
- Tests, ajustes y build: 0.5 a 1 jornada.
