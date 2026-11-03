---
chapter: 2
id: ch2
title: Nivel 1: Requisitos previos del sistema principal (configurar primero)
---

# Nivel 1: Requisitos previos del sistema principal (configurar primero) {#ch2}

El Nivel 1 es la parte de Configuración sobre la que se apoya cualquier otro ajuste. Responde a cuatro preguntas antes de que pueda configurarse nada más: qué centros de laboratorio existen, quién puede hacer qué, qué dispositivos físicos utilizan los centros y qué reglas se aplican a toda la organización. Los niveles posteriores leen de él. Un departamento pide un centro. Una plantilla de informe se enruta por rol. Una etiqueta se imprime mediante un perfil de impresora. Si una pantalla del Nivel 1 está vacía, las pantallas que dependen de ella muestran selectores vacíos o se niegan a guardar.

Configure el Nivel 1 en este orden. Cada pantalla siguiente incluye un cuadro **Orden de configuración** con la misma información, y el generador comprueba que ninguna pantalla requiera otra que vaya después.

1. [Diccionario de centros](#screen-facility-dictionary): la organización, sus laboratorios ejecutores y sus clientes solicitantes.
2. [Tipos de participación](#screen-participation_types): los roles en un caso (principal, residente, consultor) y quién puede firmar.
3. [Roles](#screen-staff-roles): qué puede abrir y cambiar cada puesto de trabajo.
4. [Tipos de delegación](#screen-delegation_types): las formas en que se puede traspasar un caso o un informe.
5. [Miembros](#screen-staff-members): las personas.
6. [Acreditación profesional](#screen-staff-credentialing): revisiones de la práctica supervisada del personal nuevo.
7. [Seguridad de la sesión](#screen-session_security): cierre de sesión por inactividad, segundo factor y política de cierre de sesión.
8. [Acceso de soporte](#screen-support_access): si el soporte de ForMedrixAI puede acceder a sus datos.
9. [Equipos](#screen-equipment): el registro de todos los dispositivos.
10. [Perfiles de impresora](#screen-printer_profiles): qué puede hacer cada impresora de etiquetas y cómo llega a ella un navegador.
11. [Agentes del centro](#screen-site_agents): el programa que imprime y mueve archivos en la red de un centro.
12. [Estaciones de escaneo](#screen-scan_stations): los puestos de trabajo con los que se puede identificar un terminal.
13. [Ajustes de impresión](#screen-print_settings): tamaños de etiqueta, reglas de códigos de barras y comportamiento de la impresión.
14. [Diseñador de etiquetas](#screen-label_designer): el diseño de cada etiqueta.
15. [Estaciones de trabajo](#screen-workstations): ordenadores registrados con un token.
16. [Grupos de estaciones de trabajo](#screen-workstation_groups): puestos de trabajo agrupados por disciplina y área.
17. [Hardware de tallado](#screen-grossing_hardware): cámaras y básculas de los puestos de tallado.
18. [Conservación de datos](#screen-retention): cuánto tiempo se conservan los registros.
19. [Configuración de la máscara de caso](#screen-case_mask_config): numeración de los números de acceso.
20. [Requisitos de los campos](#screen-field_requirements): qué campos necesita una página antes de poder guardarse.
21. [Recursos externos](#screen-external_resources): enlaces de referencia.

Cinco pantallas son de referencia, no pasos de configuración: la [pestaña Sistema](#screen-tab-system), la [pestaña Personal](#screen-tab-staff), la [Referencia de ámbito](#screen-scope_reference), la [Vista general de jurisdicciones](#screen-jurisdiction_overview) y el [Registro de impresión simulada](#screen-simulated_print).

**Palabras de estado.** Cada pantalla muestra una de las cinco palabras de estado definidas en la norma de redacción: Construido, Demostración, Parcial, Planificado, No construido. Hoy la mayoría de los servicios de datos se ejecutan con los datos de demostración del navegador, y la API de producción se conecta servicio por servicio. Cuando una pantalla ya tiene un servicio de producción y un contrato en `docs/architecture`, es **Construido**. Cuando la pantalla solo funciona en el navegador, o su efecto todavía no se aplica en ningún sitio, es **Demostración**.

## Parte A: Gestión de la empresa y de los centros {#ch2-enterprise-facilities}
Breadcrumb: Inicio > Configuración > Sistema

Esta parte contiene la pestaña Sistema, que reúne todas las pantallas de las Partes A, C y D, y la única pantalla que define la estructura de su organización.

**Cómo funciona la jerarquía.** No existe una pantalla "Empresa" independiente ni un tipo "hospital" o "clínica". Todo es un centro del [Diccionario de centros](#screen-facility-dictionary). Un centro marcado como Empresa es el nivel superior (su organización). Los demás centros apuntan a él como su Empresa matriz y son los afiliados. Lo que hace un centro lo determinan sus roles (Laboratorio ejecutor, Centro solicitante, etc.), no un tipo. Las ubicaciones (sala, habitación, cama) dependen de un solo centro. La [Referencia de ámbito](#screen-scope_reference) indica qué ajustes se definen una sola vez para la empresa y cuáles se definen por centro.

**Dónde se definen la fecha, la hora, la zona horaria y el idioma.** No existe una pantalla única de "fecha y hora globales". Cada elemento se define en un lugar distinto:

| Qué | Dónde se define | Ámbito |
|---|---|---|
| Zona horaria | Una única opción **Zona horaria del centro** en la pantalla de ajustes del [Panel de contribución](#screen-contribution_settings). Decide en qué día o mes se cuenta un caso firmado y el año que utiliza la numeración de los números de acceso. | Toda la organización. Valor predeterminado `America/Phoenix`. |
| Formato de fecha y de número | Sigue el idioma de visualización elegido en la barra superior. La pestaña Formatos de identificadores del editor de centros muestra, en solo lectura, el formato de fecha, el formato de hora y la configuración regional de la jurisdicción. | El navegador de cada usuario. |
| Idioma de visualización | El botón de idioma de la barra superior. Opciones: inglés, francés, francés (Bélgica), alemán, neerlandés, neerlandés (Bélgica), coreano, español. Se guarda en el navegador como `pathscribe_language`. | Cada usuario, cada navegador. |
| Idioma del informe | **Idioma del informe** en la pestaña General del centro. | Cada laboratorio ejecutor. |
| Idioma de ortografía | **Idioma de ortografía** en la ficha del miembro del personal. | Cada persona. |
| Ventana de actualización del agente del centro | Horas en la hora local del centro, en la pantalla [Agentes del centro](#screen-site_agents). | Cada centro. |

Las horas almacenadas son siempre UTC. Nada del Nivel 1 lo cambia.

### Pestaña Sistema {#screen-tab-system}
Breadcrumb: Inicio > Configuración > Sistema

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema**. Un enlace directo como `/configuration?tab=system&section=print_settings` abre una sección.
**2. Elemento de mantenimiento:** Sistema (el contenedor de todas las secciones de Sistema)

**3. Finalidad y alcance.** La pestaña Sistema contiene los datos de referencia y los ajustes de funcionamiento del laboratorio. Tiene seis grupos, mostrados como botones en la parte superior: **Puesto de trabajo y equipos**, **Materiales y flujos de trabajo del laboratorio**, **Consultas clínicas**, **Consultas financieras y de ingresos**, **Administración y cumplimiento** e **Integraciones**. Al elegir un grupo, la barra lateral izquierda muestra solo las pantallas de ese grupo. La pestaña Sistema es la pestaña predeterminada cuando se abre Configuración.

**4. Requisitos previos y dependencias.** Abrir Configuración requiere la capacidad `screen:configuration:open`. Después, cada sección comprueba su propia capacidad. Si no la tiene, la sección se abre en solo lectura con una nota y sus controles están desactivados.

Setup step: Reference, not part of setup
Requires: Ninguno, es un punto de partida.
Unlocks: [Diccionario de centros](#screen-facility-dictionary), [Ajustes de impresión](#screen-print_settings)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: tab-system - Pestaña Sistema con los botones de grupo y la barra lateral]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Botones de grupo | Seis botones | No aplicable | Al seleccionar un grupo, se muestran sus secciones en la barra lateral y se abre la primera. | Puesto de trabajo y equipos |
| Barra lateral | Lista de secciones | No aplicable | Un botón por sección del grupo activo, ordenado por nombre. Una sección que solo puede usar un ingeniero de ForMedrixAI permanece oculta a menos que usted tenga su capacidad de plataforma. | Ajustes de impresión seleccionado |
| Centro: (selector) | Lista de laboratorios ejecutores activos, más **Todos los centros** | Opcional | Se muestra solo en el grupo Puesto de trabajo y equipos. Filtra Ajustes de impresión, Perfiles de impresora, Estaciones de escaneo, Agentes del centro, Equipos y Hardware de tallado por un solo centro. Se recuerda únicamente hasta que usted sale de la pestaña Sistema y no se guarda. | Todos los centros |
| Aviso de cambios sin guardar | Confirmación | No aplicable | Al pasar a otra sección o grupo con cambios sin guardar, se le pide que siga editando o que los descarte. | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. La capacidad propia de cada sección figura en esa sección. Los roles Administrador y Director de laboratorio tienen de forma predeterminada la capacidad de la pantalla de configuración.
**Límites conocidos.** El selector de centro no se conserva al recargar la página. Estaciones de trabajo y Grupos de estaciones de trabajo no lo utilizan: Estaciones de trabajo tiene su propia columna de centro y Grupos de estaciones de trabajo su propio filtro de Laboratorio ejecutor.

### Diccionario de centros {#screen-facility-dictionary}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Configuración de centros

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Integraciones** > **Configuración de centros**. El encabezado de la página dice "Configuración de centros". Es la misma pantalla que el Capítulo 3 enumera como [Configuración de centros](#screen-clients).
**2. Elemento de mantenimiento:** Diccionario de centros

**3. Finalidad y alcance.** Un centro es cualquier sede u organización que PathScribe conoce: sus propios laboratorios, las clínicas y los hospitales que le envían muestras y los laboratorios de referencia a los que usted envía trabajo. Cada centro tiene sus roles, sus datos de contacto, los códigos que le asocian las peticiones entrantes, sus objetivos de tiempo de respuesta, sus opciones de entrega de informes y su enrutamiento de impresión. La organización de nivel superior es un centro con **Empresa** marcada. Casi todas las demás pantallas piden un centro, por lo que esta es la primera pantalla que debe rellenarse.

**4. Requisitos previos y dependencias.** Nada va antes. La lista de Código de lugar de prestación del servicio de la pestaña General lee el diccionario de códigos, y la lista Modelo de la pestaña IA y rendimiento muestra solo los modelos con un estudio de validación superado. Ambas son opcionales. Si omite el centro, el selector de centro de todas las demás pantallas queda vacío.

Setup step: Tier 1, step 1
Requires: Ninguno, es un punto de partida.
Unlocks: [Tipos de participación](#screen-participation_types), [Tipos de delegación](#screen-delegation_types), [Miembros](#screen-staff-members), [Equipos](#screen-equipment), [Configuración de la máscara de caso](#screen-case_mask_config), [Departamentos](#screen-departments)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-facility-dictionary - Lista de centros con búsqueda, filtros de estado y de rol y Añadir centro]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar | Texto | Opcional | Coincide con el nombre del centro, la autoridad asignadora y el nombre y el correo electrónico del contacto. | En blanco |
| Filtro de estado | Pestañas: Todos, Activos, Inactivos, Sin verificar | Opcional | Los centros sin verificar se crearon automáticamente a partir de una petición entrante y esperan a que alguien los compruebe. | Todos |
| Filtro de rol | Pestañas: Todos los tipos, Laboratorio ejecutor, Centro solicitante | Opcional | Restringe por rol. | Todos los tipos |
| Recuento de resultados | Texto (N de M) | No aplicable | Muestra cuántos centros coinciden. | No aplicable |
| Columna Centro | Texto | No aplicable | Nombre, código de la autoridad asignadora, dirección y una marca de "afiliado". | No aplicable |
| Columna Funciones | Insignias | No aplicable | Los roles del centro y su jurisdicción. | No aplicable |
| Columna Contacto | Texto | No aplicable | Nombre y correo electrónico del contacto. | No aplicable |
| Columna TRT | Texto | No aplicable | Muestra "N h primera revisión", "N h en total" o Predeterminado. | No aplicable |
| Columna Estado | Texto | No aplicable | Activo, Inactivo o Sin verificar. Aparece una nota "Creado automáticamente" cuando el centro procede de una petición. | No aplicable |
| + Añadir centro | Botón | No aplicable | Abre el editor con un centro en blanco. | No aplicable |
| Verificar | Botón de fila | No aplicable | Se muestra solo para los centros sin verificar. Marca el centro como comprobado. | No aplicable |
| Editar | Botón de fila | No aplicable | Abre el editor. | No aplicable |
| Duplicar | Botón de fila | No aplicable | Copia la configuración de nivel de organización en un centro nuevo. Borra la autoridad asignadora, el número CLIA o ISO, la dirección y los datos de contacto, el director, los identificadores de inquilino heredados, las autorizaciones pediátricas, el punto de conexión de la interfaz y las credenciales. El nombre pasa a ser "Copia de" más el original. | No aplicable |
| Desactivar / Activar | Botón de fila | No aplicable | No se muestra para los centros sin verificar. Al desactivar un centro que sigue en uso se abre **El centro sigue en uso** y se le pide que lo confirme. Las referencias no se eliminan. | No aplicable |

#### Ventana del editor: pestaña General

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre del centro | Texto | Obligatorio | Cómo aparece el centro en las peticiones, los informes y las etiquetas. Error: "El nombre del centro es obligatorio". | En blanco |
| Autoridad asignadora | Texto, hasta 10 caracteres, forzado a mayúsculas | Obligatorio | Las peticiones HL7 entrantes se asocian al centro mediante este código, por lo que debe ser único (no distingue mayúsculas de minúsculas). | En blanco |
| Estado | Opción: Activo, Inactivo (Sin verificar se muestra solo cuando ya está establecido) | Obligatorio | Los centros inactivos no se ofrecen para trabajo nuevo. | Activo |
| Roles | Casillas: Laboratorio ejecutor, Ubicación interna de envío, Centro solicitante interno, Centro solicitante externo, Obtención de muestras, Laboratorio de referencia | Obligatorio | Al menos los roles que describen lo que hace el centro. Laboratorio ejecutor habilita la pestaña IA y rendimiento y los campos exclusivos de laboratorio que figuran más abajo. | Centro solicitante externo |
| Código de lugar de prestación del servicio | Lista de los códigos de lugar de servicio | Opcional | Requiere el rol Obtención de muestras. | Ninguno |
| Número de acreditación CLIA / ISO | Texto | Opcional | Requiere Laboratorio ejecutor o Empresa. Se utiliza en las cabeceras de los informes. | En blanco |
| Nombre del director del laboratorio | Texto | Opcional | Requiere Laboratorio ejecutor o Empresa. Se utiliza en las cabeceras de los informes. | En blanco |
| URL del logotipo de cabecera | Enlace https | Opcional | Requiere Laboratorio ejecutor o Empresa. Solo se almacena la dirección, nunca la imagen. | En blanco |
| Los cargos necesitan aprobación de facturación | Opción: Igual que la empresa, Activado, Desactivado | Opcional | Solo Laboratorio ejecutor o Empresa. "Igual que la empresa" se ofrece solo a los laboratorios que no son empresa. | Igual que la empresa |
| Política de página de adenda: Forzar las adendas en una página aparte | Interruptor Sí/No | Opcional | Solo Laboratorio ejecutor. | Desactivado |
| Idioma del informe | Opción entre los ocho idiomas de visualización | Opcional | Solo Laboratorio ejecutor. El valor predeterminado sigue a la jurisdicción. | Según la jurisdicción |
| Detección de anomalías: Activada en este centro | Interruptor Sí/No | Opcional | Solo Laboratorio ejecutor. | Desactivado |
| Jurisdicción | Opción entre 14: US, CA, GB_EW, GB_SCT, GB_NIR, IE, AU, NZ, KR, BE, NL, DE, FR, ES | Obligatorio | Establece las reglas del país del centro, el formato de fecha, el corrector ortográfico y la norma del identificador del paciente (se muestra en Formatos de identificadores). | US |
| Identificador del registro nacional de cribado | Texto | Opcional | El identificador del centro ante un registro nacional de cribado. | En blanco |
| Etiquetado de muestras / bloques | Opción: alfabético (Muestra A, B, C y Bloque A1, A2, A3) o numérico (Muestra 1, 2, 3 y Bloque 1A, 1B, 1C) | Obligatorio | Cómo se rotulan las muestras y los bloques nuevos. | Alfabético |
| Empresa | Casilla: "Es una institución de empresa de nivel superior" | Opcional | Marca el centro como el nivel superior. Habilita los campos exclusivos de la empresa (Conexión con el motor de interfaz, Mensajería segura). | Desactivado |
| Empresa matriz | Lista de los demás centros que son empresa | Opcional | Hace que este centro sea afiliado de esa empresa. | Ninguna |
| Tratamiento del contacto | Opción: Sr., Sra., Srta., Mx., Dr. | Opcional | Tratamiento de la persona de contacto. | En blanco |
| Sufijo del contacto | Opción entre valores predefinidos, u Otro | Opcional | Por ejemplo, Jr. o MD. | En blanco |
| Nombre(s) del contacto, Apellido(s) del contacto, Nombre preferido del contacto | Texto | Opcional | La persona de contacto. | En blanco |
| Correo electrónico | Texto, debe contener "@" | Opcional | Correo electrónico de contacto. | En blanco |
| Teléfono, Fax | Texto | Opcional | Números de contacto. | En blanco |
| Dirección, Ciudad, Provincia / comunidad autónoma / región, Código postal | Texto | Opcional | Dirección postal. | En blanco |

Los campos de contacto obligatorios proceden de la página **Facility editor** de [Requisitos de los campos](#screen-field_requirements): nombre, autoridad asignadora, correo electrónico, teléfono, fax, dirección, ciudad, región, código postal y persona de contacto. El pie de la ventana indica lo que todavía es obligatorio.

#### Ventana del editor: pestaña Integración con el SIL

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Conexión con el motor de interfaz: punto de conexión | Texto | Obligatorio una vez configurado | Solo empresa. Dónde envía PathScribe los mensajes al motor de interfaz. | En blanco |
| Versión de HL7 | Opción: 2.3, 2.4, 2.5, 2.5.1, 2.6 | Opcional | Solo empresa. | 2.5.1 |
| Tipo de autenticación | Opción: ninguna, básica, oauth2, clave de API | Opcional | Solo empresa. | Ninguna |
| Credencial configurada | Sí/No | Opcional | Solo empresa. Registra que se ha configurado una credencial. El secreto en sí no se introduce aquí. | No |
| El SIL conectado gestiona los estados principales de los casos | Interruptor Sí/No | Opcional | Solo empresa. | Desactivado |
| Los patólogos pueden iniciar adendas/modificaciones directamente en PathScribe | Interruptor Sí/No | Opcional | Solo empresa. | Desactivado |
| Anular el enrutamiento de la empresa | Interruptor Sí/No | Opcional | Solo centros que no son empresa. Desactivado significa que el centro hereda la conexión de su matriz. | Desactivado |
| Identificador del centro emisor (MSH-4) | Texto | Obligatorio una vez configurado | Identifica el centro en el HL7 saliente. | En blanco |
| Identificador del centro receptor (MSH-6) | Texto | Opcional | El código del sistema receptor. | En blanco |
| Anulación del canal de salida | Texto | Opcional | Un canal distinto del motor para este centro. | En blanco |
| Enviar un único PDF combinado por caso | Interruptor Sí/No | Opcional | Solo Laboratorio ejecutor. | Desactivado |
| Envío del mapa anatómico: Enviar el mapa anatómico | Opción: Desactivado, Solo texto, Texto y archivo de imagen | Opcional | Solo Laboratorio ejecutor (lote 751). En un caso Assist, PathScribe nunca incluye el mapa anatómico en el informe. Este ajuste lo envía al sistema de laboratorio con los datos sinópticos: los hallazgos del mapa como líneas de texto y, con archivo, el mapa dibujado al finalizar a partir de las respuestas definitivas. Se guarda aparte con `config:organ-map-delivery:manage` y queda registrado. Un envío fallido nunca impide finalizar; aparece en la cola de salida, con reintento. | Desactivado |
| Envío del mapa anatómico: Formato del archivo | Opción: Imagen PNG, Documento PDF | Opcional | Se muestra con Texto y archivo de imagen. | Imagen PNG |
| Envío del mapa anatómico: Destino de los archivos | Texto | Obligatorio con Texto y archivo de imagen | Una carpeta, una dirección SFTP o un canal del motor de interfaces. Nunca un nombre de usuario ni una contraseña. Los nombres de archivo llevan el número de registro, el tipo de mapa y la hora, nunca el nombre de un paciente. | En blanco |

#### Ventana del editor: pestaña Formatos de identificadores

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Interruptor de anulación | Interruptor Sí/No | Opcional | Solo centros que no son empresa. Desactivado utiliza los formatos de la matriz. | Desactivado |
| Filas de formato | Lista agrupada en Nivel 1 (búsqueda: un código de barras de preparación abre el caso) y Nivel 2 (asignación interna) | No aplicable | Cada fila tiene un interruptor de activación, un cuadro de prueba y un botón para mostrar el patrón. Los patrones los fija el sistema y no se pueden editar. | Según la jurisdicción |
| Filtro de preajuste del SIL | Opción | Opcional | Restringe las filas a un preajuste. | Todos |
| Simular un escaneo | Texto | Opcional | Escriba o escanee un valor para ver qué formato coincide. | En blanco |
| Información de configuración regional | Texto de solo lectura | No aplicable | Muestra la jurisdicción, el formato de fecha, el formato de hora, la configuración regional, el corrector ortográfico y la norma del identificador del paciente. | No aplicable |
| Guardar cambios | Botón | No aplicable | Guarda la anulación. | No aplicable |

#### Ventana del editor: pestaña Informes

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Formato del informe | Opción: PDF, HL7, Ambos | Obligatorio | Cómo se envían los informes a este centro. | PDF |
| Método de entrega | Opción: Correo electrónico, Fax, Portal, HL7 | Obligatorio | Cómo llegan los informes a él. | Portal |
| Liberar automáticamente los informes al finalizar | Interruptor Sí/No | Opcional | | Desactivado |
| Enviar copia del informe al médico solicitante | Interruptor Sí/No | Opcional | | Desactivado |

#### Ventana del editor: pestaña TRT y escalado

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Objetivo de primer acceso | Número entero de horas, de 1 a 168 | Opcional | En blanco utiliza el valor predeterminado del sistema. | En blanco (valor predeterminado del sistema, 4 horas) |
| Objetivo de TRT total del caso | Número entero de horas, de 1 a 720 | Opcional | En blanco utiliza el valor predeterminado del sistema. | En blanco (valor predeterminado del sistema, 24 horas) |
| Prioridad de escalado | Opción: alta, crítica | Opcional | Prioridad de una alerta de retraso. | alta |
| Destinatarios del escalado | Casillas: Grupo de patología, Administrador del laboratorio, Médico solicitante | Opcional | Si no se marca ninguno, las alertas se suprimen para este centro. Los casos restringidos (pediátricos) siempre se escalan como Crítica. | Ninguno |

#### Ventana del editor: pestaña IA y rendimiento (solo Laboratorio ejecutor)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Redacción automática de la narrativa | Opción: heredar, activada, desactivada | Opcional | | Heredar |
| Anulación del tiempo de inactividad de la sesión | Opción: heredar, 5, 10, 15, 20, 30, 60 minutos | Opcional | Anula el valor predeterminado de la organización de [Seguridad de la sesión](#screen-session_security) para los casos de este laboratorio. | Heredar |
| Tasa de muestreo aleatorio para revisión de codificación | Número entero, de 0 a 100 | Opcional | Porcentaje de casos muestreados para la revisión de codificación. En blanco significa ninguno. Su cambio se escribe en el registro de auditoría como "Code review random sampling rate changed". | En blanco |
| Búfer de liberación | Opción: heredar o anular | Opcional | Anular muestra Búfer activado, duración (de 1 a 30 minutos) y Omitir en los casos urgentes (STAT). | Heredar (valor predeterminado de la anulación, 10 minutos) |
| Modelo | Lista: heredar, o modelos con un estudio de validación superado | Opcional | Solo en modo de edición. | Heredar |

#### Ventana del editor: pestaña Ubicaciones (solo en modo de edición)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Punto de atención | Texto | Obligatorio | Lo utilizan las reglas de enrutamiento de impresión y las estaciones de trabajo. | En blanco |
| Habitación, Cama, Edificio, Planta | Texto | Opcional | Partes de la ubicación. | En blanco |
| Estado de la ubicación | Opción (tabla HL7 0306) | Opcional | | En blanco |
| Tipo de ubicación de la persona | Opción (tabla HL7 0305) | Opcional | | En blanco |
| Verificar, Activar, Desactivar | Botones | No aplicable | Las ubicaciones creadas automáticamente a partir de un segmento PV1 entrante llegan como Sin verificar. | No aplicable |

#### Ventana del editor: pestaña Impresión (solo en modo de edición; tiene su propio Guardar)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Imprimir los informes liberados | Interruptor Sí/No | Opcional | Solo Laboratorio ejecutor. | Desactivado |
| Entrega | Opción: QZ Tray (impresora con nombre), Impresora de red (directa), Motor de interfaz o servidor de impresión | Obligatorio cuando la impresión está activada | Solo Laboratorio ejecutor. | Ninguna |
| Tamaño del papel | Opción: Predeterminado (Carta), Carta, A4, Legal | Opcional | Solo Laboratorio ejecutor. | Predeterminado |
| Nombre de la impresora | Texto | Obligatorio para QZ Tray | | En blanco |
| Tipo de impresora | Opción: Impresora del agente del centro, Dirección de la impresora | Obligatorio para la directa | | Ninguno |
| Protocolo | Opción: RAW (puerto 9100), LPR/LPD, IPP | Obligatorio para la directa | | RAW (puerto 9100) |
| Dirección, Puerto | Texto, número entero de 1 a 65535 | Obligatorio para la directa | | En blanco, 9100 |
| Nombre de la cola, Ruta IPP, Nombre para mostrar | Texto | Opcional | Cola para LPR, ruta para IPP. | En blanco |
| Bandeja de papel | Opción: Predeterminado del informe, Bandeja 1 (papel con membrete), Bandeja 2 (papel normal) | Opcional | Cualquier centro. | Predeterminado del informe |
| Caras | Opción: Predeterminado del informe, A doble cara, A una cara | Opcional | Cualquier centro. | Predeterminado del informe |

#### Ventana del editor: pestaña Mensajería segura (solo en modo de edición, solo Empresa)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filas de pasarela | NHSMAIL, EGRESS, ACCURX, PAUBOX, VIRTRU, ZIX, HEALTHLINK, MEDICAL_OBJECTS, REFERRALNET, KR_HIE | Opcional | Una fila por pasarela. | Desactivado |
| Activado | Interruptor Sí/No | Opcional | | Desactivado |
| Predeterminada | Botón de opción | Opcional | La pasarela que se utiliza de forma predeterminada. | Ninguna |
| Dirección o identificador del remitente | Texto | Opcional | | En blanco |
| Acuerdo vigente, referencia, fecha de firma, fecha de caducidad | Sí/No, texto, fechas | Opcional | Los datos del paciente salen solo mientras haya un acuerdo en vigor. | No |

#### Ventana del editor: pestaña Ortografía (solo en modo de edición, solo Laboratorio ejecutor)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Lista de palabras | Lista de texto | Opcional | Palabras que el corrector ortográfico acepta en este centro. Los cambios se auditan. | Vacía |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, cambiar, desactivar, reactivar y verificar: `config:facilities:manage`. Pestaña Impresión: `config:print-settings:manage`. Pestaña Mensajería segura: `config:secure-messaging:manage`. Los roles Administrador y Director de laboratorio los tienen de forma predeterminada. Los cambios de campo que la página audita se enumeran más arriba.
**Límites conocidos.** El envío por mensajería segura está simulado: `messageService.sendSecureEmail` registra el mensaje, pero todavía no existe ningún transporte real de pasarela (PS-332). El texto de la pestaña IA y rendimiento remite el valor predeterminado del búfer de liberación a "Configuración > Sistema > Integración con el SIL", pero ese valor predeterminado se encuentra en [Búfer de liberación posterior a la firma](#screen-release_buffer).
### Referencia de ámbito {#screen-scope_reference}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Referencia de ámbito

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento** > **Referencia de ámbito**
**2. Elemento de mantenimiento:** Referencia de ámbito (solo lectura)

**3. Finalidad y alcance.** Una página que responde a una sola pregunta: ¿este ajuste se define una vez para la organización, una vez por centro o en varios niveles? También define las palabras empresa, centro ejecutor y centro solicitante. No cambia nada.

**4. Requisitos previos y dependencias.** Ninguno. Lee una lista fija que se mantiene en el producto. Solo figuran nueve ajustes, y la página indica que las áreas que no figuran no se han comprobado.

Setup step: Reference, not part of setup
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-scope_reference - Tabla de la referencia de ámbito y definiciones]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Qué significan los términos | Tres definiciones | No aplicable | Empresa (toda la organización), Centro ejecutor (una sede de laboratorio) y Centro solicitante o cliente (quien envía el caso). | No aplicable |
| Área del ajuste | Texto | No aplicable | El ajuste: Política de segundo factor de inicio de sesión, Tiempo de cierre de sesión por inactividad, Ajustes de impresión, Reglas de enrutamiento de impresión, Objetivos de tiempo de respuesta, Agentes del centro, Estaciones de escaneo, Equipos, Estaciones de trabajo. | No aplicable |
| Dónde se establece | Texto | No aplicable | Uno de: Empresa, Valor predeterminado de la empresa con anulación por centro, Cada centro, Varios niveles (prevalece el más específico). | No aplicable |
| Cómo funciona | Texto | No aplicable | Una frase por ajuste. Un enlace abre la pantalla donde se encuentra el ajuste. | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. No hay nada que cambiar ni capacidad de sección.
**Límites conocidos.** La lista abarca nueve ajustes. No interprete que un ajuste ausente se aplica a toda la empresa o a cada centro.

### Resumen de jurisdicciones {#screen-jurisdiction_overview}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Resumen de jurisdicciones

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento** > **Resumen de jurisdicciones**
**2. Elemento de mantenimiento:** Resumen de jurisdicciones (solo lectura)

**3. Finalidad y alcance.** Una tarjeta por país que muestra lo que está configurado para él, de modo que pueda ver las carencias sin abrir siete pantallas. Muestra los países que tienen reglas de firma por país, además de cualquier país que utilice un centro o el laboratorio. Cada fila tiene un enlace **Cambiar** a la pantalla donde se edita ese ajuste. La página dice: "Esta página solo muestra lo que está configurado."

**4. Requisitos previos y dependencias.** Lee los centros, así que añádalos primero. Una tarjeta de país vacía significa que la lista de centros o las reglas en que se basa están vacías.

Setup step: Reference, not part of setup
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-jurisdiction_overview - Tarjetas de país con una fila por ajuste]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Centros | Lista de texto | No aplicable | Los centros de ese país. Un centro inactivo muestra "(inactivo)". Cambiar abre [Configuración de centros](#screen-clients). | No aplicable |
| Roles ofrecidos | Recuento | No aplicable | Roles de participación ofrecidos. Cambiar abre [Tipos de participación](#screen-participation_types). | No aplicable |
| Normas de firma | Texto | No aplicable | Los roles que "Pueden firmar" y los que "Necesitan una cofirma". Cambiar abre [Reglas de firma por país](#screen-country_signing_rules). | No aplicable |
| Sistemas de codificación | Lista de texto | No aplicable | Cada sistema, con obligatorio u opcional. Cambiar abre [Sistemas de codificación](#screen-code_systems). | No aplicable |
| Registros de cáncer | Lista de texto | No aplicable | Los registros configurados para el país. Cambiar abre [Notificación a registros de cáncer](#screen-cancer_registry_settings). | No aplicable |
| Política de IA | Texto | No aplicable | Uno de: Sin restricciones, Se permiten todos los servicios de IA, Permitidos (una lista), Limitado a proveedores de la región de datos, más un recuento de reglas de centro. Cambiar abre la pestaña Comportamiento de la IA. | No aplicable |
| Normas de conservación de | Texto | No aplicable | "Guardado para este país" o "Valor predeterminado integrado". Cambiar abre [Organismos reguladores](#screen-governing_bodies). | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. Aquí no hay nada que cambiar. Cada enlace Cambiar requiere la capacidad de la pantalla que abre.
**Límites conocidos.** Ninguno conocido.

## Parte B: Gestión de usuarios, roles y matriz de permisos {#ch2-users-roles}
Breadcrumb: Inicio > Configuración > Personal

Esta parte trata de quién puede iniciar sesión y qué puede hacer cada persona. El acceso en PathScribe se construye a partir de capacidades. Una capacidad es un permiso escrito como `domain:object:verb`, por ejemplo `config:roles:manage`. Un rol es un conjunto de capacidades con nombre. Una persona obtiene capacidades a través de sus roles, limitadas a los centros que constan en su ficha. Las capacidades marcadas como de riesgo alto se registran en el registro de auditoría cuando se utilizan.

**La matriz de permisos.** La matriz es la lista de capacidades de la pantalla Roles: todas las capacidades, agrupadas, con una marca para cada rol. El catálogo y las asignaciones iniciales son fijos en el producto (`capabilityCatalog.ts` y `capabilitySeeds.ts`). Cuatro reglas importan al planificar los roles:

- **Roles integrados.** Patólogo, Residente, Fellow, Ayudante de patólogo, Administrador, Médico, Personal de quirófano, Autor de plantillas, Aprobador de plantillas, Director de laboratorio, Revisor de garantía de calidad, Superadministrador, Técnico de recepción, Histotecnólogo, Citotécnico y Técnico molecular se suministran ya preparados. Un rol que usted añada empieza sin capacidades de configuración.
- **Administrador y Director de laboratorio.** Administrador tiene todas las capacidades de configuración. Director de laboratorio tiene el mismo conjunto salvo dos grupos: el grupo de administración (`config:roles:manage`, `config:staff:edit`, `config:staff-access:assign`, `config:staff-password:manage`, `config:field-requirements:manage`, `auth:mfa-enrolment:reset`, `config:demo-data:reset`) y la redacción de protocolos. Por tanto, solo Administrador y Superadministrador gestionan los roles, el personal y los requisitos de los campos.
- **Superadministrador.** Un rol de ForMedrixAI. Tiene todas las capacidades excepto `config:ai-prompt:approve`, un hospital no puede cambiarlo y un hospital no puede asignarlo a su propio personal.
- **Separación de funciones.** `config:clinical-mismatch-rules:manage` y `config:ai-prompt:approve` no pueden ser de un mismo rol ni de una misma persona. El guardado se rechaza.

Un cambio de configuración rechazado muestra el motivo `CONFIG_NOT_PERMITTED`. Una sección que usted no puede cambiar se abre en solo lectura.

### Pestaña Personal {#screen-tab-staff}
Breadcrumb: Inicio > Configuración > Personal

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Personal**
**2. Elemento de mantenimiento:** Personal (el contenedor de Miembros, Roles y Acreditación profesional)

**3. Finalidad y alcance.** Una pestaña para la parte de la configuración que se refiere a las personas. Tiene tres subpestañas: **Miembros del personal**, **Diccionario de roles** y **Revisión de credenciales**. Un enlace como `/configuration?tab=staff&section=roles` abre una subpestaña (`members`, `roles` o `credentialing`).

**4. Requisitos previos y dependencias.** Abrir Configuración requiere `screen:configuration:open`. Cada subpestaña comprueba su propia capacidad.

Setup step: Reference, not part of setup
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Miembros](#screen-staff-members), [Roles](#screen-staff-roles), [Acreditación profesional](#screen-staff-credentialing)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: tab-staff - Pestaña Personal con sus tres subpestañas]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Miembros del personal | Subpestaña | No aplicable | Las personas. Consulte [Miembros](#screen-staff-members). | Seleccionada |
| Diccionario de roles | Subpestaña | No aplicable | Los roles. Consulte [Roles](#screen-staff-roles). | No aplicable |
| Revisión de credenciales | Subpestaña | No aplicable | Asignaciones de práctica supervisada. Consulte [Acreditación profesional](#screen-staff-credentialing). | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. La capacidad de cada subpestaña figura en su propia pantalla.
**Límites conocidos.** Ninguno conocido.

### Tipos de participación {#screen-participation_types}
Breadcrumb: Inicio > Configuración > Sistema > Consultas clínicas > Tipos de participación

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Consultas clínicas** > **Tipos de participación**
**2. Elemento de mantenimiento:** Tipos de participación

**3. Finalidad y alcance.** Un tipo de participación es el papel que desempeña una persona en un caso: patólogo principal, residente, consultor, tallado y así sucesivamente. También es donde se decide la autoridad de firma: si ese papel puede emitir el informe final, si el informe necesita una cofirma, si la persona ve el caso completo y si más de una persona puede desempeñar el papel. Después, a los roles se les asignan los tipos que sus titulares pueden ejercer.

**4. Requisitos previos y dependencias.** La sección de autoridad de firma por centro requiere que los centros existan. La pantalla Roles lee esta lista para su pestaña Participación en el caso, así que defina los tipos antes que los roles. Si la omite, un rol no tiene tipos que ofrecer.

Setup step: Tier 1, step 2
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Roles](#screen-staff-roles), [Miembros](#screen-staff-members)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-participation_types - Lista de tipos de participación con insignias de capacidades]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar | Texto | Opcional | Texto de ayuda "Buscar tipos de participación". | En blanco |
| Filtro | Pestañas, empezando por Todos | Opcional | | Todos |
| Tipo, Descripción, Capacidades, Estado | Columnas | No aplicable | Las capacidades se muestran como insignias cortas: Validar, Cofirma, Plantilla, Vista completa, Múltiple. Una insignia "integrado" marca los tipos del sistema. | No aplicable |
| Recuento del pie | Texto | No aplicable | "N activos, M en total". | No aplicable |
| + Añadir tipo | Botón | No aplicable | Abre el editor. | No aplicable |
| Editar, Duplicar | Botones de fila | No aplicable | Duplicar abre una copia para editarla. | No aplicable |

El producto incluye estos tipos del sistema: primary, resident, attending, grossing, cytotechnologist, consultant, frozen, second_opinion, provisional_hire, biomedical_scientist y bms_advanced_practitioner. Los tipos del sistema no se pueden eliminar. En un tipo integrado se pueden editar la etiqueta, la descripción y el color. El indicador de finalizar de `primary` está bloqueado.

#### Ventana del editor

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Etiqueta | Texto | Obligatorio | Debe ser única. Errores: "La etiqueta es obligatoria" y "Ya existe un tipo de participación llamado ...". | En blanco |
| Abreviatura | Texto, hasta 12 caracteres | Obligatorio | Debe ser única. Se muestra en las cabeceras y las listas de casos. | En blanco |
| Descripción | Texto | Opcional | | En blanco |
| Color | Muestras predefinidas o un color personalizado | Opcional | | `#8AB4F8` |
| Puede finalizar / firmar | Interruptor Sí/No | Opcional | Este rol puede emitir el informe final firmado. | Desactivado |
| Requiere cofirma | Interruptor Sí/No | Opcional | Los informes de este rol deben ser cofirmados por un patólogo responsable. | Desactivado |
| Puede usar plantilla de informe | Interruptor Sí/No | Opcional | A este rol se le puede asignar una plantilla de informe para la elaboración de informes estructurados. | Desactivado |
| Puede ver el caso completo | Interruptor Sí/No | Opcional | Acceso completo al caso, con todas las muestras y los informes anteriores. | Desactivado |
| Permite varios por caso | Interruptor Sí/No | Opcional | Más de una persona puede desempeñar el rol a la vez en un mismo caso. | Activado |
| Estado | Activo / Inactivo | Opcional | | Activo |
| Autoridad de firma a nivel de centro | Un bloque por laboratorio ejecutor | Opcional | Cada laboratorio hereda el valor predeterminado normativo de su jurisdicción o el valor predeterminado de la plataforma. Anúlelo solo para una exención local o un esquema de acreditación local. | Heredado |
| Requiere cofirma en este laboratorio, Puede finalizar / firmar en este laboratorio, Puede ver el caso completo en este laboratorio | Anulaciones Sí/No | Opcional | Cada una muestra su origen: valor predeterminado de la plataforma, valor predeterminado de la jurisdicción o "Anulado a nivel de centro por nombre en fecha". **Volver al valor predeterminado heredado** elimina la anulación al guardar. | Heredado |
| Justificación | Texto | Opcional | Se registra en el registro de auditoría junto con la anulación. | En blanco |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, editar, duplicar, anular: `config:participation-types:manage` (riesgo alto, con auditoría; las anulaciones por centro se escriben en el registro de auditoría con la justificación). Administrador y Director de laboratorio la tienen de forma predeterminada.
**Límites conocidos.** Ninguno conocido.

### Diccionario de roles {#screen-staff-roles}
Breadcrumb: Inicio > Configuración > Personal > Diccionario de roles

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Personal** > subpestaña **Diccionario de roles**
**2. Elemento de mantenimiento:** Roles

**3. Finalidad y alcance.** Un rol es un conjunto de capacidades y una lista de los tipos de participación que sus titulares pueden ejercer. Esta pantalla es la matriz de permisos: usted marca qué capacidades tiene cada rol y añade roles propios. También contiene el conjunto de comandos de voz y de teclado del rol, que es una comodidad y no un control de acceso.

**4. Requisitos previos y dependencias.** La pestaña Participación en el caso muestra los tipos de participación, así que defínalos primero. Si lo omite, la pestaña no ofrece ningún tipo. Después, los roles se eligen para las personas en la pantalla Miembros.

Setup step: Tier 1, step 3
Requires: [Tipos de participación](#screen-participation_types)
Unlocks: [Miembros](#screen-staff-members), [Acceso de soporte](#screen-support_access)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: staff-roles - Lista del Diccionario de roles con acceso a casos y a la configuración]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar | Texto | Opcional | Texto de ayuda "Buscar roles". | En blanco |
| Rol | Insignia y nombre | No aplicable | Marca los roles integrados y los roles "gestionado por ForMedrixAI". | No aplicable |
| Descripción | Texto | No aplicable | | No aplicable |
| Acceso a casos | Sí/No | No aplicable | Si el rol trabaja con casos. | No aplicable |
| Acceso a la configuración | Sí/No | No aplicable | Si el rol abre Configuración. | No aplicable |
| Capacidades | Recuento (n de total) | No aplicable | | No aplicable |
| Comandos | Barra | No aplicable | Comandos de voz y de teclado activados. | No aplicable |
| Editar / Ver, Duplicar | Botones de fila | No aplicable | Un rol que usted no puede cambiar se abre como Ver. Duplicar fuerza que la copia sea un rol personalizado (no integrado). | No aplicable |

#### Ventana del rol

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | | En blanco |
| Color | Selector de color | Opcional | | `#8AB4F8` |
| Descripción | Texto | Opcional | | En blanco |
| Acceso a casos | Casilla | Opcional | | Desactivado |
| Acceso a la configuración | Casilla | Opcional | | Desactivado |
| Pestaña Capacidades | Casillas, agrupadas | Opcional | Una casilla por capacidad. Las de riesgo alto llevan una etiqueta **Auditada**. Una casilla muestra "Necesita" cuando depende de otra capacidad y "Necesaria para" cuando otras dependen de ella. | Ninguna marcada |
| Pestaña Comandos | Casillas | Opcional | Comandos de voz y de teclado del rol. No controlan el acceso. | Valores predeterminados del rol |
| Pestaña Participación en el caso | Casillas de los tipos de participación activos | Opcional | Los tipos que los titulares de este rol pueden ejercer. Un rol de Citotécnico no puede tener tipos de patólogo. | Ninguno |
| Pestaña Referencia de acciones | Lista de solo lectura | No aplicable | Una chuleta de las acciones. | No aplicable |

El guardado se rechaza, con un mensaje, en estos casos: usted no tiene permiso; una capacidad no es válida; el cambio dejaría `config:clinical-mismatch-rules:manage` y `config:ai-prompt:approve` juntas en un mismo rol, o en un rol que tiene una misma persona (separación de funciones); el cambio dejaría sin ningún rol asignable con `config:roles:manage` (al menos uno debe conservarla); el rol es Superadministrador (solo lectura); o a un rol de Citotécnico se le asigna un tipo de participación de patólogo. Un cambio en las capacidades de un rol se escribe en el registro de auditoría como "Role capabilities changed".

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, editar, duplicar: `config:roles:manage` (riesgo alto, con auditoría). Administrador y Superadministrador la tienen de forma predeterminada. Director de laboratorio no.
**Límites conocidos.** Un hospital no puede cambiar Superadministrador. Un rol personalizado empieza sin capacidades de configuración, así que marque las que necesiten sus usuarios.

### Miembros {#screen-staff-members}
Breadcrumb: Inicio > Configuración > Personal > Miembros del personal

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Personal** > subpestaña **Miembros del personal**
**2. Elemento de mantenimiento:** Miembros

**3. Finalidad y alcance.** La ficha de cada persona que trabaja en PathScribe: nombre, datos de contacto, roles, los centros en que trabaja, identificadores profesionales, firma, contraseña de inicio de sesión y estado. Los roles deciden qué puede hacer. Los centros limitan dónde se aplican esas capacidades.

**4. Requisitos previos y dependencias.** La lista Centros lee el Diccionario de centros y la lista de roles lee la pantalla Roles. Las subespecialidades proceden del diccionario de subespecialidades de [Subespecialidades](#screen-subspecialties). Si omite los roles, no se puede guardar a una persona: se requiere al menos un rol.

Setup step: Tier 1, step 5
Requires: [Diccionario de centros](#screen-facility-dictionary), [Roles](#screen-staff-roles)
Unlocks: [Acreditación profesional](#screen-staff-credentialing), [Seguridad de la sesión](#screen-session_security), [Acceso de soporte](#screen-support_access)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: staff-members - Lista de personal agrupada por rol principal]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar | Texto | Opcional | Coincide con el nombre, el correo electrónico, las credenciales, el NPI, el número GMC, la licencia y el teléfono. | En blanco |
| Filtro de rol | Lista de roles (se excluye Médico) | Opcional | Un grupo "Ninguna función coincide" muestra a las personas cuyo rol ya no existe. | Todos |
| Miembro del personal | Nombre, credenciales, insignias | No aplicable | Insignias Ped. y Orq., y "+N" para los roles adicionales. Agrupados por rol principal, con un recuento. | No aplicable |
| Correo electrónico, Rol, Subespecialidades, Estado | Columnas | No aplicable | | No aplicable |
| Añadir miembro | Botón | No aplicable | Requiere `config:staff-access:assign`. | No aplicable |

#### Ventana del editor

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre, Segundo nombre, Apellidos | Texto | Obligatorio según Requisitos de los campos | Consulte la nota bajo la tabla. | En blanco |
| Correo electrónico | Texto con el formato nombre@dominio.tld | Obligatorio según Requisitos de los campos | Se comprueba con el patrón `\S+@\S+\.\S+`. | En blanco |
| Rol(es) | Casillas | Obligatorio | Al menos uno. No se ofrecen Médico ni los roles que no se pueden asignar. Bloqueado sin `config:staff-access:assign`. | Ninguno |
| Teléfono | Texto | Opcional | | En blanco |
| Subespecialidades | Lista del diccionario de subespecialidades | Opcional | | Ninguna |
| Credenciales | Texto | Opcional | Por ejemplo MD. | En blanco |
| NPI | Texto | Opcional | Número de proveedor de Estados Unidos. | En blanco |
| Número GMC | Texto | Opcional | Número de registro del Reino Unido. | En blanco |
| Número de licencia | Texto | Opcional | | En blanco |
| Perfil de voz | Opción entre los perfiles de voz | Opcional | | En blanco |
| Idioma de ortografía | Opción de idiomas | Opcional | El idioma que se usa en el corrector ortográfico de esta persona. | En blanco |
| Grupos de revisores de control de calidad de citología | Texto, códigos de rol separados por comas, forzado a mayúsculas | Opcional | | En blanco |
| Centros | Casillas | Opcional | Vacío significa todos los centros. Limita dónde se aplican las capacidades de la persona. No cambia qué casos puede abrir. Desde el lote 653, el límite se aplica también a las acciones a nivel de caso, usando el centro solicitante del caso; un caso sin centro registrado se sigue rechazando para una persona con límite de centros, así que corrija el centro de la solicitud. Una persona sin límite de centros no nota ningún cambio. | Vacío (todos) |
| Acceso pediátrico | Interruptor Sí/No | Opcional | Requiere `config:staff-access:assign`. | Desactivado |
| Acceso a Orquestación | Interruptor Sí/No | Opcional | Requiere `config:staff-access:assign`. | Desactivado |
| PIN de autenticación rápida | Cuatro dígitos | Opcional | Se muestra solo cuando la persona tiene el rol Personal de quirófano. | En blanco |
| Credenciales jurisdiccionales | Filas | Opcional | Cada fila: Tipo (IBMS_ASD, UK_HO_REGISTERED_FORENSIC_PATHOLOGIST, MEDICOLEGAL_APPOINTMENT, NL_KCA_ADVANCED, DE_ZYTO_ASSISTENT_ADV), Organismo emisor, Jurisdicción, Fecha de entrada en vigor (obligatoria), Fecha de caducidad (opcional, no anterior a la fecha de entrada en vigor). | Ninguna |
| Contraseña de inicio de sesión | Texto, de 12 a 128 caracteres | Opcional | Solo al editar. Se rechaza si ha sido expuesta en una filtración, es común o sigue un patrón. Opciones: "debe cambiarse en el próximo inicio de sesión" y eliminar. Requiere `config:staff-password:manage`. | Ninguna |
| Cuentas de inicio de sesión vinculadas | Lista | No aplicable | Solo al editar. **Desvincular** elimina un vínculo con una identidad externa. | Ninguna |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |
| Enlace de la imagen de la firma | Enlace https | Opcional | Se muestra una vista previa. PathScribe almacena el enlace, no la imagen. | En blanco |

Cuáles de estos datos son obligatorios (nombre, segundo nombre, apellidos, rol, subespecialidades, centros, correo electrónico, teléfono, credenciales, NPI, número GMC, licencia y firma) se establece en [Requisitos de los campos](#screen-field_requirements), página **Personal**. El rol es siempre obligatorio.

El guardado comprueba las capacidades indicadas arriba y rechaza un cambio que incumpla la separación de funciones. Cambiar los roles, los centros o los indicadores de acceso escribe "Staff access changed" en el registro de auditoría. Cambiar las credenciales escribe "Staff credentials changed".

**7. Permisos.** Abrir: `screen:configuration:open`. Editar la ficha: `config:staff:edit`. Roles, centros, indicadores de acceso y credenciales: `config:staff-access:assign` (requiere `config:staff:edit`). Contraseñas: `config:staff-password:manage`. Todas de riesgo alto. Administrador y Superadministrador las tienen de forma predeterminada.
**Límites conocidos.** El PIN de autenticación rápida es solo para el rol Personal de quirófano.

### Tipos de delegación {#screen-delegation_types}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Tipos de delegación

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento** > **Tipos de delegación**
**2. Elemento de mantenimiento:** Tipos de delegación

**3. Finalidad y alcance.** Un tipo de delegación es una forma con nombre de pasar un caso o un informe a otra persona: reasignarlo, enviarlo a un grupo, pedir una segunda opinión, enviarlo a una revisión docente. Cada tipo indica si la titularidad cambia de manos, si se necesita una nota y si varias personas pueden recibirlo.

**4. Requisitos previos y dependencias.** La opción Laboratorio ejecutor lee el Diccionario de centros. Si lo omite, solo se ofrece **Todos los laboratorios**.

Setup step: Tier 1, step 4
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Requisitos de los campos](#screen-field_requirements)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-delegation_types - Lista de tipos de delegación con filtro de laboratorio]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtro de laboratorio | Lista: Todos, Global o un laboratorio | Opcional | Reduce la lista. | Todos |
| Etiqueta | Texto | Obligatorio | | En blanco |
| ID | Texto, en mayúsculas, hasta 24 caracteres | Obligatorio | Se obtiene de la etiqueta a medida que escribe. Se bloquea una vez creado el tipo. | Derivado |
| Descripción | Texto | Obligatorio | | En blanco |
| Sugerencia CPT | Texto | Opcional | | En blanco |
| Laboratorio ejecutor | Lista | Opcional | | Todos los laboratorios |
| Color de énfasis | Muestras predefinidas | Opcional | | La primera predefinida |
| Activo | Interruptor Sí/No | Opcional | | Activado |
| Transfiere la titularidad | Interruptor Sí/No | Opcional | | Desactivado |
| Requiere nota | Interruptor Sí/No | Opcional | Quien envía debe escribir una nota. | Desactivado |
| Permite varios destinatarios | Interruptor Sí/No | Opcional | | Desactivado |
| Eliminar | Botón de fila | No aplicable | Solo para los tipos personalizados. Pregunta Sí o No. | No aplicable |

El producto incluye siete tipos del sistema: REASSIGN, POOL, SECOND_OPINION, CASUAL_REVIEW (inactivo), TUMOR_BOARD (inactivo), TEACHING y CONSULT_EXT. Un tipo del sistema solo permite el interruptor de activo. Los tipos personalizados se pueden editar y eliminar.

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, editar, eliminar, activar o desactivar: `config:delegation-types:manage` (riesgo alto, con auditoría). Administrador y Director de laboratorio la tienen de forma predeterminada.
**Límites conocidos.** El subtítulo de la pantalla dice que un tipo del sistema se puede "duplicar en un nuevo tipo personalizado", pero no existe ningún botón Duplicar. Para crear una variante, añada un tipo nuevo.

### Acreditación profesional {#screen-staff-credentialing}
Breadcrumb: Inicio > Configuración > Personal > Revisión de credenciales

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Personal** > subpestaña **Revisión de credenciales**
**2. Elemento de mantenimiento:** Acreditación profesional

**3. Finalidad y alcance.** Dos tipos de asignación de práctica supervisada. Una **Evaluación centrada de la práctica profesional (FPPE)** empareja a un patólogo recién contratado con un tutor hasta que se haya revisado un número determinado de casos o de días. Una asignación de **competencia de citotécnico** empareja a un citotécnico nuevo con un supervisor hasta que se completa un número de evaluaciones. Ambas aparecen en tablas de Activas y Completadas con un filtro de centro.

**4. Requisitos previos y dependencias.** Las personas elegidas ya deben existir en [Miembros](#screen-staff-members), y el laboratorio en el [Diccionario de centros](#screen-facility-dictionary). Si los omite, los selectores están vacíos.

Setup step: Tier 1, step 6
Requires: [Diccionario de centros](#screen-facility-dictionary), [Miembros](#screen-staff-members)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: staff-credentialing - Tablas de asignación de FPPE y de competencia de citotécnico]

**6. Referencia de campos.**

#### Asignación de FPPE

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Contratación provisional | Lista de personal | Obligatorio | La persona que se evalúa. | Ninguno |
| Tutor | Lista de personal | Obligatorio | Debe ser otra persona. | Ninguno |
| Laboratorio ejecutor | Lista | Obligatorio | | Ninguno |
| Ámbito de subespecialidad | Lista | Opcional | Limita la revisión a una subespecialidad. | Todas |
| La revisión termina por | Opción: número de casos, duración, cualquiera de los dos | Obligatorio | | Cualquiera de los dos |
| Número de casos | Número entero | Obligatorio cuando se usa | Debe ser mayor que 0. | 20 |
| Duración | Número entero de días | Obligatorio cuando se usa | Debe ser mayor que 0. | 90 |
| Finalizar ahora | Botón de fila | No aplicable | Termina la revisión antes de tiempo. | No aplicable |
| Filtro de centro | Lista | Opcional | Filtra las dos tablas. | Todos |

#### Asignación de competencia de citotécnico

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nuevo citotécnico | Lista de personal | Obligatorio | | Ninguno |
| Supervisor | Lista de personal | Obligatorio | | Ninguno |
| Laboratorio ejecutor | Lista | Opcional | | Ninguno |
| Ámbito de subespecialidad | Lista | Opcional | | Todas |
| Evaluaciones necesarias | Número entero | Obligatorio | | 2 |

**7. Permisos.** Abrir: `screen:configuration:open`. FPPE: `config:fppe:manage`. Competencia de citotécnico: `config:cytotech-competency:manage`. Ambas de riesgo alto, con auditoría. Administrador y Director de laboratorio las tienen de forma predeterminada.
**Límites conocidos.** La tabla de competencia de citotécnico muestra las fechas en el formato propio del navegador, no en el idioma de visualización.

### Seguridad de la sesión {#screen-session_security}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Seguridad de la sesión

**Estado:** Parcial

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento** > **Seguridad de la sesión**
**2. Elemento de mantenimiento:** Seguridad de la sesión

**3. Finalidad y alcance.** Cuatro controles de toda la organización sobre cómo demuestran las personas quiénes son: el tiempo de cierre de sesión por inactividad, las nuevas comprobaciones biométricas, la política de segundo factor (MFA) y la política de autenticación de firma para firmar informes. Un centro ejecutor puede anular el tiempo de inactividad (en la pestaña IA y rendimiento del centro) y la política de firma.

**4. Requisitos previos y dependencias.** Las anulaciones por centro y la tabla de altas leen el Diccionario de centros y la lista de personal. Si los omite, la tabla de anulaciones queda vacía, pero los valores predeterminados de la organización siguen funcionando.

Setup step: Tier 1, step 7
Requires: [Diccionario de centros](#screen-facility-dictionary), [Miembros](#screen-staff-members)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-session_security - Tarjetas de tiempo de inactividad, biometría, MFA y política de firma]

**6. Referencia de campos.**

#### Tiempo de inactividad

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Valor predeterminado de la organización | Opción: 5, 10, 15, 20, 30, 60 minutos | Obligatorio | Se guarda al cambiarlo. Una advertencia aparece 60 segundos antes del cierre de sesión. Una anulación por centro lo sustituye en ese laboratorio. | 15 minutos |

#### Política biométrica

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Activado | Interruptor Sí/No | Opcional | Una instalación puede forzarlo a desactivado. | Desactivado |
| Cadencia | Opción: per_sign_off, per_session, per_days, never | Opcional | Cada cuánto se vuelve a comprobar. | per_sign_off |
| Días | Número entero, de 1 a 365 | Obligatorio para per_days | | 30 |

#### Política de MFA

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Modo | Opción: off, signing_roles, all | Obligatorio | Quién debe usar un segundo factor. | off |
| Minutos de verificación reforzada | Número entero, de 1 a 720 | Opcional | Cuánto tiempo sigue siendo válida una comprobación de segundo factor. | 30 |
| Horas de sesión | Número entero, de 1 a 72 | Opcional | | 12 |
| Tabla de altas | Lista con **Restablecer alta** | No aplicable | Restablecer requiere `auth:mfa-enrolment:reset`. | No aplicable |

#### Política de firma

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Valor predeterminado de la empresa | Opción: strict, session | Obligatorio | Cómo se autentica un informe en el momento de la firma. | strict |
| Tiempo de espera agotado | Opción: 15, 30, 60, 240 minutos | Opcional | | 30 minutos |
| Segundo factor | Interruptor Sí/No | Opcional | | Desactivado |
| Bloquear las anulaciones por centro | Interruptor Sí/No | Opcional | Impide que un centro cambie la política. | Desactivado |
| Anulaciones por centro | Tabla, una fila por centro ejecutor | Opcional | | Heredar |
| Exportar | Botón CSV | No aplicable | | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. Cambiar: `config:session-security:manage` (riesgo alto, con auditoría). Restablecer un alta de MFA: `auth:mfa-enrolment:reset`. Administrador y Director de laboratorio tienen la primera. Solo Administrador y Superadministrador tienen la segunda.
**Límites conocidos.** El autenticador está simulado en la demostración. Con el inicio de sesión único, el proveedor de identidad solicita el segundo factor. La pantalla de la política de firma indica que restringir la firma remota requiere el servidor de la API y está aplazado. La pantalla advierte de que la autenticación de la firma guarda relación con 21 CFR Part 11 (11.200); el control establece lo que se solicita y no hace por sí solo que un laboratorio cumpla la norma.

### Acceso de soporte {#screen-support_access}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Acceso de soporte

**Estado:** Demostración

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento** > **Acceso de soporte**
**2. Elemento de mantenimiento:** Acceso de soporte

**3. Finalidad y alcance.** Usted decide si el soporte de ForMedrixAI puede acceder a los datos de su organización. La pantalla establece la política, muestra las solicitudes pendientes de aprobación y el acceso activo, y conserva un registro aparte de todo lo que hizo el soporte. "Acceso de soporte" significa una sesión de Superadministrador que accede a una organización de la que esa persona no es personal. Sus propios usuarios nunca se ven afectados.

**4. Requisitos previos y dependencias.** Alguien debe poder aprobar: un miembro de su organización que tenga `config:support-access:approve` y que no sea la persona que solicita el acceso. Configure primero los roles y las personas. Si nadie puede aprobar y la política es Requiere aprobación, las solicitudes quedan sin respuesta.

Setup step: Tier 1, step 8
Requires: [Roles](#screen-staff-roles), [Miembros](#screen-staff-members)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-support_access - Política, solicitudes pendientes, acceso activo y actividad de soporte]

**6. Referencia de campos.**

#### Política

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Política de acceso de soporte | Opción: Desactivado, Requiere aprobación, Siempre permitido | Obligatorio | Desactivado: el soporte no puede abrir, listar ni buscar sus datos. Requiere aprobación: el soporte la solicita por incidencia con un motivo, y un aprobador la aprueba. Siempre permitido: no hace falta solicitud, y todo queda registrado igualmente. | Requiere aprobación |
| Ventana de acceso | Opción: 30 minutos, 1, 2, 4, 8 horas | Obligatorio | Cuánto dura una aprobación. El soporte o usted pueden terminarla antes. | 2 horas |
| Guardar política | Botón | No aplicable | | No aplicable |

#### Solicitudes y acceso activo

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Pendientes de aprobación | Tabla | No aplicable | Columnas: Agente de soporte, Incidencia, Motivo, Solicitado. Botones **Aprobar** y **Rechazar**. No puede aprobar su propia solicitud. | No aplicable |
| Acceso de soporte activo | Tabla | No aplicable | Columnas: Agente de soporte, Incidencia, Aprobado por, Tiempo restante. Botón **Revocar**. | No aplicable |

#### Actividad de soporte

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Tabla de auditoría | Tabla | No aplicable | Columnas: Marca de tiempo, Nombre del agente de soporte, IP de origen, País de origen, ID de la incidencia, Acción realizada, ID de los casos, Detalle. Cada entrada está encadenada a la anterior mediante un hash, de modo que una entrada modificada o eliminada se muestra como "Registro alterado en la entrada N". | No aplicable |
| Exportar CSV, Exportar JSON, Exportar PDF | Botones | No aplicable | Requiere `config:support-audit:view`. | No aplicable |

#### [FORMEDRIXAI INTERNAL ONLY] Panel Solicitar acceso de soporte {#screen-support_access-request}

> 🔒 **Ajuste restringido interno de ForMedrixAI**
> **Ámbito:** Solo personal interno de servicio y de despliegue.
> **Explicación:** Este panel aparece solo en una sesión de Superadministrador, que es un inicio de sesión del soporte de ForMedrixAI. Abre una ventana vinculada a una incidencia sobre los datos de una organización cliente. Un administrador del cliente nunca lo ve, y un cambio aquí por parte de cualquiera que no sea el soporte permitiría a una persona acceder a información sanitaria protegida sin la aprobación del cliente.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Organización | Lista | Obligatorio | El cliente al que se accede. | Ninguno |
| ID de la incidencia de soporte | Texto | Obligatorio | Por ejemplo SUP-1234. | En blanco |
| Motivo | Texto, al menos 10 caracteres | Obligatorio | Qué hay que examinar y por qué. | En blanco |
| Solicitar acceso, Finalizar acceso | Botones | No aplicable | | No aplicable |
| Incidencia cerrada (simulado) | Botón | No aplicable | Simula que el sistema de incidencias cierra la incidencia: finaliza el acceso y lo registra. No hay ningún sistema de incidencias conectado. | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. Establecer la política y la ventana: `config:support-access:policy`. Aprobar, rechazar, revocar: `config:support-access:approve`. Ver y exportar la auditoría: `config:support-audit:view`. Todas de riesgo alto. Administrador y Superadministrador las tienen de forma predeterminada. El aprobador debe pertenecer a la organización y no puede ser quien solicita el acceso, aunque un Superadministrador tenga todas las capacidades.
**Límites conocidos.** La versión del navegador está completa, pero la parte del servidor no está conectada: la puerta de la política, las sesiones vinculadas a incidencias, la tabla de auditoría de solo adición, la notificación a los aprobadores y la exportación a PDF están especificadas en `AUTHORIZATION_API.md` y todavía no se han construido. El correo de notificación está simulado. La IP y el país de origen de la auditoría solo puede registrarlos con veracidad el servidor, de modo que en la versión del navegador no son reales.

## Parte C: Asignaciones de estaciones de trabajo, impresoras, generador de etiquetas y escáneres {#ch2-hardware}
Breadcrumb: Inicio > Configuración > Sistema > Puesto de trabajo y equipos

Esta parte trata del lado físico: el registro de dispositivos, las impresoras y el programa que las controla, los puestos que escanean e imprimen, y las reglas de las etiquetas. La mayoría de estas pantallas están en el grupo **Puesto de trabajo y equipos**, que muestra un selector de **Centro** compartido encima de la barra lateral. Elija una sede allí una sola vez y Ajustes de impresión, Perfiles de impresora, Estaciones de escaneo, Agentes del centro, Equipos y Hardware de tallado muestran esa sede. Grupos de estaciones de trabajo está en el grupo **Materiales y flujos de trabajo del laboratorio**.

**Orden recomendado.** Registre primero los dispositivos (Equipos), después indique qué puede hacer cada impresora (Perfiles de impresora), luego instale y configure el agente del centro, después ponga nombre a los puestos (Estaciones de escaneo), luego defina las reglas de impresión y los diseños de etiqueta, y por último registre los ordenadores y agrupe los puestos.

**Qué necesita una etiqueta.** Una etiqueta impresa depende de cuatro elementos. Ajustes de impresión elige el tamaño de la etiqueta, el tipo de código de barras y el perfil de impresora. El Diseñador de etiquetas dispone los campos. Perfiles de impresora indica cómo llega un navegador a la impresora. La pestaña Impresión del editor de centros y el agente del centro indican adónde van los informes y las etiquetas en la red de la sede. Sin servidor de API, nada llega a una impresora real: cada impresión se registra en el [Registro de impresión simulada](#screen-simulated_print).

### Equipos {#screen-equipment}
Breadcrumb: Inicio > Configuración > Sistema > Puesto de trabajo y equipos > Equipos

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Puesto de trabajo y equipos** > **Equipos**
**2. Elemento de mantenimiento:** Equipos

**3. Finalidad y alcance.** Un registro único de todos los dispositivos del laboratorio: analizadores, tintores, procesadores de tejidos, escáneres de preparaciones, cámaras, básculas, impresoras de etiquetas, grabadoras y unidades de almacenamiento. Cada elemento pertenece a un laboratorio ejecutor y puede estar en una estación de escaneo. Otras pantallas remiten al registro: un perfil de impresora se vincula a una impresora de etiquetas, el hardware de tallado se vincula a una cámara o una báscula, y un lote molecular se dirige a un analizador activo. Un registro de servicio anota el mantenimiento, la calibración y las averías.

**4. Requisitos previos y dependencias.** La lista Laboratorio ejecutor lee el Diccionario de centros, y la lista Estación de escaneo lee [Estaciones de escaneo](#screen-scan_stations) de ese laboratorio. Si omite el centro, el elemento no se puede guardar. La estación de escaneo es opcional y se puede definir más tarde.

Setup step: Tier 1, step 9
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Perfiles de impresora](#screen-printer_profiles), [Hardware de tallado](#screen-grossing_hardware)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-equipment - Registro de equipos con filtros de tipo y de estado]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar | Texto | Opcional | Nombre, código, marca, modelo o número de serie. | En blanco |
| Filtro de tipo | Lista: Todos los tipos, o un tipo | Opcional | | Todos los tipos |
| Filtro de estado | Pestañas, empezando por Todos | Opcional | | Todos |
| Columnas | Equipo, Código, Tipo, Marca y modelo, Laboratorio ejecutor, Estación de escaneo, Servicio, Ajustes, Estado, Acciones | No aplicable | Servicio muestra Al día, Próximo vencimiento, Vencido, Aún no realizado, No programado o Avería, con la próxima fecha de vencimiento. Ajustes enlaza con el registro del perfil de impresora o del hardware de tallado que usa el dispositivo. | No aplicable |
| + Añadir equipo, Editar, Registro, Desactivar / Reactivar | Botones | No aplicable | Se desactiva, no se elimina, porque los lotes y las etiquetas impresas llevan el código. | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Código | Texto, letras, números, "_" y "-" | Obligatorio | El ID que llevan otros registros, por ejemplo PANTHER_02 en un lote molecular y en el código de barras de su plataforma. Debe ser único. No se puede cambiar después de crearlo. | En blanco |
| Nombre | Texto | Obligatorio | | En blanco |
| Tipo | Opción: Analizador, Tintor, Procesador de tejidos, Procesador de citología en medio líquido, Escáner de preparaciones, Cámara, Báscula, Impresora de etiquetas, Grabadora, Unidad de almacenamiento, Otro | Obligatorio | Los analizadores activos son los que pueden recibir los lotes moleculares. | Analizador |
| Marca, Modelo | Texto | Opcional | | En blanco |
| Número de serie | Texto | Opcional | | En blanco |
| Laboratorio ejecutor | Lista | Obligatorio | Al cambiarlo se borra la estación de escaneo. | Sede seleccionada |
| Estación de escaneo | Lista de las estaciones de ese laboratorio | Opcional | Dónde está. En un analizador, el envío de la lista de trabajo comprueba que se envía desde esta estación. Se rechaza una estación de otro laboratorio. | Ninguna |
| Calibración cada (días) | Número entero, de 1 a 3650 | Opcional | En blanco significa sin programación. Las fechas de vencimiento se cuentan desde la última entrada superada del registro de servicio. | En blanco |
| Mantenimiento cada (días) | Número entero, de 1 a 3650 | Opcional | La misma regla. | En blanco |
| Temperatura mínima (°C), Temperatura máxima (°C) | Números, mínimo por debajo del máximo; cualquiera puede quedar en blanco | Opcional | Lote 730: el intervalo de un control de temperatura del registro de equipos. Una lectura fuera de él es un fallo; el intervalo se copia en cada entrada. | En blanco |
| Admite portaobjetos de gran formato | Casilla, solo teñidores y escáneres de portaobjetos | Opcional | Lote 732: el equipo admite portaobjetos de gran formato (megabloques). La distribución de portaobjetos envía un portaobjetos de gran formato solo a un escáner con esta casilla marcada. | Sin marcar |
| Firma del control de calidad | Lista, solo teñidores y escáneres de portaobjetos: Valor predeterminado del laboratorio, Aceptación automática, Firma del instrumento (motor de interfaz), Firma en PathScribe | Opcional | Lote 763: cómo se firma la producción de este instrumento antes de repartir sus portaobjetos (teñidor) o abrir sus imágenes (escáner). Véase [Control de tinción y escaneo](#screen-stain_qc). | Valor predeterminado del laboratorio |
| Estado | Activo / Inactivo | Opcional | | Activo |
| Disposición de la plataforma | Filas, solo analizadores | Opcional | Las posiciones de la plataforma del analizador. Cada fila: Plataforma o bahía, ID de posición (letras, dígitos, "_", sin repetirse) y Admite (Placa de extracción, Cartucho de reactivo, Gradilla de tubos de muestra; al menos uno). La carga de gradillas ofrece solo las posiciones adecuadas. El ID de posición se imprime en el código de barras de la posición de la plataforma. | Ninguna |

#### Ventana del registro de servicio

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Historial | Tabla: Fecha, Tipo, Resultado, Por, Notas | No aplicable | Las entradas no se pueden cambiar ni eliminar. Corrija un error con una entrada nueva. Una nota "Avería abierta" se muestra hasta que se registra una reparación o una comprobación de funcionamiento superadas. | No aplicable |
| Tipo | Opción: Mantenimiento, Calibración, Comprobación de funcionamiento, Reparación, Avería | Obligatorio | | Mantenimiento |
| Fecha de realización | Fecha | Obligatorio | No puede ser futura. | Hoy |
| Realizado por | Texto | Obligatorio | Miembro del personal o técnico de servicio. | Su nombre |
| Resultado | Opción: Superado, No superado, No aplicable | Obligatorio | | Superado |
| Notas | Texto | Obligatorio en un fallo o una avería | | En blanco |

#### Gradillas de tinción

Lote 737. Se muestra bajo el registro cuando el laboratorio tiene gradillas de tinción reutilizables (identificadores RACK- grabados). Cada fila es una gradilla con la casilla **Admite portaobjetos de gran formato**, que se guarda al instante (requiere `config:equipment:manage`). Gestión de lotes rechaza un portaobjetos de gran formato (cortado de un megabloque) escaneado en un soporte de tinción que no los admite; un soporte de tinción desechable los admite cuando se marca **Admite portaobjetos de gran formato (megabloques)** en Nuevo contenedor. La demo tiene una gradilla así, RACK-STAIN-LF-01.

Batch 761: una gradilla se reutiliza tanda tras tanda. En el micrótomo, escanear una gradilla registrada cuya última tanda está cerrada inicia una tanda nueva, sin formulario; Gestión de lotes la abre como tanda nueva (Nuevo contenedor, rellenado). Una gradilla cuya última tanda se selló o se puso en el teñidor pero nunca se cerró queda retenida con un aviso. Cerrar esa tanda desde el micrótomo es una anulación de conciliación (`batch:reconciliation:override`), registrada con el motivo «Reusable rack scanned for a new run; the last run on it was never closed.»

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, editar, desactivar: `config:equipment:manage`. Registrar una entrada del registro de servicio: `equipment:maintenance:record`. Ambas de riesgo alto. Administrador y Director de laboratorio tienen las dos. Los roles Histotecnólogo, Citotécnico y Técnico molecular también tienen el permiso del registro.
**Límites conocidos.** Las fechas de vencimiento del servicio se calculan en la zona horaria del centro definida en los ajustes del Panel de contribución.

### Control de tinción y escaneo {#screen-stain_qc}
Breadcrumb: Inicio > Configuración > Sistema > Puesto de trabajo y equipos > Control de tinción y escaneo

**Estado:** Parcial

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Puesto de trabajo y equipos** > **Control de tinción y escaneo**
**2. Elemento de mantenimiento:** Control de tinción y escaneo

**3. Finalidad y alcance.** Lote 763, el punto de control de calidad tras la tinción y antes de la distribución. Cuando termina una serie de tinción, sus portaobjetos esperan el control: la gradilla no puede darse de salida y sus portaobjetos no se reparten en Distribución de portaobjetos hasta que se firma la serie. Una imagen escaneada puede esperar del mismo modo antes de que el Patólogo pueda abrirla. Cada teñidor y escáner se firma de una de tres maneras: **Aceptación automática** (se libera al momento, auditado como aceptación automática), **Firma del instrumento (motor de interfaz)** (opción A: el resultado de control del propio instrumento, enviado por el motor de interfaz, libera o retiene la serie; en un escáner, su propia revisión de imagen) o **Firma en PathScribe** (opción B: un técnico firma en el punto de control de Distribución de portaobjetos). Esta pantalla fija los valores predeterminados; el modo propio de un instrumento se fija en [Equipos](#screen-equipment) (Firma del control de calidad) y prevalece sobre el predeterminado.

**4. Requisitos previos y dependencias.** La lista de instrumentos lee [Equipos](#screen-equipment): teñidores y escáneres de portaobjetos. La firma del instrumento necesita la interfaz del teñidor (su mensaje de firma por el motor de interfaz); sin ella, un supervisor firma en su lugar.

Setup step: Tier 1, step 22
Requires: [Equipos](#screen-equipment)
Unlocks: None.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-stain-qc - Los valores predeterminados y la lista de teñidores y escáneres con su modo]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Teñidores | Lista: Aceptación automática, Firma del instrumento (motor de interfaz), Firma en PathScribe | Obligatorio | El valor predeterminado de un teñidor sin modo propio. | Firma en PathScribe |
| Escáneres de portaobjetos | La misma lista | Obligatorio | El valor predeterminado de un escáner sin modo propio. Con la firma del instrumento, se libera la imagen que superó la revisión del propio escáner; las demás se retienen. | Aceptación automática |
| Guardar los valores predeterminados | Botón | No aplicable | Auditado como Stain QC Settings Saved. | No aplicable |
| Teñidores y escáneres | Tabla: Instrumento, Tipo, Firma del control | No aplicable | El modo de cada instrumento, con «predeterminado» cuando no tiene uno propio. | No aplicable |

En el punto de control, un portaobjetos no conforme se marca **Volver a teñir** (estado QC Failed) o **Volver a cortar** (Recut Requested) con un motivo: Tinción débil, Tinción excesiva, Tinción irregular, Control no conforme, Burbuja bajo el cubreobjetos, Tejido plegado, Otro. Una imagen se libera o se devuelve para escanearla de nuevo con un motivo: Desenfocada, Tejido no capturado, Error de unión, Suciedad en el portaobjetos, Otro. El registro de auditoría muestra Stain QC Pending, Passed, Failed, Instrument Result Ignored; Image QC Pending, Passed, Failed.

**7. Permisos.** Abrir: `screen:configuration:open`. Guardar los valores predeterminados: `config:stain-qc:manage` (Administrador, Director de laboratorio). En el punto de control: `stain:qc:sign-off` y `scan:image-qc:sign-off` (los roles que abren Distribución de portaobjetos, Director de laboratorio); `stain:qc:override` para firmar una serie que espera la firma de su teñidor (Director de laboratorio). Todos de alto riesgo.
**Límites conocidos.** Los motivos de no conformidad son una lista fija; los criterios de control por tinción no están construidos. Las rutas del servidor y el canal de firma del motor de interfaz están previstos.

### Perfiles de impresora {#screen-printer_profiles}
Breadcrumb: Inicio > Configuración > Sistema > Puesto de trabajo y equipos > Perfiles de impresora

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Puesto de trabajo y equipos** > **Perfiles de impresora**
**2. Elemento de mantenimiento:** Perfiles de impresora

**3. Finalidad y alcance.** Un perfil de impresora registra lo que una impresora de etiquetas puede hacer realmente (resolución, compatibilidad con DataMatrix y GS1, tamaño del módulo) y cómo llega a ella un navegador (el puente). PathScribe lo utiliza para elegir la plantilla de etiqueta adecuada y para rechazar, antes de enviarlo, un trabajo que la impresora no puede gestionar.

**4. Requisitos previos y dependencias.** La lista Dispositivo del registro lee [Equipos](#screen-equipment) y ofrece solo impresoras de etiquetas. La lista Centro lee el Diccionario de centros. Si omite Equipos, el perfil se guarda igualmente, pero no queda vinculado a ningún dispositivo. Un dispositivo que no es una impresora de etiquetas se rechaza: "El dispositivo del registro debe ser una impresora de etiquetas."

Setup step: Tier 1, step 10
Requires: [Diccionario de centros](#screen-facility-dictionary), [Equipos](#screen-equipment)
Unlocks: [Ajustes de impresión](#screen-print_settings), [Estaciones de escaneo](#screen-scan_stations), [Diseñador de etiquetas](#screen-label_designer)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-printer_profiles - Tabla de perfiles de impresora]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Columnas | ID de impresora, Modelo, Fabricante, Puente, Centro, Dispositivo del registro, PPP, GS1 / DataMatrix, Estado, Acciones | No aplicable | GS1 / DataMatrix muestra Ambos, Solo DataMatrix, Solo GS1 o un guion. Una impresora compartida muestra "Global". | No aplicable |
| + Añadir perfil de impresora, Editar, Duplicar, Eliminar | Botones | No aplicable | Eliminar borra el perfil. | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| ID de impresora | Texto | Obligatorio | Por ejemplo ZEBRA-192.168.12.85. | En blanco |
| Modelo | Texto | Obligatorio | Por ejemplo ZT411. | En blanco |
| Fabricante | Opción: Zebra (ZPL), Citizen, SATO, Leica CEREBRO, Sakura Tissue-Tek, Otro | Opcional | | Zebra (ZPL) |
| Versión de ZPL | Texto | Opcional | Por ejemplo 7.0. | En blanco |
| Tipo de puente | Opción: QZ Tray, Zebra Browser Print, BarTender Automation, Directo mediante el motor de interfaz, Agente de PathScribe, Cuadro de impresión del sistema operativo | Obligatorio | Cómo llega un navegador a la impresora en esta sede. | Cuadro de impresión del sistema operativo |
| Puerto del agente | Número entero, de 1024 a 65535 | Opcional | Se muestra para el puente del Agente de PathScribe. Déjelo vacío salvo que TI haya movido el agente fuera de sus puertos estándar (9100 a 9102). | En blanco |
| Centro | Lista, o Global | Opcional | Una impresora de red compartida que se usa desde varias sedes no tiene un único propietario: déjela en Global. | Sede seleccionada, o Global |
| Dispositivo del registro | Lista de Equipos | Opcional | La impresora física. | Sin vincular |
| PPP | Número entero | Obligatorio | | 300 |
| Densidad máxima de impresión | Número entero | Obligatorio | | 300 |
| Tamaño de módulo DataMatrix | Número entero, en puntos | Obligatorio | Afecta a la legibilidad con la resolución de esta impresora. | 4 |
| Dirección IP | Texto | Opcional | Por ejemplo 192.168.12.85. | En blanco |
| Puerto | Número entero | Opcional | | 9100 |
| Admite DataMatrix | Interruptor Sí/No | Opcional | | Activado |
| Admite GS1 | Interruptor Sí/No | Opcional | | Activado |
| Activo | Interruptor Sí/No | Opcional | | Activado |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, editar, duplicar, eliminar: `config:printers:manage` (riesgo alto, con auditoría). Administrador y Director de laboratorio la tienen de forma predeterminada.
**Límites conocidos.** Hoy solo un perfil con el puente QZ Tray envía realmente etiquetas. Cualquier otro puente recurre al cuadro de impresión del navegador.

### Agentes del centro {#screen-site_agents}
Breadcrumb: Inicio > Configuración > Sistema > Puesto de trabajo y equipos > Agentes del centro

**Estado:** Parcial

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Puesto de trabajo y equipos** > **Agentes del centro**. Elija antes una sede en el selector de Centro.
**2. Elemento de mantenimiento:** Agentes del centro

**3. Finalidad y alcance.** Un agente del centro es un programa de PathScribe instalado en la red de una sede. Imprime informes y etiquetas en las impresoras de la sede y escribe y recoge archivos en los recursos compartidos de red de la sede. Esta pantalla da de alta agentes, establece qué impresoras y recursos compartidos puede usar un agente, revoca un agente y fija la ventana horaria en que puede actualizarse por sí mismo.

**4. Requisitos previos y dependencias.** Un agente pertenece a un laboratorio ejecutor, así que añada primero el centro. La pantalla muestra "Elija una sede (un laboratorio ejecutor)" hasta que elija una. Los ID de impresora definidos aquí son los ID de destino a los que remiten Estaciones de trabajo y la pestaña Impresión del editor de centros.

Setup step: Tier 1, step 11
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Estaciones de trabajo](#screen-workstations), [Estaciones de escaneo](#screen-scan_stations)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-site_agents - Agentes, impresoras del agente, recursos compartidos de archivos y ventana de actualización]

**6. Referencia de campos.**

#### Agentes

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nuevo código de alta | Botón | No aplicable | Genera un código de un solo uso que se introduce al instalar el agente. Caduca, se muestra una sola vez y se puede copiar. Requiere `config:site-agents:enroll`. | No aplicable |
| Tabla de agentes | Equipo, Estado, Versión, Última conexión, El certificado caduca, Impresoras, Acciones | No aplicable | El estado es En línea, Requiere atención, Sin conexión o Revocado. Impresoras muestra "N de M accesibles". | No aplicable |
| Revocar | Botón de fila | No aplicable | Corta el acceso del agente de inmediato. | No aplicable |
| Motivo de la revocación | Opción: Puede estar comprometido, Dado de alta por error, Trasladado a otro centro, Equipo sustituido, Equipo retirado, Otro | Obligatorio | | Ninguno |
| Nota | Texto, hasta 500 caracteres | Obligatorio para Otro | | En blanco |

#### Impresoras del agente

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| ID de impresora | Texto | Obligatorio | Debe ser único en la sede. | printer-1, printer-2 y así sucesivamente |
| Nombre | Texto | Opcional | | En blanco |
| Tipo | Opción: Informe, Etiqueta | Obligatorio | Las impresoras de etiquetas usan solo Raw 9100. | Informe |
| Protocolo | Opción: Raw 9100, LPR, IPP, IPPS (confirma la impresión) | Obligatorio | Se prefiere IPPS: la impresora confirma cada informe. Raw 9100 y LPR solo pueden confirmar que se envió. | IPPS |
| Dirección | Dirección IP o nombre de host | Obligatorio | Todavía no se admite IPv6. | En blanco |
| Puerto | Número entero, de 1 a 65535 | Obligatorio | | Según el protocolo: 9100, 515, 631 |
| Cola LPR | Texto | Opcional | Se muestra para LPR. | En blanco |
| Ruta IPP | Texto | Opcional | Se muestra para IPP e IPPS. | En blanco |
| Añadir impresora, Eliminar | Botones | No aplicable | Añadir requiere `config:site-agent-config:manage`. | No aplicable |

#### Recursos compartidos de archivos

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Dirección | Escritura o Recogida | Obligatorio | Se establece con **Añadir recurso compartido de escritura** o **Añadir recurso compartido de recogida**. | Según el botón |
| ID del recurso compartido | Texto | Obligatorio | Debe ser único en la sede. | share-1, share-2 |
| Ruta del recurso compartido | Texto como \\server\share\folder | Obligatorio | | En blanco |
| Patrón de archivo | Patrón de nombre de archivo como *.hl7 | Obligatorio para la recogida | Solo un nombre, sin carpetas. Los PDF y las imágenes no se recogen: siguen siendo enlaces. | En blanco |
| Sin cambios durante (s) | Número entero de segundos | Obligatorio para la recogida | Al menos 5 segundos. | 30 |
| Archivo más grande (MB) | Número entero, de 1 a 500 | Obligatorio para la recogida | | 50 |
| Después de la entrega | Opción: Mover a "processed", Eliminar | Obligatorio para la recogida | No se recomienda eliminar archivos clínicos. | Mover a processed |
| Entregar a | Opción: Importación de PathScribe (Peticiones o Resultados), Canal del motor de interfaz | Obligatorio para la recogida | | Canal del motor de interfaz |
| Canal del motor | Texto, con sugerencias | Obligatorio para un canal | | En blanco |
| Los archivos rechazados van a | Nombre de carpeta de letras, números, espacios, - o _ (hasta 64 caracteres) | Obligatorio para la recogida | | rejected |
| Nombre de la entrada de credenciales | Texto | Opcional | El nombre de la entrada que guarda la contraseña del recurso compartido. Las contraseñas nunca se introducen en PathScribe. | En blanco |

#### Actualizaciones del agente

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Ventana de actualización desde, hasta | Hora como 02:00, en la hora local de la sede | Opcional | Indique las dos horas o ninguna. No pueden ser iguales. La ventana puede cruzar la medianoche. Sin ventana, el agente se actualiza cuando lo indica el servidor. | Sin ventana |
| Guardar impresoras y recursos compartidos, Descartar | Botones | No aplicable | El agente recoge un cambio guardado de inmediato. Una nota "Cambios sin guardar" se muestra hasta que guarda. | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. Dar de alta y revocar agentes: `config:site-agents:enroll`. Impresoras, recursos compartidos, ventana de actualización: `config:site-agent-config:manage`. Administrador y Director de laboratorio las tienen de forma predeterminada.
**Límites conocidos.** En la demostración ningún agente puede darse de alta, así que la lista de agentes está vacía. Aun así puede generar un código y configurar impresoras y recursos compartidos. La producción usa el contrato de servidor de `SITE_AGENT_API.md`. El agente rechaza cualquier impresora fuera de las subredes y los puertos que TI haya permitido en su equipo.

### Estaciones de escaneo {#screen-scan_stations}
Breadcrumb: Inicio > Configuración > Sistema > Puesto de trabajo y equipos > Estaciones de escaneo

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Puesto de trabajo y equipos** > **Estaciones de escaneo**
**2. Elemento de mantenimiento:** Estaciones de escaneo

**3. Finalidad y alcance.** Los puestos físicos con los que un terminal puede identificarse, al iniciar sesión y en la barra superior, y a los que cambia una etiqueta de estación impresa a mitad del flujo de trabajo. Al principio hay ocho estaciones configuradas. El nombre, el código de barras y la fase del flujo de trabajo los define usted. Un equipo puede estar en una estación, y los Grupos de estaciones de trabajo agrupan estaciones.

**4. Requisitos previos y dependencias.** La lista Centro lee el Diccionario de centros (solo laboratorios ejecutores). Una estación que admite impresión necesita un perfil de impresora de casetes y portaobjetos de [Perfiles de impresora](#screen-printer_profiles). Si lo omite, el guardado se rechaza: "Obligatorio cuando «Admite impresión» está activado."

Setup step: Tier 1, step 12
Requires: [Diccionario de centros](#screen-facility-dictionary), [Perfiles de impresora](#screen-printer_profiles)
Unlocks: [Ajustes de impresión](#screen-print_settings), [Grupos de estaciones de trabajo](#screen-workstation_groups), [Hardware de tallado](#screen-grossing_hardware)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-scan_stations - Lista de estaciones de escaneo con Imprimir etiqueta e Imprimir todas las etiquetas de estaciones activas]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar | Texto | Opcional | Nombre o código de barras. | En blanco |
| Filtro de estado | Opción: Todos, Activos, Inactivos | Opcional | | Todos |
| Columnas | Puesto, Código de barras, Centro, Fase del flujo de trabajo, Estado, Acciones | No aplicable | | No aplicable |
| Imprimir etiqueta, Imprimir todas las etiquetas de estaciones activas | Botones | No aplicable | Imprimen la etiqueta de código de barras de la estación. | No aplicable |
| + Añadir puesto de escaneo, Editar, Desactivar / Reactivar | Botones | No aplicable | Se desactiva, no se elimina. | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre del puesto | Texto | Obligatorio | Por ejemplo Puesto de tallado 4. | En blanco |
| Código de barras | Texto | Obligatorio | Se imprime en la etiqueta de la estación como `STATION:` más el código. Por ejemplo GROSSING-04. | En blanco |
| Centro | Lista de laboratorios ejecutores | Obligatorio | El laboratorio donde está el puesto, no un centro solicitante. | Sede seleccionada |
| Fase del flujo de trabajo | Opción: Recepción y registro, Tallado, Procesamiento, Inclusión, Microtomía / cortes, Tinción, Archivo de portaobjetos, Otra | Obligatorio | | Recepción y registro |
| IP de la impresora | Texto | Opcional | La impresora de etiquetas de red de este puesto. Es independiente del perfil de impresora. | En blanco |
| Admite grabado | Interruptor Sí/No | Opcional | Hardware de grabado como Leica CEREBRO. El envío a la grabadora es un marcador de posición hasta que se construya la integración con el proveedor. | Desactivado |
| Admite impresión | Interruptor Sí/No | Opcional | Imprime aquí etiquetas GS1 DataMatrix de casetes y portaobjetos. | Desactivado |
| Perfil de impresora de casetes y portaobjetos | Lista de perfiles de impresora | Obligatorio cuando «Admite impresión» está activado | | Ninguno |
| Estado | Activo / Inactivo | Opcional | | Activo |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, editar, desactivar: `config:scan-stations:manage` (riesgo alto, con auditoría). Administrador y Director de laboratorio la tienen de forma predeterminada.
**Límites conocidos.** El envío a una grabadora es un marcador de posición.

### Ajustes de impresión {#screen-print_settings}
Breadcrumb: Inicio > Configuración > Sistema > Puesto de trabajo y equipos > Ajustes de impresión

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Puesto de trabajo y equipos** > **Ajustes de impresión** (la sección con la que se abre la pestaña Sistema)
**2. Elemento de mantenimiento:** Ajustes de impresión

**3. Finalidad y alcance.** El comportamiento predeterminado de impresión de etiquetas del laboratorio: imprimir cada etiqueta de casete al registrarla o en lote; los tamaños de etiqueta; el tipo de código de barras y los prefijos; a qué perfil de impresora va cada tipo de etiqueta; y la disposición física de las etiquetas de casetes y portaobjetos. Si no se elige ningún centro, usted edita el valor predeterminado del sistema. Al elegir un centro se muestran sus ajustes: hasta que cree una excepción, hereda el valor predeterminado del sistema y es de solo lectura. **+ Crear excepción de centro** copia el valor predeterminado para que el centro pueda diferir, y **Volver al valor predeterminado del sistema** elimina la excepción. Un centro conserva solo los campos en los que quiere diferir.

**4. Requisitos previos y dependencias.** Los tres selectores de perfil de impresora leen [Perfiles de impresora](#screen-printer_profiles). Si los omite, cada uno ofrece solo "Usar el cuadro de impresión del navegador". El selector de centro lee el Diccionario de centros.

Setup step: Tier 1, step 13
Requires: [Diccionario de centros](#screen-facility-dictionary), [Perfiles de impresora](#screen-printer_profiles), [Estaciones de escaneo](#screen-scan_stations)
Unlocks: [Diseñador de etiquetas](#screen-label_designer)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-print_settings - Tarjetas de Ajustes de impresión con el aviso de excepción de centro]

**6. Referencia de campos.** Cada control se guarda al cambiarlo. Una nota "Guardando" se muestra mientras se guarda.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Modo de impresión en macroscopía | Opción: Bajo demanda (por bloque o contenedor), Lote (por caso o petición) | Obligatorio | Bajo demanda imprime cada etiqueta de casete al registrarla durante el tallado. Lote aplaza la impresión a una única acción por caso. | Bajo demanda |
| Modo de impresión en el micrótomo | Opción: A demanda, Bloque, Lote | Opcional | Batch 758. Cómo imprime el micrótomo las etiquetas de portaobjetos, aparte de la macroscopía. A demanda: una etiqueta cada vez, cada una escaneada en su portaobjetos antes de imprimir la siguiente. Bloque: al escanear un bloque se imprimen todas sus etiquetas, que se escanean en cualquier orden. Lote: el técnico marca los portaobjetos y los imprime juntos. En todos los modos, pasar al bloque siguiente con etiquetas de este bloque sin escanear queda retenido hasta que cada una se escanee, se vuelva a cortar o se anule, o el técnico continúe (queda registrado). Mientras no se elija, el micrótomo sigue el ajuste de macroscopía. | Como macroscopía |
| Imponer las salvaguardas de «A demanda» | Interruptor Sí/No | Opcional | Si está activado, el valor predeterminado queda fijado en todo el laboratorio y el personal de registro no puede cambiar un caso a Lote. | Desactivado |
| Exigir verificación por escaneo | Interruptor Sí/No | Opcional | Exige escanear el código de barras del casete o contenedor nuevo antes de pasar al bloque siguiente. | Desactivado |
| Pedir un motivo al reimprimir un informe | Interruptor Sí/No | Opcional | La reimpresión de un informe impreso necesita un motivo, que se guarda en el registro de auditoría junto con la impresión. | Desactivado |
| Tamaño de la etiqueta del contenedor | Opción entre los tamaños de etiqueta predefinidos (no se ofrecen los tamaños de petición de página completa) | Obligatorio | Muestra estándar (CLSI AUTO12, 2.0 por 1.0 pulgadas), Superposición secundaria de casete/portaobjetos (1.0 por 0.25 pulgadas), Contenedor mediano (3.0 por 2.0 pulgadas), Contenedor quirúrgico grande (4.0 por 2.0 pulgadas), Adhesivo de petición (4.0 por 2.0 pulgadas), Petición / bolsa de transporte (4.0 por 6.0 pulgadas). | Muestra estándar |
| Tamaño de la etiqueta de petición | Opción entre todos los tamaños predefinidos, incluidos Petición de página completa US Letter y A4 | Obligatorio | La hoja de adhesivos de petición. | Petición / bolsa de transporte (4.0 por 6.0 pulgadas) |
| Perfil de impresora de etiquetas de contenedor | Lista de perfiles, o Usar el cuadro de impresión del navegador | Opcional | Con un perfil QZ Tray, las etiquetas de contenedor van directamente a esa impresora térmica. | Usar el cuadro de impresión del navegador |
| Perfil de impresora de etiquetas moleculares | Igual | Opcional | Para las etiquetas moleculares de placa, gradilla, muestra y posición en la plataforma. | Usar el cuadro de impresión del navegador |
| Perfil de impresora de etiquetas de petición | Igual | Opcional | Para la hoja de adhesivos de petición. | Usar el cuadro de impresión del navegador |
| Simbología del código de barras del contenedor | Opción: Code 128 (1D), QR Code (2D), DataMatrix (2D) | Obligatorio | Se aplica a las etiquetas de Código de barras de lote maestro de Gestión de lotes. | Code 128 |
| Prefijo de etiqueta desechable | Texto, hasta 12 caracteres, en mayúsculas | Obligatorio | Se imprime como prefijo-TIPO-AAAAMMDD-XXXX. | CONT |
| Prefijo de gradilla reutilizable | Texto, hasta 12 caracteres, en mayúsculas | Obligatorio | Se imprime como prefijo-TIPO-NN. | RACK |
| GTIN de GS1 (etiquetas de casetes y portaobjetos) | Texto, hasta 14 caracteres | Obligatorio para imprimir GS1 DataMatrix | El valor AI(01) de cada etiqueta GS1 DataMatrix de casete y portaobjetos. Requiere un prefijo de empresa GS1 registrado para ForMedrixAI LLC (GS1 US o la organización miembro regional). Vacío de forma predeterminada: cada impresión GS1 real se rechaza con un error hasta que introduzca uno. | En blanco |
| Disposición de la etiqueta de casete: valor predefinido | Opción: casete de 45 grados (unos 28.2 por 8.0 mm), casete de 35 grados (unos 28.5 por 7.0 mm) | Opcional | Rellena los cuatro cuadros siguientes. | 45 grados |
| Anchura de la cara (mm) | Número, al menos 1 | Obligatorio | Anchura física de la cara del casete. | 28.2 |
| Altura de la cara (mm) | Número, al menos 1 | Obligatorio | | 8.0 |
| Tamaño del módulo del código de barras (mm) | Número, al menos 0.05 | Obligatorio | | 0.25 |
| Altura de la línea de texto (mm) | Número, al menos 0.5 | Obligatorio | | 1.4 |
| Comprobación de ajuste de la disposición del casete | Advertencia o mensaje "hay espacio", y una vista previa en directo a escala 10 | No aplicable | Advierte cuando el código de barras o el texto no caben en la cara configurada. | No aplicable |
| Enviar una impresión de prueba real | Lista de perfiles de impresora, GTIN de prueba, **Enviar impresión de prueba** | Opcional | Imprime datos de ejemplo a través de un perfil real. Compare el resultado con un casete real antes de usarlo. | Ninguno |
| Disposición de la etiqueta de portaobjetos: Anchura de la cara, Altura de la cara, Tamaño del módulo del código de barras, Altura del texto (mm) | Números (mínimos 1, 1, 0.05, 0.5) | Obligatorio | Establecen el tamaño de los puntos y la posición del texto en la etiqueta de portaobjetos que se imprime. Tiene su propia vista previa, comprobación de ajuste e impresión de prueba. | 20.0, 8.0, 0.2, 1.2 |
| Códigos de tipo de contenedor | Un cuadro de texto (hasta 8 caracteres, en mayúsculas) por tipo: Gradilla de tinción, Cesta del procesador de tejidos, Bandeja de archivo, Recipiente de descalcificación, Lote ad hoc | Obligatorio | El código corto de cada Código de barras de lote maestro. | STAIN, PROC, TRAY, DECAL, ADHOC |

**7. Permisos.** Abrir: `screen:configuration:open`. Cambiar: `config:print-settings:manage` (riesgo alto, con auditoría). Administrador y Director de laboratorio la tienen de forma predeterminada.
**Límites conocidos.** Solo un perfil QZ Tray envía directamente. Cualquier otro puente recurre al cuadro de impresión del navegador. No se puede editar un centro sin excepción. Compruebe las dimensiones del casete con el casete real, porque un tamaño erróneo imprime fuera del borde.

### Diseñador de etiquetas {#screen-label_designer}
Breadcrumb: Inicio > Configuración > Sistema > Puesto de trabajo y equipos > Diseñador de etiquetas

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Puesto de trabajo y equipos** > **Diseñador de etiquetas**
**2. Elemento de mantenimiento:** Diseñador de etiquetas

**3. Finalidad y alcance.** Un editor de arrastrar y soltar para la disposición de cada etiqueta: usted coloca campos en una etiqueta de tamaño fijo, establece su posición y su tamaño exactos y decide cuándo se muestra cada uno. Las disposiciones se guardan por tipo de etiqueta, como valor predeterminado de la empresa y, en algunos tipos, como excepción de centro. Una disposición se puede exportar como código de impresora para probarla en una impresora o en un visor antes de usarla.

**4. Requisitos previos y dependencias.** La opción de excepción de centro lee el Diccionario de centros. Ajustes de impresión elige qué impresora recibe la etiqueta, así que configúrelo primero. Si omite los centros, solo se ofrece el Valor predeterminado de la empresa.

Setup step: Tier 1, step 14
Requires: [Diccionario de centros](#screen-facility-dictionary), [Ajustes de impresión](#screen-print_settings)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-label_designer - Lienzo de la etiqueta, campos disponibles e inspector]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Tipo de etiqueta | Opción: Petición, Muestra (contenedor), Bloque (casete), Portaobjetos, Contenedor de decantación, Muestra molecular, Placa molecular, Gradilla molecular, Posición molecular en la plataforma | Obligatorio | Cada tipo tiene un tamaño de etiqueta fijo: 101.6 por 152.4 mm, 50.8 por 25.4, 25.4 por 12.7, 25.4 por 9.5, 50.8 por 25.4, 25.4 por 12.7, 50.8 por 19.05, 38.1 por 12.7, 38.1 por 12.7 (en ese orden). El tamaño no es editable. | Petición |
| Ámbito | Opción: Valor predeterminado de la empresa, o un centro "(modificado manualmente)" | Obligatorio | Solo Petición, Muestra y Decantación permiten una excepción de centro. Bloque, Portaobjetos y los cuatro tipos Moleculares muestran **Estándar de la empresa: bloqueado** y solo se pueden editar en el valor predeterminado de la empresa. | Valor predeterminado de la empresa |
| Campos disponibles | Lista | No aplicable | Los campos de este tipo de etiqueta que aún no están en el lienzo. Arrastre uno al lienzo. Se muestra "Todos los campos colocados." cuando no queda ninguno. | No aplicable |
| Lienzo | Área de arrastrar y soltar | No aplicable | Vista previa en directo con datos de ejemplo, al tamaño real de la etiqueta. Arrastre un campo para moverlo o arrastre un tirador para cambiar su tamaño (texto al pasar el cursor "Arrastre para cambiar el tamaño"). Los tiradores solo se muestran en el campo seleccionado. Un campo de código de barras dibuja un código de barras de ejemplo real; si el código de barras no se puede dibujar, el campo muestra en su lugar "error al generar el código de barras". | No aplicable |
| Inspector | Panel | No aplicable | Los ajustes del campo seleccionado. Si no hay nada seleccionado, muestra "Seleccione un campo colocado para editarlo." | No aplicable |
| X (mm), Y (mm) | Número | Obligatorio | Posición del campo seleccionado. Un campo se mantiene dentro de la etiqueta. | Donde se suelte |
| Ancho (mm), Alto (mm) | Número | Obligatorio | Tamaño del campo seleccionado. | Valor predeterminado del campo |
| Tamaño de fuente (mm) | Número | Obligatorio para los campos de texto | | Valor predeterminado del campo |
| Mostrar este campo | Opción: Siempre, Condición | Obligatorio | Condición muestra una segunda opción: otro campo y después "cuando ese campo tenga un valor", "cuando ese campo esté vacío" o "cuando ese campo sea igual a" un **Valor que debe coincidir**. | Siempre |
| Vista previa con ese campo vacío | Casilla | Opcional | Muestra la etiqueta tal como se imprime cuando el campo probado está vacío. | Desactivado |
| Quitar campo | Botón | No aplicable | Retira del lienzo el campo seleccionado. | No aplicable |
| Ajustar a la etiqueta | Botón | No aplicable | Aparece cuando un campo sobrepasa el borde. El guardado se rechaza hasta que se corrige: "No guardado: un campo sobrepasa el borde de la etiqueta." | No aplicable |
| Guardar disposición | Botón | No aplicable | Guarda para el tipo y el ámbito elegidos. Mensajes: "Predeterminado de la empresa guardado." o "Excepción del centro guardada."; cuando el guardado falla por un motivo que la pantalla no puede nombrar, "Error desconocido al guardar esta disposición." | No aplicable |
| Restablecer valores predeterminados | Botón | No aplicable | Elimina la disposición guardada de ese tipo y ámbito y vacía el lienzo. El mensaje dice "Disposición restablecida a los valores predeterminados." | No aplicable |
| Historial de versiones | Botón y lista | No aplicable | Cada guardado es una versión, que se muestra como "Versión N, guardada cuándo por quién". **Restaurar esta versión** la guarda como la versión más reciente. La lista lleva el encabezado "Versiones guardadas de esta disposición". Una disposición que nunca se ha guardado muestra "Esta disposición todavía no se ha guardado." | No aplicable |
| Exportar ZPL, Exportar EPL, Exportar DPL | Botones | No aplicable | Muestra el código de impresora traducido a partir de la disposición. Pruébelo en el visor que nombra la pantalla (labelary.com) a 203 ppp, o en su propia impresora. Los comandos de código de barras difieren un poco entre modelos de impresora. El resultado aparece en un cuadro con el encabezado "ZPL exportado" (para EPL y DPL, una nota indica que es un punto de partida). Seleccione el texto para copiarlo. ZPL es el lenguaje que PathScribe envía (a través de QZ Tray). **EPL y DPL son solo texto de exportación**: PathScribe nunca los envía a una impresora, así que usted copia o guarda el texto y lo envía por su cuenta. | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. Cambiar, restablecer, restaurar: `config:label-layouts:manage` (riesgo alto, con auditoría). Administrador y Director de laboratorio la tienen de forma predeterminada.
**Límites conocidos.** La exportación es un punto de partida para probar, no una garantía de que todos los modelos de impresora la impriman de forma idéntica. El cuadro lleva el encabezado "ZPL exportado" incluso después de elegir Exportar EPL o Exportar DPL; lea la nota sobre el texto para ver qué lenguaje contiene. Las dimensiones de casetes y portaobjetos para la impresión en sí también proceden de [Ajustes de impresión](#screen-print_settings).

### Estaciones de trabajo {#screen-workstations}
Breadcrumb: Inicio > Configuración > Sistema > Puesto de trabajo y equipos > Estaciones de trabajo

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Puesto de trabajo y equipos** > **Estaciones de trabajo**
**2. Elemento de mantenimiento:** Estaciones de trabajo

**3. Finalidad y alcance.** Un registro de cada ordenador que imprime o ejecuta un agente de PathScribe. Cada uno recibe un token de larga duración y queda vinculado al centro, la sala y el rol en que trabaja, de modo que el enrutamiento de impresión pueda dirigirse a él. Un ordenador también se puede marcar como "Este ordenador" para que el navegador sepa de qué estación de trabajo se trata.

**4. Requisitos previos y dependencias.** La lista Centro lee el Diccionario de centros. Las impresoras vinculadas son los ID de destino de la lista de impresoras del agente del centro, así que configure primero [Agentes del centro](#screen-site_agents). Si lo omite, puede escribir cualquier ID, pero no coincide con nada en el momento de imprimir.

Setup step: Tier 1, step 15
Requires: [Diccionario de centros](#screen-facility-dictionary), [Agentes del centro](#screen-site_agents)
Unlocks: [Reglas de enrutamiento de destinos de impresión](#screen-print_routing_rules)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-workstations - Lista de estaciones de trabajo con el estado del token y Registrar estación de trabajo]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Columnas | Estación de trabajo, Centro, Sala, Rol, Impresoras, Token, Visto por última vez, Estado, Acciones | No aplicable | El estado es Activa, Caduca pronto (en 30 días), Token caducado o Revocada. Token muestra los últimos caracteres y la fecha de caducidad. Una fila revocada muestra quién la revocó y por qué. | No aplicable |
| Registrar estación de trabajo | Botón | No aplicable | Abre el formulario. | No aplicable |
| Editar | Botón de fila | No aplicable | | No aplicable |
| Nuevo token | Botón de fila | No aplicable | Emite un token nuevo. El token anterior sigue funcionando durante 24 horas para poder actualizar el agente. | No aplicable |
| Revocar | Botón de fila | No aplicable | Elija un motivo (Puede estar comprometida, Inscrita por error, Trasladada a otro centro, Equipo sustituido, Equipo retirado, Otro). Para Otro se requiere una nota. El token deja de funcionar de inmediato. | No aplicable |
| Usar este ordenador / Dejar de usar este ordenador | Botón de fila | No aplicable | Vincula este navegador a la estación de trabajo. | No aplicable |
| Probar un token | Texto y botón **Comprobar** | Opcional | Muestra cómo respondería el servidor a un token pegado: Aceptado, o Rechazado por caducado, revocado, desconocido o mal formado. | En blanco |

#### Formulario de registro y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto, hasta 60 caracteres | Obligatorio | Debe ser único entre las estaciones de trabajo activas del centro. | En blanco |
| Centro | Lista | Obligatorio | | Ninguno |
| Sala | Texto, hasta 60 caracteres | Opcional | Por ejemplo Sala de tallado 2. | En blanco |
| Punto de atención | Texto, hasta 60 caracteres | Opcional | Las reglas de enrutamiento de impresión de una ubicación coinciden con este dato. | En blanco |
| Disciplina | Opción: Histología, Citología, Molecular, Autopsia | Opcional | | Sin definir |
| Área funcional | Lista de esa disciplina | Opcional | Debe pertenecer a la disciplina. | Sin definir |
| Impresora de informes, Impresora de etiquetas | Texto con sugerencias | Opcional | Un ID de destino de la lista de impresoras del agente del centro. | Sin definir |
| Registrar y mostrar el token, Guardar | Botones | No aplicable | El token nuevo se muestra una sola vez: cópielo en el agente de la estación de trabajo. PathScribe conserva solo una huella y no puede volver a mostrarlo. | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. Registrar, editar: `config:workstations:manage`. Nuevo token, revocar, probar un token: `config:workstation-tokens:manage`. Todas de riesgo alto. El registro, el cambio, la rotación y la revocación, y las conexiones rechazadas, se escriben en el registro de auditoría. Administrador y Director de laboratorio las tienen de forma predeterminada.
**Límites conocidos.** Un token dura 365 días salvo que se sustituya. En la demostración los tokens se comprueban en el navegador; en producción los comprueba el servidor de la API. Una conexión en la demostración se etiqueta como Simulada.

### Grupos de estaciones de trabajo {#screen-workstation_groups}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Grupos de estaciones de trabajo

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio** > **Grupos de estaciones de trabajo**
**2. Elemento de mantenimiento:** Grupos de estaciones de trabajo

**3. Finalidad y alcance.** Un grupo de estaciones de trabajo reúne estaciones de escaneo por disciplina y área funcional, las asigna a un laboratorio ejecutor y establece lo que se carga cuando un técnico selecciona una: el modo de control de calidad, un grupo de acciones predeterminado, una acción predeterminada y una página dedicada opcional.

**4. Requisitos previos y dependencias.** La lista Laboratorio ejecutor lee el Diccionario de centros. La lista Grupo de acciones predeterminado lee [Grupos de acciones](#screen-action_groups) y la lista Acción predeterminada lee el Registro de acciones; ambas son opcionales, y cada una ofrece "Ninguna" sin ellas. Agrupar estaciones supone que existen [Estaciones de escaneo](#screen-scan_stations). Autopsia todavía no tiene áreas funcionales, así que un grupo de Autopsia no se puede guardar (véase PS-261).

Setup step: Tier 1, step 16
Requires: [Diccionario de centros](#screen-facility-dictionary), [Estaciones de escaneo](#screen-scan_stations)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-workstation_groups - Lista de grupos de estaciones de trabajo con búsqueda]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar | Texto | Opcional | Nombre o área funcional. | En blanco |
| Columnas | Nombre, Disciplina / Área, Laboratorio ejecutor, Modo de CC, Estado, Acciones | No aplicable | | No aplicable |
| Añadir grupo de estaciones de trabajo, Editar, Desactivar / Reactivar | Botones | No aplicable | | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | Por ejemplo Grupo de puestos de tallado. | En blanco |
| Disciplina | Opción: HISTOLOGY, CYTOLOGY, MOLECULAR, AUTOPSY | Obligatorio | Decide qué áreas funcionales se ofrecen. | HISTOLOGY |
| Área funcional | Lista de la disciplina | Obligatorio | | Ninguna |
| Laboratorio ejecutor | Lista | Obligatorio | | Ninguno |
| Modo de aplicación del control de calidad | Opción: Auto-Resolve, Enforced, Hybrid | Opcional | | Sin definir |
| Grupo de acciones predeterminado | Lista | Opcional | | Ninguno |
| Acción predeterminada (se activa en el siguiente escaneo) | Lista | Opcional | | Ninguna |
| Ruta de página dedicada | Texto como /microtomy-workstation | Opcional | Déjelo en blanco hasta que exista una página real del puesto. | En blanco |
| Activo | Interruptor Sí/No | Opcional | | Activado |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, editar, desactivar: `config:workstation-groups:manage` (riesgo alto, con auditoría). Administrador y Director de laboratorio la tienen de forma predeterminada.
**Límites conocidos.** Autopsia no tiene áreas funcionales, así que todavía no se puede usar.

### Hardware de tallado {#screen-grossing_hardware}
Breadcrumb: Inicio > Configuración > Sistema > Puesto de trabajo y equipos > Hardware de tallado

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Puesto de trabajo y equipos** > **Hardware de tallado**
**2. Elemento de mantenimiento:** Hardware de tallado

**3. Finalidad y alcance.** Las cámaras y las básculas de los puestos de tallado, y cómo llega PathScribe a cada una. El dispositivo físico se elige en el registro de equipos.

**4. Requisitos previos y dependencias.** La lista Dispositivo del registro lee [Equipos](#screen-equipment), y la lista Estación de escaneo lee [Estaciones de escaneo](#screen-scan_stations). Si omite Equipos, el dispositivo no queda vinculado. Un dispositivo de un tipo equivocado se rechaza.

Setup step: Tier 1, step 17
Requires: [Diccionario de centros](#screen-facility-dictionary), [Equipos](#screen-equipment), [Estaciones de escaneo](#screen-scan_stations)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-grossing_hardware - Lista de hardware de tallado]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Columnas | Nombre, Tipo, Conexión, Dispositivo del registro, Estación de escaneo, Estado, Acciones | No aplicable | Mensaje de lista vacía: "No hay equipos de tallado para este centro." | No aplicable |
| + Añadir equipo de tallado, Editar, Desactivar / Reactivar | Botones | No aplicable | | No aplicable |
| Tipo | Opción: Cámara, Báscula | Obligatorio | | Cámara |
| Nombre | Texto | Obligatorio | Por ejemplo Cámara macro del puesto de tallado 3. | En blanco |
| Conexión | Opción: Navegador (sin instalación), Agente de PathScribe, Introducción manual | Obligatorio | Cámara: Navegador o Agente. Báscula: Agente o Introducción manual. Las demás combinaciones se rechazan. El navegador accede directamente a una cámara USB estándar. Introducción manual significa que el peso se escribe en la plantilla de tallado. | Navegador (sin instalación) |
| Dirección del agente de PathScribe | Enlace https como https://127.0.0.1:9100 | Obligatorio para Agente | Debe empezar por https://. | En blanco |
| Dispositivo del registro | Lista de Equipos del mismo tipo | Opcional | | Sin vincular |
| Estación de escaneo | Lista, o Cualquier estación | Opcional | | Cualquier estación |
| Estado | Activo / Inactivo | Opcional | | Activo |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, editar, desactivar: `config:grossing-hardware:manage` (riesgo alto, con auditoría). Administrador y Director de laboratorio la tienen de forma predeterminada.
**Límites conocidos.** Ninguno conocido.

### Registro de impresión simulada {#screen-simulated_print}
Breadcrumb: Inicio > Configuración > Sistema > Puesto de trabajo y equipos > Impresión simulada

**Estado:** Demostración

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Puesto de trabajo y equipos** > **Impresión simulada**
**2. Elemento de mantenimiento:** Registro de impresión simulada (solo lectura, con un botón de vaciado)

**3. Finalidad y alcance.** Sin servidor de API, las etiquetas y los informes no se envían a una impresora real. Cada impresión se registra aquí como Simulada, de modo que pueda ver qué se habría impreso, dónde y cuántas copias. Nada de lo que figura aquí llegó a una impresora. Un interruptor hace que las impresiones simuladas fallen, para probar la vía de fallo.

**4. Requisitos previos y dependencias.** Ninguno. Muestra lo que producen las pantallas de impresión, así que imprima algo primero.

Setup step: Reference, not part of setup
Requires: [Perfiles de impresora](#screen-printer_profiles)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-simulated_print - Tabla del registro de impresión simulada]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Hacer que las impresiones simuladas fallen | Casilla | Opcional | Hace que cada impresión simulada falle, para que pueda probar el mensaje de fallo. | Desactivado |
| Recuento | Texto | No aplicable | "N impresiones simuladas". | No aplicable |
| Vaciar el registro | Botón | No aplicable | Pide confirmación y después borra todos los registros. No se puede deshacer. | No aplicable |
| Cuándo | Fecha y hora | No aplicable | En el formato del idioma de visualización. | No aplicable |
| Qué | Texto | No aplicable | Impresión del agente del centro, Grabado de portaobjetos o casetes, Etiqueta, Etiqueta molecular, Trabajo de impresión en red, Informe, Etiqueta de un escaneo. | No aplicable |
| Enviado por | Texto | No aplicable | La vía utilizada. | No aplicable |
| Destino | Texto | No aplicable | | No aplicable |
| Copias | Número entero | No aplicable | | No aplicable |
| Resultado | Texto | No aplicable | "Simulado: enviado a la impresora" o "Simulado: falló". | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. La capacidad de la sección es `config:printers:manage`. Administrador y Director de laboratorio la tienen de forma predeterminada.
**Límites conocidos.** El registro se guarda en el almacenamiento propio del navegador, de modo que es por navegador y no se comparte. Se sustituye por la impresión real cuando se conecta el servidor de la API.

## Parte D: Preferencias globales del sistema, fecha, hora y zona horaria, numeración de muestras y de acceso {#ch2-global-preferences}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento

Esta parte contiene las reglas de toda la organización: cuánto tiempo se conservan los registros, cómo se construyen los números de acceso, qué campos exigen las páginas y los enlaces de referencia que ve el personal. No existe una única pantalla de "preferencias globales". Para la fecha, la hora, la zona horaria y el idioma, consulte la tabla de la [Parte A](#ch2-enterprise-facilities): la zona horaria es una única opción de toda la organización en los ajustes del [Panel de contribución](#screen-contribution_settings), el formato de fecha sigue el idioma de visualización, y los idiomas del informe y de ortografía se definen en el centro y en la persona. El [Resumen de jurisdicciones](#screen-jurisdiction_overview) de solo lectura está en la Parte A.

### Conservación de datos {#screen-retention}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Conservación de datos

**Estado:** Demostración

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento** > **Conservación de datos**
**2. Elemento de mantenimiento:** Conservación de datos

**3. Finalidad y alcance.** Los períodos de conservación propios del laboratorio: cuánto tiempo debe conservar PathScribe las sugerencias de la IA, el registro de auditoría, las instantáneas de casos y el archivo de informes. La pantalla registra la política. Las excepciones por departamento y los mínimos de los organismos reguladores se definen en [Departamentos](#screen-departments) y [Organismos reguladores](#screen-governing_bodies).

**4. Requisitos previos y dependencias.** Ninguno. Consulte la política de gobernanza de datos de su institución antes de reducir cualquier período.

Setup step: Tier 1, step 18
Requires: Ninguno, es un punto de partida.
Unlocks: [Departamentos](#screen-departments)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-retention - Cuatro períodos de conservación con Guardar cambios y Restablecer valores predeterminados]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Sugerencias de IA | Número entero de días, de 30 a 730 | Obligatorio | Las sugerencias de campos generadas por la IA y las puntuaciones de confianza que se conservan por caso. | 90 días |
| Registros de auditoría | Número entero de días, de 90 a 3650 | Obligatorio | Todas las acciones de los usuarios, firmas, adendas, eventos de voz y eventos del sistema. El mínimo es de 90 días. Las reducciones por debajo de los mínimos normativos requieren la aprobación de su responsable de cumplimiento. | 365 días |
| Instantáneas de casos | Número entero de años, de 1 a 30 | Obligatorio | Los datos completos del caso capturados en cada finalización y en cada firma. | 7 años |
| Archivo de informes | Número entero de años, de 1 a 30 | Obligatorio | Los informes firmados que se conservan para la revisión medicolegal y de patología. | 10 años |
| Guardar cambios | Botón | No aplicable | Muestra "Política de conservación actualizada. Se aplicará en el próximo ciclo de depuración." Un valor fuera de su intervalo se ignora al escribirlo. | No aplicable |
| Restablecer valores predeterminados | Botón | No aplicable | Coloca los cuatro valores predeterminados en los cuadros. Aun así debe seleccionar Guardar cambios. | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. Cambiar: `config:retention-policy:manage` (riesgo alto, con auditoría). Administrador y Director de laboratorio la tienen de forma predeterminada.
**Límites conocidos.** La política se guarda solo en el navegador. Ningún trabajo de depuración la lee todavía: no se elimina ni se conserva nada de forma distinta por su causa (PS-345). El mensaje "se aplicará en el próximo ciclo de depuración" describe el comportamiento previsto, no uno construido.

### Configuración de máscaras de caso {#screen-case_mask_config}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Configuración de máscaras de caso

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Integraciones** > **Configuración de máscaras de caso**
**2. Elemento de mantenimiento:** Configuración de máscaras de caso (numeración de acceso)

**3. Finalidad y alcance.** Una máscara de caso es el patrón de un número de acceso: un prefijo, el año y una secuencia correlativa, por ejemplo `MFT26-0029`. Cada máscara tiene su propio prefijo, su propio patrón y su propio contador, y pertenece a un solo ámbito: la empresa, un centro que sea laboratorio ejecutor o un departamento. Cuando se registra un caso, PathScribe busca una máscara en este orden: su departamento, después su laboratorio ejecutor y por último la empresa. Un caso sin máscara en ningún punto de esa cadena usa el patrón predeterminado `O` más el año de dos dígitos, un guion y una secuencia de cuatro dígitos. Un número de acceso es permanente y está ligado al tejido físico y a la cadena de custodia, de modo que guardar una máscara cambia el patrón solo a partir de ese momento y nunca reinicia el contador.

**4. Requisitos previos y dependencias.** Los ámbitos Centro y Empresa leen el Diccionario de centros. Un ámbito de departamento lee [Departamentos](#screen-departments), que se configura en un nivel posterior. Si omite el centro, no se puede añadir ninguna máscara de centro ni de empresa; los casos usan entonces el patrón predeterminado. Un ámbito que ya tiene una máscara no se vuelve a ofrecer: use Editar.

Setup step: Tier 1, step 19
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Departamentos](#screen-departments)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-case_mask_config - Máscaras de caso agrupadas por Empresa, Centro y Departamento]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Grupos | Empresa, Centro, Departamento | No aplicable | Cada grupo muestra sus máscaras, o "Aún no se ha definido ninguna máscara de caso en este ámbito". | No aplicable |
| Columnas | Prefijo, Patrón de máscara, Secuencia actual, Reiniciar cada año, Acciones | No aplicable | | No aplicable |
| + Añadir máscara de caso, Editar, Eliminar | Botones | No aplicable | Eliminar actúa de inmediato y no pide confirmación. | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Ámbito | Opción: Departamento, Empresa, Centro (laboratorio ejecutor), y después una lista de ese tipo | Obligatorio | Se bloquea al editar. Al añadir, se excluyen todos los laboratorios ejecutores que ya tienen una máscara: "Todos los centros ejecutores reales ya tienen su propia máscara de caso." | Departamento |
| Prefijo | Texto | Obligatorio | Por ejemplo MFT. | En blanco |
| Patrón de máscara | Texto con los símbolos `{PREFIX}`, `{YEAR:4}`, `{YEAR:2}`, `{SEQ:N}` | Obligatorio | Por ejemplo `{PREFIX}{YEAR:2}-{SEQ:4}` da `MFT26-0029`. | `{PREFIX}{YEAR:2}-{SEQ:4}` |
| Dígitos de la secuencia | Número entero, 1 o más | Obligatorio | Se usa cuando el patrón no indica explícitamente el número de dígitos. | 4 |
| Reiniciar la secuencia cada año | Interruptor Sí/No | Opcional | Empieza la secuencia en 1 cada año nuevo, en la zona horaria del centro, nunca en la zona horaria del dispositivo. | Activado |
| Previsualizar el siguiente número | Botón | No aplicable | Muestra el siguiente número sin consumir ninguno. | No aplicable |
| Secuencia actual, último reinicio, última actualización por | Texto de solo lectura | No aplicable | Se muestra al editar. | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, editar, eliminar: `config:case-masks:manage` (riesgo alto, con auditoría). Administrador y Director de laboratorio la tienen de forma predeterminada.
**Límites conocidos.** El año y el reinicio anual usan la zona horaria del centro de la organización (ajustes del [Panel de contribución](#screen-contribution_settings)). El ejemplo de **Previsualizar el siguiente número** se construye con la zona horaria del navegador que usted está utilizando, así que cerca del Año Nuevo puede mostrar un año distinto del número que recibiría realmente un caso.

### Requisitos de los campos {#screen-field_requirements}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Requisitos de los campos

**Estado:** Demostración

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento** > **Requisitos de los campos**
**2. Elemento de mantenimiento:** Requisitos de los campos

**3. Finalidad y alcance.** Elige, para su organización, qué campos necesita cada página antes de poder guardarse. Algunos campos están bloqueados como siempre obligatorios, con el motivo a la vista, porque un registro no es seguro o no se puede utilizar sin ellos. El resto se puede activar o desactivar. Las páginas recogen la elección al guardar: por ejemplo, los miembros del personal y el editor de centros leen aquí sus campos obligatorios.

**4. Requisitos previos y dependencias.** La pantalla se aplica a la organización de la persona que ha iniciado sesión. Una persona sin organización vinculada ve los valores predeterminados y no puede cambiarlos. No hace falta configurar nada antes.

Setup step: Tier 1, step 20
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-field_requirements - Selector de página e interruptores Obligatorio agrupados con campos bloqueados]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Página | Lista de 16 páginas: Recepción, Peticiones adicionales, Gestión de lotes, Historia clínica (citología), Cribado citológico, Estación de inclusión, Editor de centros, Tallado, Consulta intraoperatoria, Mensajería, Puesto de microtomía, Constructor de placas moleculares, Carga de gradillas moleculares, Informe del caso, Estación de distribución de portaobjetos, Personal | Obligatorio | Muestra los campos de una página, en grupos. | Recepción |
| Ajustes para (organización) | Texto | No aplicable | La organización que está cambiando. | Su organización |
| Obligatorio | Casilla, una por campo | Opcional | Activa o desactiva el requisito. Una nota muestra "Modificado respecto al valor predeterminado" cuando lo ha cambiado. | Según el campo |
| Siempre obligatorio | Insignia de bloqueo y motivo | No aplicable | El campo no se puede desactivar. Se muestra el motivo, por ejemplo que las normas de laboratorio exigen dos identificadores del paciente. | Bloqueado |
| Sugerencias | Texto bajo un campo | No aplicable | Por ejemplo "Se comprueba en cada muestra", "Se rellena automáticamente si se deja en blanco" o una condición como "Solo casos de citología y PAAF". | No aplicable |

El Sexo en la página de Acceso es un campo obligatorio bloqueado y sin valor predeterminado (lote 661): quien registra el acceso debe elegirlo. El Motivo de la contingencia en la página de Acceso es obligatorio, y el envío se bloquea si falta (lote 658).

Un cambio rechazado muestra uno de estos mensajes: "Ese campo es siempre obligatorio.", "No tiene permiso para cambiar los requisitos de los campos.", "Solo puede cambiar los ajustes de su propia organización.", "Ese campo no se puede configurar." o "Esa página no se puede configurar." Cada cambio que realiza se escribe en el registro de auditoría con la página, el campo y el valor nuevo.

**7. Permisos.** Abrir: `screen:configuration:open`. Cambiar: `config:field-requirements:manage` (grupo de administración). Administrador y Superadministrador la tienen de forma predeterminada. Director de laboratorio no, y ve la pantalla en solo lectura: "Puede ver estos ajustes, pero no cambiarlos."
**Límites conocidos.** En la demostración los ajustes se guardan en el almacenamiento del navegador. El servidor de producción solo tiene un contrato para la comprobación de permisos (`AUTHORIZATION_API.md`), no para guardar los ajustes. Desactivar un requisito de protocolo en Tallado envía a revisión secundaria las muestras completadas sin protocolo.

### Recursos externos {#screen-external_resources}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Recursos externos

**Estado:** Construido

**1. Navegación:** Pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento** > **Recursos externos**
**2. Elemento de mantenimiento:** Recursos externos

**3. Finalidad y alcance.** Los enlaces de referencia que se muestran en el panel Recursos: protocolos del CAP, la clasificación de la OMS, sistemas internos del laboratorio y similares. Los Enlaces rápidos de las pantallas Búsqueda y Registro de auditoría proceden de esta lista (lote 659), por lo que un enlace añadido aquí aparece allí. Un enlace de toda la empresa lo ve todo el mundo. Un enlace limitado a un laboratorio solo lo ve el laboratorio ejecutor al que está asociado.

**4. Requisitos previos y dependencias.** Un enlace limitado a un laboratorio necesita un laboratorio ejecutor del Diccionario de centros. Si lo omite, solo se pueden guardar enlaces de toda la empresa: "Seleccione un laboratorio ejecutor para un recurso limitado a un laboratorio."

Setup step: Tier 1, step 21
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-external_resources - Lista de recursos agrupados en Protocolos, Referencias y Sistemas]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Lista | Recursos agrupados por categoría | No aplicable | Cada fila muestra su título, su enlace y su ámbito: "Toda la empresa" o "Laboratorio: nombre". Mensaje de lista vacía: "Aún no hay recursos externos configurados." | No aplicable |
| + Añadir recurso, Editar, Eliminar | Botones | No aplicable | Eliminar pregunta "¿Eliminar (título)? No se puede deshacer." | No aplicable |
| Título | Texto | Obligatorio | Por ejemplo Protocolos de cáncer del CAP. | En blanco |
| URL | Dirección web que empieza por https:// o http:// | Obligatorio | Error: "Introduzca una URL válida, incluido https://". | En blanco |
| Categoría | Opción: Protocolos, Referencias, Sistemas | Obligatorio | | Protocolos |
| Ámbito | Opción: Toda la empresa, Laboratorio ejecutor específico | Obligatorio | | Toda la empresa |
| Laboratorio ejecutor | Lista | Obligatorio para un ámbito de laboratorio | | Ninguno |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, editar, eliminar: `config:external-resources:manage` (riesgo alto, con auditoría). Administrador y Director de laboratorio la tienen de forma predeterminada.
**Límites conocidos.** Solo se guarda la dirección. PathScribe no comprueba que el enlace funcione.
