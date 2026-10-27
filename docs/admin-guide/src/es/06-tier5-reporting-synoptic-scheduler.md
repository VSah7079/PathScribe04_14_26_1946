---
chapter: 6
id: ch6
title: Nivel 5: informes, formularios sinópticos y configuración del programador
---

# Nivel 5: informes, formularios sinópticos y configuración del programador {#ch6}

Este capítulo describe el aspecto de un informe liberado, los formularios estructurados (sinópticos) que rellenan los patólogos y la forma de enviar, imprimir y programar un informe liberado. Documenta 15 pantallas en cuatro partes. Tres elementos del esquema no están construidos y cada uno se señala donde aparece: un canal de entrega a un portal del paciente, la carga automática de versiones de los protocolos del CAP y un programador de trabajos nocturnos que un administrador pueda configurar. En cada sección se nombran las alternativas que funcionan más cercanas.

**Orden de configuración de este nivel.** Complete primero del Nivel 1 al Nivel 4 (en particular centros, médicos, roles y agentes del centro). Después trabaje este nivel en el orden siguiente. El cuadro "Orden de configuración" de cada pantalla repite su lugar en la lista.

1. [Fuentes aprobadas](#screen-fonts): elija las fuentes que ofrecen los editores de informes.
2. [Estilo del documento](#screen-document_style): defina el estilo de texto predeterminado de los informes del laboratorio, el tamaño de página y los márgenes.
3. [Revisión de plantillas](#screen-template_governance): decida quién puede aprobar y publicar las plantillas sinópticas.
4. [Biblioteca de partes](#screen-templates-parts): cree o copie los encabezados, cuerpos y pies de página reutilizables.
5. [Plantillas de informe](#screen-templates-templates): monte plantillas de informe a partir de partes y publíquelas.
6. [Reglas de enrutamiento](#screen-templates-routing): elija qué plantilla utiliza un caso según el centro, el médico o el protocolo.
7. [Cola de revisión](#screen-protocols-review): lleve los protocolos sinópticos por borrador, revisión y aprobación.
8. [Protocolos activos](#screen-protocols-active): compruebe y mantenga los protocolos sinópticos publicados.
9. [Reglas de enrutamiento de destinos de impresión](#screen-print_routing_rules): decida a qué impresora va un informe liberado.
10. [Reglas de configuración de entrega](#screen-delivery_rules): decida cómo se envía cada informe liberado (mensaje de resultado, impresión, fax electrónico, entrega de archivo).
11. [Programaciones de entrega](#screen-delivery_schedules): decida cuándo sale cada envío.

Pantallas que no forman parte de la configuración y por eso no tienen número de paso: las dos páginas de pestaña ([pestaña Plantillas de informe](#screen-tab-templates) y [pestaña Biblioteca sinóptica](#screen-tab-protocols)), [Todos los protocolos](#screen-protocols-all) y [Mis exportaciones](#screen-my-exports).

**Canales de entrega de un vistazo.** Cada uno se vuelve a exponer, con sus límites, en la [Parte 3](#ch6-scheduled-delivery).

| Canal | Estado | Qué existe |
|---|---|---|
| Cola de impresión | Construido | Las reglas de entrega envían un trabajo de impresión; las reglas de enrutamiento de impresión eligen la impresora; la pantalla Cola de impresión gestiona los trabajos. |
| Mensaje de resultado al motor de interfaces (electrónico) | Construido | El canal predeterminado. |
| Fax electrónico | Construido | Se envía al servidor de interfaces, que entrega el PDF a una pasarela de correo a fax. |
| Entrega de archivo | Construido | Se envía al servidor de interfaces, que escribe el archivo en una carpeta o en un destino SFTP configurado en ese servidor. |
| Correo electrónico seguro | Demostración | Una persona envía desde una ventana un mensaje vinculado a un caso; el correo va a la [Bandeja de salida de correo simulada](#screen-simulated_mail). No es un canal de las reglas de entrega. |
| Portal del paciente o del proveedor | No construido | No existe ningún canal de portal. |

**Dónde están las herramientas de trabajos por lotes y nocturnos.** La impresión por lotes y el programador de trabajos nocturnos no son una sola pantalla. La [Parte 4](#ch6-batch-jobs) enumera las pantallas que existen y dónde se documenta cada una.

## Diseñador de plantillas de informe y configuración de la imagen de marca {#ch6-report-templates}
Breadcrumb: Inicio > Configuración > Plantillas de informe

Un informe se construye con tres tipos de **parte** (encabezado, cuerpo, pie de página). Una **plantilla** coloca las partes en cinco ranuras (encabezado de la página 1, encabezado de las páginas 2 y siguientes, cuerpo, pie de página de las páginas 2 y siguientes, pie de página de la página 1). Las **reglas de enrutamiento** deciden qué plantilla recibe un caso. Las fuentes, el tamaño de página y los márgenes predeterminados del laboratorio están por debajo de todo ello.

**Cómo se elige una plantilla para un caso.** El enrutador prueba los criterios siguientes en orden y se detiene en la primera coincidencia: primero un filtro de informe preliminar; después una anulación del centro (Pass 0); después, para un centro afiliado sin regla propia, la anulación de su empresa matriz (Pass 0a); después una preferencia del médico (Pass 0b); después una coincidencia de protocolo sinóptico, en la que las reglas definidas por el administrador se comprueban antes que la tabla integrada (Pass 1); después la alternativa por subespecialidad (Pass 2); después la alternativa de referencia (Pass 3). Dentro de un mismo tipo de regla, una regla para un laboratorio ejecutor prevalece sobre una regla Global para el mismo centro o médico.

**Capas del estilo de texto.** El estilo de texto de un informe procede de tres capas; prevalece la más específica: el estilo predeterminado del laboratorio (Estilo del documento) queda anulado por el panel Estilo de la propia plantilla, que a su vez queda anulado por el formato de etiqueta de un componente en el inspector.

**Imagen de marca.** El encabezado del informe toma su logotipo, el nombre del director del laboratorio y el número de acreditación del departamento; si faltan, del centro, y después de la empresa. Esos campos se definen en otras pantallas; este capítulo no los repite:
- Imagen de marca del departamento: [Diccionario de departamentos](#screen-departments) (Nombre del director del laboratorio, número de acreditación, URL del logotipo de la cabecera).
- Imagen de marca del centro y opciones de informe: [Configuración de centros](#screen-clients) y [Diccionario de centros](#screen-facility-dictionary).

PathScribe guarda solo la dirección de una imagen de logotipo alojada, nunca la imagen. Una parte de encabezado con **Mostrar logotipo del centro** activado la utiliza.

### Pestaña Plantillas de informe {#screen-tab-templates}
Breadcrumb: Inicio > Configuración > Plantillas de informe

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Plantillas de informe**
**2. Elemento de mantenimiento:** La propia pestaña, con las subpestañas **Plantillas de informe**, **Biblioteca de partes** y **Reglas de enrutamiento**.

**3. Finalidad de negocio y alcance.** La pestaña agrupa las tres pantallas que definen el diseño del informe: la lista de plantillas, la biblioteca de partes reutilizables y las reglas de enrutamiento de plantillas. La página de la pestaña no tiene campos propios. Los botones de las subpestañas son los únicos controles.

**4. Requisitos previos y dependencias.** La pestaña se abre para cualquier persona con `screen:configuration:open`. Cada subpestaña queda después limitada por su propia capacidad, de modo que una persona que no la tiene ve la lista pero no puede cambiar nada.

Setup step: Reference, not part of setup
Requires: [Estilo del documento](#screen-document_style)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: tab-templates - Pestaña Plantillas de informe con las tres subpestañas]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Plantillas de informe (subpestaña) | Botón | No aplica | Abre la [lista de plantillas](#screen-templates-templates). | Seleccionada |
| Biblioteca de partes (subpestaña) | Botón | No aplica | Abre la [biblioteca de partes](#screen-templates-parts). | No seleccionada |
| Reglas de enrutamiento (subpestaña) | Botón | No aplica | Abre las [reglas de enrutamiento de plantillas](#screen-templates-routing). | No seleccionada |

**7. Permisos.** Abrir la pestaña: `screen:configuration:open`. Las acciones de cada subpestaña usan sus propias capacidades, indicadas en la subpestaña.
**Límites conocidos.** Ninguno conocido.

### Biblioteca de partes {#screen-templates-parts}
Breadcrumb: Inicio > Configuración > Plantillas de informe > Biblioteca de partes

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Plantillas de informe** > subpestaña **Biblioteca de partes**
**2. Elemento de mantenimiento:** Partes de informe (encabezado, cuerpo, pie de página)

**3. Finalidad de negocio y alcance.** Una parte es un bloque reutilizable de un informe: un **encabezado** (imagen de marca de la institución, número de acceso, datos demográficos del paciente), una parte de **cuerpo** (diagnóstico, descripción macroscópica, microscópica, datos sinópticos) o un **pie de página** (números de página, aviso de confidencialidad, línea de identidad del paciente). Las partes se construyen una vez aquí y se colocan en cualquier número de plantillas. Una parte puede ser Global (se ofrece a todos los laboratorios ejecutores) o pertenecer a un laboratorio ejecutor. La biblioteca incluye partes integradas, que se muestran con una insignia **Integrado**. Las partes integradas no se pueden editar ni archivar; duplique una para cambiarla.

**4. Requisitos previos y dependencias.** Las partes no necesitan otras partes, pero el estilo de texto del laboratorio y los laboratorios ejecutores a los que se refieren deben existir antes. Si omite la configuración de centros, la lista de Laboratorio ejecutor ofrece solo Global.

Setup step: Tier 5, step 4
Requires: [Estilo del documento](#screen-document_style), [Configuración de centros](#screen-clients)
Unlocks: [Plantillas de informe](#screen-templates-templates)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: templates-parts - Biblioteca de partes con encabezados, cuerpos y pies de página agrupados]

**Qué muestra la pantalla.** Las partes archivadas no aparecen en la lista. Las partes se agrupan en Encabezados, Cuerpos y Pies de página. Cada tarjeta muestra el nombre, una insignia de estado (Borrador, Publicada o Archivada), la insignia Integrado cuando corresponde, el laboratorio ejecutor, y el tipo, la especialidad y la descripción. Una tarjeta ofrece **Editar** (no en las partes integradas), **Duplicar** y **Archivar** con confirmación Sí/No (no en las partes integradas).

**6. Referencia de campos.**

Controles de la lista:

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar | Texto | Opcional | Filtra la lista por el nombre de la parte. | En blanco |
| Filtro de tipo | Opción: Todos, Encabezados, Cuerpos, Pies de página | Opcional | Muestra un solo tipo de parte. | Todos |
| Filtro de laboratorio | Opción: todos los laboratorios, Global o un laboratorio ejecutor | Opcional | Muestra las partes de un laboratorio. | Todos |
| Nueva parte | Botón | No aplica | Abre el selector de tipo de parte (encabezado, cuerpo o pie de página) y después el generador de partes. | No aplica |

#### Generador de partes {#ch6-part-builder}
Breadcrumb: Inicio > Configuración > Plantillas de informe > Biblioteca de partes > Generador de partes

[SCREENSHOT PLACEHOLDER: templates-parts-builder - Generador de partes con lienzo, paleta e inspector]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Tipo de parte | Opción: Parte de encabezado, Parte de cuerpo, Parte de pie de página | Obligatorio | Se elige una sola vez, al crear la parte. Decide en qué ranura se puede colocar la parte. | Ninguno |
| Nombre | Texto | Obligatorio | Se muestra en la biblioteca y en la ranura de la plantilla. Haga clic en el nombre para editarlo. | `New Header Part`, `New Body Part` o `New Footer Part` |
| Especialidad | Texto | Opcional | Agrupa la parte. `General` significa todas las especialidades. | En blanco (se muestra como General) |
| Descripción | Texto | Opcional | Nota breve que se muestra en la tarjeta de la biblioteca. | En blanco |
| Estándar | Opción: Ninguno, CAP, RCPath, Personalizado | Opcional | Solo una etiqueta. Registra el origen del diseño y no carga ni comprueba ningún protocolo. | Ninguno |
| Laboratorio ejecutor | Opción: Global (todos los laboratorios ejecutores) o un laboratorio ejecutor | Opcional | Una parte específica de un laboratorio solo se ofrece para las plantillas de ese laboratorio. | Global |
| Cuadrícula | Interruptor: Cuadrícula activada / Cuadrícula desactivada | Opcional | Muestra u oculta la cuadrícula de diseño en el lienzo. Solo es visual. | Activada |
| Componentes (lienzo) | Arrastrar desde la paleta | Opcional | El contenido de la parte. Consulte los campos del inspector en [Plantillas de informe](#screen-templates-templates). Se muestra el número de componentes. | Vacío |
| Estado de guardado | Indicador: Sin guardar, Guardando, Guardado, Error | No aplica | La parte se guarda mientras usted la edita. | No aplica |
| Publicar | Botón | No aplica | Pone la parte a disposición de las plantillas (solo se pueden colocar partes publicadas). Se aplica una comprobación del diagnóstico final; consulte el editor de plantillas. | Borrador |

**7. Permisos.** Abrir: `screen:configuration:open`. Crear, guardar, archivar, duplicar: `config:report-template:manage`. Publicar: `config:report-template:publish`. Ambas son de riesgo alto y se auditan. Administrador y Director del laboratorio tienen las dos; Autor de plantillas tiene manage; Aprobador de plantillas tiene publish.
**Variables de plantilla para el sexo del paciente y el número del NHS (lote 662).** Las plantillas de informe imprimen `{{patient.sexAtBirth}}` y pueden usar `{{patient.nhsNumber}}`. El sexo se sigue almacenando con el mismo código (M, F, U) más I para indeterminado, por lo que las plantillas que comprueban `patient.sex == 'M'` siguen funcionando. La insignia del banner del paciente muestra «localizado» solo cuando el indicador de estado del número del NHS almacenado es 01.
**Límites conocidos.** El campo Estándar es una etiqueta. No vincula una parte con un protocolo del CAP ni del RCPath.

### Plantillas de informe {#screen-templates-templates}
Breadcrumb: Inicio > Configuración > Plantillas de informe > Plantillas de informe

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Plantillas de informe** > subpestaña **Plantillas de informe**
**2. Elemento de mantenimiento:** Plantillas de informe

**3. Finalidad de negocio y alcance.** Una plantilla de informe define la estructura de un informe: qué partes de encabezado, cuerpo y pie de página utiliza, en qué ranuras y, de forma opcional, los pasos de generación asistida por IA del laboratorio para ella. Una plantilla está en Borrador, Publicada o Archivada. Solo el enrutamiento puede elegir una plantilla publicada. La lista muestra cada plantilla con su estado, una insignia **IA** cuando la generación con IA está activada, una insignia **ESTÁNDAR** en el diseño quirúrgico estándar, el número de ranuras activas y la hora de la última actualización.

**4. Requisitos previos y dependencias.** Las plantillas se construyen con partes publicadas, por lo que primero va la biblioteca de partes. Si la omite, el selector de partes del editor muestra "No se encontraron partes publicadas". El estilo de texto del laboratorio debe estar definido para que el panel Estilo de la plantilla tenga un valor predeterminado al que recurrir.

Setup step: Tier 5, step 5
Requires: [Biblioteca de partes](#screen-templates-parts), [Estilo del documento](#screen-document_style)
Unlocks: [Reglas de enrutamiento](#screen-templates-routing)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: templates-templates - Lista de plantillas de informe con filtro de estado, búsqueda, Desde la estándar y Nueva plantilla]

**6. Referencia de campos.**

Controles de la lista:

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtro de estado | Opción: Todas, Publicadas, Borrador, Archivadas, cada una con un recuento | Opcional | Muestra un solo estado. | Todas |
| Buscar | Texto | Opcional | Filtra por nombre. | En blanco |
| Nueva plantilla (Empezar en blanco) | Botón | No aplica | Crea un borrador vacío y abre el editor. | No aplica |
| Desde la estándar (Usar plantilla estándar) | Botón | No aplica | Copia el diseño estándar de patología quirúrgica como un borrador nuevo llamado `My Surgical Pathology Report`. | No aplica |
| Editar | Botón en la fila de un borrador | No aplica | Abre el editor. | No aplica |
| Duplicar | Botón | No aplica | Crea una copia llamada `Copy of <name>`. | No aplica |
| Eliminar / Archivar | Botón con confirmación Sí/No | No aplica | Un borrador se elimina; una plantilla publicada se archiva. | No aplica |

#### Editor de plantillas {#ch6-template-editor}
Breadcrumb: Inicio > Configuración > Plantillas de informe > Plantillas de informe > Editor de plantillas

[SCREENSHOT PLACEHOLDER: templates-templates-editor - Editor de plantillas con panel de la biblioteca de partes, ranuras de página y vista previa]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre de la plantilla | Texto | Obligatorio | Haga clic para editarlo. Se guarda al salir del cuadro. | El nombre dado al crearla |
| Línea de especialidad y estándar | Texto de solo lectura | No aplica | Muestra la especialidad de la plantilla y su estándar (CAP, RCPath o Personalizado). Una plantilla en blanco empieza como `general` y `custom`. | `general`, `custom` |
| Estado | Borrador, Publicada o Archivada | No aplica | **Publicar** pasa un borrador a Publicada. Publicar está desactivado cuando la plantilla tiene más de un campo marcado como Diagnóstico final. | Borrador |
| Filtro de laboratorio ejecutor (panel de la biblioteca de partes) | Opción: Todos los laboratorios (Global + cada laboratorio), Global o un laboratorio | Opcional | Reduce las partes que se ofrecen. | Todos los laboratorios |
| Búsqueda de partes | Texto | Opcional | Filtra las partes publicadas. | En blanco |
| Ranura: Encabezado de la página 1 | Una parte de encabezado | Opcional | Encabezado de la primera página. | Vacía |
| Ranura: Encabezado de las páginas 2+ | Una parte de encabezado, o "igual que la página 1" | Opcional | Encabezado de las páginas posteriores. | Vacía |
| Ranura: Cuerpo | Lista ordenada de partes de cuerpo | Opcional | Arrastre para reordenar. Las partes de cuerpo continúan en todas las páginas. Cada una se puede desactivar con el interruptor de la ranura sin quitarla. | Vacía |
| Ranura: Pie de página de las páginas 2+ | Una parte de pie de página | Opcional | Pie de página de las páginas posteriores. | Vacía |
| Ranura: Pie de página de la página 1 | Una parte de pie de página | Opcional | Pie de página de la primera página. | Vacía |
| Estilo (Familia de fuentes) | Opción entre las fuentes aprobadas | Opcional | Estilo de texto predeterminado de la plantilla para el encabezado, el cuerpo o el pie de página. Si está en blanco, recurre al valor predeterminado del laboratorio. | Predeterminado del laboratorio |
| Estilo (Tamaño de fuente, pt) | Número | Opcional | Igual. Los tamaños se expresan en puntos. | Predeterminado del laboratorio |
| Estilo (Negrita, Subrayado) | Interruptores | Opcional | Igual. | Desactivados |
| Estilo (Transformación del texto) | Opción: Tal como se escribe, Primera letra en mayúscula, MAYÚSCULAS | Opcional | Igual. | Tal como se escribe |
| Vista previa | Botón | No aplica | Muestra la plantilla con datos de caso simulados, el número de páginas y el contexto simulado. | No aplica |
| Márgenes de la vista previa (superior, derecho, inferior, izquierdo, mm) | Número | Opcional | Solo para esta vista previa. El tamaño de página y los márgenes reales del laboratorio se definen en Estilo del documento. | El valor del laboratorio |
| Tamaño de página de la vista previa | Opción: A4, US Letter, US Legal, A3, B5 | Opcional | Solo para esta vista previa. | El valor del laboratorio |

#### Inspector: campos del componente seleccionado {#ch6-template-inspector}
Breadcrumb: Inicio > Configuración > Plantillas de informe > Plantillas de informe > Editor de plantillas > Inspector

El inspector muestra las propiedades de lo que se selecciona en el lienzo. Se utiliza el mismo inspector en el generador de partes.

[SCREENSHOT PLACEHOLDER: templates-templates-inspector - Panel del inspector de un campo seleccionado]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Etiqueta | Texto | Opcional | La etiqueta impresa del campo. | En blanco |
| Ancho | Columnas sobre 12 | Opcional | Arrastre el control del lienzo para un ajuste más fino. | Según el tipo de componente |
| Obligatorio | Interruptor Sí/No | Opcional | El campo debe rellenarse. | Desactivado |
| Ocultar si está vacío | Interruptor Sí/No | Opcional | Deja el campo fuera del informe impreso cuando no tiene valor. | Desactivado |
| Salto de página antes de este campo | Interruptor Sí/No | Opcional | Inicia una página nueva. | Desactivado |
| Campo de diagnóstico final | Interruptor Sí/No | Opcional | Marca el campo que contiene el diagnóstico final. Una plantilla solo puede tener uno. | Desactivado |
| Incluir en la exportación FHIR | Interruptor Sí/No | Opcional | Se guarda con el campo. No hay ninguna pantalla de exportación FHIR construida; consulte el [Capítulo 7](#ch7). | Desactivado |
| Mostrar cuando (visibilidad) | Lista de condiciones con Y/O | Opcional | Condiciones sobre otros campos: es igual a, no es igual a, contiene, está vacío, no está vacío, mayor que, menor que, etc. | Siempre visible |
| Posición de la etiqueta | Opción: Encima del campo, Junto al campo, Oculta | Opcional | Formato de la etiqueta. | Encima |
| Tamaño de fuente de la etiqueta (pt), Negrita, Subrayado, Transformación del texto | Número e interruptores | Opcional | Formato de etiqueta a nivel de componente. Prevalece sobre los estilos de la plantilla y del laboratorio. | Heredado |
| Clave de vinculación | Texto | Obligatorio en los campos vinculados | El campo de datos del caso que lee un campo de texto, de lista desplegable, de número, de fecha, de imagen o un párrafo de datos. | Ninguna |
| Campo de texto: marcador de posición, longitud máxima, patrón de validación (regex) | Texto, número, texto | Opcional | Límites de entrada de un campo de texto. | En blanco |
| Lista desplegable: opciones | Un `value|Label` por línea | Obligatorio | Las opciones. | En blanco |
| Lista desplegable: permitir selección múltiple, permitir entrada de texto libre | Interruptores | Opcional | | Desactivados |
| Número: unidad, opciones de unidad, decimales, mínimo, máximo | Texto y números | Opcional | | En blanco |
| Fecha: formato, usar la fecha de hoy de forma predeterminada | Opción: Fecha, Fecha y hora, Solo año; interruptor | Opcional | | Fecha, desactivado |
| Calculado: expresión, tipo de salida, unidad | Texto; opción Texto, Número, Fecha | Obligatorio | Un valor calculado a partir de otros campos. | Ninguno |
| Etiqueta estática: texto, variante, negrita, cursiva | Texto; opción Título 1, 2, 3, Cuerpo, Pie de ilustración | Obligatorio | Título o texto fijo. | Cuerpo |
| Bloque de texto enriquecido: contenido, tamaño de fuente (px), alineación del texto | Texto, número, opción Izquierda, Centro, Derecha | Opcional | Prosa fija, igual en todos los informes. | En blanco |
| Párrafo de datos: clave de vinculación, formato de texto enriquecido, permitir que la IA escriba este párrafo | Texto e interruptores | Opcional | Una ranura que se rellena con datos del caso. | Escritura por IA desactivada |
| Imagen incrustada: clave de vinculación o URL de imagen estática, texto alternativo, pie de imagen, alineación, ancho, alto (px) | Texto, números | Opcional | La dirección de una imagen alojada, nunca un archivo cargado. | Tamaño automático |
| Sección: encabezado de impresión, plegable, iniciar plegada | Texto e interruptores | Opcional | Un grupo de campos. | Desactivado |
| Diseño de columnas: número de columnas, espacio entre columnas (px) | Números | Opcional | Las columnas entre las que fluye el contenido. | Ninguno |
| Grupo repetido: iterar sobre, alias del elemento, mínimo de elementos, máximo de elementos | Texto, números | Opcional | Repite su contenido para cada elemento de una lista. | Ninguno |
| Bloque Si: mostrar elementos secundarios cuando, rama Si no | Lista de condiciones | Opcional | Muestra el contenido cuando se cumple la condición. | Ninguno |
| Bloque Según: según, casos (etiqueta del caso, cuando) | Campo y lista de condiciones | Opcional | Muestra el contenido del caso que coincide. | Ninguno |
| Salto de página: comportamiento del salto | Opción: Automático, Saltar siempre, Evitar el salto | Opcional | | Automático |
| Referencia de plantilla: ID de la plantilla referenciada, nombre, anulaciones de contexto | Texto | Opcional | Inserta el contenido de otra plantilla. | Ninguna |
| Encabezado: mostrar logotipo del centro, mostrar nombre del paciente, mostrar número de acceso, ámbito de página, altura (px), HTML personalizado | Interruptores, opción Todas las páginas, Solo página 1, Solo páginas 2+; número; texto | Opcional | Interruptores de contenido del encabezado. | Desactivados, todas las páginas |
| Pie de página: mostrar números de página, formato del número de página, ámbito de página, altura (px), HTML personalizado | Interruptor, texto, opción, número, texto | Opcional | Interruptores de contenido del pie de página. | Desactivados, todas las páginas |
| Generación con IA: activar la generación asistida por IA, instrucción del sistema, temperatura, máximo de tokens | Interruptor, texto, número, número | Opcional | Ajustes de IA por sección que utiliza el modo Orquestación. Se configuran en el [Capítulo 5](#ch5). | Desactivada |

**7. Permisos.** Abrir: `screen:configuration:open`. Crear, guardar, duplicar, eliminar, archivar: `config:report-template:manage`. Publicar: `config:report-template:publish`. Ambas son de riesgo alto y se auditan. Los titulares son los mismos que en la biblioteca de partes.
**Límites conocidos.** Las comprobaciones del diagnóstico final se ejecutan en el editor antes de publicar. El ciclo de vida de las plantillas aquí es Borrador, Publicada, Archivada; no hay un paso de revisión como el de las plantillas sinópticas (consulte [Revisión de plantillas](#screen-template_governance)).

### Reglas de enrutamiento {#screen-templates-routing}
Breadcrumb: Inicio > Configuración > Plantillas de informe > Reglas de enrutamiento

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Plantillas de informe** > subpestaña **Reglas de enrutamiento**
**2. Elemento de mantenimiento:** Reglas de enrutamiento de plantillas

**3. Finalidad de negocio y alcance.** Las reglas anulan la cadena predeterminada (protocolo, después subespecialidad, después el estándar de referencia) para centros, médicos o protocolos sinópticos concretos. Una **Correspondencia de protocolo** permite asociar un protocolo sinóptico nuevo o modificado a una plantilla sin esperar a una versión del software. Esta pantalla no es la misma que [Reglas de enrutamiento](#screen-routing_rules) en Sistema, que envía los casos a los patólogos.

**4. Requisitos previos y dependencias.** Las reglas apuntan a plantillas publicadas, centros, médicos y protocolos. Si omite las plantillas, la lista de plantillas de informe está vacía. Una correspondencia de protocolo se elige entre los protocolos de la Biblioteca sinóptica, por lo que resulta más útil después del trabajo de la [Cola de revisión](#screen-protocols-review); una regla se puede añadir más tarde.

Setup step: Tier 5, step 6
Requires: [Plantillas de informe](#screen-templates-templates), [Configuración de centros](#screen-clients), [Médicos](#screen-physicians)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: templates-routing - Reglas de enrutamiento de plantillas con las secciones de centro, médico y protocolo y el panel de prueba]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Excepciones de centro | Lista de reglas | Opcional | Paso 0 y paso 0a. Un centro afiliado sin regla propia utiliza la de su empresa matriz. | Ninguno |
| Preferencias de facultativos | Lista de reglas | Opcional | Paso 0b. | Ninguno |
| Correspondencias de protocolo | Lista de reglas | Opcional | Paso 1. Complementan la tabla de protocolos integrada y tienen prioridad sobre ella. | Ninguno (solo la tabla integrada) |
| Panel de prioridad | Lista de solo lectura | No aplica | Muestra cada paso y si lo define el administrador o este puede ampliarlo; se resalta el paso que resolvió la última prueba. | No aplica |
| Activar / Desactivar regla | Interruptor en cada fila | Opcional | Una regla desactivada se omite. | Activada |
| Eliminar | Botón con confirmación | No aplica | | No aplica |

#### Añadir o editar una regla {#ch6-routing-rule-window}
Breadcrumb: Inicio > Configuración > Plantillas de informe > Reglas de enrutamiento > Añadir regla

[SCREENSHOT PLACEHOLDER: templates-routing-rule - Ventana Añadir regla de enrutamiento de centro]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Centro, médico o protocolo | Lista de selección | Obligatorio | La entidad a la que se aplica la regla. La etiqueta sigue a la sección que abrió. | Ninguno |
| Laboratorio ejecutor | Opción: Global (todos los laboratorios ejecutores) o un laboratorio | Opcional | Una regla de un laboratorio se comprueba antes que una regla Global para los casos de ese mismo laboratorio. | Global |
| Plantilla de informe | Lista de selección de plantillas | Obligatorio | La plantilla que la entidad utiliza siempre. | Ninguno |
| Nota | Texto | Opcional | El motivo de la excepción. | En blanco |

#### Probar el enrutamiento de plantillas {#ch6-routing-test}
Breadcrumb: Inicio > Configuración > Plantillas de informe > Reglas de enrutamiento > Prueba

[SCREENSHOT PLACEHOLDER: templates-routing-test - Panel Probar el enrutamiento de plantillas]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Centro ejecutor | Lista de selección | Opcional | El centro del caso. | Cualquiera |
| Médico solicitante | Lista de selección | Opcional | | Cualquiera |
| Subespecialidad | Lista de selección | Opcional | | Cualquiera |
| ID de plantilla sinóptica | Lista de selección | Opcional | | Ninguno |
| Probar enrutamiento | Botón | No aplica | Muestra la plantilla elegida y el paso que la eligió. Un resultado ambiguo enumera los candidatos. | No aplica |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, cambiar, eliminar: `config:template-routing:manage` (riesgo alto, auditado). Admin y Lab Director la tienen; Template Author y Template Approver no.
**Límites conocidos.** Las tablas de subespecialidad y de estándar de referencia (pasos 2 y 3) están integradas y no se pueden editar aquí. La barrera del informe preliminar está integrada.

### Fuentes aprobadas {#screen-fonts}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Fuentes aprobadas

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Fuentes aprobadas

**3. Finalidad de negocio y alcance.** Controla qué fuentes ofrecen a los patólogos en su barra de herramientas los editores de texto libre (el editor de informes, el editor narrativo, los editores de macros y las ventanas de comentarios leen la lista). Una fuente desactivada se conserva en la lista, pero queda oculta para los usuarios. El conjunto es fijo: 14 fuentes en tres grupos. Aquí no se puede añadir el nombre de una fuente.

**4. Requisitos previos y dependencias.** Ninguno. Este ajuste solo filtra una barra de herramientas. No cambia la fuente predeterminada de los informes del laboratorio; esta se define en [Estilo del documento](#screen-document_style), que ofrece su propia lista más corta de siete fuentes y no lee esta lista.

Setup step: Tier 5, step 1
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-fonts - Fuentes aprobadas con búsqueda e interruptores por fuente]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar fuentes | Texto | Opcional | Filtra las 14 fuentes por nombre. | En blanco |
| Insignia de recuento | Texto de solo lectura, "N de 14 activadas" | No aplica | | No aplica |
| Interruptor de fuente (uno por fuente) | Interruptor Sí/No, que se muestra como Activo o Inactivo | Opcional | Activado significa que la fuente aparece en las barras de herramientas de los editores. El conjunto: Serif (Times New Roman, Georgia, Garamond, Palatino), Sans-Serif (Arial, Helvetica, Calibri, Verdana, Trebuchet MS, Tahoma, Roboto), Monospace (Courier New, Consolas, Lucida Console). | Activadas Arial, Times New Roman y Courier New; el resto desactivadas |
| Protección de la última fuente | Mensaje "Debe quedar activada al menos una fuente" | No aplica | La última fuente activada no se puede desactivar. | No aplica |

**7. Permisos.** Abrir: `screen:configuration:open`. Cambiar: `config:report-appearance:manage` (riesgo alto, auditado). Sin ella, la sección queda en gris y es de solo consulta. Admin y Lab Director la tienen de forma predeterminada.
**Límites conocidos.** Ninguno conocido.

### Estilo del documento {#screen-document_style}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Estilo del documento

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Estilo del documento

**3. Finalidad de negocio y alcance.** Define el estilo de texto predeterminado del laboratorio para el encabezado, el cuerpo y el pie de página de todos los informes, así como el tamaño de página y los márgenes de impresión del laboratorio. El panel Estilo de una plantilla anula el valor predeterminado para esa plantilla, y el formato de la etiqueta de un componente anula ambos. Los tamaños se guardan en puntos, el tamaño que se imprime, y nada se imprime por debajo de 8 pt. Un estilo guardado antes de que existieran los puntos se conserva en píxeles (cada píxel se imprime como 0,75 pt) y sigue imprimiéndose igual hasta que usted lo convierta.

**4. Requisitos previos y dependencias.** Ninguno. Hágalo antes de construir las plantillas, para que cada plantilla parta del valor predeterminado correcto.

Setup step: Tier 5, step 2
Requires: Ninguno, es un punto de partida.
Unlocks: [Biblioteca de partes](#screen-templates-parts), [Plantillas de informe](#screen-templates-templates)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-document_style - Estilo del documento con los estilos de encabezado, cuerpo y pie de página y la configuración de página]

**6. Referencia de campos.** Los mismos cinco campos de estilo aparecen una vez para el encabezado, el cuerpo y el pie de página.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Familia de fuentes (encabezado, cuerpo, pie de página) | Opción: Arial, Helvetica, Times New Roman, Georgia, Calibri, Verdana, Courier New | Opcional | La fuente predeterminada del informe para esa zona. | Arial |
| Tamaño de fuente (pt) | Número de puntos, mínimo 8 | Opcional | El tamaño impreso. Se muestra como "Tamaño de fuente (px, guardado antes de los puntos)" con una sugerencia cuando el estilo aún está en píxeles. | Cuerpo 10, encabezado 11, pie de página 10 |
| Negrita | Interruptor Sí/No | Opcional | | Encabezado activado; cuerpo y pie de página desactivados |
| Subrayado | Interruptor Sí/No | Opcional | | Desactivado |
| Transformación del texto | Opción: Tal como se escribe, Primera letra en mayúscula, MAYÚSCULAS | Opcional | | Tal como se escribe |
| Vista previa | Texto de muestra de solo lectura | No aplica | Muestra el estilo elegido en directo. | No aplica |
| Convertir a puntos | Botón, solo para un estilo guardado en píxeles | No aplica | Abre una confirmación que enumera cada tamaño y el tamaño al que se imprimirá. Los números no cambian y ahora significan puntos, por lo que el texto se imprime más grande. Queda registrado en el registro de auditoría. | No aplica |
| Tamaño de página | Opción: A4 (210 x 297 mm), US Letter (216 x 279), US Legal (216 x 356), A3 (297 x 420), B5 (176 x 250) | Opcional | El tamaño de papel del laboratorio. La vista previa de la plantilla se abre con él. | A4 |
| Margen superior, derecho, inferior e izquierdo (mm) | Número entero de 5 a 50 | Opcional | Márgenes de impresión. | Superior 25, derecho 20, inferior 25, izquierdo 20 |

**7. Permisos.** Abrir: `screen:configuration:open`. Cambiar: `config:report-appearance:manage` (riesgo alto, auditado), que se comprueba tanto en el servicio como en la pantalla. Admin y Lab Director la tienen.
**Límites conocidos.** El generador de informes de desarrollo (`functions/`) sigue imprimiendo en A4 y todavía no lee el tamaño de página del laboratorio; el ajuste se envía en los datos de generación para que lo pueda usar el servidor de producción. El tamaño de página y los márgenes son una política del laboratorio, determinada por el papel de la impresora, no una elección personal.

### Revisión de plantillas {#screen-template_governance}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Revisión de plantillas

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Revisión de plantillas

**3. Finalidad de negocio y alcance.** Define quién puede aprobar y publicar las **plantillas sinópticas** (la Biblioteca sinóptica) en este centro. No rige las plantillas de informe, que tienen su propio ciclo sencillo de borrador, publicación y archivo. Se aplican dos ajustes, más una regla fija: una plantilla sinóptica de diagnóstico no se puede publicar con una cobertura de SNOMED por debajo del 80 % a nivel de campo. Las plantillas de procedimiento, como las listas de verificación de tallado, están exentas porque nunca se codifican.

**4. Requisitos previos y dependencias.** Los roles integrados Template Author, Template Approver, Lab Director y Admin hacen el trabajo, por lo que primero se configuran los roles del personal. Si omite este paso, nadie puede aprobar una plantilla, porque la aprobación requiere las capacidades de aprobador.

Setup step: Tier 5, step 3
Requires: [Roles](#screen-staff-roles)
Unlocks: [Cola de revisión](#screen-protocols-review), [Protocolos activos](#screen-protocols-active)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-template_governance - Revisión de plantillas con autoaprobación y revisores necesarios]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Permitir la autoaprobación de plantillas | Interruptor Sí/No | Opcional | Desactivado (recomendado): un autor no puede aprobar ni publicar una plantilla que ha creado o editado. Cada persona que ha guardado la plantilla cuenta como autor. Actívelo solo para consultas individuales, centros pequeños o pruebas. | Desactivado |
| Revisores necesarios | Opción: 1, 2 o 3 revisores independientes | Opcional | Aprobaciones que necesita una plantilla antes de poder publicarse. Cada una debe proceder de un Template Approver, Lab Director o Admin distinto que no sea uno de sus autores (salvo que la autoaprobación esté activada). | 1 |
| Umbral de SNOMED | Texto de solo lectura, 80 % | No aplica | Se muestra en el subtítulo. No es editable. | 80 % |

**7. Permisos.** Abrir: `screen:configuration:open`. Cambiar: `config:template-governance:manage` (riesgo alto, auditado; el cambio se registra con los valores anterior y nuevo). Admin la tiene de forma predeterminada; Lab Director no, así que concédasela en Personal > Roles si el Lab Director debe gestionarla. Sin ella, la pantalla muestra un aviso de que puede ver los ajustes pero no cambiarlos.
**Límites conocidos.** Ninguno conocido.

## Configuración del módulo de informes sinópticos del CAP {#ch6-synoptic}
Breadcrumb: Inicio > Configuración > Biblioteca sinóptica

La Biblioteca sinóptica contiene las listas de verificación estructuradas (protocolos) que los patólogos rellenan para los informes oncológicos y de otro tipo. Es independiente de las plantillas de informe: un protocolo define las preguntas y su codificación, una plantilla de informe define el aspecto de un informe. La pantalla Reglas de enrutamiento enlaza ambos.

**Qué hay realmente en la biblioteca hoy (léalo primero).** En los datos de demostración, el registro contiene 36 protocolos: 32 Publicados, 3 En revisión y 1 Borrador. Por origen, 23 son `Custom` y 13 son `PathScribe`. **Ninguno es una lista de verificación con licencia del CAP ni del RCPath.** Los nombres CAP, RCPath e ICCR existen solo como etiquetas de origen en la ventana Cargar y como nombres de organismos reguladores. Las 19 entradas llamadas "Generic Template" (mama, pulmón, próstata, colon, riñón, Wilms, melanoma y otras) son marcadores de posición en la versión `0.1.0-generic`. El resto son dos formularios sinópticos genéricos de prueba, formularios de PathScribe como los de Mohs y vaciamiento cervical, formularios de hígado médico, placenta y trasplante renal, el examen macroscópico de autopsia, las tres rutas de tallado de referencia y cinco sistemas de informe de citología (Bethesda de tiroides, Milán de glándulas salivales, París de vías urinarias, Papanicolaou pancreatobiliar, PAAF de ganglio linfático). Un hospital que necesite un protocolo del CAP debe obtenerlo con la licencia del propio CAP e incorporarlo por las vías que se indican a continuación.

**Cómo entra y sale una versión de un protocolo.**

| Paso | Estado | Qué existe |
|---|---|---|
| Importar un archivo de protocolo de PathScribe (JSON) | Construido | **Cargar protocolo** lee el archivo, lo comprueba y lo guarda como borrador. Después pasa por la revisión como cualquier otro borrador. |
| Comprobar una lista de verificación electrónica del CAP (eCC, XML SDC) o un libro de Excel | Parcial | Se comprueba el formato del archivo y se muestra el número de secciones y de preguntas. Todavía no se puede importar, y el contenido no se verifica con el CAP ni con el RCPath. |
| Crear un protocolo en el editor | Construido | **Crear / personalizar** parte de cero o de una copia de un protocolo existente. |
| Cargar una versión nueva de un protocolo existente | Construido | **Nueva versión** abre el editor con el siguiente número de versión. Al publicarla se archiva la versión de la que procede. |
| Sincronización nocturna automática de las actualizaciones del CAP, el RCPath o el ICCR | No construido | La pantalla Organismos reguladores tiene un interruptor de Sincronización automática por organismo, y la ventana Cargar y los textos de notificación mencionan una sincronización nocturna, pero en esta versión no existe ningún trabajo de sincronización y ninguno figura en la lista de trabajos del servidor. El contrato de notificaciones (`TEMPLATE_NOTIFICATIONS_API.md`) describe los mensajes que enviaría un futuro trabajo de sincronización. Hasta entonces, cargue las actualizaciones a mano. |
| Retirar un protocolo | Construido | **Archivar** lo quita de los informes nuevos; los informes ya escritos conservan su contenido. **Restaurar como borrador** lo devuelve para revisarlo y volver a publicarlo. |

**Ciclo de vida.** Borrador, En revisión, Requiere cambios, Aprobado, Publicado, Archivado. Los nombres de las acciones siguen al origen: para el CAP el paso de aprobación es **Aceptar** y el de publicación **Liberar**; para el RCPath son **Ratificar** y **Publicar**; para Custom, PathScribe e ICCR son **Aprobar** y **Publicar**. La gobernanza (autoaprobación, número de revisores, regla del 80 % de SNOMED) se define en [Revisión de plantillas](#screen-template_governance).

### Pestaña Biblioteca sinóptica {#screen-tab-protocols}
Breadcrumb: Inicio > Configuración > Biblioteca sinóptica

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Biblioteca sinóptica**
**2. Elemento de mantenimiento:** La propia pestaña, con tres subpáginas: **Protocolos activos** (Listas de verificación validadas y en uso), **Cola de revisión** (Pendiente de aprobación) y **Todos los protocolos** (Biblioteca completa).

**3. Finalidad de negocio y alcance.** Un solo lugar para todo el ciclo de vida de los protocolos. La pestaña no tiene campos propios; sus tres entradas de navegación abren las subpáginas siguientes.

**4. Requisitos previos y dependencias.** Se abre para cualquiera que tenga `screen:configuration:open`. Los organismos reguladores que aparecen en la biblioteca se definen en [Organismos reguladores](#screen-governing_bodies).

Setup step: Reference, not part of setup
Requires: [Organismos reguladores](#screen-governing_bodies)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: tab-protocols - Pestaña Biblioteca sinóptica con Protocolos activos, Cola de revisión y Todos los protocolos]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Protocolos activos | Entrada de navegación, "Listas de verificación validadas y en uso" | No aplica | Abre [Protocolos activos](#screen-protocols-active). | Seleccionada |
| Cola de revisión | Entrada de navegación, "Pendiente de aprobación" | No aplica | Abre la [Cola de revisión](#screen-protocols-review). | No seleccionada |
| Todos los protocolos | Entrada de navegación, "Biblioteca completa" | No aplica | Abre [Todos los protocolos](#screen-protocols-all). | No seleccionada |

**7. Permisos.** Abrir: `screen:configuration:open`. Las acciones utilizan las capacidades de protocolo que se enumeran en cada subpágina.
**Límites conocidos.** Ninguno conocido.

### Cola de revisión {#screen-protocols-review}
Breadcrumb: Inicio > Configuración > Biblioteca sinóptica > Cola de revisión

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Biblioteca sinóptica** > **Cola de revisión**
**2. Elemento de mantenimiento:** Protocolos a la espera de publicación

**3. Finalidad de negocio y alcance.** Enumera todos los protocolos en un estado previo a la publicación (En revisión, Requiere cambios, Aprobado), agrupados por categoría anatómica, con un recuadro de recuento para cada estado. Un banner repite la regla: las plantillas necesitan al menos un 80 % de cobertura de SNOMED y la aprobación clínica antes de publicarse. Haga clic en una tarjeta para abrir el revisor (En revisión, Aprobado) o el editor (Requiere cambios). Los protocolos en borrador no aparecen aquí; búsquelos en Todos los protocolos.

**4. Requisitos previos y dependencias.** Necesita los ajustes de revisión y los roles que hacen el trabajo. Si los omite, se rechaza la aprobación porque la persona no tiene la capacidad, o porque un único autor intenta aprobar su propio trabajo.

Setup step: Tier 5, step 7
Requires: [Revisión de plantillas](#screen-template_governance), [Roles](#screen-staff-roles), [Organismos reguladores](#screen-governing_bodies)
Unlocks: [Protocolos activos](#screen-protocols-active)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: protocols-review - Cola de revisión con recuentos por estado y tarjetas]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar | Texto | Opcional | Coincide con el nombre, la categoría o el origen del protocolo. | En blanco |
| Recuadros de estado | Recuentos de solo lectura: En revisión, Requiere cambios, Aprobado | No aplica | | No aplica |
| Cargar protocolo | Botón | No aplica | Abre la [ventana Cargar](#ch6-upload-window). | No aplica |
| Crear / personalizar | Botón | No aplica | Abre la [ventana Crear](#ch6-build-window). | No aplica |
| Tarjeta: nombre, versión, insignia de origen, tipo, propietario | Texto de solo lectura | No aplica | Datos del protocolo. | No aplica |
| Tarjeta: insignia del ciclo de vida | Solo lectura: En revisión, Requiere cambios, Aprobado | No aplica | | No aplica |
| Tarjeta: nota de revisión | Texto de solo lectura | No aplica | La última nota del revisor, con un marcador de devolución o de advertencia. | En blanco |
| Acción de la tarjeta | Abre el revisor ("Abrir revisor" o "Abrir el revisor para publicar" cuando está Aprobado) o el editor ("Abrir el editor para atender los cambios") | No aplica | | No aplica |

#### Acciones del revisor {#ch6-reviewer-actions}
La página del revisor (que se abre desde una tarjeta) mueve un protocolo entre estados. Cada movimiento pide confirmación y, en una devolución, un motivo.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Marcar En revisión | Botón | No aplica | Pone un borrador en la cola de revisión. | No aplica |
| Aprobar (CAP: Aceptar; RCPath: Ratificar) | Botón con confirmación y notas finales opcionales | Notas opcionales | Requiere `config:protocol:approve`. Una persona que ha creado o editado la plantilla no puede aprobarla salvo que la autoaprobación esté activada, y no puede aprobarla dos veces. | No aplica |
| Publicar (CAP: Liberar) | Botón con confirmación | No aplica | Requiere `config:protocol:publish`, el número exigido de aprobaciones independientes y al menos un 80 % de cobertura de SNOMED a nivel de campo para una plantilla de diagnóstico. Al publicarla, queda disponible para todos los patólogos a la vez. | No aplica |
| Requiere cambios | Botón con motivo obligatorio | Motivo obligatorio | Devuelve el protocolo al autor. Requiere `config:protocol:approve`. | No aplica |
| Restablecer a borrador | Botón | No aplica | Devuelve un protocolo a borrador. | No aplica |

**7. Permisos.** Redactar, importar, crear, guardar, enviar: `config:protocol:draft`. Aprobar y devolver para cambios: `config:protocol:approve`. Publicar: `config:protocol:publish`. Retirar (archivar, restaurar): `config:protocol:retire`. Todas de riesgo alto y auditadas. Template Author tiene redactar; Template Approver tiene aprobar, publicar y retirar; Admin tiene las cuatro; Lab Director tiene todas menos redactar. Enviar, devolver, aprobar y publicar envían cada uno una notificación (a los aprobadores, al autor, etc.).
**Límites conocidos.** El revisor y el editor son páginas completas independientes (`/template-review/:id`, `/template-editor/:id`). Su referencia campo por campo no forma parte de las 15 pantallas de este capítulo; consulte los [campos del editor de plantillas](#ch6-protocol-editor).

### Protocolos activos {#screen-protocols-active}
Breadcrumb: Inicio > Configuración > Biblioteca sinóptica > Protocolos activos

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Biblioteca sinóptica** > **Protocolos activos**
**2. Elemento de mantenimiento:** Protocolos publicados

**3. Finalidad de negocio y alcance.** Las listas de verificación que se ofrecen actualmente en el flujo de informes sinópticos (estado Publicado), agrupadas por categoría y filtradas por Anatomía Patológica quirúrgica, Citología no ginecológica, Citología ginecológica o Tallado. Haga clic en una fila para desplegarla y ver las estadísticas, el seguimiento del ciclo de vida y las acciones.

**4. Requisitos previos y dependencias.** Los protocolos llegan a esta lista al publicarse desde la cola de revisión, por lo que primero se trabaja la cola. Si la omite, la lista está vacía ("No se encontraron protocolos").

Setup step: Tier 5, step 8
Requires: [Cola de revisión](#screen-protocols-review), [Organismos reguladores](#screen-governing_bodies)
Unlocks: [Reglas de enrutamiento](#screen-templates-routing)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: protocols-active - Protocolos activos agrupados por categoría con una fila desplegada]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtro de grupo | Opción: Todos, Anatomía Patológica quirúrgica, Citología no ginecológica, Citología ginecológica, Tallado, cada una con un recuento | Opcional | | Todos |
| Buscar | Texto | Opcional | Coincide con el nombre, la categoría o el origen. | En blanco |
| Cargar protocolo | Botón | No aplica | Abre la [ventana Cargar](#ch6-upload-window). | No aplica |
| Crear / personalizar | Botón | No aplica | Abre la [ventana Crear](#ch6-build-window). | No aplica |
| Fila: nombre, versión, insignia de origen, tipo, insignia del ciclo de vida | Texto de solo lectura | No aplica | | No aplica |
| Secciones | Número de solo lectura | No aplica | Una estimación: el número de campos dividido entre 7, redondeado, con un mínimo de 1. No es un recuento de las secciones reales del protocolo. | No aplica |
| Campos | Número de solo lectura | No aplica | | No aplica |
| Última modificación | Texto de solo lectura | No aplica | | No aplica |
| Propietario | Texto de solo lectura | No aplica | | No aplica |
| Cobertura de SNOMED CT, cobertura de ICD-10/11 | Barras de solo lectura, porcentaje | No aplica | Cobertura de codificación a nivel de campo. | No aplica |
| Ver protocolo | Botón | No aplica | Abre el revisor de solo lectura. | No aplica |
| Duplicar | Botón | No aplica | Abre el editor con una copia (un protocolo nuevo). | No aplica |
| Exportar JSON | Botón | No aplica | Descarga el protocolo como un archivo JSON de PathScribe; la exportación queda auditada. | No aplica |
| Nueva versión | Botón | No aplica | Abre el editor con la versión siguiente. Al publicar la versión nueva se archiva esta. | No aplica |
| Archivar | Botón con confirmación | No aplica | Lo quita de los informes nuevos. Un protocolo publicado muestra una advertencia más severa. Los informes ya escritos conservan su contenido. Requiere `config:protocol:retire`. | No aplica |

**7. Permisos.** Igual que para la [Cola de revisión](#screen-protocols-review). Para ver y exportar basta con la pantalla.
**Límites conocidos.** La cifra de Secciones es una estimación.

### Todos los protocolos {#screen-protocols-all}
Breadcrumb: Inicio > Configuración > Biblioteca sinóptica > Todos los protocolos

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Biblioteca sinóptica** > **Todos los protocolos**
**2. Elemento de mantenimiento:** La biblioteca completa

**3. Finalidad de negocio y alcance.** Todos los protocolos en todos los estados, agrupados por categoría. Es el único lugar donde se encuentran los borradores y los protocolos archivados y donde se puede restaurar uno archivado.

**4. Requisitos previos y dependencias.** Ninguno, salvo que la biblioteca tenga contenido.

Setup step: Reference, not part of setup
Requires: [Cola de revisión](#screen-protocols-review)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: protocols-all - Todos los protocolos con botones de filtro de estado]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtro de estado | Opción: Todos, Publicado, Aprobado, En revisión, Requiere cambios, Borrador, Archivado, cada uno con un recuento | Opcional | **Todos** oculta los protocolos archivados; solo aparecen en **Archivado**. | Todos |
| Buscar | Texto | Opcional | Coincide con el nombre, la categoría o el origen. | En blanco |
| Cargar protocolo, Crear / personalizar | Botones | No aplica | Como arriba. | No aplica |
| Fila: nombre, versión, origen, tipo, insignia del ciclo de vida, nota de revisión | Solo lectura | No aplica | | No aplica |
| Abrir revisor | Botón, no en Publicado ni Archivado | No aplica | | No aplica |
| Abrir editor | Botón, no en Publicado ni Archivado | No aplica | | No aplica |
| Duplicar, Exportar JSON, Archivar | Botones | No aplica | Como en Protocolos activos (Duplicar y Archivar no se ofrecen en una fila archivada). | No aplica |
| Restaurar como borrador | Botón, solo en las filas archivadas | No aplica | Devuelve un protocolo archivado como borrador; debe pasar de nuevo por la revisión. | No aplica |

**7. Permisos.** Igual que para la Cola de revisión.
**Límites conocidos.** Ninguno conocido.

#### Ventana Cargar {#ch6-upload-window}
Breadcrumb: Inicio > Configuración > Biblioteca sinóptica > Cargar protocolo

[SCREENSHOT PLACEHOLDER: protocols-upload - Ventana Cargar protocolo con el organismo regulador y la zona para soltar el archivo]

Subtítulo: "Carga manual, el recurso si la sincronización nocturna omite una actualización". Una advertencia indica que un protocolo importado se guarda como borrador y que debe enviarse a revisión y aprobarse antes de poder publicarse.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Organismo regulador | Opción: CAP, RCPath, ICCR, RCPA, Otro | Obligatorio | Se registra como origen del borrador. | CAP |
| Archivo | Archivo JSON, XML o XLSX, de hasta 10 MB, soltado o buscado | Obligatorio | Se lee y se comprueba en cuanto se elige. | Ninguno |
| Resultado de la comprobación del formato | Lista de solo lectura | No aplica | Indica si el formato es válido, enumera los problemas y siempre señala que el contenido no está verificado con el CAP ni con el RCPath. Solo se puede importar un protocolo JSON de PathScribe. Un formulario XML eCC (SDC) del CAP o un libro de Excel se comprueba, pero "se puede comprobar aquí, aunque todavía no importar". | No aplica |
| Importar como borrador | Botón | No aplica | Guarda el borrador. Se rechaza si ya existe un protocolo con el mismo nombre o si falta `config:protocol:draft`. | Desactivado hasta que el archivo se pueda importar |

#### Ventana Crear / personalizar {#ch6-build-window}
Breadcrumb: Inicio > Configuración > Biblioteca sinóptica > Crear / personalizar

[SCREENSHOT PLACEHOLDER: protocols-build - Ventana Crear / personalizar]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Empezar desde cero | Opción | Opcional | Abre el editor con una plantilla en blanco. | No aplica |
| Búsqueda de plantilla existente | Texto | Opcional | Busca por nombre, origen o categoría. | En blanco |
| Plantilla existente | Opción entre las de la biblioteca, cada una con su versión y su número de campos | Opcional | La plantilla que se va a copiar. | Ninguno |
| Personalizar esta plantilla | Botón | No aplica | Abre el editor con una copia. | No aplica |

#### Campos del editor de plantillas {#ch6-protocol-editor}
Breadcrumb: Inicio > Configuración > Biblioteca sinóptica > Editor de plantillas

[SCREENSHOT PLACEHOLDER: protocols-editor - Editor de plantillas sinópticas con metadatos, secciones y campos]

El editor es una página completa. Su bloque **Metadatos de la plantilla** figura a continuación; las secciones y los campos tienen otros muchos ajustes (tipo de campo, opciones de respuesta con codificación SNOMED e ICD, condiciones, reglas de recuento, funciones de notificación pT, pN, pM, estadio FIGO e identificador de bloque). La referencia completa de esa página es una cuestión pendiente de la guía.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre de la plantilla | Texto | Obligatorio | Debe ser único entre los protocolos no archivados. | En blanco |
| Categoría anatómica | Opción entre botones de categoría | Opcional | Agrupa el protocolo en las listas. | En blanco |
| Fuente / organismo regulador | Opción entre botones de fuente | Obligatorio | Decide los nombres de las acciones (Aceptar, Ratificar, Aprobar). | Personalizado |
| Estándar de notificación | Texto | Opcional | Para los sistemas de citología, por ejemplo la edición de Bethesda. | En blanco |
| Edición de estadificación | Texto | Opcional | Por ejemplo `AJCC 8th`. | En blanco |
| Versión | Números mayor, menor y de revisión con botones para incrementarlos | Obligatorio | Se incrementa automáticamente con Nueva versión. | `1.0.0` |
| Guardar borrador | Botón | No aplica | Requiere `config:protocol:draft`. | No aplica |
| Enviar a revisión | Botón con confirmación | No aplica | Pasa la plantilla a la Cola de revisión y avisa a los administradores y a los responsables clínicos. No se puede editar hasta que se devuelva. | No aplica |

## Motor de informes programados y reglas de distribución automática {#ch6-scheduled-delivery}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento

Tres ajustes deciden qué ocurre con un informe tras la firma: las **Reglas de configuración de entrega** eligen los canales, las **Reglas de enrutamiento de destinos de impresión** eligen la impresora para el canal de impresión y las **Programaciones de entrega** eligen la hora. Una cuarta pantalla, **Mis exportaciones**, enumera los archivos que una persona ha solicitado.

**Estado de los canales, uno por uno.**

| Canal | Estado | Qué existe hoy |
|---|---|---|
| Fax | Construido | Una regla de entrega puede fijar un canal en Fax electrónico con un número de fax (de 7 a 15 dígitos, con un `+` inicial opcional). PathScribe envía el PDF firmado y sus datos al servidor de interfaces como un mensaje `REPORT_DELIVERY`; el servidor lo entrega a una pasarela de correo a fax. La pasarela se configura en el servidor, no en PathScribe. Si el servidor no tiene canal de fax, responde 503 y la entrega falla con ese motivo. Contrato: `REPORT_DELIVERY_API.md`; receptor de desarrollo: `functions/report_delivery.py`. Tamaño máximo del PDF: 20 MB. |
| Portal | No construido | Las reglas de entrega no tienen ningún canal de portal. El registro del centro tiene una opción **Método de entrega** (Correo electrónico, Fax, Portal, HL7) que se almacena, pero nada la lee cuando se envía un informe. |
| Correo electrónico seguro | Demostración | No es un canal de las reglas de entrega. Una persona inicia desde una ventana un mensaje seguro vinculado a un caso; se entrega en la [Bandeja de salida de correo simulada](#screen-simulated_mail) y no sale nada del edificio. No hay conectado ningún canal de correo real. |
| Cola de impresión | Construido | El canal de impresión crea un trabajo de impresión. La impresora procede de las reglas de enrutamiento de impresión o, si no, del destino predeterminado del propio centro. Los trabajos se gestionan en la pantalla Cola de impresión (véase la [Parte 4](#ch6-batch-jobs)). |
| Electrónica (mensaje de resultado) | Construido | El mensaje de resultado al motor de interfaces. Es el canal predeterminado cuando no coincide ninguna regla. |
| Depósito de archivos | Construido | El servidor escribe el PDF en una carpeta o en un destino SFTP. La regla nombra el destino; el servidor guarda su dirección y sus credenciales de acceso. |

### Reglas de configuración de entrega {#screen-delivery_rules}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Reglas de configuración de entrega

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Reglas de configuración de entrega

**3. Finalidad de negocio y alcance.** Decide cómo se envía cada informe liberado: mediante el mensaje de resultado, impreso, por fax, depositado en un destino de archivos o retenido para su recogida manual. Una regla coincide según el profesional, el centro solicitante, la ubicación del paciente (punto de atención) y el tipo de informe. Gana la regla que coincide con más campos. Cuando nada coincide, el informe se envía **Solo electrónica**. La pantalla contiene además el ajuste de reintento automático del centro y un panel de prueba.

**4. Requisitos previos y dependencias.** Las reglas apuntan a profesionales, centros y ubicaciones, y un canal de impresión necesita un lugar donde imprimir. Si omite los centros y los médicos, las listas de criterios están vacías. Si omite el enrutamiento de impresión, un trabajo de impresión recurre al destino predeterminado del propio centro.

Setup step: Tier 5, step 10
Requires: [Configuración de centros](#screen-clients), [Médicos](#screen-physicians), [Reglas de enrutamiento de destinos de impresión](#screen-print_routing_rules)
Unlocks: [Programaciones de entrega](#screen-delivery_schedules)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-delivery_rules - Reglas de configuración de entrega con la tabla de reglas, el ajuste de reintentos y el panel de prueba]

**6. Referencia de campos.**

Controles de la pantalla:

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Tabla de reglas: Criterios, Canales, Nota | Lista de solo lectura | No aplica | Los criterios se leen como Profesional, Centro, Ubicación e Informe, o "Coincide con todos los casos (prioridad más baja)". Los canales se leen como listas Primario, Secundario y Respaldo, o "No se envía nada". | Vacía: todos los casos se resuelven en Solo electrónica |
| Añadir regla | Botón | No aplica | Abre la ventana de la regla. | No aplica |
| Editar, Eliminar | Botones de fila | No aplica | | No aplica |
| Reintentos automáticos: espera antes de cada uno (minutos) | Minutos enteros separados por comas, cada uno de 1 a 1.440, como máximo 10 | Opcional | Una impresión, un fax o un depósito de archivos que falla se reintenta tras cada espera por turno. Después del último intento pasa a las excepciones de entrega, se envía un mensaje a Admin y Lab Director y se envían los canales de respaldo de la regla. En blanco significa sin reintentos. | `1, 5, 15` |
| Guardar reintentos | Botón | No aplica | Requiere `config:delivery-rules:manage`. | No aplica |

#### Añadir o editar una regla de entrega {#ch6-delivery-rule-window}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Reglas de configuración de entrega > Añadir regla

[SCREENSHOT PLACEHOLDER: system-delivery_rules-edit - Ventana Añadir regla de entrega con criterios y canales]

Todos los criterios son opcionales. Una regla sin ninguno coincide con todos los casos, pero solo como la coincidencia de prioridad más baja. La ventana lo advierte.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Profesional | Lista de selección de médicos | Opcional | | Cualquier profesional |
| Centro solicitante | Lista de selección de centros | Opcional | | Cualquier centro |
| Ubicación del paciente (punto de atención) | Lista de selección de ubicaciones | Opcional | | Cualquier ubicación |
| Tipo de informe | Opción: Preliminar, Definitivo, Corregido, Adenda | Opcional | | Cualquier tipo de informe |
| Canal: Electrónica (mensaje de resultado al motor de interfaz) | Opción: Desactivado, Primario, Secundario, Respaldo | Opcional | Los canales primarios y secundarios se envían a la vez. Los canales de respaldo se envían cuando una impresión, un fax o un depósito de archivos primario no tiene destino o sigue fallando tras sus reintentos. | Desactivado |
| Canal: Impresión | Igual | Opcional | | Desactivado |
| Canal: Fax electrónico | Igual | Opcional | | Desactivado |
| Canal: Depósito de archivos | Igual | Opcional | | Desactivado |
| Número de fax | Texto, de 7 a 15 dígitos con un `+` opcional | Opcional | Déjelo en blanco para enviar el fax al médico solicitante o, si no tiene número de fax, al centro solicitante. | En blanco |
| Destino del depósito de archivos | Texto, el nombre del destino tal como está configurado en el servidor de interfaz | Obligatorio cuando el depósito de archivos está activado | La carpeta o el servidor SFTP y sus credenciales de acceso se guardan en el servidor, no en PathScribe. | En blanco |
| Nota | Texto | Opcional | Por qué existe la regla. | En blanco |

Se rechaza un respaldo sin canal primario ("Un respaldo necesita un canal primario del que depender"). También se rechaza un número de fax que no tenga de 7 a 15 dígitos, o un depósito de archivos sin destino.

#### Probar la resolución de entrega {#ch6-delivery-test}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Reglas de configuración de entrega > Prueba

[SCREENSHOT PLACEHOLDER: system-delivery_rules-test - Panel Probar la resolución de entrega]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Profesional, Centro solicitante, Ubicación del paciente, Tipo de informe | Selectores, como arriba | Opcional | Los datos del caso que se van a probar. | Cualquiera |
| Resolver | Botón | No aplica | Muestra la regla coincidente, la acción resuelta (Solo electrónica, Solo impresión, Entrega dual, Suprimir) y el plan de canales. Si no hay coincidencia, indica que se aplica el valor predeterminado Solo electrónica. | No aplica |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, cambiar y eliminar reglas y guardar los reintentos: `config:delivery-rules:manage` (riesgo alto, auditado). Admin y Lab Director la tienen. Para reenviar una entrega fallida se utilizan las pantallas Cola de impresión o Salida, con sus propias capacidades.
**Límites conocidos.** El fax y el depósito de archivos necesitan que el servidor de interfaces tenga configurados esos canales y destinos. El portal está No construido. El correo electrónico seguro no es un canal aquí.

### Programaciones de entrega {#screen-delivery_schedules}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Programaciones de entrega

**Estado:** Parcial

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Programaciones de entrega

**3. Finalidad de negocio y alcance.** Define **cuándo** sale cada cosa, por flujo, para toda la empresa, con una excepción opcional para un centro ejecutor. Cada registro de enfermedad tiene su propia programación. PathScribe decide cuándo puede un elemento salir de su cola; el motor de interfaces decide cómo se envía. Flujos: Entrega de informes, Entrega de facturación, Flujo de resultados, Flujo de admisiones (ADT), Flujo de accesión, Sincronización con el LIS, Registro. **Parcial:** la programación se almacena, se resuelve y se evalúa, y la cola de salida muestra la hora programada de cada elemento y el indicador del plazo de notificación. El contrato dice que el servidor de producción debe aplicar las mismas reglas antes de pasar un elemento; una versión de navegador o de desarrollo no retiene un envío hasta su hora.

**4. Requisitos previos y dependencias.** Una excepción de centro se elige entre los centros, por lo que estos van primero. Si lo omite, solo se puede definir la programación de la empresa.

Setup step: Tier 5, step 11
Requires: [Configuración de centros](#screen-clients), [Reglas de configuración de entrega](#screen-delivery_rules)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-delivery_schedules - Programaciones de entrega por flujo con ámbito de empresa y de centro]

**6. Referencia de campos.**

Controles de la pantalla:

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Programaciones para | Opción: Toda la empresa o un centro ejecutor | Opcional | El ámbito que se edita. | Toda la empresa |
| Tarjeta del flujo: resumen y origen | Texto de solo lectura | No aplica | El resumen se lee, por ejemplo, "Lote lun, mié a las 06:00 (America/New_York)". El origen se lee "Sin programación establecida: se envía inmediatamente", "Sigue la programación de la empresa" o "Establecida para este centro". | Enviado inmediatamente |
| Tarjetas de registro | Una tarjeta por registro de enfermedad | Opcional | Cada registro de enfermedad tiene su propia programación y nunca toma prestada la de otro. | Retener 240 minutos tras la firma; una modificación vuelve a poner en cola |
| Editar, Establecer para este centro, Seguir la empresa | Botones | No aplica | Crean o quitan una excepción de centro. Al quitarla, el centro sigue la programación de la empresa. | No aplica |

#### Editor de programaciones {#ch6-schedule-editor}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Programaciones de entrega > Editar

[SCREENSHOT PLACEHOLDER: system-delivery_schedules-edit - Editor de programaciones]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Cómo se envía | Opción: Enviar inmediatamente, Solo en las horas fijadas, En lote a horas fijas, Retener hasta la firma definitiva, En la firma, tras una retención para revisión | Obligatorio | | Enviar inmediatamente |
| Horas en que pueden enviarse los elementos | Filas de Días, Desde, Hasta (24 horas); Añadir horas / Quitar | Obligatorio para horas fijadas | Cada una debe terminar después de empezar, el mismo día. | Ninguno |
| Frecuencia (Con qué frecuencia) | Opción: Todos los días, Semanal, Mensual | Obligatorio para el lote | | Ninguno |
| Días de lote | Días de la semana de lun a dom | Obligatorio para semanal | | Ninguno |
| Días del mes | Números del 1 al 28, separados por comas | Obligatorio para mensual | | Ninguno |
| Horas de lote (24 horas) | Horas como `06:00, 22:00` | Obligatorio para el lote | | Ninguno |
| Hora de corte (opcional) | Hora, 24 horas | Opcional | Los elementos firmados después de esta hora en un día de ejecución esperan a la siguiente ejecución. En blanco usa la hora de ejecución. | En blanco |
| Retención para revisión (minutos tras la firma) | Número entero, de 1 a 10.080 | Obligatorio para la retención para revisión | Haga que coincida con la ventana de control de calidad y de modificaciones. | Ninguno |
| Días sin envío | Fechas `YYYY-MM-DD`, separadas por comas | Opcional | Por ejemplo, festivos. Se aplica a las horas fijadas y al lote. | En blanco |
| Zona horaria | Nombre IANA, por ejemplo `America/New_York` | Obligatorio | Las horas anteriores se interpretan en esta zona. | Ninguno |
| Plazo de notificación (días desde la firma) | Número entero, de 1 a 3.650 | Opcional | La cola señala los casos próximos (a menos de 3 días) o fuera de plazo. | En blanco |
| Una modificación devuelve el elemento a la cola | Interruptor Sí/No | Opcional | Un informe corregido se envía de nuevo con esta programación. Activado de forma predeterminada en los registros de enfermedad. | Desactivado, salvo en los registros de enfermedad |
| Guardar programación | Botón | No aplica | Se rechaza si no es válida o si falta el permiso. | No aplica |

#### Probar una programación {#ch6-schedule-test}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Programaciones de entrega > Probar una programación

[SCREENSHOT PLACEHOLDER: system-delivery_schedules-test - Panel Probar una programación]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Flujo | Opción entre los flujos | Obligatorio | | Ninguno |
| Centro ejecutor | Opción, o Ninguno (programación de la empresa) | Opcional | | Ninguno |
| Registro | Opción | Obligatorio para el flujo Registro | | Ninguno |
| Fecha y hora (en la zona horaria de la programación) | Fecha y hora | Obligatorio | | Ahora |
| El caso está firmado definitivamente | Sí/No | Opcional | | No |
| Firmado a las | Fecha y hora | Opcional | | En blanco |
| Comprobar | Botón | No aplica | Responde "Sale." o "Espera.", con el motivo y la siguiente oportunidad. | No aplica |

**7. Permisos.** Abrir: `screen:configuration:open`. Cambiar: `config:delivery-schedules:manage` (riesgo alto, auditado solo por flujo, centro, registro de enfermedad y tipo; sin datos del paciente). Admin y Lab Director la tienen.
**Límites conocidos.** Los destinos, los campos obligatorios, la aprobación de la puesta en marcha y el transporte de un registro de enfermedad pertenecen a la configuración propia de ese registro, no a la programación. Véase `DELIVERY_SCHEDULES_API.md`.

### Reglas de enrutamiento de destinos de impresión {#screen-print_routing_rules}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Reglas de enrutamiento de destinos de impresión

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Reglas de enrutamiento de destinos de impresión

**3. Finalidad de negocio y alcance.** Decide a qué impresora de red va el trabajo de impresión de un informe liberado. El ámbito de una regla es un nivel: **Estación de trabajo / usuario**, **Ubicación**, **Cuenta de cliente (centro solicitante)** o **Centro (laboratorio ejecutor)**. El nivel más específico con alguna regla activa que coincida prevalece por completo sobre los niveles menos específicos. Dentro de un nivel, una regla puede acotarse por muestra o tipo de caso y por desencadenante de evento. Cuando nada coincide, el trabajo va al destino predeterminado del propio centro.

**4. Requisitos previos y dependencias.** Una regla nombra una impresora a la que se llega mediante un agente del centro o por dirección, y un ámbito tomado de las estaciones de trabajo, las ubicaciones y los centros. Si omite los agentes del centro, solo se puede indicar la dirección de una impresora. Una regla de centro debe usar las impresoras del agente del propio centro.

Setup step: Tier 5, step 9
Requires: [Agentes del centro](#screen-site_agents), [Configuración de centros](#screen-clients), [Estaciones de trabajo](#screen-workstations)
Unlocks: [Reglas de configuración de entrega](#screen-delivery_rules)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-print_routing_rules - Reglas de enrutamiento de destinos de impresión con la tabla y el panel de prueba]

**6. Referencia de campos.**

Controles de la pantalla:

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Tabla de reglas: Ámbito, Criterios, Destino, Nota | Lista de solo lectura | No aplica | Los criterios se leen "Muestra: ...", "Desencadenante: ..." o "Coincide con todos los trabajos de este nivel". | Vacía: los trabajos usan el destino predeterminado de cada centro |
| Añadir regla, Editar, Eliminar | Botones | No aplica | | No aplica |

#### Añadir o editar una regla de enrutamiento de impresión {#ch6-print-rule-window}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Reglas de enrutamiento de destinos de impresión > Añadir regla

[SCREENSHOT PLACEHOLDER: system-print_routing_rules-edit - Ventana Añadir regla de enrutamiento de impresión]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nivel de ámbito | Opción: Estación de trabajo / usuario, Ubicación, Cuenta de cliente (centro solicitante), Centro (laboratorio ejecutor) | Obligatorio | | Ninguno |
| Ámbito | Id de la estación de trabajo o del usuario (texto, por ejemplo `ws-fgh-theatre2-01`), o una lista de selección de ubicaciones o centros | Obligatorio | Se muestra una advertencia cuando falta. | Ninguno |
| Muestra / tipo de caso | Opción: Cirugía de rutina, Biopsia intraoperatoria, Citología | Opcional | | Cualquier muestra o tipo de caso |
| Desencadenante de evento | Opción: Validación inicial, Validación modificada (corregida/adenda), Preliminar | Opcional | | Cualquier desencadenante de evento |
| Destino de impresión: Impresora | Opción: Impresora del agente del centro, o Dirección de la impresora (envío directo) | Obligatorio | Una dirección directa solo funciona desde un servidor de PathScribe dentro de la red del hospital; desde la nube utilice una impresora del agente del centro. | Ninguno |
| Centro (laboratorio ejecutor) | Lista de selección | Obligatorio para una impresora del agente del centro | | Ninguno |
| Impresora | Lista de selección de las impresoras de informes del agente del centro | Obligatorio para una impresora del agente del centro | Requiere permiso para ver las impresoras de ese centro. | Ninguno |
| Dirección | Dirección IP o nombre de host, sin `http://` ni ruta | Obligatorio para una dirección directa | | Ninguno |
| Protocolo | Opción: IPP, LPR/LPD, Raw (puerto 9100) | Obligatorio para una dirección directa | | Ninguno |
| Puerto | Número entero de 1 a 65535 | Opcional | | El predeterminado del protocolo |
| Ruta IPP | Texto | Opcional, solo IPP | | `/ipp/print` |
| Cola LPR | Texto | Opcional, solo LPR/LPD | | `lp` |
| Nombre | Texto | Opcional | Un nombre descriptivo para la impresora. | En blanco |
| Nota | Texto | Opcional | Por qué existe la regla. | En blanco |

#### Probar la resolución del destino de impresión {#ch6-print-test}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Reglas de enrutamiento de destinos de impresión > Prueba

[SCREENSHOT PLACEHOLDER: system-print_routing_rules-test - Panel Probar la resolución del destino de impresión]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| ID de estación de trabajo / usuario | Texto | Opcional | | En blanco |
| Ubicación, Centro solicitante, Centro ejecutor | Selectores | Opcional | | Cualquiera |
| Muestra / tipo de caso, Desencadenante de evento | Opciones | Opcional | | Cualquiera |
| Resolver | Botón | No aplica | Muestra la regla coincidente y su nivel, y el destino resuelto. Si no hay coincidencia, indica que el trabajo recurriría al destino predeterminado del centro. | No aplica |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, cambiar, eliminar: `config:print-routing:manage` (riesgo alto, auditado). Nombrar la impresora del agente de un centro se comprueba en ese centro, igual que ver sus impresoras. Admin y Lab Director la tienen.
**Límites conocidos.** El destino predeterminado del centro, el modo de impresión (impresora con nombre de QZ Tray, entrega al motor de interfaces o impresión directa en red) y el tamaño de papel se definen en la pestaña Impresión del registro del centro, en el [Diccionario de centros](#screen-facility-dictionary), no aquí. La impresión directa en red necesita un servidor de PathScribe o un agente del centro dentro de la red del hospital; un navegador no puede abrir un socket de impresora.

### Mis exportaciones {#screen-my-exports}
Breadcrumb: Inicio > Mis exportaciones

**Estado:** Demostración

**1. Navegación:** El botón de exportaciones de la barra superior, que muestra el número de exportaciones listas para descargar. El botón aparece solo cuando hay un servidor de API conectado; en la demostración, abra la página en `/my-exports`.
**2. Elemento de mantenimiento:** Los archivos de exportación de la propia persona que ha iniciado sesión

**3. Finalidad de negocio y alcance.** Las exportaciones grandes (informes de control de calidad, de auditoría, de eliminación y de búsqueda) se preparan como trabajos en segundo plano. La persona las solicita, se le avisa cuando el archivo está listo y lo descarga aquí. Los archivos se conservan 7 días y solo los puede descargar la persona que los solicitó. En esta demostración las exportaciones se descargan de inmediato, por lo que la lista normalmente está vacía. Un banner señala el servidor simulado: las exportaciones se preparan en el navegador y se conservan solo hasta cerrar sesión. El contrato de la API es `ASYNC_EXPORT_API.md`; con el servidor de PathScribe conectado, una exportación grande se prepara allí y aparece aquí cuando está lista.

**4. Requisitos previos y dependencias.** Ninguno para abrirla. Una exportación aparece solo si se concedió su propia capacidad de exportación (por ejemplo `qa:deficiencies:export`), así que concédalas en los roles del personal a las personas que las necesiten.

Setup step: Reference, not part of setup
Requires: [Roles](#screen-staff-roles)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-my-exports - Lista de Mis exportaciones con estado, filas y descarga]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Exportación | Texto de solo lectura | No aplica | El título de la exportación. | No aplica |
| Solicitada | Fecha y hora de solo lectura | No aplica | | No aplica |
| Estado | Solo lectura: En espera, Preparando, Lista, Fallida, Cancelada, Caducada | No aplica | | No aplica |
| Filas | Número de solo lectura | No aplica | | No aplica |
| Se elimina después de | Fecha de solo lectura | No aplica | Siete días después de la solicitud. | No aplica |
| Acciones: Descargar, Cancelar | Botones | No aplica | Descargar cuando está Lista; Cancelar mientras está En espera o Preparando. | No aplica |
| Actualizar | Botón | No aplica | | No aplica |
| Hacer que las exportaciones tarden más (para probar la experiencia de espera) | Interruptor Sí/No, que se muestra solo en el servidor simulado | Opcional | Un control de demostración. | Desactivado |

**7. Permisos.** La página solo necesita una persona con la sesión iniciada y enumera las exportaciones de esa misma persona. Cada exportación se solicita con su propia capacidad `...:export`, que es de riesgo alto y se audita como `DOCUMENT_EXPORTED` con el número de filas.
**Límites conocidos.** La parte del servidor no está conectada. Las exportaciones de configuración (diccionarios, tablas de correspondencias, la lista de médicos) son pequeñas, se quedan en el navegador y no aparecen aquí. Las ejecuciones programadas de informes guardados (página de búsqueda, Informe > Programaciones) son Simuladas y no envían nada; tienen su propio contrato en `SCHEDULED_REPORTS_API.md`.

## Configuración de la impresión por lotes y del programador de trabajos nocturnos {#ch6-batch-jobs}
Breadcrumb: Inicio > Configuración

**Estado de esta parte:** Parcial. No existe una única pantalla de "impresión por lotes y programador de trabajos nocturnos", y un administrador no puede crear ni editar un trabajo programado. Lo que existe se indica a continuación, con el capítulo que documenta cada pantalla.

| Elemento | Estado | Dónde se configura | Dónde se documenta |
|---|---|---|---|
| Cola de impresión (retener, liberar, cancelar, reintentar, redirigir, acciones masivas) | Construido | Los trabajos se gestionan en Registros del sistema > Interfaces > Cola de impresión. Las impresoras y el enrutamiento se definen en [Reglas de enrutamiento de destinos de impresión](#screen-print_routing_rules) y en la pestaña Impresión del centro. | [Registros del sistema: interfaces](#screen-audit-interfaces) |
| Agregación de impresión por lotes ("Ejecutar lote ahora") | Parcial | Un botón de la pantalla Cola de impresión con un inicio y un fin de ventana (horas de 24 horas, interpretadas en UTC) y una opción de agrupación (Cuenta de cliente o Ruta de entrega). Agrupa, bajo identificadores de lote compartidos, los trabajos en cola que no pasan por interfaz y que se firmaron dentro de la ventana. Solo se ejecuta cuando alguien lo pulsa. Un trabajo recurrente llamado `print.batchAggregation` aparece en la lista de trabajos del servidor sin intervalo fijo, pero en esta versión no se establece ningún calendario. | [Registros del sistema: interfaces](#screen-audit-interfaces) |
| Reimpresión de etiquetas por lotes | Construido | Gestión de lotes > Reimpresión de etiquetas: busque casos por fecha o número de registro, elija casetes, contenedores de muestras o solicitudes, elija una impresora de casetes y reimprima las etiquetas una a una. Cada etiqueta queda auditada; las etiquetas fallidas se pueden reintentar. Requiere `label:batch:reprint`. | [Gestión de lotes](#screen-batch-management) |
| Exportaciones programadas | Demostración | Los informes guardados de búsqueda de casos se pueden programar (a diario, semanalmente o mensualmente) desde la página de búsqueda, Informe > Programaciones. Una ejecución es simulada y no envía nada. Las exportaciones grandes se ejecutan como trabajos en segundo plano y figuran en [Mis exportaciones](#screen-my-exports). | `SCHEDULED_REPORTS_API.md`, `ASYNC_EXPORT_API.md` |
| Trabajos del servidor (estado de las colas, mensajes no entregados, reencolado) | Construido, solo lectura y reencolado | Registros del sistema > Trabajos del servidor. Muestra los tipos de trabajo (envío de interfaz, intento de entrega, envío de impresión, liberación de informes retenidos, envío de cargos, generación de exportaciones, evento) y los trabajos recurrentes con la frecuencia con que se ejecuta cada uno. Requiere `jobs:server-job:view`; reencolar un trabajo no entregado requiere `jobs:server-job:requeue`. | [Registros del sistema](#screen-audit-log) |
| Programador de trabajos nocturnos (crear, editar, activar o desactivar trabajos) | No construido | Los trabajos recurrentes están fijados en el servidor de API. La pantalla Trabajos del servidor los enumera y muestra su estado, pero no tiene controles para cambiar una hora ni para desactivar uno. | No aplica |
| Sincronización nocturna de protocolos (CAP, RCPath, ICCR) | No construido | Véase [Biblioteca sinóptica](#ch6-synoptic). | No aplica |

**Trabajos recurrentes que el servidor enumera hoy** (minutos entre ejecuciones): barrido de reintento de entregas (0,5), barrido de liberación de vencimientos (0,25), caducidad de enlaces de consulta (5), escalado de registros de enfermedad obsoletos (60), alertas diarias de seguimiento (1440), caducidad del acceso de soporte (5), barrido de correlación citología-histología (1440), sondeo del LIS (su propia programación), agregación de lotes de impresión (su propia programación), monitor del SLA de ROSE en citología (5), purga del bus de mensajes (1440).

**Orden de configuración del trabajo por lotes.** No hay nada que configurar para los trabajos del servidor. Para la impresión, termine las [Reglas de enrutamiento de destinos de impresión](#screen-print_routing_rules) y después revise la Cola de impresión. Para la reimpresión de etiquetas, configure primero la impresora de casetes en Perfiles de impresora. Conceda `label:batch:reprint` y las capacidades `print:job:*` en los roles del personal a las personas que los ejecutan.
