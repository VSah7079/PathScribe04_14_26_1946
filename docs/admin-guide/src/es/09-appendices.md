---
chapter: 9
id: ch9
title: Apéndices: resolución de problemas y verificación del registro de auditoría
---

# Apéndices: resolución de problemas y verificación del registro de auditoría {#ch9}

Este capítulo tiene tres partes. La primera es una matriz de resolución de problemas: los problemas que un administrador encuentra con más frecuencia, cada uno con su causa y la pantalla que lo soluciona. La segunda es un índice de los códigos de error que PathScribe muestra o registra. La tercera documenta la pantalla Registros del sistema y ofrece una guía paso a paso para verificar lo que contiene el registro de auditoría. El glosario de términos es el último capítulo de la guía ([Glosario](#ch99)).

**La Guía del usuario (lote 657).** La Guía del usuario en línea, dirigida a las personas que hacen el trabajo, se genera a partir de Markdown en `docs/user-guide/` con `python3 scripts/user-guide/build.py` y se publica con la aplicación en `/help`; el botón Ayuda de cada pantalla y F1 abren el artículo de la pantalla que se está mostrando. Las pantallas de configuración y de administración conservan sus botones de la Guía del administrador. No hace falta ningún ajuste. Para añadir o cambiar una página, edite su archivo y vuelva a generar; la generación comprueba las secciones obligatorias, los enlaces y las rutas.

Cada mensaje citado aquí es el texto en español del producto. Cada código existe en el código fuente; un código que solo es un marcador de posición en un contrato, sin uso en el producto, no figura en la lista.

## Matriz de resolución de problemas {#ch9-matrix}
Breadcrumb: Inicio > Guía del administrador > Apéndices > Matriz de resolución de problemas

**Estado:** Construido

**Cómo utilizar la matriz.** Busque el síntoma que comunica el usuario, lea la causa probable y siga la solución. La mayoría de los avisos de que "algo no funciona" responden a una de dos causas: un diccionario que nunca se configuró (una lista vacía) o un rol que no tiene una capacidad (un botón atenuado o un guardado rechazado). Cuando el síntoma muestra un código en mayúsculas, búsquelo en el [índice de códigos de error](#ch9-error-codes).

**Antes de nada.** Dos comprobaciones responden a la mayoría de las preguntas.

1. Abra [Registros del sistema](#screen-audit-log) y busque el nombre de la persona o la clave de la capacidad. Una comprobación de permiso rechazada escribe una entrada **Capability refused** que indica la capacidad y el rol de sesión de la persona.
2. Mire la pestaña **Registro de errores** y busque un error abierto con un código, un origen y una hora cercanos al aviso.

### Listas vacías y mensajes de "sin configurar" {#ch9-matrix-empty}

Una lista desplegable vacía o un mensaje de "ninguno configurado" casi siempre significa que se omitió un diccionario anterior en el orden de configuración. La página [Orden de configuración](setup-sequence.html) indica ese orden.

| Síntoma (lo que ve el usuario) | Causa probable | Solución | Pantalla |
|---|---|---|---|
| En la ventana de equipo de un caso: **No hay tipos de participación configurados**, con la sugerencia "Configure los tipos en Sistema → Tipos de participación". | No existe ningún tipo de participación. | Añada los tipos que utiliza el laboratorio y vuelva a abrir la ventana. | [Tipos de participación](#screen-participation_types) |
| Una impresión de prueba o una ventana de etiquetas indica **No hay perfiles de impresora configurados**. | No se ha añadido ningún perfil de impresora. | Añada un perfil de impresora para cada modelo de impresora de etiquetas. | [Perfiles de impresora](#screen-printer_profiles) |
| Una estación de inclusión o de microtomía indica **No hay ninguna impresora configurada** o **El perfil de impresora configurado ya no existe**. Una estación de distribución de portaobjetos indica **Esta estación no está configurada para imprimir etiquetas de portaobjetos.** | La estación no tiene perfil de impresora o su perfil se eliminó. | Abra la estación y elija un perfil de impresora que siga existiendo. | [Estaciones de escaneo](#screen-scan_stations), [Perfiles de impresora](#screen-printer_profiles) |
| Una ventana de distribución de portaobjetos o de lote de escaneado indica **No hay escáneres de portaobjetos configurados** (el texto nombra Configuración, Equipos, tipo "Escáner de portaobjetos"). | No hay ningún registro de equipo de tipo Escáner de portaobjetos. | Añada los escáneres. | [Equipos](#screen-equipment) |
| Una etiqueta no se imprime y el mensaje dice **No hay ningún GTIN GS1 configurado. Configure uno en Ajustes de impresión antes de imprimir una etiqueta GS1 de casete** (o de portaobjetos). | El centro no tiene ningún GTIN GS1 introducido. | Introduzca el GTIN en Ajustes de impresión. | [Ajustes de impresión](#screen-print_settings) |
| El panel de operaciones del centro indica **Todavía no hay perfiles de pantalla configurados**. | No existe ningún perfil de pantalla. | Añada uno en Perfiles de pantalla. | [Perfiles de pantalla](#screen-display_profiles) |
| El panel de quirófano indica **Aún no hay terminales configurados**. | No existe ningún terminal de quirófano. | Añada los terminales. | [Terminales del quirófano](#screen-or_suite_terminals) |
| En la ventana de la regla de enrutamiento: **No hay grupos activos. Active antes "Grupo / equipo de trabajo" en una subespecialidad.** | Ninguna subespecialidad está en el modo Grupo / equipo de trabajo. | Active Grupo / equipo de trabajo en al menos una subespecialidad y después añada la regla. | [Subespecialidades](#screen-subspecialties), [Reglas de enrutamiento](#screen-routing_rules) |
| En la ventana del contenedor nuevo: **Ningún centro tiene configurado actualmente el rol de laboratorio de referencia.** | Ningún centro tiene el rol de laboratorio de referencia. | Asigne ese rol a un centro en los ajustes del centro. | [Diccionario de centros](#screen-facility-dictionary) |
| Un usuario que prueba el correo seguro ve **Su laboratorio no tiene configurada ninguna pasarela de mensajería segura.** | El centro no tiene ninguna pasarela en su pestaña Mensajería segura. | Añada una pasarela en los ajustes del centro. | [Diccionario de centros](#screen-facility-dictionary) |
| La lista **Añadir** de Niveles de servicio de clientes está vacía, con la nota de que todos los clientes ya tienen un nivel o de que no hay clientes configurados. | Todos los centros ya tienen un nivel de servicio o no existe ningún centro cliente. | Añada primero los centros o edite el nivel existente. | [Configuración de centros](#screen-clients), [Niveles de servicio de clientes](#screen-client_sla) |

### Guardados rechazados, botones atenuados y pantallas que no se pueden abrir {#ch9-matrix-permissions}

PathScribe comprueba las capacidades dos veces. La pantalla atenúa una acción que la persona no puede realizar. El servicio que hay detrás de la acción vuelve a comprobarla y la rechaza. En producción, el servidor de API repite la comprobación y tiene la última palabra. No existe ninguna forma de eludirlo para ningún rol, tampoco para Superadmin.

| Síntoma | Causa probable | Solución | Pantalla |
|---|---|---|---|
| Un botón está atenuado. Su indicación dice **Sus roles no incluyen "<capability>".** | Ninguno de los roles de la persona tiene esa capacidad. | Añada la capacidad a un rol que tenga la persona. Las capacidades se agrupan por área en el Diccionario de roles. | [Roles](#screen-staff-roles), [Miembros](#screen-staff-members) |
| La indicación dice **"<capability>" requiere también "<other>", que sus roles no incluyen.** | La capacidad requiere otra capacidad (su lista `requires` en el catálogo). | Conceda ambas. Un guardado de rol se rechaza con "a capability is missing one it needs" hasta que también se conceda la capacidad requerida. | [Roles](#screen-staff-roles) |
| La indicación dice **"<capability>" no está disponible aquí: su asignación de centro no la cubre.** | La persona tiene la capacidad, pero la acción afecta a un centro que no está entre sus centros asignados (o abarca todos los centros). | Cambie la asignación de centros de la persona. | [Miembros](#screen-staff-members) |
| Un guardado de Configuración falla con **No guardado: esto requiere el permiso "<permission>". Un administrador puede concederlo en Configuración → Personal → Diccionario de roles.** | La persona no tiene la capacidad `config:...:manage` de esa pantalla (código `CONFIG_NOT_PERMITTED`). | Conceda el permiso indicado al rol de la persona. | [Roles](#screen-staff-roles) |
| Un guardado de rol falla: **No guardado: después ningún rol podría gestionar roles.** | El cambio dejaría sin `config:roles:manage` a todos los roles asignables. | Asigne primero **Gestionar los roles** a otro rol asignable y después guarde. | [Roles](#screen-staff-roles) |
| Un guardado de rol o de personal falla con **changing the clinical mismatch rules and approving the AI instructions are separate duties**. | Una persona (o un rol) no puede tener a la vez `config:clinical-mismatch-rules:manage` y `config:ai-prompt:approve` (código `SEPARATION_OF_DUTIES`). | Reparta las dos capacidades entre dos roles que tengan personas distintas. | [Roles](#screen-staff-roles), [Miembros](#screen-staff-members) |
| Un guardado de rol falla con **No guardado: este rol lo gestiona ForMedrixAI**. | El rol Superadmin no se puede cambiar en un hospital. | Ninguna. Utilice otro rol. | [Roles](#screen-staff-roles) |
| Un usuario abre una pantalla y ve **No tiene acceso a esta pantalla**; tras iniciar sesión, la página de Inicio dice **Ninguno de sus roles le da todavía acceso a una pantalla.** | El rol no tiene la capacidad `screen:<name>:open`, por lo que Inicio no muestra ningún icono y la ruta rechaza la dirección. | Añada la capacidad de pantalla al rol. | [Roles](#screen-staff-roles) |
| Una persona no puede aprobar su propia edición: **Usted editó este texto, por lo que no puede aprobarlo.** | La autoaprobación se rechaza en las instrucciones de la IA (código `SELF_APPROVAL`). | Haga que apruebe el texto otra persona que tenga `config:ai-prompt:approve`. | [Instrucciones de la IA](#screen-ai_instructions) |
| Un botón de exportación no hace nada, o la pantalla de exportación muestra **No tiene permiso para exportar este informe.** | Cada exportación tiene su propia capacidad (por ejemplo `audit:audit-log:export`) y el servidor la comprueba de nuevo en la descarga. | Conceda la capacidad de exportación que indica la ayuda emergente del botón. | [Roles](#screen-staff-roles), [Mis exportaciones](#screen-my-exports) |

### Etiquetas e informes que no se imprimen {#ch9-matrix-print}

| Síntoma | Causa probable | Solución | Pantalla |
|---|---|---|---|
| Una etiqueta va a la ventana de impresión del navegador y el mensaje dice **La impresora de etiquetas no está conectada, por lo que esta etiqueta se envió a la ventana de impresión del navegador. Compruebe que QZ Tray se está ejecutando en este ordenador.** | El servicio QZ Tray no se está ejecutando o no es accesible en ese ordenador. | Inicie QZ Tray en el ordenador e imprima de nuevo. | [Perfiles de impresora](#screen-printer_profiles), [Ajustes de impresión](#screen-print_settings) |
| **La etiqueta <id> no se ha impreso: <printer> se ha quedado sin etiquetas / se ha quedado sin cinta / el cabezal de impresión está abierto / no se ha podido contactar con <printer>.** | La impresora comunicó ese estado (códigos `PAPER_OUT`, `RIBBON_OUT`, `HEAD_OPEN`, `PRINTER_UNREACHABLE`). | Repare la impresora y después reintente la etiqueta. Una etiqueta nunca se reintenta por sí sola, por lo que no puede imprimirse dos veces. | [Cola de impresión](#screen-audit-interfaces) |
| **...no se ha impreso: <printer> ha rechazado el diseño de la etiqueta** o **su código de barras no ha superado la validación GS1. Es un problema de PathScribe; le rogamos que lo notifique.** | Se rechazó el contenido de la etiqueta (`MALFORMED_ZPL`, `INVALID_GS1`). Reintentar no sirve de nada. | Notifíquelo al soporte de ForMedrixAI con la hora y el diseño de la etiqueta. | [Diseñador de etiquetas](#screen-label_designer) |
| Un trabajo de impresión de informe está en **Error** con "Network printing needs the PathScribe site agent." | Se envió un informe a una impresora de red desde un navegador, que no puede acceder a ella (`NEEDS_SITE_AGENT`). | Dirija la impresión del laboratorio a través de una impresora del agente del centro. | [Agentes del centro](#screen-site_agents), [Reglas de enrutamiento de destinos de impresión](#screen-print_routing_rules) |
| La impresión "funciona" pero no sale nada en la versión de demostración. | La versión de demostración registra las impresiones en lugar de enviarlas. | Lea el registro de impresión simulada. | [Registro de impresión simulada](#screen-simulated_print) |

### Mensajes de interfaz atascados {#ch9-matrix-interfaces}

| Síntoma | Causa probable | Solución | Pantalla |
|---|---|---|---|
| Un mensaje aparece en **DLQ de interfaz saliente** con el error **Envío rechazado**, **Tiempo de espera del envío agotado** o **Motor inaccesible**. | El motor de interfaz no devolvió un 2xx (`DISPATCH_REJECTED`, `DISPATCH_TIMEOUT`, `DISPATCH_UNREACHABLE`). El mensaje se conserva para reintentarlo. | Compruebe el motor en la subpestaña **Motores**. Cuando esté en buen estado, elija **Reintentar envío** (requiere `interface:outbound:resend`). | [Registros del sistema: interfaces](#screen-audit-interfaces) |
| El reintento responde **Retenido en la pantalla Cola saliente: libérelo primero allí.** | El mensaje está retenido en la cola de salida. | Libérelo en esa pantalla y después vuelva a enviarlo. | [Registros del sistema: interfaces](#screen-audit-interfaces) |
| El reintento responde **Retenido: el PDF del informe aún no está disponible.** | El documento del informe todavía no se ha generado. | Espere. Se enviará con el PDF en un reintento posterior. | [Registros del sistema: interfaces](#screen-audit-interfaces) |
| Un cargo está en **DLQ de salida** (financiero) con **Falta el código CIE-10** o **Falta el NPI del profesional**. | El cargo no se puede construir sin el código o sin el NPI (`MISSING_ICD10`, `MISSING_PROVIDER_NPI`). | Introduzca el valor en la fila; la fila tiene un campo para cada uno. | [Registros del sistema: financiero](#screen-audit-financial) |
| Una tarea de **Trabajos del servidor** no se puede volver a poner en cola: **Reenvíe esta tarea desde Interfaces.** | Las tareas de interfaz y de impresión se reenvían desde sus propias pantallas (`WRONG_SCREEN`). | Utilice la cola de interfaz o de impresión, con `interface:outbound:resend` o `print:job:retry`. | [Registros del sistema: interfaces](#screen-audit-interfaces) |
| Una nueva puesta en cola responde **Esta tarea ya no está fallida; puede que ya se haya vuelto a poner en cola.** | Otra persona ya la volvió a poner en cola (`NOT_DEAD_LETTERED`). | Actualice. No se requiere ninguna acción. | [Registros del sistema](#screen-audit-log) |
| Excepciones de interfaz pendientes (un contador en la pestaña **Registro de interfaces**). | Los mensajes entrantes que no se pudieron vincular a un paciente o a un caso esperan a una persona. | Abra la subpestaña **Excepciones de interfaz** y revise cada una. | [Registros del sistema: interfaces](#screen-audit-interfaces) |

### Falla el inicio de sesión {#ch9-matrix-signin}

| Síntoma | Causa probable | Solución | Pantalla |
|---|---|---|---|
| **Correo electrónico o contraseña incorrectos**, y después **Un intento fallido más bloqueará el inicio de sesión de este correo durante 15 minutos.** | El inicio de sesión con contraseña bloquea un correo tras 5 intentos fallidos seguidos, durante 15 minutos. El recuento es por correo escrito, pertenezca o no a una cuenta. | Espere 15 minutos o establezca una contraseña nueva para la persona: establecer una contraseña elimina el bloqueo. El registro de auditoría contiene **Sign-in failed**, **Sign-in locked** y **Sign-in refused**. | [Miembros](#screen-staff-members) |
| **Pida a su administrador que restablezca su contraseña desde la pantalla de Personal.** | La persona olvidó la contraseña. El formulario de inicio de sesión no permite restablecerla por cuenta propia. | Establezca una contraseña temporal en el registro de la persona. La persona debe elegir la suya en el siguiente inicio de sesión. | [Miembros](#screen-staff-members) |
| Inicio de sesión único: **Ha iniciado sesión, pero no hay ninguna cuenta activa de PathScribe para usted.** | Ningún registro de personal coincide (`not_provisioned`). | Añada a la persona como miembro. El primer inicio de sesión único la vincula por correo electrónico. | [Miembros](#screen-staff-members) |
| Inicio de sesión único: **Su cuenta de PathScribe está inactiva.** | El registro de personal está inactivo. | Reactívelo. | [Miembros](#screen-staff-members) |
| Inicio de sesión único: **Más de una cuenta de PathScribe coincide con este inicio de sesión.** | Dos registros de personal comparten el correo electrónico (`ambiguous`). | Elimine el duplicado. | [Miembros](#screen-staff-members) |
| Inicio de sesión único: **Esta cuenta de PathScribe ya está vinculada a otra cuenta de inicio de sesión.** | Un buzón reasignado: el registro está vinculado a otra identidad en el mismo proveedor (`already_linked`). | Desvincule la cuenta anterior en el registro de la persona y vuelva a iniciar sesión. | [Miembros](#screen-staff-members) |
| Inicio de sesión único: **Su cuenta de PathScribe no incluye acceso a esta aplicación.** | Los roles de la persona no incluyen ni acceso a casos ni acceso a la configuración (`no_app_access`). | Asigne a la persona un rol con acceso. | [Roles](#screen-staff-roles) |
| Inicio de sesión único: **Su organización exige un segundo factor y el servicio de inicio de sesión no informó de ninguno.** | El proveedor de identidad no informó de un segundo factor (`mfa_required`). | Complete el segundo factor en el proveedor de identidad. | [Seguridad de la sesión](#screen-session_security) |
| **El inicio de sesión no está configurado en esta instalación. Póngase en contacto con su administrador del sistema.** | La compilación no tiene configurado el inicio de sesión. | Corrija `config.json` (consulte los códigos de arranque más abajo). | [Códigos de configuración de arranque](#ch9-codes-config) |
| Una pantalla completa **PathScribe no puede iniciarse: hay que corregir su configuración** con una lista de códigos. | `config.json` tiene un ajuste que el producto rechaza. PathScribe no se inicia con ajustes incorrectos. | Corrija `config.json` en el servidor web y vuelva a cargar. Cada código figura en el índice. | [Códigos de configuración de arranque](#ch9-codes-config) |
| Códigos del segundo factor: **Ese código ya se ha usado. Espere al siguiente.** o **Demasiados intentos. Los códigos del segundo factor están bloqueados hasta las <time>.** | El código se reutilizó o se introdujeron demasiados códigos erróneos. | Espere al siguiente código o a la hora de fin del bloqueo. | [Seguridad de la sesión](#screen-session_security) |
| **Esta cuenta ya tiene la sesión iniciada en otra pestaña o ventana de este navegador.** | PathScribe permite una sola sesión activa por cuenta y por navegador. | Continúe para cerrar la otra sesión (su trabajo sin guardar se conserva y se ofrece para su revisión). | [Seguridad de la sesión](#screen-session_security) |

### Un mensaje de interfaz o una pantalla parece atascado {#ch9-matrix-stuck}

| Síntoma | Causa probable | Solución | Pantalla |
|---|---|---|---|
| Una pantalla indica **No se puede acceder al servidor de PathScribe. Inténtelo de nuevo en un momento.** | El navegador no pudo llegar al servidor de API, o este respondió con un error del servidor (`UNAVAILABLE`), o no respondió en 30 segundos (`TIMED_OUT`). | Compruebe la ruta de red y el estado del servidor de API. La pantalla reintenta donde lo indica (por ejemplo, el panel de motores cada minuto). | [Registros del sistema](#screen-audit-log) |
| **Su sesión ha finalizado. Inicie sesión de nuevo.** | El servidor devolvió 401 (`SIGNED_OUT`). | Inicie sesión de nuevo. | [Seguridad de la sesión](#screen-session_security) |
| **Ya se hizo. Actualice y vuelva a mirar.** o un guardado que informa de un conflicto. | Otra persona cambió el mismo registro (`CONFLICT`). | Actualice la pantalla y aplique el cambio de nuevo. | [Registros del sistema](#screen-audit-log) |
| Una exportación se queda en **Preparando**, o termina con **La exportación ha tardado demasiado y se ha detenido.** | Una generación se detiene a los 30 minutos (`TIMED_OUT`). | Restrinja los filtros y exporte de nuevo. | [Mis exportaciones](#screen-my-exports) |
| **Ya tiene 3 exportaciones en preparación.** | Un usuario puede tener 3 exportaciones abiertas (`TOO_MANY_OPEN`). | Espere a que termine una o cancele una. | [Mis exportaciones](#screen-my-exports) |

## Índice de códigos de error del sistema {#ch9-error-codes}
Breadcrumb: Inicio > Guía del administrador > Apéndices > Índice de códigos de error del sistema

**Estado:** Construido

**Qué cubre este índice.** Los códigos en mayúsculas del código fuente que un administrador puede ver en una pantalla, leer en el Registro de errores o encontrar en un contrato. Cada fila indica la pantalla en la que aparece, qué significa y qué hacer. El contrato que se nombra en la segunda columna está en `docs/architecture/`; cuando ningún contrato enumera un código, la fila nombra el archivo del servicio.

**Cómo llegan los códigos a una pantalla.** El cliente de API asigna a cada llamada fallida un código corto y fijo y nunca utiliza el texto del mensaje del servidor, porque ese texto podría nombrar a un paciente. Se usa un código del servidor cuando son letras mayúsculas, dígitos y guiones bajos, de 2 a 40 caracteres, y empieza por una letra. En caso contrario, el código se obtiene del estado HTTP.

| Estado | Código |
|---|---|
| 401 | `SIGNED_OUT` |
| 403 | `NOT_PERMITTED` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 400, 422 | `INVALID` |
| 429 | `TOO_MANY_REQUESTS` |
| cualquier otro | `UNAVAILABLE` |

También existen motivos en minúsculas (por ejemplo, los motivos de inicio de sesión `not_provisioned` e `inactive`, y los del servidor `capability_refused`, `support_access_disabled` y `support_access_not_approved`). No son códigos en mayúsculas, por lo que figuran en la matriz anterior y en la pantalla [Acceso de soporte](#screen-support_access), no en este índice.

### Códigos que puede mostrar cualquier pantalla respaldada por el servidor {#ch9-codes-http}

| Código de error | Dónde aparece | Significado | Qué hacer |
|---|---|---|---|
| `SIGNED_OUT` | Cualquier pantalla que llame al servidor de API. Contrato: `HTTP_SERVICES_PATTERN.md` sección 4; `src/services/apiServer/apiHttpClient.ts`. | El servidor respondió 401: el inicio de sesión ha finalizado o no se aceptó el token. | Inicie sesión de nuevo. Si vuelve a aparecer nada más iniciar sesión, informe al soporte de ForMedrixAI. |
| `NOT_PERMITTED` | Cualquier pantalla respaldada por el servidor. Contrato: `HTTP_SERVICES_PATTERN.md`; `AUTHORIZATION_API.md`. | El servidor respondió 403: falta la capacidad o está fuera de los centros de la persona. | Consulte las filas de la matriz sobre botones atenuados. Busque **Capability refused** en [Registros del sistema](#screen-audit-log). |
| `NOT_FOUND` | Cualquier pantalla respaldada por el servidor. Contrato: `HTTP_SERVICES_PATTERN.md`. | El registro ya no existe, por ejemplo porque otra persona lo eliminó o lo dio de baja. | Actualice y ábralo de nuevo. |
| `CONFLICT` | Cualquier pantalla con un guardado con control de versiones. Contrato: `HTTP_SERVICES_PATTERN.md` (guardados con control de versiones). | El servidor respondió 409: el registro cambió desde que se leyó. Para un caso, el servidor devuelve además la versión que tiene. | Actualice y aplique el cambio de nuevo. |
| `INVALID` | Cualquier guardado respaldado por el servidor. Contrato: `HTTP_SERVICES_PATTERN.md`. | El servidor respondió 400 o 422: rechazó los valores. | Compruebe las entradas del formulario y guarde de nuevo. |
| `TOO_MANY_REQUESTS` | Cualquier pantalla respaldada por el servidor. Contrato: `HTTP_SERVICES_PATTERN.md`; `STAFF_ADMIN_API.md`. | El servidor respondió 429: se alcanzó un límite de frecuencia. | Espere un momento e inténtelo de nuevo. Los casos repetidos se envían al soporte de ForMedrixAI. |
| `TIMED_OUT` | Cualquier pantalla respaldada por el servidor; la lista de exportaciones. Contrato: `HTTP_SERVICES_PATTERN.md`; `ASYNC_EXPORT_API.md` sección 4. | La llamada no obtuvo respuesta en 30 segundos (el valor predeterminado del cliente). En la generación de una exportación, la generación se detuvo a los 30 minutos. | Reintente. En una exportación, restrinja los filtros. |
| `UNAVAILABLE` | Cualquier pantalla respaldada por el servidor, por ejemplo la lista de estaciones de trabajo, la lista de agentes del centro, el panel de motores y Trabajos del servidor. Contrato: `HTTP_SERVICES_PATTERN.md`. | No se pudo acceder al servidor, este respondió con cualquier otro estado o envió una respuesta que no era un objeto JSON. | Compruebe la red y el servidor de API. Reintente. |
| `NOT_SUPPORTED` | Una acción solo de demostración en una instalación con servidor. Contrato: `HTTP_SERVICES_PATTERN.md`; `src/services/apiServer/httpServiceExtras.ts`. | El método existe solo para la demostración (cargar datos de demostración). La versión de servidor no realiza ninguna llamada. | Nada. Es lo esperado en una instalación con servidor. |
### Rechazos de permisos y de aprobación {#ch9-codes-permission}

| Código de error | Dónde aparece | Significado | Qué hacer |
|---|---|---|---|
| `CONFIG_NOT_PERMITTED` | Todos los guardados de Configuración. Contrato: `AUTHORIZATION_API.md`; `src/services/authorization/guardConfigWrites.ts`. | Los roles de la persona no tienen la capacidad de esa pantalla, por lo que no se guardó nada. La página de Configuración muestra el nombre de la capacidad. | Conceda la capacidad en [Roles](#screen-staff-roles). |
| `EXPORT_NOT_PERMITTED` | Exportación de la búsqueda de casos y exportación del informe de casos. Contrato: `CASE_SEARCH_API.md`; `AUTHORIZATION_API.md` (exportaciones). | Falta la capacidad de exportación (`search:case-results:export` o `search:case-report:export`). No se devuelve ninguna fila. | Conceda la capacidad. |
| `SEPARATION_OF_DUTIES` | Guardado de rol y guardado de personal. Contrato: `AUTHORIZATION_API.md` (separación de funciones). | Un rol o una persona tendría a la vez `config:clinical-mismatch-rules:manage` y `config:ai-prompt:approve`. | Reparta las dos capacidades entre roles distintos que tengan personas diferentes. |
| `SELF_APPROVAL` | Instrucciones de la IA. Contrato: `AUTHORIZATION_API.md`; [Instrucciones de la IA](#screen-ai_instructions). | La persona editó el texto pendiente, por lo que no puede aprobarlo. | Haga que lo apruebe otra persona que tenga `config:ai-prompt:approve`. |
| `AI_VENDOR_NOT_ALLOWED` | Cualquier función de IA. Contrato: `AI_PROXY.md`; `src/services/aiIntegration/aiCallPolicy.ts`. | La política de proveedores de IA rechaza el servicio o la región para la jurisdicción. La llamada no se realiza y se audita como `AI_CALL_REFUSED`. La función continúa sin IA y dice "AI is not available for this jurisdiction." | Cambie la regla o la región de alojamiento en la pestaña [Comportamiento de la IA](#screen-tab-ai), si la política del laboratorio lo permite. |

### Exportaciones {#ch9-codes-exports}

| Código de error | Dónde aparece | Significado | Qué hacer |
|---|---|---|---|
| `INVALID_PARAMETERS` | [Mis exportaciones](#screen-my-exports). Contrato: `ASYNC_EXPORT_API.md` sección 3. | El servidor no pudo utilizar los filtros. | Cambie los filtros y exporte de nuevo. |
| `TOO_MANY_ROWS` | [Mis exportaciones](#screen-my-exports). Contrato: `ASYNC_EXPORT_API.md`. | Coincidieron más de 1.000.000 de filas. | Restrinja los filtros. |
| `TOO_MANY_OPEN` | [Mis exportaciones](#screen-my-exports). Contrato: `ASYNC_EXPORT_API.md`. | La persona ya tiene 3 exportaciones en cola o en ejecución. | Espere o cancele una. |
| `BUILD_FAILED` | [Mis exportaciones](#screen-my-exports). Fuente: `src/services/exports/asyncExportContract.ts`. | El servidor no pudo generar el archivo. Una generación tiene 2 intentos. | Inténtelo de nuevo. Si vuelve a fallar, informe al soporte de ForMedrixAI. |
| `CANCELLED` | [Mis exportaciones](#screen-my-exports). Fuente: `src/i18n/locales/en.json` (`exports.problem`). | Se canceló la exportación. | Exporte de nuevo si todavía la necesita. |
| `EXPIRED` | [Mis exportaciones](#screen-my-exports); el agente del centro. Contrato: `ASYNC_EXPORT_API.md`; `SITE_AGENT_API.md` sección 6. | En una exportación: el archivo se eliminó tras su periodo de conservación (7 días de forma predeterminada, de 1 a 30 según lo fije el laboratorio). En una tarea del agente del centro: no se inició a tiempo y se devolvió. | Exporte de nuevo. En una tarea, consulte las filas de impresión más abajo. |

### Configuración de arranque {#ch9-codes-config}

Estos códigos aparecen en la pantalla completa **PathScribe no puede iniciarse: hay que corregir su configuración**. PathScribe no se inicia hasta que se corrigen. Los ajustes y las reglas figuran en `RUNTIME_CONFIG.md` sección 3. El código es `src/services/runtimeConfig/runtimeSettings.ts`.

| Código de error | Dónde aparece | Significado | Qué hacer |
|---|---|---|---|
| `UNREADABLE` | Pantalla de arranque. | `config.json` no es un JSON válido. | Corrija el archivo. |
| `NOT_AN_OBJECT` | Pantalla de arranque. | `config.json` debe ser una lista de ajustes y valores (un objeto JSON). | Corrija el archivo. |
| `UNKNOWN_SETTING` | Pantalla de arranque. | El nombre no es uno de los ajustes que conoce PathScribe, o es un nombre solo de compilación. | Compruebe la ortografía con `RUNTIME_CONFIG.md`. |
| `NOT_TEXT` | Pantalla de arranque. | Un valor debe ser texto, un número, o verdadero o falso. | Corrija el valor. |
| `TOO_LONG` | Pantalla de arranque. | Un valor tiene más de 2.000 caracteres. | Acórtelo. |
| `INVALID_URL` | Pantalla de arranque. | El valor debe ser una dirección web, o una ruta de este sitio que empiece por `/`, sin nombre de usuario ni contraseña. | Corrija la dirección. |
| `NOT_HTTPS` | Pantalla de arranque. | Una dirección debe usar https. El http sin cifrar solo se admite hacia este ordenador en una compilación de desarrollo. | Utilice una dirección https. |
| `NOT_THIS_SITE` | Pantalla de arranque. | Una ruta de proxy lleva a otro sitio (por ejemplo `//host`). | Utilice una ruta de este sitio o una dirección https. |
| `API_SERVER_REQUIRED` | Pantalla de arranque. | Una compilación de servidor necesita la dirección del servidor de PathScribe y no hay ninguna configurada. | Configure la dirección de la API. |
| `SSO_REQUIRED` | Pantalla de arranque. | Una compilación de servidor inicia sesión solo mediante el proveedor de identidad, por lo que `VITE_AUTH_MODE` debe ser `sso`. | Configúrelo, junto con los ajustes del proveedor. |
| `API_SERVER_IN_DEMO_BUILD` | Pantalla de arranque. | Una compilación de demostración nunca se comunica con un servidor real. | Instale una compilación de servidor. |
| `NOT_IN_DEMO_BUILD` | Pantalla de arranque. | Una compilación de demostración no puede usar un ajuste de concentrador, de generador de documentos, de receptor de interfaz ni de tareas del servidor, y nunca es de producción. | Instale una compilación de servidor. |
| `ADDRESS_NOT_FROM_SERVER` | Pantalla de arranque, marcada "from the PathScribe server's /api/config". | El servidor no puede establecer una dirección, porque la política de seguridad del sitio se genera a partir de `config.json`. | Ponga la dirección en `config.json`. |
| `NOT_FROM_SERVER` | Pantalla de arranque, marcada "from the PathScribe server's /api/config". | Solo `config.json` o la compilación pueden establecer este ajuste (inicio de sesión, rol de la instancia, qué tareas ejecuta el servidor). | Mueva el ajuste a `config.json`. |

### Impresión, etiquetas y agente del centro {#ch9-codes-print}

Los seis primeros códigos tienen su propio texto de mensaje. El contrato de los códigos del agente es `SITE_AGENT_API.md` sección 6; la lista es `AGENT_ERROR_CODES` en `src/services/siteAgent/siteAgentContract.ts`. Las impresiones de informes se reintentan según el calendario de entrega del laboratorio (1, 5 y 15 minutos de forma predeterminada, hasta 10 reintentos). Las etiquetas nunca se reintentan por sí solas.

| Código de error | Dónde aparece | Significado | Qué hacer |
|---|---|---|---|
| `PRINTER_UNREACHABLE` | Aviso de etiqueta; Cola de impresión. Contrato: `SITE_AGENT_API.md`. | No hay conexión con la impresora. Se reintenta en los informes. | Compruebe la alimentación y la red de la impresora y reintente. |
| `PAPER_OUT` | Aviso de etiqueta; Cola de impresión. Contrato: `SITE_AGENT_API.md`. | A la impresora de etiquetas se le han acabado las etiquetas. | Cargue etiquetas y reintente. |
| `RIBBON_OUT` | Aviso de etiqueta; Cola de impresión. Contrato: `SITE_AGENT_API.md`. | A la impresora de etiquetas se le ha acabado la cinta. | Cargue una cinta y reintente. |
| `HEAD_OPEN` | Aviso de etiqueta; Cola de impresión. Contrato: `SITE_AGENT_API.md`. | El cabezal de impresión está abierto. | Ciérrelo y reintente. |
| `MALFORMED_ZPL` | Aviso de etiqueta. Contrato: `SITE_AGENT_API.md`. | La impresora rechazó el diseño de la etiqueta. No se reintenta. | Informe al soporte de ForMedrixAI. |
| `INVALID_GS1` | Aviso de etiqueta. Contrato: `SITE_AGENT_API.md`. | El código de barras de la etiqueta no superó la validación GS1. No se reintenta. | Informe al soporte de ForMedrixAI. Compruebe el GTIN en [Ajustes de impresión](#screen-print_settings). |
| `NEEDS_SITE_AGENT` | [Cola de impresión](#screen-audit-interfaces). Contrato: `SITE_AGENT_API.md`; `src/services/printing/printJobFailureReason.ts`. | Un navegador no puede enviar a una impresora de red. El trabajo falla de inmediato y pasa a la cola de excepciones. | Utilice una impresora del agente del centro. Consulte [Agentes del centro](#screen-site_agents). |
| `PRINTER_OFFLINE` | [Cola de impresión](#screen-audit-interfaces). Fuente: `src/services/printing/attemptPrintDelivery.ts`. | QZ Tray no está conectado en el ordenador de impresión. Se reintenta. | Inicie QZ Tray. |
| `PRINT_REJECTED` | [Cola de impresión](#screen-audit-interfaces). Fuente: `attemptPrintDelivery.ts`, `redispatchPrintJob.ts`. | Un trabajo no se puede imprimir, por ejemplo porque no hay ninguna impresora configurada para la entrega por QZ Tray, o porque no se pudo generar el documento del informe. | Corrija los ajustes de la impresora y reintente. |
| `PRINTER_REJECTED` | Cola de impresión. Contrato: `SITE_AGENT_API.md`. | La impresora rechazó el trabajo. No se reintenta. | Compruebe la pantalla de errores de la propia impresora. |
| `DOCUMENT_UNAVAILABLE` | Cola de impresión. Contrato: `SITE_AGENT_API.md`. | El enlace de descarga del agente falló o caducó. Se reintenta. | Nada al principio. Si persiste, informe al soporte de ForMedrixAI. |
| `DOCUMENT_INTEGRITY` | Cola de impresión. Contrato: `SITE_AGENT_API.md`. | El SHA-256 del archivo no coincidió, por lo que nunca se imprimió. No se reintenta. | Informe al soporte de ForMedrixAI. |
| `UNKNOWN_DESTINATION` | Cola de impresión; entrega en archivo. Contrato: `SITE_AGENT_API.md`. | El agente no tiene ninguna impresora ni recurso compartido con ese id (su configuración está desactualizada). | Actualice la lista de impresoras del agente en [Agentes del centro](#screen-site_agents). |
| `SHARE_UNREACHABLE` | Entrega a recurso compartido. Contrato: `SITE_AGENT_API.md`. | No se pudo acceder al recurso compartido. Se reintenta. | Compruebe el recurso compartido. |
| `SHARE_ACCESS_DENIED` | Entrega a recurso compartido. Contrato: `SITE_AGENT_API.md`. | El agente no puede escribir en el recurso compartido. No se reintenta. | Corrija los permisos del recurso compartido. |
| `SHARE_FULL` | Entrega a recurso compartido. Contrato: `SITE_AGENT_API.md`. | El recurso compartido está lleno. Se reintenta. | Libere espacio. |
| `IN_DOUBT` | Cola de impresión. Contrato: `SITE_AGENT_API.md`. | El agente se detuvo después de empezar a enviar y antes de conocer el resultado. Nunca se reenvía por sí solo. | Compruebe la impresora. Vuelva a imprimir si la página no está. |
| `AGENT_ERROR` | Cola de impresión. Contrato: `SITE_AGENT_API.md`. | Cualquier otro fallo del agente. Se reintenta. | Compruebe el agente en [Agentes del centro](#screen-site_agents). |

### Mensajes de salida, cargos, registros y tareas del servidor {#ch9-codes-outbound}

| Código de error | Dónde aparece | Significado | Qué hacer |
|---|---|---|---|
| `DISPATCH_REJECTED` | [Registros del sistema: interfaces](#screen-audit-interfaces) (se muestra como "Envío rechazado"). Contrato: `INTERFACE_TRANSACTIONS.md`. | El motor no devolvió un 2xx. El mensaje se conserva para reintentarlo. | Compruebe el motor y después **Reintentar envío**. |
| `DISPATCH_TIMEOUT` | [Registros del sistema: interfaces](#screen-audit-interfaces) (se muestra como "Tiempo de espera del envío agotado"). Contrato: `OUTBOUND_QUEUE_API.md`; `INTERFACE_TRANSACTIONS.md`. | El motor no respondió a tiempo. | Igual que arriba. |
| `DISPATCH_UNREACHABLE` | [Registros del sistema: interfaces](#screen-audit-interfaces) (se muestra como "Motor inaccesible"). Contrato: `INTERFACE_TRANSACTIONS.md`. | No se pudo acceder al motor. | Igual que arriba. |
| `MISSING_ICD10` | [Registros del sistema: financiero](#screen-audit-financial). Contrato: `DIAGNOSIS_CODING.md`; `src/services/billing/validateChargeMetadata.ts`. | Un cargo no tiene código CIE-10. | Introduzca el código en la fila. |
| `MISSING_PROVIDER_NPI` | [Registros del sistema: financiero](#screen-audit-financial). Fuente: `validateChargeMetadata.ts`. | Un cargo no tiene NPI del profesional. | Introduzca el NPI en la fila. |
| `REGISTRY_NOT_READY` | Cola de salida; Excepciones de registro. Contrato: `BATCH_REGISTRY_FEED_API.md`; `REGISTRY_ACKNOWLEDGEMENT_API.md`. | Un envío a un registro está retenido: falta un campo o un ajuste obligatorio. | Complete el elemento que falta, indicado en la entrada. |
| `REGISTRY_LIVE_NOT_APPROVED` | Cola de salida; Excepciones de registro. Contrato: `REGISTRY_GO_LIVE_API.md`. | Se firmó un caso real, pero la conexión con el registro no está aprobada para producción. La entrada muestra "Held: attestation required". | Complete la aprobación de puesta en producción en la pantalla de ajustes del registro. |
| `NOT_DEAD_LETTERED` | Trabajos del servidor. Contrato: `MESSAGE_BUS_API.md`. | La tarea ya no está fallida (409). | Actualice. |
| `WRONG_SCREEN` | Trabajos del servidor. Fuente: `src/services/serverJobs/serverJobsContract.ts`. | Las tareas de interfaz y de impresión no se vuelven a poner en cola aquí. | Reenvíe desde la cola de interfaz o de impresión. |
| `CONSULT_LINK_NOT_ACTIVE` | Pestaña Enlaces de consulta. Contrato: `CONSULT_ACCESS_API.md`. | El enlace ya está revocado o ha caducado. | Actualice. |
| `NO_RECIPIENTS` | Programaciones de informes. Contrato: `SCHEDULED_REPORTS_API.md`. | No queda ningún destinatario activo. | Elija al menos un destinatario. |
| `TOO_MANY_SCHEDULES` | Programaciones de informes. Contrato: `SCHEDULED_REPORTS_API.md`. | La persona tiene el máximo de programaciones permitido. | Elimine o combine una programación. |
| `RECIPIENT_ACCESS_UNKNOWN` | Programaciones de informes. Contrato: `SCHEDULED_REPORTS_API.md`. | No se pudo determinar lo que puede ver un destinatario, por lo que no se generó nada. | Compruebe los roles y los centros del destinatario. |
| `RUN_FAILED` | Programaciones de informes. Fuente: `src/services/scheduledReports/createScheduledReportService.ts`. | Falló una ejecución programada. | Consulte el Registro de errores. |

### Pantallas de configuración: rechazos que conviene conocer {#ch9-codes-config-screens}

| Código de error | Dónde aparece | Significado | Qué hacer |
|---|---|---|---|
| `REASON_REQUIRED` | [Importación de códigos](#screen-code_import), revocaciones de estaciones de trabajo y de flujos, y varias acciones sobre casos. Fuente: el servicio de cada pantalla. | El cambio requiere un motivo. | Introduzca un motivo. |
| `BAD_DATE` | [Sistemas de codificación](#screen-code_systems). Fuente: `src/services/coding/codeSystemPolicyRules.ts`. | Una fecha no es una fecha real del calendario. | Corríjala. |
| `BAD_ROLE` | [Sistemas de codificación](#screen-code_systems). Fuente: `codeSystemPolicyRules.ts`. | Un rol de una regla no es válido. | Elija un rol válido. |
| `BAD_SYSTEM` | [Sistemas de codificación](#screen-code_systems). Fuente: `codeSystemPolicyRules.ts`. | Un sistema de codificación está en blanco o no es válido. | Elija un sistema de codificación. |
| `DUPLICATE` | [Sistemas de codificación](#screen-code_systems). Fuente: `codeSystemPolicyRules.ts`. | El mismo sistema de codificación tiene dos filas con la misma fecha de inicio. | Elimine una fila o cambie su fecha. |
| `NO_RULES` | [Sistemas de codificación](#screen-code_systems). Fuente: `codeSystemPolicyRules.ts`. | No hay reglas. | Añada una regla o restablezca el valor predeterminado. |
| `TOO_MANY` | [Sistemas de codificación](#screen-code_systems). Fuente: `codeSystemPolicyRules.ts`. | Hay demasiadas reglas. | Elimine algunas. |
| `SAME_PERSON` | [Importación de códigos](#screen-code_import). Fuente: `src/services/billing/codeEngine/planImportJob.ts`. | La persona que cargó la importación no puede aprobarla ni rechazarla (principio de los cuatro ojos). | Debe decidir otra persona. |
| `JOB_NOT_APPROVED` | [Importación de códigos](#screen-code_import). Fuente: `planImportJob.ts`. | Solo se puede revertir una importación aprobada. | Ninguna. |
| `JOB_NOT_PENDING` | [Importación de códigos](#screen-code_import). Fuente: `planImportJob.ts`. | La importación ya no está pendiente de aprobación. | Actualice. |
| `MAPPING_INCOMPLETE` | [Importación de códigos](#screen-code_import). Fuente: `src/services/billing/mockCodeImportService.ts`. | Las columnas del código de facturación, del código CPT y de la fecha de entrada en vigor no están todas asociadas. | Asócielas, o indique una fecha de entrada en vigor para todo el archivo. |
| `NO_ROWS` | [Importación de códigos](#screen-code_import). Fuente: `mockCodeImportService.ts`. | El archivo no tiene filas que se puedan importar. | Compruebe el archivo. |
| `ROWS_REFUSED` | [Importación de códigos](#screen-code_import). Fuente: `mockCodeImportService.ts`. | Algunas filas no se pueden importar. | Corríjalas o elija omitirlas. |
| `ROW_MISSING` | [Importación de códigos](#screen-code_import). Fuente: `mockCodeImportService.ts`. | Una versión de código de la importación ya no existe, por lo que no se puede aprobar. | Cargue la importación de nuevo. |
| `ROW_NOT_PENDING` | [Importación de códigos](#screen-code_import). Fuente: `mockCodeImportService.ts`. | Una versión de código de la importación ya no está pendiente. | Cargue la importación de nuevo. |
| `NAME_TAKEN` | [Estaciones de trabajo](#screen-workstations), [Canal de informes (Power BI)](#screen-bi_feed). Fuente: `src/services/workstationRegistry/workstationRegistryRules.ts`; `src/services/biFeed/biFeedRules.ts`. | Otra estación de trabajo activa del centro tiene ese nombre. | Elija otro nombre. |
| `ALREADY_REVOKED` | [Estaciones de trabajo](#screen-workstations), [Canal de informes (Power BI)](#screen-bi_feed). Fuente: los dos mismos servicios. | La estación de trabajo ya está revocada. | Ninguna. |
| `REVOKE_REASON_INVALID` | [Estaciones de trabajo](#screen-workstations), [Canal de informes (Power BI)](#screen-bi_feed). Fuente: los dos mismos servicios. | Hay que elegir un motivo, con una nota para Otro. | Elija un motivo. |
| `FEED_OFF` | [Canal de informes (Power BI)](#screen-bi_feed). Fuente: `src/services/biFeed/biFeedRules.ts`. | El canal está desactivado. | Actívelo en los ajustes del canal. |
| `DATASET_NOT_IN_FEED` | [Canal de informes (Power BI)](#screen-bi_feed). Fuente: `biFeedRules.ts`. | El canal no ofrece un conjunto de datos. | Añádalo primero a los ajustes del canal. |
| `FACILITY_NOT_IN_FEED` | [Canal de informes (Power BI)](#screen-bi_feed). Fuente: `biFeedRules.ts`. | El canal no ofrece un centro. | Añádalo primero a los ajustes del canal. |
| `IDENTIFIED_NOT_APPROVED` | [Canal de informes (Power BI)](#screen-bi_feed). Fuente: `biFeedRules.ts`. | Los tokens identificados necesitan una aprobación registrada. | Registre la aprobación. |
| `NOT_HL7` | [Ingesta de LIS en modo Asistencia](#screen-assist_lis_polling). Fuente: `src/services/lisIngestion/adapters/hl7v2StatusAdapter.ts`. | El mensaje no es un mensaje HL7 v2 (debe empezar por un segmento MSH). | Compruebe el sistema emisor. |
| `UNSUPPORTED_MESSAGE_TYPE` | [Ingesta de LIS en modo Asistencia](#screen-assist_lis_polling). Fuente: `hl7v2StatusAdapter.ts`. | Solo se aceptan mensajes ORU^R01, ORM^O01 y OML^O21. | Envíe un tipo admitido. |
| `MISSING_ACCESSION` | [Ingesta de LIS en modo Asistencia](#screen-assist_lis_polling). Fuente: `hl7v2StatusAdapter.ts`, `webhookJsonAdapter.ts`. | El mensaje no tiene número de acceso. | Corrija el emisor. |
| `MISSING_STATUS` | [Ingesta de LIS en modo Asistencia](#screen-assist_lis_polling). Fuente: `src/services/lisIngestion/types.ts`. | El mensaje no tiene estado del LIS. | Corrija el emisor. |
| `INVALID_JSON` | [Ingesta de LIS en modo Asistencia](#screen-assist_lis_polling). Fuente: `types.ts`. | El mensaje no es un JSON válido. | Corrija el emisor. |
| `CROSSWALK_DUPLICATE_STATUS` | [Ingesta de LIS en modo Asistencia](#screen-assist_lis_polling). Fuente: `src/services/assistPolling/mockAssistPollingService.ts`. | Un estado del LIS está asociado dos veces. | Asocie cada estado una sola vez. |
| `INTERVAL_OUT_OF_RANGE` | [Ingesta de LIS en modo Asistencia](#screen-assist_lis_polling). Fuente: `mockAssistPollingService.ts`. | El intervalo de sondeo está fuera de los minutos enteros permitidos. | Introduzca un valor dentro del intervalo indicado. |
| `NHS_NUMBER_CHECK_DIGIT` | [Registro de cáncer del Reino Unido (COSD)](#screen-cosd_destination). Contrato: `UK_COSD_API.md`. | El número NHS no supera su dígito de control. | Corrija el número en el caso. |
| `NHS_NUMBER_FORMAT` | [Registro de cáncer del Reino Unido (COSD)](#screen-cosd_destination). Contrato: `UK_COSD_API.md`. | El número NHS no tiene diez dígitos. | Corríjalo. |
| `PATIENT_IDENTIFIER_MISSING` | [Registro de cáncer del Reino Unido (COSD)](#screen-cosd_destination). Contrato: `UK_COSD_API.md`. | Falta el número NHS. | Introdúzcalo. |
| `ICDO_MISSING` | [Registro de cáncer del Reino Unido (COSD)](#screen-cosd_destination). Contrato: `UK_COSD_API.md`. | No hay código ICD-O-3. | Añádalo al caso. |
| `ICDO_FORMAT` | [Registro de cáncer del Reino Unido (COSD)](#screen-cosd_destination). Contrato: `UK_COSD_API.md`. | Un código ICD-O-3 no tiene la forma `8500/3`. | Corríjalo. |
| `DIAGNOSIS_DATE_MISSING` | [Registro de cáncer del Reino Unido (COSD)](#screen-cosd_destination). Contrato: `UK_COSD_API.md`. | Falta la fecha del diagnóstico. | Introdúzcala. |
| `XML_NOT_WELL_FORMED` | [Registro de cáncer del Reino Unido (COSD)](#screen-cosd_destination); carga de protocolos. Contrato: `UK_COSD_API.md`; fuente: `protocolUploadValidation.ts`. | La vista previa, o el archivo cargado, no es un XML bien formado. | Corrija los datos o el archivo. |
| `UNSUPPORTED_FORMAT` | Carga de protocolos de la Biblioteca sinóptica ([Biblioteca sinóptica](#screen-tab-protocols)). Fuente: `src/services/templates/protocolUploadValidation.ts`. | El tipo de archivo no es compatible. Utilice JSON, XML o XLSX. | Convierta el archivo. |
| `FILE_TOO_LARGE` | Carga de protocolos. Fuente: `protocolUploadValidation.ts`. | El archivo supera los 10 MB. | Redúzcalo. |
| `JSON_INVALID` | Carga de protocolos. Fuente: `protocolUploadValidation.ts`. | El archivo no es un JSON válido. | Corríjalo. |
| `JSON_NEWER_FORMAT` | Carga de protocolos. Fuente: `protocolUploadValidation.ts`. | El archivo lo exportó una versión más reciente de PathScribe. | Actualice PathScribe o exporte desde la misma versión. |
| `XML_NOT_SDC` | Carga de protocolos. Fuente: `protocolUploadValidation.ts`. | El XML no es un formulario CAP eCC (SDC). | Utilice el archivo correcto. |
| `NOT_IMPORTABLE` | Carga de protocolos. Fuente: `protocolUploadValidation.ts`. | El formato se puede comprobar, pero todavía no importar. La importación funciona con archivos de protocolo de PathScribe (JSON). | Utilice un archivo JSON de PathScribe. |
| `XLSX_NOT_MAPPED` | Carga de protocolos. Fuente: `protocolUploadValidation.ts`. | No se leyeron las hojas del libro, por lo que las columnas no se asociaron a preguntas. | Utilice un formato admitido. |
| `PRODUCTION_GATED` | [Captura inteligente](#screen-smart_capture). Fuente: `src/services/smartCapture/smartCaptureStates.ts`. | Hay configurado un motor de interfaz real y la barrera de producción está cerrada, por lo que no se envió nada. | Abra la barrera de producción cuando el laboratorio esté preparado. |
| `ALREADY_ACCESSIONED` | [Buzón de depósito](#screen-lockbox-drop-off). Contrato: `LOCKBOX_API.md`. | El recibo ya está registrado (409). | Ninguna. |
| `PLACEHOLDER_UNRESOLVED` | [Buzón de depósito](#screen-lockbox-drop-off). Contrato: `LOCKBOX_API.md`. | Se solicitó el registro de un marcador provisional sin número de orden vinculado (409). | Vincule primero el marcador provisional a su orden. |
| `NOT_A_PLACEHOLDER` | [Buzón de depósito](#screen-lockbox-drop-off). Contrato: `LOCKBOX_API.md`. | Solo un marcador provisional se puede vincular a una orden. | Ninguna. |

## Referencia de Registros del sistema {#ch9-system-logs}
Breadcrumb: Inicio > Guía del administrador > Apéndices > Referencia de Registros del sistema

**Estado:** Construido

Registros del sistema es donde se lee el registro de lo que hicieron las personas, el sistema y la IA. Esta parte documenta la pantalla. La siguiente ([Guía de verificación del registro de auditoría](#ch9-audit-verification)) explica cómo utilizarla para responder a las preguntas de un auditor.

### Registros del sistema {#screen-audit-log}
Breadcrumb: Inicio > Registros del sistema

**Estado:** Construido. En la versión de demostración el registro de auditoría se conserva en el navegador; con un servidor de API lo conserva el servidor (consulte Límites conocidos).

**1. Navegación:** icono de Inicio **Registros del sistema** (dirección `/audit`).
**2. Elemento de mantenimiento:** Registros del sistema (una pantalla de referencia; aquí no se configura nada).

**3. Finalidad y alcance.** Una sola pantalla para el registro de cumplimiento del laboratorio: acciones de la IA, cambios de los usuarios, eventos del sistema, errores, actividad de garantía de calidad, actividad de interfaces y de impresión, fallos de envío financiero, alertas críticas, enlaces de consulta externos y las tareas en segundo plano del servidor de API. Es de solo lectura salvo por tres acciones: marcar un error como resuelto con **Resolver**, reenviar un mensaje de interfaz o un trabajo de impresión fallido, y revocar un enlace de consulta. Cada pestaña es un registro distinto que mantiene un servicio distinto. Las pestañas Registro de auditoría y Registro de errores se documentan aquí. La pestaña **Registro de interfaces** se documenta en [Registros del sistema: interfaces](#screen-audit-interfaces) y la pestaña **Financiero** en [Registros del sistema: financiero](#screen-audit-financial).

**4. Requisitos previos y dependencias.** La pantalla solo muestra lo que ha ocurrido, por lo que no hay nada que configurar antes, salvo quién puede abrirla. Una persona que no tiene `screen:audit-log:open` no ve ningún icono en Inicio y, si escribe la dirección, recibe el mensaje "No tiene acceso a esta pantalla".

Setup step: Reference, not part of setup
Requires: [Roles](#screen-staff-roles), [Miembros](#screen-staff-members)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-audit-log - Registros del sistema, pestaña Registro de auditoría con botones de tipo, filtros y Exportar CSV]

El encabezado de la página dice **Registros del sistema** con el subtítulo "Registro completo de acciones de la IA, cambios de los usuarios, eventos del sistema, errores y actividad de garantía de calidad". A continuación hay una barra de pestañas, después un cuadro **Buscar una referencia de soporte** y por último la pestaña activa. Un contador en **Registro de errores** muestra los errores abiertos, en **Registro de interfaces** las excepciones de interfaz pendientes y en **Garantía de calidad** los elementos de calidad abiertos. Una persona cuyo rol es Patólogo ve el aviso "Se muestra solo la actividad de sus casos: los eventos de los estudios de validación no son visibles para los patólogos".

[SCREENSHOT PLACEHOLDER: screen-audit-log-errors - Registros del sistema, pestaña Registro de errores]

**6. Referencia de campos.** La pantalla tiene filtros, columnas y botones en lugar de campos de formulario. Los nombres de fila empiezan por la pestaña.

#### Pestañas

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Pestaña: Registro de auditoría | Pestaña | No aplicable | Todas las entradas de auditoría que la persona puede ver. Se documenta más abajo. | Seleccionada al abrir |
| Pestaña: Registro de errores | Pestaña | No aplicable | Errores que registró el sistema, con un código. Se documenta más abajo. | No aplicable |
| Pestaña: Registro de interfaces | Pestaña con subpestañas Excepciones de interfaz, DLQ de interfaz de salida, Envíos de salida, Cola de impresión, Motores | No aplicable | Consulte [Registros del sistema: interfaces](#screen-audit-interfaces). La dirección `?tab=interfaces` la abre. | No aplicable |
| Pestaña: Garantía de calidad | Pestaña con una opción de Grupo | No aplicable | Ocho grupos de registros de calidad: Deficiencias, Vinculación intraoperatoria, Discordancia y conciliación, Plazo de cofirma, Revisión de acreditación, Desviación posterior a la validación, Revisión de coincidencia de paciente y Revisiones de la dirección. Cada grupo tiene sus propias opciones de Estado. | No aplicable |
| Pestaña: Financiero | Pestaña con subpestañas Registros de facturación y DLQ de salida | No aplicable | Consulte [Registros del sistema: financiero](#screen-audit-financial). | No aplicable |
| Pestaña: Alertas críticas | Pestaña | No aplicable | El registro de las alertas de resultados críticos. | No aplicable |
| Pestaña: Enlaces de consulta | Pestaña | No aplicable | Todos los enlaces de consulta externos de todos los casos, con **Solo activos** y **Revocar**. Se muestra a las personas con `audit:consult-links:view`. | No aplicable |
| Pestaña: Trabajos del servidor | Pestaña | No aplicable | Las tareas en segundo plano del servidor de API: estado y mensajes fallidos, con nueva puesta en cola. Solo se muestra a las personas con `jobs:server-job:view`. Un enlace abierto sin esa capacidad lleva a Registro de auditoría. | Oculta sin la capacidad |
| Buscar una referencia de soporte | Texto, con la forma `SR-XXXX-XXXX` | Opcional | Nombra el caso, la entrada de auditoría, la entrada de error o la excepción de interfaz a la que apunta una referencia de soporte. La propia consulta se audita (`support_reference.resolved`). Si la entrada está fuera del intervalo cargado, indica que amplíe el intervalo de fechas. | En blanco |

#### Pestaña Registro de auditoría

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Registro de auditoría: botones de tipo | Opción: Todos, IA, Usuario, Sistema, con recuentos | Opcional | Filtra por el tipo de la entrada. | Todos |
| Registro de auditoría: Solo gestión de pacientes | Casilla Sí/No con recuento | Opcional | Muestra solo los eventos cuyo nombre empieza por `mpi.` (fusión, traslado, vinculación, revinculación, actualización demográfica). Se combina con los demás filtros. Un futuro evento `mpi.` se incluye automáticamente. | No |
| Registro de auditoría: filtro de usuario | Opción entre todos los usuarios de las entradas cargadas | Opcional | Solo se muestra en una sesión de Superadmin. Los demás encuentran a una persona escribiendo el nombre en el cuadro de búsqueda. | Todos los usuarios |
| Registro de auditoría: Intervalo de fechas | Opción: Hoy, Últimos 7 días, Últimos 30 días, Últimos 90 días, Intervalo personalizado | Opcional | Límite en la zona horaria del centro. Intervalo personalizado añade una fecha **Desde** y una fecha **Hasta**; la fecha final incluye todo el día. | Últimos 7 días |
| Registro de auditoría: Buscar | Texto | Opcional | Busca coincidencias en el nombre del evento, el texto del detalle, el usuario y el id del caso (número de acceso), sin distinguir mayúsculas de minúsculas. | En blanco |
| Registro de auditoría: Exportar CSV | Botón | No aplicable | Requiere `audit:audit-log:export`. Consulte la guía de verificación. Atenuado sin ella. | No aplicable |
| Registro de auditoría: Marca de tiempo | Columna, `YYYY-MM-DD HH:MM:SS.mmm UTC` | No aplicable | Cuándo se escribió la entrada, siempre en UTC. | No aplicable |
| Registro de auditoría: Tipo | Columna | No aplicable | IA, Usuario o Sistema. | No aplicable |
| Registro de auditoría: Evento | Columna | No aplicable | El nombre del evento, seguido de una etiqueta de referencia de soporte. | No aplicable |
| Registro de auditoría: Detalle | Columna | No aplicable | Texto en inglés, sin nombres de pacientes, fechas de nacimiento, NHC ni valores clínicos. | No aplicable |
| Registro de auditoría: Usuario | Columna | No aplicable | El nombre visible de la persona o del actor del sistema. Las acciones automáticas muestran un actor del sistema como `SYSTEM`. | No aplicable |
| Registro de auditoría: Caso | Columna | No aplicable | El número de acceso cuando la entrada se refiere a un caso. Haga clic en él para abrir el caso. | No aplicable |

La entrada contiene además un valor de confianza (en las entradas de IA), un id de centro y un id de estación de escaneo. Se almacenan y figuran en el contrato del servidor, pero la pantalla no muestra ninguna columna para ellos y el CSV no incluye el centro ni la estación. El id del centro no figura en las entradas registradas antes de que existiera o por código que no lo proporciona.

#### Pestaña Registro de errores

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Registro de errores: botones de gravedad | Opción: Todos, Error, Aviso, Info, con recuentos | Opcional | Filtra por gravedad. | Todos |
| Registro de errores: Estado | Opción: Todos los estados, Solo abiertos, Solo resueltos | Opcional | Filtra por resolución. | Todos los estados |
| Registro de errores: Buscar | Texto | Opcional | Busca coincidencias en el mensaje, el código y el origen. | En blanco |
| Registro de errores: Resolver | Botón en cada fila abierta | No aplicable | Requiere `audit:error:resolve`. Registra quién lo resolvió y cuándo; después la fila muestra "Resuelto por <name>, <time>". | No aplicable |
| Registro de errores: Exportar CSV | Botón | No aplicable | Requiere `audit:error-log:export`. | No aplicable |
| Registro de errores: columnas | Fecha y hora, Gravedad, Código, Mensaje, Origen, Caso, Estado | No aplicable | La columna Código contiene los códigos del [índice](#ch9-error-codes). | No aplicable |

**7. Permisos.**
- Abrir la pantalla: `screen:audit-log:open`. Los roles Admin, Lab Director y QA Reviewer la tienen de forma predeterminada. El rol Pathologist no la tiene de forma predeterminada.
- Exportar: una capacidad por registro, todas de riesgo alto, todas con `screen:audit-log:open` como requisito: `audit:audit-log:export`, `audit:error-log:export`, `audit:interface-log:export`, `audit:qa-log:export` y `audit:billing-log:export`. Los roles que abren la pantalla vienen con las cinco. Cada exportación se audita.
- Resolver un error: `audit:error:resolve` (riesgo alto).
- Pestaña Enlaces de consulta: `audit:consult-links:view`. Trabajos del servidor: `jobs:server-job:view`, y la nueva puesta en cola con `jobs:server-job:requeue`.
- Alcance en pantalla: los patólogos ven todas las entradas que nombran un caso, además de sus propias entradas sin caso. Los eventos de estudios de validación (`validation_study_created`, `validation_study_activated`, `validation_study_closed`, `validation_study_deleted`, `validation_report_generated` y los tres eventos `validation_routing_rule_*`) se ocultan a todos salvo a Admin, Pathologist-Admin y Superadmin.
- Ver el registro no se audita. Se auditan las exportaciones, la resolución de un error y una consulta de referencia de soporte.

**Límites conocidos.**
- **Sin evidencia de manipulación en el registro de auditoría principal.** El registro de auditoría principal es de solo adición por diseño (el servicio no tiene ninguna llamada de actualización ni de eliminación y el contrato del servidor no da al inicio de sesión de base de datos de la aplicación ese permiso), pero sus entradas no están encadenadas por hash y nada en pantalla las verifica. El único registro encadenado por hash es la auditoría de [Acceso de soporte](#screen-support_access). Consulte la guía de verificación.
- **La conservación es un ajuste, no se aplica.** El periodo de conservación del registro se fija en [Conservación de datos](#screen-retention). Ninguna tarea de purga lo lee todavía (PS-345), por lo que hoy no se elimina nada por su causa.
- **El `detail` de la auditoría está en inglés por diseño.** Es un artefacto de cumplimiento, no texto de la interfaz. Los títulos de las columnas, los filtros y los botones están traducidos; el texto del detalle y el archivo exportado no.
- **Versión de demostración.** Sin un servidor de API, el registro de auditoría se almacena en el navegador y empieza con entradas de ejemplo precargadas. La hora y el usuario que actúa proceden del navegador. Con un servidor de API, el servidor establece la hora y el actor a partir del token de inicio de sesión.
- **Sin columna de centro ni de estación** en pantalla ni en el CSV, aunque ambos se registran (consulte más arriba).
## Guía de verificación del registro de auditoría {#ch9-audit-verification}
Breadcrumb: Inicio > Guía del administrador > Apéndices > Guía de verificación del registro de auditoría

**Estado:** Parcial. La grabación, la búsqueda y la exportación están construidas. La evidencia de manipulación del registro de auditoría principal y la purga automática por conservación no están construidas.

**A quién va dirigida.** A un administrador o a un ingeniero de servicios de ForMedrixAI que tenga que mostrar a un auditor o a un inspector qué cambió, quién lo cambió y cuándo. Utiliza solo lo que existe hoy.

### Qué se registra {#ch9-audit-recorded}

Cada entrada de auditoría contiene: un id; una hora (almacenada en UTC); un tipo (**IA**, **Usuario** o **Sistema**); un nombre de evento; una frase de detalle en inglés; el nombre visible del usuario que actúa; el número de acceso de un caso cuando lo hay; una confianza de la IA cuando corresponde; un id de centro cuando lo proporciona el código; y la estación de escaneo en la que se realizó la acción. El id de la estación se añade automáticamente a cada entrada que escribe el servicio de auditoría.

Lo que llega al registro:

- **Cada comprobación de una capacidad de riesgo alto**, permitida o rechazada. El evento es **Capability allowed** o **Capability refused**. El detalle nombra la clave de la capacidad, los roles que la concedieron o el motivo por el que se rechazó, el rol de sesión de la persona y el centro. El catálogo de capacidades marca qué capacidades son de riesgo alto. El guardado de una pantalla de configuración es una de estas comprobaciones.
- **Cambios de roles y de personal.** **Role capabilities changed** enumera lo que se concedió y se retiró a un rol. **Staff access changed** registra un cambio en los roles, los centros, el acceso pediátrico, el acceso de orquestación o el acceso de control de calidad entre inquilinos de una persona, cada uno con su valor anterior y el nuevo. **Staff credentials changed** registra las ediciones de credenciales.
- **Eventos de inicio de sesión.** **Signed in**, **Sign-in failed** (intento n de 5), **Sign-in locked**, **Sign-in refused**, **SSO account linked**, **SSO account unlinked** y **SSO sign-in refused**. El registro nunca guarda lo que se escribió.
- **Eventos de cambio con nombre para algunos ajustes.** Por ejemplo `AI_VENDOR_POLICY_CHANGED`, `CLINICAL_MISMATCH_RULE_CHANGED`, `AI_PROMPT_EDITED`, `AI_PROMPT_APPROVED`, `FEEDBACK_SETTINGS_CHANGED`, `RECALL_SETTINGS_CHANGED`, `QA_TREND_POLICY_CHANGED`, `CODE_SYSTEM_POLICY_CHANGED`, `PEER_REVIEW_GATE_CHANGED`, **Template review settings changed**, **Organ map colours changed**, **Signing-authority country profile changed** y los cuatro eventos **Signing-authority facility override** (añadido, cambiado, eliminado, justificación actualizada). Los eventos de excepción por centro llevan cada indicador cambiado con su valor anterior y el nuevo, y la justificación del administrador o "Justification: none given".
- **Comandos de voz.** **Voice command executed** y **Voice command refused**. El detalle indica el identificador de la acción y la pantalla, por ejemplo `Voice command executed: action TABLE_DELETE on screen WORKLIST; confirmed by repeating the phrase`; una denegación indica el motivo (no disponible en esta pantalla, frase no repetida para confirmar o no repetida a tiempo). La persona es el usuario que actúa. El registro nunca guarda lo que se dijo y ninguna entrada nombra un caso.
- **Impresiones y exportaciones.** `DOCUMENT_PRINTED`, `DOCUMENT_REPRINTED`, `DOCUMENT_RENDERED`, `DOCUMENT_EXPORTED`, `DOCUMENT_FAXED`: quién, el número de acceso, el destino, el estado y, en una exportación, el número de filas.
- **Eventos de casos**, como la generación del sinóptico, las actualizaciones de campos, la validación final, la selección de protocolo, la detección y la corrección de desviaciones, las correcciones de facturación y la gestión de pacientes (`mpi.*`).
- **Acciones automáticas** bajo un actor del sistema.

Dos límites importan al leer el registro.

1. Una entrada de capacidad muestra que una persona utilizó una capacidad y si estaba permitido. En la mayoría de los ajustes **no** muestra los valores anterior y nuevo. Solo los eventos citados arriba, y algunos más, llevan el cambio en sí.
2. Un cambio realizado mientras una sesión de Superadmin actúa en otra organización también se escribe en el registro de [Acceso de soporte](#screen-support_access) de esa organización.

**El texto del detalle está en inglés por diseño.** Los registros de auditoría son artefactos de cumplimiento, no texto de la interfaz, por lo que el detalle sigue en inglés literal en todos los idiomas del producto y en la exportación. Busque con el nombre del evento en inglés o con la clave de la capacidad.

### Cómo encontrar un cambio en un ajuste {#ch9-audit-find-setting}

1. Abra [Registros del sistema](#screen-audit-log), pestaña **Registro de auditoría**.
2. Establezca el **Intervalo de fechas**. El valor predeterminado es **Últimos 7 días**; elija **Intervalo personalizado** para un cambio más antiguo. Las entradas fuera del intervalo están ocultas, no han desaparecido.
3. En **Buscar**, escriba la clave de la capacidad de la pantalla que está comprobando. La capacidad de cambio de cada pantalla de Configuración figura en su parte **Permisos** en esta guía (por ejemplo `config:retention-policy:manage` para [Conservación de datos](#screen-retention)). La búsqueda coincide con el texto del detalle, por lo que encuentra las entradas **Capability allowed**.
4. Lea las columnas **Usuario** y **Marca de tiempo** para saber quién y cuándo. El detalle nombra el rol que concedió la capacidad.
5. Si la pantalla tiene un evento de cambio con nombre (consulte la lista anterior), busque también el nombre de ese evento. Contiene el cambio en sí, no solo la comprobación del permiso.
6. Para excluir el ruido, utilice los botones de **Tipo** (**Usuario** muestra las acciones humanas).
7. Para ver solo los rechazos, busque `Capability refused`.

Una entrada que dice **Capability allowed** muestra que la persona tenía permiso para realizar el cambio y que se intentó el cambio. Por sí sola no demuestra qué valor se guardó. Para un ajuste sin evento de cambio propio, compare con el valor actual de la pantalla y, si el laboratorio conserva una, con una exportación de la configuración (consulte **Exportar** más abajo).

### Cómo comprobar quién cambió un permiso {#ch9-audit-find-permission}

1. En la pestaña **Registro de auditoría**, busque `Role capabilities changed`. Cada entrada dice `Role "<name>": granted <keys>; removed <keys>.` La columna **Usuario** es la persona que guardó el rol.
2. Para ver a quién se le asignó o se le retiró un rol, busque `Staff access changed`. El detalle enumera cada cambio con su valor anterior y el nuevo (roles, centros, acceso pediátrico, acceso de orquestación, acceso de control de calidad entre inquilinos).
3. Para ver las ediciones de credenciales, busque `Staff credentials changed`.
4. Para ver si una persona usó realmente un permiso, busque la clave de la capacidad y lea las entradas **Capability allowed** y **Capability refused**.
5. Para enumerar quién puede hacer algo hoy, utilice [Roles](#screen-staff-roles) y [Miembros](#screen-staff-members); el registro muestra el historial y esas pantallas muestran el estado actual.
6. Para un rol que el hospital no puede cambiar: un cambio en el rol Superadmin se rechaza en un hospital, por lo que ninguna entrada mostrará uno. Superadmin lo tiene el personal de soporte de ForMedrixAI y se concede fuera del directorio de personal del hospital.

Un guardado de rol también se rechaza, antes de escribir nada, si no dejara ningún rol capaz de gestionar roles, rompiera un par de separación de funciones o concediera una capacidad sin la que requiere. Un guardado rechazado no escribe ninguna entrada **Role capabilities changed**.

### Cómo funcionan la integridad y la conservación del registro {#ch9-audit-integrity}

**Solo de adición.** El servicio de auditoría no tiene ninguna llamada para actualizar o eliminar una entrada; solo puede escribir entradas nuevas y leerlas. El contrato del servidor (`STAFF_ADMIN_API.md` sección 1; `AUTHORIZATION_API.md`) exige que la tabla de auditoría sea de solo adición: no existe ninguna llamada de actualización ni de eliminación y el inicio de sesión de base de datos de la aplicación no tiene ese permiso. Un error resuelto es el único cambio permitido en un registro, y se anota como quién y cuándo en la entrada del error, no como una sobrescritura del mensaje.

**Quién establece la hora y el actor.** Con el servidor de API, el servidor establece la hora y el usuario que actúa a partir del token portador. El navegador solo envía el evento, por lo que un usuario no puede elegir el nombre que aparece. En la versión de demostración lo hace el navegador.

**Ids únicos.** Cada entrada recibe un id único. También se espera que la tabla del servidor haga cumplir la unicidad.

**Evidencia de manipulación: el registro de auditoría principal no tiene ninguna.** El registro de auditoría principal **no** está encadenado por hash ni firmado. Nada en la pantalla Registros del sistema demuestra que una entrada no haya sido alterada por alguien con acceso directo a la base de datos, y no hay ningún botón de "verificar" para ello. La integridad se apoya en la regla de solo adición anterior y en los permisos de la base de datos. El único registro encadenado por hash es la auditoría de [Acceso de soporte](#screen-support_access) (consulte más abajo). Si su auditor exige evidencia criptográfica de manipulación para el registro principal, indíqueselo a ForMedrixAI: no está construida.

**Conservación.** El periodo de conservación del registro de auditoría es un ajuste de [Conservación de datos](#screen-retention): el campo **Registros de auditoría**, en días, de 90 a 3650, 365 de forma predeterminada. La pantalla indica que un cambio "takes effect at next purge cycle". **Ninguna tarea de purga lee todavía este ajuste (PS-345)**, por lo que hoy no se elimina nada por su causa. Considere el número como una política registrada, no como una política aplicada. El registro de cada exportación (quién, qué, cuándo, número de filas y hash del archivo) se conserva con el periodo de conservación del registro de auditoría.

**Las exportaciones son copias de trabajo.** El CSV exportado es una copia de lo que había en pantalla. El registro de la exportación es la entrada de auditoría.

### Cómo exportar {#ch9-audit-export}

1. En la pestaña que necesite, establezca primero los filtros. La exportación abarca las filas que dejan los filtros, no todo el registro.
2. Elija **Exportar CSV**. El botón está atenuado, con una ayuda emergente que nombra la capacidad, salvo que la persona tenga la capacidad de exportación de esa pestaña (consulte Permisos más arriba).
3. El servicio comprueba la capacidad antes de generar el archivo. Un rechazo no genera nada.
4. Con un servidor de API, la exportación la genera el servidor (consulte [Mis exportaciones](#screen-my-exports)): el archivo es una copia de trabajo que se conserva 7 días de forma predeterminada (de 1 a 30), una persona puede tener 3 exportaciones abiertas y se rechazan las que superan 1.000.000 de filas. En la versión de demostración, el navegador genera y descarga el archivo de inmediato.
5. El nombre del archivo tiene la forma `pathscribe-audit-log-<date>.csv`. Las primeras líneas son una cabecera que nombra el informe, quién lo solicitó, los filtros utilizados y el número de filas. Después vienen las columnas: **ID, Timestamp, Type, Event, Detail, Actioned By, Accession No., AI Confidence**. Las celdas que empiezan por `=`, `+`, `-` o `@` se neutralizan para que una hoja de cálculo no las ejecute como fórmula.
6. Cada exportación escribe una entrada `DOCUMENT_EXPORTED` con la persona, el nombre del archivo, el formato y el número de filas. Busque `DOCUMENT_EXPORTED` para ver quién ha exportado el registro.
7. El CSV no incluye los ids del centro ni de la estación. Si un inspector los necesita, indíquelo a los servicios de ForMedrixAI: el servidor los conserva.
8. Las demás pestañas se exportan igual, cada una con su propia capacidad y sus propias columnas: Registro de errores (ID, Timestamp, Severity, Code, Message, Source, Accession No., Resolved), Garantía de calidad (ID, Group, Date, Case, Specimen, Detail, Status, User), Registro de interfaces y el registro de facturación de Financiero.

### Cómo encaja la auditoría de Acceso de soporte {#ch9-audit-support}

El acceso del soporte de ForMedrixAI a sus datos se registra en su propio flujo, separado del registro de auditoría principal, y pertenece a su organización. Se documenta en [Acceso de soporte](#screen-support_access).

- **Qué registra.** Los cambios de política; las solicitudes, aprobaciones, rechazos, caducidades, finalizaciones anticipadas y revocaciones; las aperturas rechazadas; las aperturas y ediciones de casos; cada lista, búsqueda o informe que reveló sus casos (con los ids de los casos); los nombres, nunca los valores, de los criterios de búsqueda; y las exportaciones de esta auditoría. Las exportaciones y los cambios de configuración del propio agente de soporte también se registran aquí (como `supportExport` y `supportConfigChange`), además de en el registro de auditoría principal.
- **Las entradas nunca se eliminan.** Cada entrada contiene un número de secuencia, la hora, el actor, la incidencia, la acción, los ids de los casos y un detalle en inglés sin datos de pacientes.
- **Está encadenado por hash.** Cada entrada lleva un SHA-256 de sus campos y del hash de la entrada anterior, empezando por 64 ceros. Una entrada cambiada, eliminada o reordenada rompe la cadena. La pantalla indica **Record intact (N entries)** o **Record altered at entry N**, y la exportación JSON lleva la comprobación de la cadena.
- **Para verificarlo.** Abra Acceso de soporte, lea la línea de la cadena del panel de auditoría y exporte JSON para una comprobación independiente. Necesita `config:support-audit:view`.
- **Formatos de exportación.** CSV, JSON y PDF, con las columnas Timestamp, Support agent name, Originating IP, Originating country, Ticket ID, Action taken, Case IDs, Detail.
- **Límites.** La IP y el país de origen solo puede registrarlos con veracidad el servidor a partir de la solicitud, por lo que la versión de demostración los deja vacíos. El almacenamiento aislado por inquilino en su propia tabla de solo adición es trabajo del servidor (PS-358).

Este es el único registro del producto con evidencia de manipulación integrada. Cubre solo el acceso de soporte, no el registro de auditoría principal.

### Una rutina breve de verificación {#ch9-audit-routine}

Para una revisión rutinaria de un periodo de muestra, siga estos pasos.

1. Establezca el intervalo de fechas del **Registro de auditoría** en el periodo. Anote el recuento del pie ("Mostrando N de M eventos").
2. Busque `Role capabilities changed`, `Staff access changed` y `Capability refused` y lea cada entrada.
3. Busque `Sign-in locked` y `Sign-in refused` para ver problemas de inicio de sesión.
4. Busque `DOCUMENT_EXPORTED` para ver quién ha sacado datos.
5. Abra la pestaña **Registro de errores**, filtre por **Solo abiertos** y compruebe que no queda sin resolver nada importante.
6. Abra [Acceso de soporte](#screen-support_access) y confirme que la línea de la cadena indica que está íntegra; lea las entradas del periodo.
7. Exporte el CSV del Registro de auditoría del periodo y conserve el archivo con sus notas de revisión. La propia exportación queda registrada.
8. Busque `Manual Entry` para ver los identificadores escritos en lugar de escaneados (Batch 759). Cada entrada indica el módulo, lo escrito, el usuario y el puesto, y enlaza con el caso. Muchas entradas en un mismo puesto pueden indicar un escáner averiado o etiquetas dañadas.
