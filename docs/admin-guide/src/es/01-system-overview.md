---
chapter: 1
id: ch1
title: Descripción general y arquitectura del sistema
---

# Descripción general y arquitectura del sistema {#ch1}

Este capítulo está dirigido al administrador o al ingeniero que planifica una implantación de PathScribe. Indica cuáles son las partes de PathScribe, cómo circulan los datos entre ellas, qué debe aportar un centro y cuáles son los controles de seguridad. Describe lo que el producto hace hoy. Todo lo que no está construido se etiqueta como **Planificado** o **No construido**, y el capítulo indica dónde está la función operativa más cercana.

## Cómo utilizar esta guía {#ch1-how-to-use}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Cómo utilizar esta guía

**Estado:** Construido (esta guía y el botón Ayuda de la aplicación).

**Los capítulos siguen el orden de configuración.** El capítulo 2 trata el nivel 1, el capítulo 3 trata el nivel 2, y así hasta el capítulo 8, que trata el nivel 7. El capítulo N documenta el nivel N-1. Si configura un centro desde el primer capítulo hasta el último, cada pantalla a la que llegue tendrá ya configuradas las pantallas de las que depende. El capítulo 9 contiene los apéndices (referencia del registro de auditoría y glosario).

**Cada pantalla tiene un cuadro de secuencia de configuración.** Cada pantalla de mantenimiento de esta guía incluye tres líneas:

- **Paso de configuración:** el lugar de la pantalla en el orden, por ejemplo «Nivel 2, paso 6». Una pantalla que es un registro, una cola o un panel de uso diario indica «Referencia, no forma parte de la configuración».
- **Requiere:** las pantallas que deben configurarse antes. Cada una es un enlace. La guía indica también qué ocurre si se omite (una lista desplegable vacía o un guardado rechazado).
- **Habilita:** lo que la pantalla hace posible una vez configurada.

**La página maestra del orden de configuración.** [Orden de configuración](setup-sequence.html) (`setup-sequence.html`) enumera todas las pantallas en el orden en que debe configurarlas, generado a partir de esas tres líneas. Utilícela como lista de comprobación para un centro nuevo.

**El botón Ayuda.** **Construido.** Un botón **Ayuda** situado en la parte superior derecha de cada pantalla de Configuración abre esta guía en la sección propia de esa pantalla, en una ventana separada que recuerda su posición (una pestaña nueva si el navegador rechaza una ventana), de modo que no se pierden las ediciones sin guardar. Sigue la pestaña y la sección de la barra lateral que estén abiertas: en el Diccionario de roles de la pestaña Personal abre la sección [Diccionario de roles](#screen-staff-roles), y en **Sistema > Departamentos** abre [Departamentos](#screen-departments). La pantalla Trabajos de migración tiene uno bajo su título. El botón abre `go.html#<screen id>`, donde `<screen id>` es el identificador de la pantalla en esta guía (por ejemplo `screen-departments`); `go.html` lo genera la compilación de la guía y localiza la página del capítulo correcto. Las pantallas fuera de Configuración que tienen una sección en esta guía (el Registro de auditoría, la Gestión de lotes, la Entrega en Lockbox y otras) se abren con un botón de libro abierto en la barra superior, junto al micrófono. Una prueba falla si una pestaña o sección de Configuración no tiene sección en esta guía, de modo que una pantalla nueva no puede publicarse sin documentar.

**Palabras de estado.** Cada pantalla y cada parte de este capítulo utiliza una de cinco palabras fijas:

| Estado | Significado |
|---|---|
| **Construido** | Funciona con los datos de demostración y tiene un contrato de servicio escrito (`docs/architecture/*_API.md`) para el servidor de producción. |
| **Demostración** | Funciona con los datos de demostración, solo en el navegador. La parte de servidor de producción todavía no está conectada. |
| **Parcial** | Parte de lo que indica el título está construida. La sección enumera exactamente qué parte. |
| **Planificado** | No está construido. Un párrafo breve indica qué se pretende y qué se sabe sobre los plazos. |
| **No construido** | Solicitado, pero no existe pantalla ni contrato. La sección lo indica en una frase y nombra lo más cercano que sí existe. |

Lea «Construido» con atención. Significa que la parte del navegador funciona y que el contrato para el servidor está escrito. No significa que el servidor de producción exista. La siguiente parte de este capítulo indica cuál es hoy el estado del servidor de producción.

**FORMEDRIXAI INTERNAL ONLY.** Algunos ajustes solo pueden ser modificados por los ingenieros de implantación o de servicio de ForMedrixAI. Son las capacidades del dominio `platform:`, o cualquier capacidad marcada `platformOnly`, y las pantallas que solo se muestran a ese personal. En esta guía su título empieza por `[FORMEDRIXAI INTERNAL ONLY]` y la sección se abre con un aviso enmarcado que indica quién puede modificar el ajuste y por qué está restringido. La edición de la guía para clientes omite esas secciones. La edición interna las conserva. Si usted es administrador de un cliente y no ve un ajuste que menciona un ingeniero de ForMedrixAI, probablemente es uno de estos.

## Resumen ejecutivo {#ch1-executive-summary}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Resumen ejecutivo

**Estado:** Parcial. La aplicación del navegador está construida. El servidor de API de producción, el esquema de la base de datos y los servicios permanentes están especificados en contratos escritos y todavía no están construidos (consulte [El estado del producto hoy](#ch1-current-state)).

PathScribe es un sistema de información del laboratorio (LIS) y de informes de anatomía patológica clínica asistido por IA, de ForMedrixAI LLC. Está diseñado para Estados Unidos, el Reino Unido, la UE y otros mercados, y sus pantallas están traducidas a seis idiomas (inglés, francés, alemán, neerlandés, coreano y español; las traducciones distintas del inglés todavía requieren la revisión de hablantes nativos antes del uso clínico).

Un caso se tramita en uno de dos modos, que se decide por caso:

- **CoPilot.** PathScribe es una capa de captura de datos sinópticos sobre un LIS anfitrión. El LIS anfitrión es propietario del caso y del informe final, y PathScribe le devuelve los datos sinópticos estructurados.
- **Orquestación.** PathScribe es propietario del caso de principio a fin como un LIS ligero, incluido el texto narrativo asistido por IA. Se utiliza para los casos de colaboración externa que no tienen un LIS anfitrión.

Lo que controla un administrador es la configuración: el personal y los roles, los diccionarios y las tablas de consulta, las reglas del flujo de trabajo, el comportamiento de la IA, las plantillas de informe, las interfaces y las reglas de facturación. Los capítulos siguientes documentan esas pantallas en el orden en que se configura un centro.

Tres hechos importan para la planificación:

1. **La base de datos de producción es Microsoft SQL Server**, a la que se accede mediante un servidor de API de PathScribe construido sobre ASP.NET Core, con actualizaciones en directo mediante SignalR. PathScribe no utiliza Firebase como base de datos de producción. Algunos archivos de Firebase permanecen en el repositorio de trabajos anteriores y se van a sustituir.
2. **El alojamiento lo elige el cliente o ForMedrixAI.** El diseño utiliza componentes estándar (contenedores, SQL Server, certificados TLS) y no depende de un único proveedor de nube. Un centro puede utilizar una nube pública, una nube privada o soberana, o su propio centro de datos.
3. **PathScribe todavía no puede implantarse en producción.** La aplicación del navegador está lo bastante completa para hacer demostraciones y para probarla frente a los contratos. El servidor que almacenaría datos reales de pacientes no está construido. Planifique una primera implantación como un proyecto conjunto con ForMedrixAI, no como una instalación.

## Plano de la arquitectura {#ch1-architecture}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Plano de la arquitectura

**Estado:** Parcial. Cada parte siguiente indica su propio estado.

### Las partes {#ch1-parts}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Plano de la arquitectura > Las partes

| Parte | Qué es | Estado |
|---|---|---|
| **Aplicación del navegador** | Una aplicación de una sola página en React y TypeScript, servida como archivos estáticos. No contiene claves y, cuando hay un servidor de API configurado, no escribe datos de pacientes en el almacenamiento del navegador. Una sola compilación sirve a todos los centros: los ajustes de cada centro proceden de un archivo `config.json` situado junto a `index.html`. | Construido |
| **Servidor de API de PathScribe** | ASP.NET Core. Aplica los permisos, mantiene la sesión iniciada, ejecuta las transacciones de la base de datos y los trabajos programados, y llama a los proveedores de IA, al generador de informes y al motor de interfaces. | Planificado. Los contratos están escritos en `docs/architecture/*_API.md`. No hay código de servidor en el repositorio. |
| **Concentrador de actualizaciones en directo** | Un concentrador SignalR en el servidor de API, en `/hubs/live`. Avisa a las pantallas abiertas de que algo ha cambiado, usando solo identificadores y nunca texto de pacientes. | Planificado. La parte del navegador está construida y probada con un concentrador de prueba. |
| **Base de datos** | Microsoft SQL Server. | Planificado. No hay esquema ni scripts en el repositorio. |
| **Motor de interfaces** | BridgeLink, una bifurcación de código abierto de Mirth Connect (un servidor Java). PathScribe le entrega un mensaje JSON; el motor construye y envía el HL7 y recibe las respuestas. | Parcial. El contrato de mensajes está escrito. El motor todavía no está implantado ni conectado, y la versión de demostración utiliza un motor simulado. |
| **Proxy de IA y proveedores de IA** | El servidor de API reenvía las solicitudes de IA al proveedor configurado y añade la clave del proveedor, que el navegador nunca posee. | Parcial. La parte del navegador y la comprobación de proveedores por jurisdicción están construidas. Las rutas del servidor están Planificadas. |
| **Generador de informes** | Un servicio que convierte un informe liberado en un PDF, mediante Chromium sin interfaz gráfica controlado por Playwright. | Planificado. Solo existe un sustituto de desarrollo. |
| **Agente del centro** | Un servicio de Windows instalado en cada centro. Se conecta hacia el exterior mediante HTTPS, imprime informes y etiquetas en impresoras de red y escribe archivos en recursos compartidos de Windows. | Parcial. Las pantallas de administración y el contrato están construidos. El agente en sí está Planificado. |
| **Puentes de impresión de la estación de trabajo** | QZ Tray o el agente de estación de trabajo de PathScribe, que se ejecuta en un ordenador del puesto de trabajo para imprimir etiquetas en la impresora contigua. | QZ Tray: Construido (las etiquetas se imprimen a través de él). Agente de estación de trabajo: Construido (parte del navegador). |
| **Visores de imagen de preparación completa (WSI)** | La propia aplicación visora del proveedor (por ejemplo Leica, Roche o Hamamatsu). PathScribe hace el seguimiento de los lotes de escaneado y abre el visor del proveedor en una pestaña nueva del navegador para la preparación correcta. Nunca dibuja las imágenes de las preparaciones. | Construido (enlace de apertura). Las actualizaciones del estado de los lotes de escaneado requieren el concentrador. |

### Cómo circulan los datos {#ch1-data-flow}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Plano de la arquitectura > Cómo circulan los datos

```
 Hospital or lab network                         PathScribe hosting (cloud or on-premises)
 -----------------------                         ----------------------------------------
 Bench workstation                               Static web host (browser app, config.json)
   Browser app  --- https ---------------------> PathScribe API server (ASP.NET Core)
     |   ^                                         |        |         |          |
     |   +---- wss /hubs/live (SignalR) <----------+        |         |          |
     |                                                      |         |          |
     +-- QZ Tray / workstation agent (localhost)            v         v          v
         labels to the printer beside it                SQL Server   AI proxy   Report renderer
                                                         (database)    |        (Chromium PDF)
 Site agent (Windows service) --- https, outward ------>     |         v
   report and label printers, Windows shares                 |    AI vendors (per jurisdiction policy)
                                                             |
 Interface engine (BridgeLink) <---- JSON ---- API server ---+
   HL7 to and from the host LIS, EMR, instruments
   (hosted by ForMedrixAI, or installed at the hospital)
```

Cómo leerlo:

1. **Del navegador al servidor de API.** Cada acción pasa por el servidor de API con la identidad del usuario que ha iniciado sesión. Las comprobaciones de permisos del propio navegador solo ocultan botones; el servidor decide. El servidor devuelve códigos de error fijos (`NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`) y nunca devuelve texto que pueda nombrar a un paciente. Los nombres y los identificadores de los pacientes viajan en el cuerpo de una solicitud, nunca en una dirección web.
2. **Del servidor de API al concentrador y a los navegadores.** Después de confirmarse un cambio en la base de datos, el servidor escribe un evento en una tabla de salida en la misma transacción. A continuación, un distribuidor lo publica a través del concentrador. El evento lleva solo identificadores. Una pantalla que lo recibe vuelve a leer los datos mediante la llamada normal, con comprobación de permisos. Las primeras pantallas que lo utilizan son el Panel en directo del quirófano y la Cola intraoperatoria; el objetivo de diseño es que transcurran menos de 500 milisegundos desde la confirmación hasta el segundo panel. Sin concentrador, las mismas pantallas consultan periódicamente (cada 15 segundos en las pantallas intraoperatorias).
3. **Del servidor de API a la IA.** El navegador llama a `/api/ai/...` en su propio origen. El servidor añade la clave del proveedor, comprueba la política de proveedores y regiones de la jurisdicción, reenvía la solicitud y escribe un registro de auditoría que no contiene texto de la consulta.
4. **Del servidor de API al motor de interfaces.** El servidor de API envía un sobre JSON con un tipo de transacción (en `INTERFACE_TRANSACTIONS.md` figuran 15 tipos salientes). El motor lo convierte a HL7 y lo envía. PathScribe nunca construye por sí mismo el HL7 que sale a la red. El tráfico HL7 permanece en el almacén de mensajes propio del motor, no en el bus de mensajes de PathScribe.
5. **Del servidor de API al agente del centro.** El agente del centro es la única forma en que un servidor alojado en la nube llega a una impresora o a un recurso compartido dentro del hospital. Se conecta hacia el servidor mediante HTTPS con un certificado de cliente, de modo que no hace falta abrir ningún puerto de entrada en el cortafuegos.
6. **Informes.** El servidor genera cada PDF que sale de PathScribe, almacena un documento inmutable y con huella digital por cada liberación y envía ese mismo documento por todos los canales. El navegador muestra una vista previa construida para coincidir con lo que se envía.

### Alojamiento y escala {#ch1-hosting}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Plano de la arquitectura > Alojamiento y escala

**Estado:** Planificado. Este es el diseño de `DEPLOYMENT_READINESS_REVIEW.md`; nada de ello se ha implantado.

- **Dos formas admitidas de alojamiento.** Una nube pública, con la base de datos administrada y el alojamiento de contenedores del proveedor cuando proceda. O un paquete portátil: los mismos contenedores en Kubernetes o Docker en una nube privada, una nube soberana o el propio centro de datos del hospital. El paquete se valida una sola vez, y cada ubicación de alojamiento recibe después una lista de comprobación de cualificación de la instalación.
- **Partes permanentes.** La API (al menos una instancia activa), la base de datos (nunca en pausa automática en producción), el concentrador de actualizaciones en directo, el generador de informes y el motor de interfaces que mantiene las conexiones HL7. Reducir a cero no es compatible con una actualización de pantalla de un segundo ni con los casos URGENTES (STAT) por la noche. Los trabajos recurrentes (reintentos, temporizadores de liberación, comprobaciones de caducidad) pueden ejecutarse como tareas programadas breves.
- **Escalado del concentrador.** El SaaS compartido utiliza Azure SignalR Service. La nube privada y las instalaciones propias utilizan un backplane de Redis, o una sola instancia. Sin Azure SignalR Service, el equilibrador de carga necesita sesiones persistentes y WebSockets habilitados con un tiempo de inactividad superior a 15 segundos. El equipo de desarrollo todavía debe confirmar esta matriz.
- **El motor de interfaces funciona de ambas formas** (decidido el 13 de oct. de 2026): alojado por ForMedrixAI en la región del inquilino (tenant), o instalado en el hospital, a partir de la misma imagen de contenedor.
- **Una compilación, muchos centros.** `npm run build:server` genera la compilación para producción. No contiene cuentas de demostración ni herramientas de demostración. Las direcciones y los ajustes de inicio de sesión de cada centro se incluyen en su `config.json` (37 ajustes, enumerados en `RUNTIME_SETTINGS`), que se sirve con `Cache-Control: no-store`. PathScribe se niega a iniciarse, e indica los ajustes incorrectos, si el archivo incumple una regla (por ejemplo, una dirección que no es `https://`).
- **Cabeceras de seguridad del navegador.** La Content-Security-Policy, HSTS y las demás cabeceras se generan para nginx, IIS y Azure App Service, Azure Static Web Apps, Azure Front Door, o una lista simple, a partir de una sola definición en `deploy/security-headers/`. Después de cambiar una dirección en `config.json`, ejecute de nuevo el generador para que se permita la nueva dirección.
- **Los cambios de esquema** son scripts SQL con versión que aplica la canalización de versiones, nunca al iniciarse la aplicación, y cada cambio deja la base de datos utilizable por la versión anterior.

## El estado del producto hoy {#ch1-current-state}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > El estado del producto hoy

**Estado:** Demostración en casi todas las pantallas de datos; consulte la tabla siguiente para las excepciones.

Lea esta parte antes de prometer una fecha de puesta en marcha a un cliente. Se comprobó con el repositorio el 21 de oct. de 2026.

**Lo que funciona hoy.** La aplicación del navegador funciona con **servicios de demostración que residen en el navegador**. Unas 170 carpetas de servicio de `src/services/` siguen un mismo patrón: una interfaz, una versión de demostración que guarda sus datos en el navegador y (en casi todos los casos) una versión de servidor que llama a la API. La aplicación elige la versión de servidor cuando `VITE_API_BASE_URL` está definido en `config.json`, y la versión de demostración en caso contrario. Cuando hay un servidor de API configurado, los datos de demostración se mantienen en memoria y no se escriben en el almacenamiento del navegador.

**Lo que está conectado a una API de producción.** Nada. Las versiones de servidor existen en el código del navegador y tienen pruebas con servidor simulado que comprueban cada ruta, pero el servidor de API que respondería a ellas no está en el repositorio y no se ha construido (el trabajo está asignado al equipo de la India, a partir de los contratos). No se ha probado nada con un servidor real. Hay versiones de servidor escritas en el código del navegador para todos los servicios salvo tres:

| Servicio sin versión de servidor todavía | Motivo |
|---|---|
| Registro de acciones (coincidencia de comandos de voz y de teclas rápidas) | Es síncrono y está en memoria. Solo sus ajustes guardados irían al servidor, mediante el servicio de configuración. |
| Servicio de instrucciones de IA | Sus reglas se ejecutan en el navegador sobre un almacenamiento inyectado; el almacenamiento pasa por los servicios de configuración y de auditoría. |
| Servicio del diccionario de interfaz | Igual: las reglas se ejecutan en el navegador. El almacenamiento pasa por los servicios de configuración y de auditoría. |

Las actualizaciones en directo ya utilizan SignalR en el navegador (`signalRLiveUpdateService.ts`), pero el concentrador no está construido.

**Lo que impide una implantación en producción** (según la revisión de preparación, estado en el lote 641):

| Impedimento | Estado |
|---|---|
| Servidor de API y esquema de SQL Server | Abierto. No iniciado. |
| Almacenamiento de blobs para los PDF de informes, las exportaciones y las liberaciones retenidas | Contrato escrito. Almacenamiento y puntos de conexión abiertos. |
| Trabajos programados en el servidor (unos diez temporizadores) | Abierto. Hasta que cada trabajo se traslade, el navegador lo ejecuta mientras alguien tenga la sesión iniciada. `VITE_SERVER_JOBS` entrega un trabajo al servidor por su nombre. |
| Servicio generador de informes | Plantilla de citología terminada. El servicio alojado está abierto. |
| Inicio de sesión a través del servidor (backend-for-frontend), configuración del proveedor de identidad en tiempo de ejecución | Configuración en tiempo de ejecución terminada. La parte del servidor está abierta. |
| Motor de interfaces, permanente, con las reglas de borde | Contrato escrito. Alojamiento y puntos de conexión abiertos. |
| Agente del centro | Contrato y pantallas terminados. El agente está abierto. |
| Concentrador y actualizaciones por envío | Parte del navegador terminada. El concentrador está abierto. |
| Retirar las funciones `api/` de Vercel anteriores, los servicios de Firebase y `functions/` | Abierto. Tres pantallas (Monitor de grabadoras, la lista de deficiencias de QA y el historial de seguimiento de materiales) todavía leen servicios respaldados por Firebase. |

Otros puntos abiertos que un administrador debe conocer:

- **Hoy el navegador aplica los permisos, y la aplicación en el servidor no está construida.** Las comprobaciones de capacidades se ejecutan en los servicios del navegador. Un servidor debe repetir cada comprobación antes de que se almacenen datos reales de pacientes. Consulte [Modelo de seguridad](#ch1-security).
- **Todavía no se han realizado pruebas con lectores de pantalla por parte de una persona.** Las comprobaciones automáticas de accesibilidad (reglas A y AA de WCAG 2.1, en Chromium) se superan, pero todavía no ha habido una persona que pruebe con NVDA o VoiceOver (PS-687).
- **Firefox no se ha pasado por la batería automática** en el espacio de trabajo de compilación. Una comprobación manual en Chrome, Edge y Firefox está abierta (PS-718).
- **Las traducciones** al francés, alemán, neerlandés, coreano y español requieren la revisión de hablantes nativos antes del uso clínico.
- **La canalización de integración continua** está escrita, pero solo se ejecutará cuando el repositorio esté en GitHub (previsto para finales de octubre de 2026).
## Requisitos previos del sistema {#ch1-prerequisites}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Requisitos previos del sistema

**Estado:** Parcial. El repositorio contiene los requisitos de software, de red y de navegador. **No contiene cifras de dimensionamiento** para servidores, almacenamiento de la base de datos, ancho de banda, copias de seguridad ni recuperación. Donde esta parte dice «Todavía no especificado», no existe ninguna cifra en el repositorio y aquí no se inventa ninguna; los puntos abiertos están en el archivo de preguntas abiertas del capítulo para que ForMedrixAI los decida antes de que un cliente planifique la capacidad.

### Hardware del servidor y alojamiento {#ch1-prereq-hardware}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Requisitos previos del sistema > Hardware del servidor y alojamiento

| Elemento | Qué dice el repositorio |
|---|---|
| Tamaño del servidor de API (CPU, memoria, número de instancias) | Todavía no especificado. El diseño exige al menos una instancia activa, con la lógica de negocio en bibliotecas de clases y una imagen de contenedor. |
| Tamaño del concentrador (SignalR) y número de conexiones | Todavía no especificado. La prueba de aceptación utiliza al menos 50 paneles conectados. |
| Generador de informes | Un grupo activo de 2 a 4 procesos del navegador Chromium (empiece con 2), un tiempo límite de 5 segundos por informe, un navegador que se recicla tras 500 generaciones, sin salida a la red, un `/dev/shm` mayor y unos 100 MB de fuentes (incluidas las CJK). CPU y memoria por instancia: Todavía no especificado. |
| Motor de interfaces | BridgeLink, un servidor Java de ejecución prolongada, como contenedor. Tamaño: Todavía no especificado. |
| Plataforma de contenedores | Kubernetes o Docker para el paquete portátil; el alojamiento de contenedores del proveedor para una nube pública. Versiones: Todavía no especificado. |
| Intermediario de mensajes | Ninguno. El bus de mensajes son tablas de la base de datos SQL Server, detrás de una interfaz (`IMessageBus`). RabbitMQ o una cola en la nube solo se añadirían si las pruebas de carga muestran que las tablas son un cuello de botella. |
| Herramientas de compilación (para los ingenieros que compilan la parte frontal) | Node.js 24.x (`engines` en `package.json`). No hacen falta en un servidor de producción, que sirve archivos estáticos. |

### Base de datos {#ch1-prereq-database}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Requisitos previos del sistema > Base de datos

**Estado:** Planificado. No hay esquema, scripts ni código de base de datos en el repositorio.

- **Motor.** Microsoft SQL Server. El mismo motor funciona como Azure SQL Database (sin servidor o aprovisionada), SQL Server en una máquina virtual, SQL Server en contenedores Linux (imágenes oficiales de Microsoft para 2017 a 2025; solo hosts Linux x86-64; se requiere una licencia) o AWS RDS for SQL Server.
- **Nunca ponga en pausa automática una base de datos de producción.** Una base de datos en pausa convierte la primera pantalla de la mañana, o un caso URGENTE (STAT) por la noche, en una solicitud fallida. La pausa automática es aceptable solo para los inquilinos (tenants) de prueba y de formación. En Azure SQL sin servidor se desactiva con `-1`.
- **Punto de partida para el tamaño.** La revisión de preparación recomienda un mínimo de 2 núcleos virtuales para un inquilino (tenant) de producción «hasta que las pruebas de carga digan otra cosa». Es una recomendación, no un requisito probado. Almacenamiento, memoria, IOPS y crecimiento por caso: Todavía no especificado.
- **Cambios de esquema.** Scripts con versión que aplica la canalización de versiones antes de que se inicie el contenedor de la API, nunca al iniciarse la aplicación.
- **Copias de seguridad.** La restauración a un momento dado es el diseño para las tablas de auditoría. Calendario de copias de seguridad, conservación, objetivo de tiempo de recuperación y objetivo de punto de recuperación: Todavía no especificado.
- **Nota sobre AWS.** AWS no tiene SQL Server sin servidor, y un cambio de clase de instancia implica una interrupción del servicio (que se acorta con Multi-AZ). Se aplica el coste de la licencia.
- **Almacenamiento de blobs** para los PDF de informes, las exportaciones y las liberaciones retenidas: Azure Blob o un almacén compatible con S3, por inquilino (tenant), privado, cifrado en reposo y en la región de alojamiento del inquilino (contrato: `BLOB_STORAGE_API.md`). PathScribe no almacena imágenes ni archivos adjuntos, solo enlaces al sistema de imagen del laboratorio.

### Red {#ch1-prereq-network}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Requisitos previos del sistema > Red

| Necesidad | Detalle |
|---|---|
| TLS en todas partes | Toda dirección de servidor de `config.json` debe ser `https://`. El `http://` simple solo se permite hacia el mismo ordenador en una compilación de desarrollo, o para una implantación interna que define `"https": false` en su archivo de orígenes de cabeceras de seguridad (que entonces suprime HSTS). |
| Navegador hacia la API y el concentrador | HTTPS hacia el servidor de API. WebSockets (`wss://`) hacia `/hubs/live`. Deje habilitados los Server-Sent Events y el sondeo largo como alternativas, porque algunos proxies de hospital bloquean los WebSockets. Los equilibradores de carga necesitan los WebSockets habilitados y un tiempo de inactividad superior a 15 segundos. |
| Direcciones permitidas | Las direcciones de `config.json` (API, proveedores de identidad, concentrador, generador, receptor de interfaz, puntos de conexión de IA y de terminología, supervisión de errores) pasan a ser la Content-Security-Policy del navegador. Vuelva a ejecutar el generador de cabeceras después de cualquier cambio. |
| Proveedor de identidad | Accesible desde el navegador (y desde el servidor, cuando el servidor se encargue del inicio de sesión). Direcciones de redirección para Microsoft Entra ID: `https://<pathscribe host>/auth/callback/microsoft` y `https://<pathscribe host>/auth/signing/microsoft`. |
| Agente del centro | Solo HTTPS saliente (puerto 443), en su propio nombre de host (por ejemplo `agent.<tenant domain>`) que exige un certificado de cliente. Sin apertura de entrada en el cortafuegos. Un proxy que inspecciona TLS debe dejar pasar ese host sin tocarlo, porque la inspección invalida el certificado de cliente. |
| Alcance del agente del centro (lo define localmente el servicio informático del hospital) | Las subredes de las impresoras, los puertos de las impresoras (por defecto 9100, 515, 631 y 443), las raíces UNC de los recursos compartidos y los hosts desde los que pueden descargarse documentos. PathScribe no puede modificar esta lista. |
| Enlace HL7 | Las peticiones de entrada y los resultados de salida utilizan el motor de interfaces. El enlace se protege con una VPN de sitio a sitio o con MLLP sobre TLS. Un mensaje solo se acusa de recibo cuando se ha almacenado de forma duradera. |
| Dirección saliente fija | Los depósitos de archivos por SFTP necesitan una dirección IP saliente fija para la lista de permitidos del hospital (una pasarela NAT o una salida del cortafuegos) y una clave de host fijada. |
| Fax electrónico y correo electrónico | Una pasarela SMTP en el puerto 587 con autenticación. |
| Ancho de banda y latencia | Todavía no especificado. El objetivo de diseño para una actualización de pantalla general es de 800 ms en el percentil 95 desde la confirmación hasta la presentación; para los paneles de quirófano, menos de 500 ms. La primera carga de página es de 0,70 MB comprimidos (objetivo: 1 MB). |
| Región de alojamiento | Se elige una región por implantación. El `/api/config` del servidor de API puede informar de las regiones de la base de datos y de los blobs, que muestra la pestaña Comportamiento de la IA (consulte [Comportamiento de la IA](#screen-tab-ai)). Ese punto de conexión está Planificado. |

### Estación de trabajo del cliente {#ch1-prereq-workstation}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Requisitos previos del sistema > Estación de trabajo del cliente

**Estado:** Construido, con las comprobaciones abiertas que se indican.

- **Navegadores admitidos** (decidido el 15 de oct. de 2026): Chrome, Microsoft Edge y Firefox en sus versiones actuales. **Safari no es compatible.** Las pruebas automáticas se ejecutan en Chromium (el motor de Chrome y Edge). Firefox se ejecuta solo a petición, todavía no se ha ejecutado en el espacio de trabajo de compilación y hay una comprobación manual en los tres navegadores abierta (PS-718). En Chrome y Edge las listas desplegables se dibujan como paneles con estilo; Firefox muestra su propia lista. El comportamiento es el mismo.
- **Funciones del navegador utilizadas.** WebAssembly (el corrector ortográfico), Web Workers y (cuando la persona los concede) cámara, micrófono y captura de pantalla, para las fotografías de tallado, el dictado y las capturas de pantalla de las solicitudes de mejora. La cabecera Permissions-Policy permite estas funciones solo para PathScribe.
- **Impresión de etiquetas desde un ordenador del puesto de trabajo.** QZ Tray (Construido) o el agente de estación de trabajo de PathScribe (Construido, parte del navegador) deben estar en ejecución en el ordenador. Escuchan solo en el propio ordenador: el agente de estación de trabajo en `wss://127.0.0.1`, puertos 9100 a 9102, y QZ Tray en `localhost`, puertos 8181, 8282, 8383 y 8484. Si la página no puede conectar con QZ Tray, la etiqueta se abre en la ventana de impresión del navegador y un mensaje indica que la impresora de etiquetas no está conectada.
- **Permitir el acceso a la red local.** Chrome y Edge piden permiso a la persona para las direcciones locales. El servicio informático del hospital puede aprobar PathScribe de antemano con la directiva `LocalNetworkAccessAllowedForUrls`.
- **Avisos de QZ Tray.** QZ Tray pregunta «Allow this website to use your printers?» mientras las solicitudes de impresión no se firmen con el certificado del cliente. La firma está **Planificada** (requiere el servidor de API). Hasta entonces, es posible que se pregunte a la persona una vez por estación de trabajo. La decisión (16 de oct. de 2026) es un certificado autofirmado por cliente, que tiene una fecha de caducidad que el servicio informático debe renovar y volver a distribuir; consulte `docs/product/QZ_TRAY_CERTIFICATE_GUIDE.md`. Los pasos para cada herramienta de gestión de dispositivos están marcados «Probar primero» porque no se han ejecutado en un equipo piloto.
- **Impresoras de etiquetas.** Impresoras térmicas que admiten ZPL. A las impresoras de informes de la red se llega mediante el agente del centro. Hoy la impresión de informes en red no funciona desde el navegador.
- **Lectores de pantalla.** Las comprobaciones automáticas de accesibilidad se superan; las pruebas por parte de una persona con NVDA o VoiceOver están abiertas (PS-687).
- **Idiomas.** Inglés, francés, alemán, neerlandés, coreano y español, además de la redacción en neerlandés de Bélgica y en francés de Bélgica.
- **Tamaño del monitor, procesador mínimo y memoria:** Todavía no especificado.
- **Visores de imagen de preparación completa (WSI).** El visor del proveedor debe estar instalado o ser accesible desde la estación de trabajo según lo que exija ese proveedor. PathScribe solo abre el visor en una pestaña nueva, mediante una plantilla de dirección de apertura que usted introduce una vez para cada visor, con el código de barras de la preparación insertado. Se configura en [Integraciones con proveedores](#screen-vendor_integrations). PathScribe no incluye ninguna dirección de visor.

## Modelo de seguridad {#ch1-security}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Modelo de seguridad

**Estado:** Parcial. Casi todos los controles siguientes están construidos en el navegador y tienen un contrato de servidor escrito. El servidor que debe repetir cada comprobación no está construido (consulte [El estado del producto hoy](#ch1-current-state)). Una comprobación en el navegador es una cortesía; la comprobación del servidor es el control. No describa ningún control de esta parte como protección de datos reales de pacientes hasta que exista la parte de servidor.

Esta parte indica qué hace cada control. No dice que utilizarlo haga que un laboratorio cumpla ninguna ley ni norma. Eso lo deciden las políticas, los contratos y el sistema de calidad del propio laboratorio.

### Inicio de sesión único {#ch1-sso}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Modelo de seguridad > Inicio de sesión único

**Estado:** Parcial. OpenID Connect (OIDC): parte del navegador Construida. Parte del servidor Planificada.

- **Protocolo.** OpenID Connect, flujo de código de autorización con PKCE, con la aplicación registrada como cliente público de aplicación de una sola página (sin secreto de cliente). Es genérico, por lo que funciona con Microsoft Entra ID, Okta, Ping y Keycloak. Microsoft Entra ID es el primer objetivo. La autoridad de Entra debe nombrar un inquilino (tenant): `/common`, `/organizations` y `/consumers` se rechazan porque permitirían entrar a cualquier cuenta de Microsoft.
- **El inicio de sesión con Google** no se ofrece, porque el punto de conexión de tokens de Google exige un secreto de cliente. Un hospital que utiliza Google Workspace puede federar Google a través de Entra ID o de Okta.
- **Nadie se crea por iniciar sesión.** Solo pueden iniciar sesión los miembros del personal que ya están dados de alta y activos. La identidad se asocia con un registro de personal mediante el sujeto permanente del proveedor (el `oid` de Entra y, en su defecto, `sub`), nunca solo por el correo electrónico. El primer inicio de sesión puede vincularse por correo electrónico si este es de confianza (verificado, o una autoridad de Entra específica del inquilino); un ajuste puede desactivarlo para que un administrador vincule cada cuenta. Los rechazos (no dado de alta, inactivo, ambiguo, ya vinculado, sin acceso a la aplicación) se muestran con un mensaje claro y se auditan. Consulte [Miembros del personal](#screen-staff-members).
- **Las versiones de demostración** ofrecen también el inicio de sesión con contraseña. Una compilación de producción (`VITE_AUTH_MODE` definido como `sso`) no lleva cuentas de demostración.
- **Tokens.** Hoy el navegador guarda los tokens en `sessionStorage` (solo esta pestaña; desaparecen al cerrarla). **Planificado para producción** (decidido el 3 y el 15 de oct. de 2026): el servidor de API guarda los tokens y el navegador recibe solo una cookie de sesión `HttpOnly`, `Secure`, `SameSite` con una cabecera antifalsificación. El navegador nunca lleva un JWT, y el concentrador utiliza la misma cookie. Esto requiere almacenamiento de sesión compartido (SQL Server o Redis) en el servidor.
- **Registro de la aplicación en Entra ID** (pasos para el servicio informático del hospital, de `AUTHENTICATION_OIDC.md`): un registro de un solo inquilino (tenant) con la plataforma Single-page application y las dos direcciones de redirección indicadas en [Red](#ch1-prereq-network), sin secreto de cliente, la notificación opcional `email` en el token de identidad y un ámbito de API expuesto y concedido a la aplicación.
- **Cuentas y roles desde el directorio.** La sincronización automática de cuentas (SCIM: altas, cambios y bajas) está **Planificada** para la fase de servidor. La asignación de grupos del directorio a roles de PathScribe está **Planificada** para después de la primera versión. Cuando llegue, un grupo solo podrá conceder roles de puesto de trabajo, nunca Administrador, Director del laboratorio, Aprobador de plantillas ni nada con autoridad de firma, y cada asignación necesitará la aprobación de un segundo administrador. Hoy los roles se asignan a mano en [Miembros del personal](#screen-staff-members) y en [Diccionario de roles](#screen-staff-roles).

#### SAML 2.0 {#ch1-saml}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Modelo de seguridad > Inicio de sesión único > SAML 2.0

**Estado:** No construido.

PathScribe no tiene inicio de sesión SAML 2.0, ni biblioteca SAML, ni pantalla SAML. Una búsqueda en todo el repositorio encuentra la palabra solo en dos documentos de diseño. Lo más cercano que funciona es OIDC, descrito arriba. La dirección documentada para el alojamiento SaaS compartido es que los hospitales inicien sesión a través de un intermediario de identidad de PathScribe (Microsoft Entra ID External ID), que habla SAML u OIDC con el directorio del hospital y OIDC simple con PathScribe, de modo que «PathScribe nunca trata con SAML». Ese intermediario está **Planificado** y no está construido. Una implantación en nube privada o dedicada se conecta directamente al Entra ID del propio hospital mediante OIDC. Un hospital que hoy solo puede ofrecer SAML debe decírselo a ForMedrixAI durante la planificación, o federar SAML en Entra ID o en Okta, que a su vez hablan OIDC con PathScribe.

### Control de acceso basado en roles {#ch1-rbac}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Modelo de seguridad > Control de acceso basado en roles

**Estado:** Demostración. Las comprobaciones se ejecutan en los servicios del navegador. La aplicación en el servidor (`AUTHORIZATION_API.md`, fase 4) está **Planificada**.

- **Capacidades.** Todo lo que PathScribe aplica es una capacidad con nombre de la forma `domain:object:verb`, por ejemplo `config:retention-policy:manage`. El catálogo (`capabilityCatalog.ts`) es la única lista y contiene unas 320 capacidades (322 en el momento de redactar esto; el número crece con las versiones). Una capacidad se añade solo junto con su comprobación, y una prueba hace fallar la compilación si una capacidad no tiene comprobación. Cada capacidad tiene un nivel de riesgo. Para una capacidad de **riesgo alto**, cada comprobación en una acción se escribe en el registro de auditoría, permitida o rechazada, y toda exportación es de riesgo alto.
- **Roles.** Un rol es un conjunto de capacidades. Un miembro del personal tiene uno o más roles y una asignación de centros (una asignación vacía significa todos los centros). El ámbito pertenece a la asignación, no al rol. Una comprobación se supera solo cuando un rol que se posee concede la capacidad, también se conceden todas las capacidades que esta requiere y la acción está dentro de los centros de la persona. Un rechazo indica un motivo (no concedida, requisito no concedido, fuera de ámbito, centro desconocido).
- **Roles integrados.** Dieciséis: Patólogo, Residente, Fellow, Ayudante de patólogo, Administrador, Médico, Personal de quirófano, Autor de plantillas, Aprobador de plantillas, Director del laboratorio, Revisor de control de calidad, Técnico de registro, Histotecnólogo, Citotécnico, Técnico de biología molecular y Superadministrador. Médico y Personal de quirófano son entradas del directorio sin acceso a la aplicación. Los valores iniciales siguen el principio de mínimo privilegio: un Patólogo no tiene capacidades de configuración por defecto. Un administrador puede modificar roles y añadir roles en [Diccionario de roles](#screen-staff-roles), salvo Superadministrador.
- **Ningún rol puede eludir los controles.** Superadministrador es un rol al que se conceden capacidades como a cualquier otro, y la comprobación no tiene ningún atajo para él. Administrador tampoco implica nada. Superadministrador posee todas las capacidades excepto `config:ai-prompt:approve` (aprobar las instrucciones de la IA): se le retiene por separación de funciones, de modo que solo el laboratorio (el director del laboratorio) aprueba lo que se le indica a su propia IA, y el soporte de ForMedrixAI nunca lo hace.
- **Superadministrador está reservado al soporte de ForMedrixAI.** Se ejerce solo mediante un inicio de sesión de soporte. Un hospital no puede asignarlo, editarlo ni verlo en el selector de roles del personal, y un registro de personal que lo nombre no obtiene nada de él. El origen en el servidor de esa identidad (el propio inquilino de identidad de ForMedrixAI) está **Planificado**.
- **Capacidades exclusivas de la plataforma.** Seis capacidades del dominio `platform:` solo cuentan si proceden de Superadministrador (consulta de casos entre inquilinos, organismos rectores, reglas de firma y la gestión, la publicación y la simulación del diccionario de interfaz). Un rol de hospital no puede poseerlas. Sus pantallas están marcadas `[FORMEDRIXAI INTERNAL ONLY]` en esta guía.
- **Límite del inquilino (tenant).** Cada usuario y cada caso llevan un `organisationId`. El alcance entre inquilinos se limita al acceso de soporte (véase más abajo). Hoy la aplicación se realiza en el navegador; una capa de consultas en el servidor que la aplique está Planificada.
- **Privacidad de los casos.** Una persona que no puede abrir un caso recibe el mismo mensaje neutro que para un caso que no existe. Un número de registro escrito o pegado no demuestra nada, y un mensaje convierte un número en un enlace solo si quien lo lee puede abrir ese caso. El servidor debe dar la misma respuesta (por ejemplo `404`) para «no existe tal caso» y «usted no puede verlo», sin diferencia en el cuerpo, las cabeceras ni el tiempo de respuesta.
- **Pantallas.** Cada pantalla tiene su propia capacidad `screen:<name>:open`. Inicio y los concentradores de pantallas muestran solo los mosaicos que la persona puede abrir, y la ruta vuelve a comprobarlo.
- **Los comandos de voz y de teclado** no son control de acceso y nunca se utilizan para conceder acceso.
- **Dónde se administra.** [Diccionario de roles](#screen-staff-roles), [Miembros del personal](#screen-staff-members) y la [pestaña Personal](#screen-tab-staff). Los cambios de roles y de capacidades se auditan.

### Autenticación multifactor y reautenticación al firmar {#ch1-mfa}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Modelo de seguridad > Autenticación multifactor y reautenticación al firmar

**Estado:** Parcial. Parte del navegador Construida. El autenticador de las cuentas de demostración es **Simulado**. Parte del servidor Planificada.

- **Usuarios de inicio de sesión único.** El proveedor de identidad solicita el segundo factor. PathScribe lee el token de identidad y acepta la MFA cuando `amr` contiene `mfa`, o nombra métodos de dos familias distintas (conocimiento, posesión, inherencia), o `acr` nombra una clase multifactor. Una contraseña por sí sola no es MFA. Si la organización exige MFA y el token no lo indica, el inicio de sesión se rechaza con un mensaje claro. El proveedor debe estar configurado para enviar estas notificaciones (Entra: una directiva de acceso condicional que exija MFA; Okta: una directiva de autenticación con un factor de posesión; Keycloak: asignar el nivel de autenticación a `acr` y añadir un asignador de `amr`).
- **Política por organización.** En [Seguridad de la sesión](#screen-session_security): a quién se le solicita (a nadie, a los roles que firman informes o a todos; por defecto, a nadie), cuántos minutos pasan antes de que una firma necesite un código nuevo (de 1 a 720, por defecto 30) y cuántas horas pasan antes de que caduque el segundo factor y termine la sesión (de 1 a 72, por defecto 12). Se guarda con `config:session-security:manage` y se audita.
- **Verificación reforzada en una firma.** Cuando el último segundo factor es anterior al tiempo de verificación reforzada, la firma lo vuelve a solicitar: un código nuevo para las sesiones con contraseña, o un inicio de sesión nuevo en el proveedor (`prompt=login`) cuyo token debe volver a afirmar la MFA.
- **Cuentas de demostración.** Un autenticador **Simulado** basado en tiempo (RFC 6238) con códigos de recuperación que se muestran una sola vez. Existe solo en la versión de demostración. Una versión de servidor no tiene factor simulado, de modo que a una persona que no utiliza el inicio de sesión único y a quien se le solicita MFA se le indica que no está disponible y no puede iniciar sesión. El restablecimiento de una inscripción requiere `auth:mfa-enrolment:reset`.
- **Bloqueo.** Cinco códigos fallidos bloquean la comprobación durante 15 minutos. Cinco inicios de sesión con contraseña fallidos bloquean un correo electrónico durante 15 minutos. Hoy estos recuentos se guardan en el navegador; el servidor debe guardarlos. Con el inicio de sesión único, el proveedor aplica su propio bloqueo.
- **Política de autenticación al cerrar sesión** (Construida, Demostración). Por centro ejecutor: una contraseña en cada firma (el valor por defecto, `strict`) o una vez por sesión (`session`, con una duración de 15, 30, 60 o 240 minutos), con un segundo factor opcional. Una sesión termina por tiempo de inactividad, por cierre de sesión o por un cambio de rol. La pantalla advierte de que el modo de una vez por sesión se aparta de lo que 21 CFR Part 11 (11.200(a)(1)) espera para las firmas posteriores, por lo que lo decide el sistema de calidad del cliente.
- **Firma biométrica** (WebAuthn, Touch ID o Windows Hello) es una confirmación opcional. Cada persona inscribe su propio dispositivo y la contraseña siempre funciona también. La versión de servidor de las llamadas biométricas está escrita, pero las pantallas todavía no la utilizan.
- **No construido:** restricción del cierre de sesión remoto por red, caducidad de una sesión de firma por bloqueo de la estación de trabajo, segundos factores por SMS y por llave de hardware, un almacén de políticas en el servidor.
- **Dónde se administra.** [Seguridad de la sesión](#screen-session_security).
### Seguridad de la sesión {#ch1-session}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Modelo de seguridad > Seguridad de la sesión

**Estado:** Parcial. Tiempo de inactividad Construido (navegador). Sesión mantenida en el servidor Planificada.

- **Tiempo de inactividad.** Un valor predeterminado para toda la organización en [Seguridad de la sesión](#screen-session_security), que se elige entre 5, 10, 15, 20, 30 o 60 minutos. El valor predeterminado es 15. Un laboratorio ejecutor puede fijar su propio valor en el [Diccionario de centros](#screen-facility-dictionary). Cuando hay un caso abierto se aplica el valor del laboratorio; en el resto de pantallas (Inicio, Lista de trabajo) se aplica el valor de la organización. Al agotarse el tiempo, se cierra la sesión de la persona y los borradores sin guardar se conservan, no se descartan.
- **Misma cuenta, segunda pestaña.** Iniciar sesión de nuevo como el mismo usuario en otra pestaña sustituye a la sesión anterior en el mismo navegador, con un aviso.
- **Regla del servidor.** El servidor también finaliza una sesión cuyo token ha caducado, de modo que un navegador cerrado o bloqueado no puede mantener una sesión abierta.
- **Almacenamiento del navegador.** Con un servidor de API configurado, no se escribe ningún dato de pacientes en el almacenamiento del navegador. Solo lo utilizan las preferencias de visualización, los ajustes de la estación de trabajo (estación de escaneado, perfil de pantalla, posiciones de las ventanas) y la sesión iniciada.
- **Protección del transporte y de la página.** Las cabeceras generadas establecen una Content-Security-Policy estricta (sin script en línea, sin `eval`, sin marcos), HSTS en las instalaciones https, `nosniff`, una política `no-referrer` (las direcciones pueden contener identificadores de casos) y una Permissions-Policy restringida. El HTML de los informes se sanea antes de mostrarse. El navegador no guarda ninguna clave de IA, de terminología ni de proveedor, y una prueba hace fallar la compilación si aparece alguna en el front-end.
- **Informes de errores.** Los informes de fallos pueden enviarse a Sentry o al recopilador propio de un hospital, **desactivados por defecto**. Un informe contiene solo el nombre del error, un mensaje depurado (sin texto entrecomillado, direcciones de correo electrónico ni series de tres o más dígitos), como máximo diez marcos de pila, la ruta con los segmentos numéricos sustituidos y una referencia. Requiere dos ajustes en `config.json` y, para un cliente de EE. UU., un Business Associate Agreement firmado con el proveedor o, para la UE y el Reino Unido, un acuerdo de encargo de tratamiento de datos y residencia de los datos en la UE. El autoalojamiento evita ambos requisitos.
- **Dónde se administra.** [Seguridad de la sesión](#screen-session_security) y [Diccionario de centros](#screen-facility-dictionary).

### Acceso de soporte {#ch1-support}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Modelo de seguridad > Acceso de soporte

**Estado:** Parcial. Parte del navegador Construida. Parte del servidor Planificada.

El hospital, como responsable del tratamiento de los datos, decide si el soporte de ForMedrixAI puede acceder a sus datos. «Acceso de soporte» significa una sesión de Superadministrador que accede a una organización de la que la persona no es miembro del personal.

- **Política por organización.** Desactivado (el soporte no obtiene nada, tampoco el Superadministrador), **Requiere aprobación** (el valor predeterminado) o Siempre permitido. Con Requiere aprobación, el soporte solicita el acceso por cada incidencia, con un motivo de al menos 10 caracteres. Un aprobador del hospital (no el solicitante) aprueba o rechaza. Una aprobación dura lo que dura la ventana de acceso de la organización (30 minutos, 1, 2, 4 u 8 horas; el valor predeterminado es 2) o menos si el soporte la finaliza o el hospital la revoca.
- **El flujo de auditoría propio del hospital.** Independiente del registro de auditoría principal: solicitudes, decisiones, caducidades, aperturas rechazadas, aperturas y ediciones de casos, toda lista o búsqueda que haya dado a conocer casos (identificadores de caso; nombres de los criterios de búsqueda, nunca los valores), cambios de política y exportaciones. Cada entrada está encadenada mediante hash a la anterior, de modo que una entrada modificada o eliminada rompe la cadena, y la pantalla muestra la comprobación de manipulación. La exportación es en CSV o JSON.
- **Capacidades.** `config:support-access:policy`, `config:support-access:approve` y `config:support-audit:view`, asignadas por defecto a Administrador. Abrir el caso de otra organización requiere además `platform:cross-tenant-cases:view`, que solo puede poseer Superadministrador, y queda auditado.
- **No construido (trabajo del servidor):** la dirección IP de origen y el país (el navegador los registra vacíos), la notificación por correo electrónico y webhook a los aprobadores (hoy es un mensaje dentro de la aplicación), la finalización del acceso al cerrarse la incidencia, la exportación del flujo en PDF (existen CSV y JSON; hay una función de PDF escrita en el navegador), el flujo en su propia tabla de solo adición por inquilino (tenant) y los tokens de sesión de soporte vinculados a la incidencia y a la caducidad.
- **Dónde se administra.** [Acceso de soporte](#screen-support_access).

### Registro de auditoría {#ch1-audit}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Modelo de seguridad > Registro de auditoría

**Estado:** Parcial. Parte del navegador Construida. Almacenamiento en el servidor Planificado.

- **Qué se registra.** Acciones de los usuarios, cierres de sesión, enmiendas, eventos de voz, eventos del sistema y llamadas de IA. Toda comprobación de una capacidad de riesgo alto se registra, tanto si se permite como si se rechaza. Los cambios de configuración realizados por una persona autorizada se auditan. Algunos registran los valores anterior y nuevo (por ejemplo, la política de proveedores de IA y las excepciones de autoridad de firma); en muchos ajustes el registro contiene solo la entrada de que la comprobación de la capacidad se permitió, no el valor nuevo. Consulte [Registros del sistema](#screen-audit-log) para ver qué contiene cada entrada.
- **Sin datos de pacientes en el detalle.** El texto `detail` de la auditoría está en inglés literal y está construido para no contener nombres de pacientes, fechas de nacimiento, NHC ni valores clínicos. Utiliza identificadores y nombres de configuración. Las contraseñas, los códigos y los secretos nunca se registran.
- **Diseño del servidor.** Tablas de solo adición (solo permisos de inserción y de selección), cada fila de auditoría escrita en la misma transacción que el cambio que registra, un flujo encadenado mediante hash para el acceso de soporte y copias de seguridad en un momento dado. Los archivos de auditoría exportados en almacenamiento inmutable son una opción de cada hospital. **Planificado:** nada de esto existe hasta que se construya el servidor. La versión del navegador guarda el registro en el almacenamiento de demostración.
- **Conservación.** Consulte [Conservación de datos](#ch1-retention).
- **Dónde se consulta.** [Registros del sistema](#screen-audit-log), con las vistas de interfaces y financiera [Registros del sistema: interfaces](#screen-audit-interfaces) y [Registros del sistema: financiero](#screen-audit-financial).

### Ocultación de datos de pacientes en las capturas de pantalla de soporte {#ch1-phi}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Modelo de seguridad > Ocultación de datos de pacientes en las capturas de pantalla de soporte

**Estado:** Construido.

Cuando un usuario envía una Solicitud de mejora, la aplicación toma una captura de pantalla y cubre todos los elementos marcados como datos de pacientes antes de que la imagen salga del navegador. Todo lo que muestra el nombre de un paciente, su fecha de nacimiento, NHC o identificador nacional, número de registro o de caso, o datos de contacto o de seguro del paciente se marca con `data-phi` y su tipo. Las notificaciones emergentes (toasts) que nombran un caso están envueltas para que también queden cubiertas. Los nombres del personal no se tratan como datos de pacientes. Una prueba lee todos los archivos fuente y hace fallar la compilación ante un lugar sin marcar, sin lista de excepciones. Límites que conviene tener en cuenta: el texto libre que contenga por casualidad un identificador (detalle de auditoría, motivos de excepción de interfaces) no puede ser reconocido por ninguna comprobación del código, por lo que esas celdas se cubren por completo; y la comprobación lee nombres, no tipos, de modo que puede pasar por alto un valor transmitido a través de una lista genérica (se encontró y corrigió uno de esos casos en el Lote 368, y después se revisaron veinte pantallas en un navegador).

### Política de proveedores de IA y regiones de alojamiento {#ch1-ai-policy}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Modelo de seguridad > Política de proveedores de IA y regiones de alojamiento

**Estado:** Parcial. Comprobación en el navegador Construida. Comprobación en el proxy del servidor Planificada.

- **Por qué.** Algunas jurisdicciones indican qué proveedores de IA están permitidos o prohibidos. PathScribe es neutral respecto a los proveedores y comprueba cada llamada de IA antes de enviarla.
- **La regla.** Para cada jurisdicción y, opcionalmente, cada centro: los servicios de IA permitidos y las regiones de alojamiento permitidas para cada servicio. Sin regla, se permite cualquier servicio. La regla de un centro restringe la de su jurisdicción, y la llamada debe cumplir ambas. Cuando una regla limita las regiones, se rechaza una llamada cuya región no esté registrada. Los servicios se nombran por la forma de la petición: mensajes estructurados (Anthropic), finalizaciones de chat (OpenAI), finalizaciones de chat gestionadas (Azure OpenAI), pasarela de modelos (AWS Bedrock), contenido estructurado (Google Gemini) y personalizado (un modelo autoalojado). La región de alojamiento configurada se guarda con el ajuste del proveedor de IA.
- **Cuando se rechaza.** La función continúa sin IA y, cuando puede, muestra «La IA no está disponible para esta jurisdicción». La llamada nunca se envía a otro proveedor en su lugar.
- **El servidor debe repetir la comprobación.** Una comprobación en el navegador puede eludirse, por lo que el proxy de IA del servidor debe realizar la misma comprobación en cada ruta, y es la que cuenta. Debe elegir el servicio y la región a partir del ajuste guardado, nunca del cuerpo de la petición, responder `403` con el código `AI_VENDOR_NOT_ALLOWED` y auditar el rechazo. **Planificado.**
- **Claves.** El navegador nunca guarda una clave de proveedor de IA. En producción, las claves residen en el almacén de secretos del servidor (por ejemplo, Azure Key Vault). El ajuste guardado contiene el proveedor, el modelo, el punto de conexión y el nombre de la implementación, nunca una clave.
- **Qué debería hacer también el servidor (Planificado):** auditar cada llamada de IA (quién, caso, centro y jurisdicción comprobados, servicio, modelo, región de alojamiento, función, tokens, resultado; nunca la consigna, que puede contener datos de pacientes), limitar la frecuencia por usuario y por organización, y comprobar que existe un Business Associate Agreement o un acuerdo de encargo de tratamiento de datos para el proveedor elegido.
- **Carencia declarada.** En el navegador, un ajuste de proveedor `mock` envía las peticiones de IA a la ruta de Anthropic a través del proxy, por lo que un sitio de demostración configurado en `mock` sigue llamando al proxy. Una jurisdicción que no permite Anthropic la rechaza.
- **Revisión humana.** El resultado de la IA es una sugerencia. Las pantallas que lo utilizan lo muestran para que el clínico lo acepte o lo rechace; consulte el capítulo de IA (Capítulo 5).
- **Dónde se administra.** La tarjeta de política de proveedores de IA y la tarjeta de regiones de alojamiento en la pestaña [Comportamiento de la IA](#screen-tab-ai). Cambiar una regla requiere `config:ai-vendor-policy:manage` (Administrador y Director del laboratorio por defecto), y cada cambio se audita como `AI_VENDOR_POLICY_CHANGED`.

### Conservación de datos {#ch1-retention}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Modelo de seguridad > Conservación de datos

**Estado:** Parcial. Los ajustes están Construidos. **Todavía nada purga datos según ellos**; el trabajo de purga es trabajo del servidor.

[Conservación de datos](#screen-retention) contiene cuatro períodos: sugerencias de IA (90 días por defecto), registros de auditoría (365 días por defecto), instantáneas de casos (7 años por defecto) y archivo de informes (10 años por defecto). La pantalla advierte de que la conservación mínima de los registros de auditoría es de 90 días y de que las reducciones por debajo de los mínimos reglamentarios requieren la aprobación del responsable de cumplimiento normativo de la institución. Guardar requiere `config:retention-policy:manage`. La conservación de las muestras físicas y los bloques se gestiona mediante la cola de eliminación y las Retenciones de conservación a nivel de caso, que siguen la jurisdicción (RCPath para el Reino Unido, CAP y CLIA para EE. UU.). Los documentos de informe inmutables en el almacenamiento de blobs son su propia protección contra la eliminación. Períodos de conservación de las copias de seguridad: Aún no especificados.

### HIPAA y CLIA: los controles que tiene el producto {#ch1-regulatory}
Breadcrumb: Inicio > Guía del administrador > Descripción general y arquitectura del sistema > Modelo de seguridad > HIPAA y CLIA: los controles que tiene el producto

**Estado:** Parcial. La tabla enumera los controles que existen en la versión del navegador. Ningún control protege datos reales de pacientes hasta que exista la parte del servidor, y **utilizar estos controles no hace que un laboratorio cumpla la normativa** de HIPAA, CLIA ni de ninguna otra ley. El cumplimiento depende de las políticas, los contratos, el alojamiento y el sistema de calidad del laboratorio.

| Área | Lo que tiene PathScribe | Estado | Dónde |
|---|---|---|---|
| Identidad única del usuario | Registros del personal, con inicio de sesión único cotejado con el sujeto permanente del proveedor | Parcial | [Miembros del personal](#screen-staff-members) |
| Control de acceso (mínimo privilegio) | Capacidades y roles, ámbito de centro, sin atajo para ningún rol, privacidad de los casos | Demostración | [Diccionario de roles](#screen-staff-roles) |
| Cierre de sesión automático | Tiempo de inactividad (valor predeterminado de la organización, excepción por laboratorio); se conservan los borradores | Construido (navegador) | [Seguridad de la sesión](#screen-session_security) |
| Autenticación de la persona | Inicio de sesión único, MFA del proveedor comprobada a partir del token, verificación reforzada en una firma, comprobación opcional del dispositivo | Parcial | [Seguridad de la sesión](#screen-session_security) |
| Controles de auditoría | Registro de auditoría de acciones, comprobaciones de riesgo alto y cambios de configuración; flujo de soporte encadenado mediante hash | Parcial | [Registros del sistema](#screen-audit-log) |
| Seguridad de la transmisión | https obligatorio para toda dirección de servidor, HSTS, política de contenido estricta; TLS mutuo para el agente del centro | Construido (navegador y cabeceras). Servidor Planificado | [Red](#ch1-prereq-network) |
| Acceso de proveedores | Acceso de soporte controlado por el hospital, vinculado a una incidencia y limitado en el tiempo, con su propia auditoría | Parcial | [Acceso de soporte](#screen-support_access) |
| Mínimo necesario en las herramientas | Datos de pacientes ocultados en las capturas de pantalla de soporte; sin texto de pacientes en direcciones web, errores ni mensajes del concentrador; informes de fallos depurados | Construido | [Ocultación](#ch1-phi) |
| Terceros que tratan datos de pacientes | Política de proveedores de IA por jurisdicción, límites de región, claves guardadas por el servidor; se necesita un Business Associate Agreement o un acuerdo de encargo de tratamiento de datos para cada proveedor | Parcial | [Comportamiento de la IA](#screen-tab-ai) |
| Integridad del informe | Un documento de informe inmutable y con hash (SHA-256) por cada emisión, enviado sin cambios por todos los canales; guardados de caso con versiones y detección de conflictos | Construido (contrato); servidor Planificado | Capítulo 6 |
| Conservación de datos | Períodos configurables; cola de eliminación y Retenciones de conservación para las muestras | Parcial | [Conservación de datos](#screen-retention) |
| CLIA: autoridad de firma | Los tipos de participación y las reglas de firma por país deciden quién puede firmar, con excepciones locales auditadas | Construido | [Tipos de participación](#screen-participation_types), [Reglas de firma por país](#screen-country_signing_rules) |
| CLIA: carga de trabajo y competencia en citología | Un límite diario de carga de trabajo para el cribado de citología GIN, con excepciones por personal y por centro, y el envío de los cierres de sesión de firma de un citotécnico nuevo a un supervisor para su cofirma hasta que se documenten las evaluaciones de competencia | Construido (navegador). El servidor registra el tiempo de cribado con su propio reloj; Planificado | [Límite diario de carga de trabajo](#screen-cytology_workload_cap), [Reglas del país y del laboratorio](#screen-cytology_compliance_features) |
| Identidad del centro en los informes | Un registro de centro contiene su número CLIA o ISO 15189, que se muestra en las cabeceras de los informes | Construido | [Diccionario de centros](#screen-facility-dictionary) |

**No construido o no especificado:** el cifrado en reposo de la base de datos SQL Server (no hay ningún ajuste ni requisito escrito en el repositorio; los contenedores de blobs están especificados como cifrados en reposo); una especificación de copias de seguridad y recuperación ante desastres; un almacén de auditoría en el servidor a prueba de manipulaciones; una prueba de penetración independiente o una certificación de seguridad (en el repositorio no consta ninguna); y cualquier declaración de cumplimiento.
