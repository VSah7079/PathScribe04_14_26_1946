---
chapter: 7
id: ch7
title: Nivel 6: Motor de interfaces e integraciones con sistemas externos
---

# Nivel 6: Motor de interfaces e integraciones con sistemas externos {#ch7}

Este capítulo describe cómo PathScribe intercambia mensajes con otros sistemas: la historia clínica electrónica (HCE) del hospital, un sistema de información del laboratorio (LIS), los laboratorios de referencia, los sistemas de facturación, los registros y las herramientas de informes. También describe las pantallas que utiliza un administrador para vigilar esos intercambios y para tratar los que fallan.

Lea el estado de cada parte antes de planificar un proyecto en torno a ella. Gran parte de este nivel es un contrato ya redactado y un lado del navegador ya construido, mientras que el servidor y el motor de interfaces del otro extremo todavía no están conectados. Cuando algo no está construido, la sección indica **No construido** o **Planificado** y nombra lo más parecido que sí existe.

**La regla de este capítulo.** PathScribe decide qué se envía y cuándo. El motor de interfaces decide cómo: el texto HL7, la conexión, los reintentos en la línea y la terminología propia del proveedor. PathScribe nunca traduce los nombres de campo ni los códigos de un proveedor, y no afirma ser un conector certificado para ninguna HCE.

## El orden de configuración del Nivel 6 {#ch7-order}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

El Nivel 6 es en su mayor parte opcional. Un laboratorio que utiliza PathScribe por sí solo, sin LIS, sin flujo hacia un registro y sin herramienta de informes, puede omitirlo por completo. Realice los pasos siguientes solo para las integraciones que utilice, en este orden. Cada paso nombra las pantallas que deben estar configuradas antes (Niveles 1 a 5), y la misma información aparece en el cuadro "Orden de configuración" de cada pantalla.

1. [Correspondencia de códigos de muestra](#screen-crosswalk): asigne los códigos de muestra propios de cada centro emisor a su Diccionario de muestras, para que las peticiones entrantes se resuelvan. Necesita el Diccionario de centros y el Diccionario de muestras.
2. [Diccionario de interfaz](#screen-interface_dictionary) (solo personal de ForMedrixAI): describe los campos propios de un proveedor. Los clientes no realizan este paso; se enumera para que la numeración quede completa.
3. [Ingesta de LIS en modo Asistencia](#screen-assist_lis_polling): para un laboratorio cuyo LIS es el propietario del caso y en el que PathScribe presta asistencia con borradores de IA. Necesita Comportamiento de la IA y la Biblioteca sinóptica.
4. [Canal de informes (Power BI)](#screen-bi_feed): permite que una herramienta de informes lea los datos de PathScribe. Necesita los centros ejecutores en el Diccionario de centros.
5. [Asignaciones de campos de migración](#screen-migration_field_mappings): asigne los nombres de campo de un sistema antiguo, antes de cualquier importación de datos históricos.
6. [Trabajos de migración de datos históricos](#screen-migration-jobs): importe un archivo antiguo y compruebe el trabajo. Necesita el paso 5.
7. [Incorporación de volantes](#screen-requisition_ingestion): vincular los volantes en papel escaneados por lotes a su caso mediante el código de barras de cada página. Necesita la carpeta de entrega del escáner (o el sistema que envía los escaneos).

Las pantallas de supervisión ([Registros del sistema: interfaces](#screen-audit-interfaces), [Motores de interfaces](#screen-interface-engines), [DLQ de interfaz saliente](#screen-outbound-interface-dlq), [Envíos de salida](#screen-outbound-dispatches) y la [Cola de salida](#screen-outbound-queue)) y las herramientas de prueba ([Vista previa de mensajes de interfaz salientes](#screen-outbound_message_preview), [Bandeja de salida de correo simulada](#screen-simulated_mail), [Mock Interface Engine](#screen-mock-interface-engine) y [Mock EMR](#screen-mock-emr)) no son pasos de configuración. Cada una indica `Reference, not part of setup` y enumera lo que debe existir para que muestre datos.

## Qué contiene y qué no contiene este nivel {#ch7-status}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

| Parte del esquema | Estado | Qué existe hoy |
|---|---|---|
| Arquitectura del motor de interfaces | Parcial | El contrato de mensajes y el lado del navegador están construidos. El motor (BridgeLink) y los puntos de acceso del servidor que necesita están Planificados. Véase [Cómo encaja el motor de interfaces](#ch7-architecture). |
| HL7 v2.x saliente (ADT, ORU, ORM) | Parcial | PathScribe envía un mensaje JSON para que el motor lo convierta en HL7, salvo tres mensajes que construye él mismo como texto HL7. Véase [Tipos de mensaje](#ch7-hl7-types). |
| HL7 v2.x entrante | Parcial | Los procesadores existen y se pueden probar con mensajes pegados. Ningún receptor recibe todavía un mensaje HL7 real. |
| Punto de acceso FHIR R4 y credenciales de cliente OAuth2 | No construido | No hay punto de acceso ni pantalla de configuración. Véase [FHIR R4 y OAuth2](#ch7-fhir). |
| Integración con HCE (Epic, Cerner, MEDITECH, AthenaHealth) | No construido | No hay conector de proveedor, certificado o no. Véase [Integración con HCE](#ch7-ehr). |
| Envío y recepción de resultados con laboratorios de referencia | Parcial | Se envían manifiestos de derivación y se procesa una carga de resultados. Ningún punto de acceso entrante recibe todavía un resultado. Véase [Interfaces con laboratorios de referencia](#ch7-reflab). |
| Supervisión de interfaces, colas de errores y reprocesamiento | Construido (lado del navegador) | Las pantallas y sus capacidades funcionan. El latido del motor y los reintentos del lado del motor están Planificados. Véase [Supervisión](#ch7-monitoring). |

## Cómo encaja el motor de interfaces {#ch7-architecture}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

**Estado:** Parcial

### El término "PathScribe Interface Engine" {#ch7-pie-term}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

El esquema de esta guía denomina a la capa de interfaces PathScribe Interface Engine (PIE). Ese nombre no aparece en el producto, en sus pantallas ni en sus documentos de diseño, y esta guía no inventa el nombre de un producto. Lo que tiene el producto son dos elementos que, juntos, realizan el trabajo que describe el esquema:

- **El lado de PathScribe.** Servicios de la aplicación deciden qué enviar y cuándo, construyen el mensaje JSON, lo ponen en cola, registran el resultado y permiten que un administrador lo reenvíe, lo retenga o lo libere. Todo lo que en este capítulo se puede pulsar está en este lado.
- **El motor de interfaces.** El diseño utiliza BridgeLink, una bifurcación de código abierto de Mirth Connect, como motor. Convierte el JSON de PathScribe en HL7 (u otro formato), mantiene su propio almacén de mensajes, envía al sistema receptor y recibe las respuestas. BridgeLink es el nombre de trabajo en los documentos de diseño (`INTERFACE_ENGINE_EDGE.md`). Sus plantillas de canal están Planificadas, no construidas.

### Dónde se ejecuta el motor {#ch7-hosting}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

El motor es una única imagen de contenedor que se utiliza en dos lugares, a elección de cada hospital (decisión D6). ForMedrixAI puede alojarlo en la región del inquilino (tenant), o se puede instalar en una máquina virtual dentro del hospital. La pantalla [Motores de interfaces](#screen-interface-engines) muestra cuál de las dos opciones es cada motor (**Alojado** o **En las instalaciones**). La imagen, sus plantillas de canal y sus puntos de acceso de estado están Planificados, a cargo del equipo del servidor.

Los mensajes HL7 no viajan por el bus de mensajes de SQL Server (decisión D1). El servidor de API entrega un mensaje al motor como un trabajo de tipo `interface.dispatch`, y el motor conserva el HL7 en su propio almacén de mensajes.

### Qué funciona hoy y qué está Planificado {#ch7-today}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

| Elemento | Estado | Qué significa para usted |
|---|---|---|
| Mensajes salientes, sobre JSON | Construido (lado del navegador) | El navegador envía `{queueEntryId, transactionType, dispatchedAt, payload}` a la dirección indicada en el parámetro de compilación `VITE_INTERFACE_RECEIVER_ENDPOINT`. En una compilación de producción la dirección debe ser `https`; una dirección ausente o con HTTP sin cifrar se rechaza antes de enviar nada. La espera es de 15 segundos. |
| Qué se considera enviado | Construido (lado del navegador) | Cualquier respuesta 2xx marca el mensaje como enviado. Todavía no hay acuse de recibo HL7 (ACK). Un tiempo de espera agotado, un motor inaccesible y un rechazo son tres errores distintos en las pantallas. |
| Compilación de demostración | Demostración | Si no se ha definido la dirección de un motor, un motor simulado recibe todos los mensajes y los conserva en una lista. Véase [Mock Interface Engine](#screen-mock-interface-engine). |
| Eventos entrantes de instrumentos | Construido (lado del navegador) | Existen cuatro webhooks para el Cassette Engine: excepción de bloque, resultado del envío de casetes, ubicación del material y estado del grabador. Utilizan un secreto compartido en el encabezado `X-API-Key`, con una firma HMAC opcional. |
| Mensajes HL7 entrantes | No construido | Los procesadores de ADT y de gestión de pacientes existen y están probados, pero nada recibe un mensaje HL7 real y los llama. |
| Puntos de acceso del servidor para el motor (`POST /api/interface/inbound`, `POST /api/interface/outbound-acks`, `POST /api/interface/heartbeat`, `GET /api/interface/engines`) | Planificado | Escritos como contrato (fase 2e). Añaden entrega, resultados confirmados por acuse de recibo, ventanas de reintento, mensajes fallidos y estado del motor. |
| Credenciales del motor por inquilino (tenant) | Planificado | Credenciales de cliente OAuth2 o TLS mutuo por cada motor de inquilino. Véase [FHIR R4 y OAuth2](#ch7-fhir). |

**Ventanas de reintento planificadas.** El contrato indica que los mensajes entrantes esperan 10 segundos, 30 segundos, 1 minuto, 5 minutos y después 15 minutos, con un mensaje fallido a las 24 horas. Los mensajes salientes se reenvían a 1, 5, 15 y 60 minutos, y después cada hora, durante 24 horas. Los envíos a registros se conservan durante 72 horas. Se envía un acuse de recibo AA; CA se envía o queda a la espera del acuse de la aplicación; AR y CE se reintentan dentro de la ventana; AE y CR fallan de inmediato. Un resultado que pasa a la cola de mensajes fallidos retiene los mensajes posteriores del mismo caso. Nada de esto funciona todavía. Hoy, un envío fallido espera a que un administrador lo reenvíe.

### Ajustes de interfaz del centro que se guardan pero no se utilizan {#ch7-facility-settings}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

El Editor de centros (Nivel 1, [Diccionario de centros](#screen-facility-dictionary)) tiene una pestaña **Integración con el SIL**. Guarda una dirección del motor, la versión de HL7, el tipo de autenticación (ninguna, básica, OAuth2 o clave de API), un indicador que señala si se ha aprovisionado una credencial, si el LIS es propietario de los estados del caso, si PathScribe permite acciones posteriores a la validación final, y los identificadores de enrutamiento del centro emisor y del centro receptor y una sustitución del canal de salida. Estos ajustes se guardan con el centro. Ninguna vía de envío los lee hoy. Un mensaje va a la única dirección de nivel de implantación indicada arriba. La credencial nunca se guarda: solo se guarda un indicador de Sí/No.

## HL7 v2.x entrante y saliente {#ch7-hl7}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

**Estado:** Parcial

### Tipos de mensaje {#ch7-hl7-types}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

No existe ninguna pantalla que active o desactive tipos de mensaje. Los tipos siguientes están fijados por el producto. Esta parte enumera solo lo que admite el código. Todo lo que no figura en la lista no se admite.

**Saliente.** PathScribe pone en cola estos tipos de transacción. El motor construye el HL7 de todos ellos, salvo los tres marcados como "PathScribe builds HL7".

| Tipo de transacción | Qué transporta | Forma HL7 |
|---|---|---|
| `A08` | Actualización de los datos demográficos del paciente | El motor construye ADT^A08. El sexo se envía como M, F, U o A para indeterminado en PID-8 (el código A es una suposición pendiente de confirmar con los sistemas receptores). Para los centros del Reino Unido, el código del NHS es M a 1, F a 2, I a 9, U a X. |
| `A40` | Fusión de pacientes | El motor construye ADT^A40 |
| `A47` | Cambio del identificador del paciente | El motor construye ADT^A47 |
| `ORU_R01` | Resultado de patología definitivo, enmendado o corregido | El motor construye ORU^R01. Para la patología electrónica de EE. UU. (Nivel 7), PathScribe construye él mismo un ORU^R01 v2.5.1. |
| `LIS_SYNC` | Datos del caso y resultado sinóptico de un caso en modo Asistencia, para el LIS | El motor lo construye |
| `ORDER_CREATED` | Una petición nueva | El motor lo construye |
| `ACCESSION_EVENT` | Una petición registrada, o una deficiencia de registro | El motor lo construye |
| `REGISTRY_REPORT`, `CANCER_REGISTRY_REPORT` | Envíos a registros (Nivel 7) | El motor lo construye. Los acuses de recibo regresan. |
| `REPORT_DELIVERY` | Un PDF de informe firmado para envío por fax electrónico o depósito de archivo | Motor o servicio de entrega |
| `PRINT_JOB` | Un PDF de informe para que el motor lo imprima | Motor |
| `REFERRAL_MANIFEST` | El manifiesto de un lote de derivación para un laboratorio de referencia | El motor lo construye. Los resultados regresan. |
| `MOLECULAR_ORDER` | Una petición de ensayo molecular o una petición de instrumento | El motor lo construye |
| `WSI_SCAN_MANIFEST` | Las preparaciones cargadas en un lote de escaneado de preparaciones completas | El motor lo construye. El estado del escaneado de las preparaciones regresa. |
| `BLOCK_ORDER` | Las peticiones de tinción de un bloque para un instrumento de inclusión o de tinción | PathScribe construye HL7: ORM^O01 |
| `SLIDE_ORDER`, `SPECIMEN_LABEL` | Una petición de preparación; una etiqueta de recipiente de muestra | El motor lo construye |
| `MATERIAL_SCAN_EVENT` | Un escaneo de código de barras de un casete o una preparación | El motor lo construye |
| `CHARGE_DFT` | Un cargo para el sistema de facturación | PathScribe construye HL7: DFT^P03 |
| `CHARGE_JSON` | Un cargo como webhook JSON de facturación | JSON, sin HL7 |
| `FINANCIAL_CLASS` | Carga de clase financiera para un motor de facturación | Una carga de vista previa hasta que existan los formatos |
| `CRITICAL_ALERT` | Canales de alertas críticas posteriores al lanzamiento | No conectado. Hoy nada lo genera. |

Por tanto, el "ORM" del esquema es el ORM^O01 que PathScribe construye para las peticiones de bloque dirigidas a un instrumento. PathScribe no construye por sí mismo ningún ORM para una HCE ni para un LIS. El motor decide en qué HL7 se convierte un mensaje de petición creada, y no existe ninguna pantalla para añadir un tipo de mensaje.

**Entrante.** Estos procesadores existen en la aplicación. Ninguno está conectado a un receptor real, salvo los webhooks de instrumentos mencionados arriba. Puede pasar un mensaje pegado por ellos con el [Mock Interface Engine](#screen-mock-interface-engine) en la compilación de demostración.

| Familia | Mensajes | Estado |
|---|---|---|
| Admisión, alta y traslado (`adtParser.ts`) | A01, A03, A04, A08, A02, A09, A10, A05, A06, A07, A11, A12, A13, A31 | Procesador construido; sin receptor |
| Gestión de pacientes (`patientManagementParser.ts`) | A40 fusión, A24 vinculación, A47 cambio de identificador, A43 traslado | Procesador construido; sin receptor. Un mensaje que no se puede emparejar se pone en cola como excepción de interfaz, nunca se adivina. |
| Cambios de visita (`processVisitMessage.ts`) | A45, A50, A34 | Procesador construido; sin receptor |
| Estado de peticiones del LIS (el adaptador de modo Asistencia) | ORU^R01, ORM^O01, OML^O21 | Solo estado. Puede pegar uno en [Ingesta de LIS en modo Asistencia](#screen-assist_lis_polling). |
| Eventos JSON | Resultado de VPH, excepción de bloque, ubicación del material, resultado de derivación, resultados de series moleculares, estado del escaneado de preparaciones completas | Procesadores construidos; los webhooks de instrumentos son la única vía activa |

**Las peticiones entrantes no se analizan desde HL7.** El servicio de recepción de peticiones admite una petición estructurada, no un mensaje ORM, por lo que hoy no se acepta una petición HL7 real procedente de una HCE. La [Correspondencia de códigos de muestra](#screen-crosswalk) resuelve los códigos de una petición una vez que esta llega al servicio.

**Adaptadores de proveedor.** Los adaptadores de Cerebro y de Vantage son deliberadamente módulos vacíos que no hacen nada.

### Correspondencia de códigos de muestra {#screen-crosswalk}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Tipos de pedido y reglas de entrada

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones**
**2. Elemento de mantenimiento:** Tipos de pedido y reglas de entrada (el nombre en el menú). El título en la pantalla es **Correspondencia de códigos de muestra**.

**3. Finalidad comercial y alcance.** Un sistema emisor utiliza sus propios códigos para las muestras, y un mismo código puede significar cosas distintas en distintos sistemas emisores. Esta pantalla asigna el código de cada centro emisor a una entrada del Diccionario de muestras. Cada petición entrante se comprueba con esta tabla. Cuando ninguna entrada coincide, PathScribe no bloquea la petición. Crea una entrada marcada como **Auto-learned: pending review**, crea una entrada pendiente en el Diccionario de muestras para que la petición pueda continuar y pone en cola una excepción de interfaz de tipo `unmapped_order_code` para que una persona la resuelva. Usted revisa aquí las entradas aprendidas automáticamente, o añade de antemano una entrada real para que un código conocido no tenga que aprenderse nunca.

**4. Requisitos previos y dependencias.** La lista **Centro** es el Diccionario de centros y la lista **Equivale a** es el Diccionario de muestras, de modo que ambos se configuran primero. Si los omite, las listas están vacías y no se puede guardar una correspondencia, porque el centro, el código externo y el tipo de muestra son obligatorios.

Setup step: Tier 6, step 1
Requires: [Diccionario de centros](#screen-facility-dictionary), [Diccionario de muestras](#screen-specimens)
Unlocks: [Registros del sistema: interfaces](#screen-audit-interfaces)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-crosswalk - Lista de la Correspondencia de códigos de muestra con los botones Añadir correspondencia, Importar hoja de cálculo y Exportar]

**6. Referencia de campos.**

La lista.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Centro | Texto (solo lectura) | No aplica | El centro emisor del que procede el código. | No aplica |
| Código externo | Texto (solo lectura) | No aplica | El código de muestra propio del sistema emisor. | No aplica |
| Equivale a | Texto (solo lectura) | No aplica | La entrada del Diccionario de muestras a la que se asigna el código. | No aplica |
| Origen | **Confirmada por el administrador** o **Auto-learned: pending review** | No aplica | Las entradas **Auto-learned** las creó el sistema cuando ninguna entrada coincidía. Un cartel con un contador, encima de la lista, indica cuántas esperan revisión. | No aplica |
| Cartel de revisión pendiente | Contador y enlace | No aplica | Se muestra cuando hay excepciones de códigos de petición sin asignar pendientes. El enlace **View Unmapped Stubs in Audit Queue** abre Registros del sistema, Interfaces, filtrado por `unmapped_order_code`. | Oculto cuando el contador es 0 |
| Añadir correspondencia | Botón | No aplica | Abre el panel Añadir una correspondencia. | No aplica |
| Importar hoja de cálculo | Botón, archivo CSV | No aplica | Lee un CSV con las columnas Facility, ExternalCode y ResolvesTo y muestra una vista previa antes de guardar nada. | No aplica |
| Exportar | Botón | No aplica | Descarga `SpecimenCodeCrosswalk.csv` con las columnas Facility, ExternalCode, ResolvesTo y Source. La exportación se registra en el registro de auditoría. | No aplica |

El panel Añadir una correspondencia.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Centro | Lista de selección del [Diccionario de centros](#screen-facility-dictionary) | Obligatorio | El centro emisor. Se permite el mismo código en dos centros distintos. | En blanco |
| Código externo | Texto | Obligatorio | El código exactamente como lo utiliza el emisor. La comparación no distingue mayúsculas de minúsculas. El texto de ayuda muestra `TISSUE-01`. | En blanco |
| Sede (opcional) | Lista de selección de sedes, o **Todas las sedes** | Opcional | Limita la correspondencia a una sede. Una correspondencia nueva guardada sin sede se aplica a todas las sedes. | Todas las sedes |
| Equivale al tipo de muestra | Lista de selección con búsqueda del [Diccionario de muestras](#screen-specimens), que busca en nombres y sinónimos | Obligatorio | La entrada en la que se convierte una petición con este código. | En blanco |
| Guardar correspondencia | Botón | No aplica | Se rechaza con un mensaje si el mismo centro, código y sede ya se asignan a una entrada ("Facility already maps external code to entry"). | No aplica |

La vista previa de la hoja de cálculo.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Línea de resumen | Texto | No aplica | Filas listas, cuántas actualizan una correspondencia existente, cuántas son nuevas y cuántas se omiten por errores. | No aplica |
| Errores de fila | Lista de texto | No aplica | Un nombre de centro que no coincide con ningún centro, un código externo en blanco, o un nombre de muestra que no coincide con ninguna entrada del Diccionario de muestras. Los nombres se comparan por nombre, sin distinguir mayúsculas de minúsculas. Una fila con error se omite, nunca se adivina. | No aplica |
| Aplicar importación | Botón | No aplica | Guarda todas las filas sin error. Una fila cuyo centro y código ya existen actualiza el tipo de muestra de esa correspondencia. Las filas importadas no tienen sede. | Desactivado cuando todas las filas tienen error |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, importar y actualizar correspondencias: `config:crosswalk:manage` (riesgo alto). Admin y Lab Director lo tienen de forma predeterminada; Superadmin tiene todas las capacidades (salvo `config:ai-prompt:approve`, retirada por la separación de funciones). Sin él, la pantalla es de solo lectura. Resolver una excepción de código no asignado desde la ventana de revisión crea la misma entrada.

**Límites conocidos.** El nombre en el menú (**Tipos de pedido y reglas de entrada**) difiere del título de la pantalla (**Correspondencia de códigos de muestra**); ambos son la misma pantalla. La lista no permite editar ni eliminar, solo añadir y actualizar mediante hoja de cálculo. Ningún receptor recibe todavía una petición HL7 real, de modo que las entradas se utilizan cuando una petición llega al servicio de recepción de peticiones, no a partir de un mensaje de la línea.
### Ingesta de LIS en modo Asistencia {#screen-assist_lis_polling}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Ingesta de LIS en modo Asistencia

**Estado:** Parcial

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones**
**2. Elemento de mantenimiento:** Ingesta de LIS en modo Asistencia

**3. Finalidad de negocio y alcance.** En el modo Asistencia, el LIS externo es el propietario del caso. Sus actualizaciones llegan a PathScribe de tres maneras, mediante consulta periódica, mediante un mensaje HL7 v2 o mediante un webhook JSON, y las tres pasan por una única cola de preparación. Cuando el LIS notifica Tallado completado, la IA elige las plantillas sinópticas y redacta los campos que puede a partir del texto de tallado. Cuando el LIS notifica Microscopía/diagnóstico completado, redacta el resto a partir del diagnóstico. Esta pantalla contiene los ajustes, un cuadro de prueba para mensajes pegados, la cola de preparación y el registro de ejecuciones.

**Qué está construido y qué no.** Construido: los ajustes, la asignación de estados, el cuadro de prueba, la cola de preparación con sus reintentos, el registro de ejecuciones y las reglas de redacción de la IA. Simulado en la demostración: la programación (la aplicación consulta con el intervalo guardado mientras está abierta y la consulta está activada, y la pantalla muestra una nota **Programación simulada** con la última y la próxima ejecución) y el LIS al que pregunta **Consultar ahora**. No construido: un receptor activo para mensajes HL7 o de webhook, y un campo para la dirección del LIS que se consulta. La pantalla no tiene ese campo.

**4. Requisitos previos y dependencias.** El paso de IA utiliza los interruptores de Comportamiento de la IA y las plantillas sinópticas. Si se aplica **IA desactivada en Comportamiento de la IA**, una actualización solo cambia el texto del caso y no se redacta ningún borrador. Solo se procesa un caso en modo Asistencia; un caso que no está en modo Asistencia se omite con el resultado **No es un caso de modo Asistencia**.

Setup step: Tier 6, step 3
Requires: [Comportamiento de la IA](#screen-tab-ai), [Biblioteca sinóptica](#screen-tab-protocols)
Unlocks: [Registros del sistema: interfaces](#screen-audit-interfaces)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-assist_lis_polling - Ingesta de LIS en modo Asistencia con consulta periódica, asignación de estados, cuadro de prueba, cola de preparación y actividad]

**6. Referencia de campos.**

Consulta periódica y asignación de estados.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Consultar el LIS de forma programada | Interruptor Sí/No. La etiqueta indica **Consulta programada activada** o **Consulta programada desactivada**. | Opcional | Activa la consulta programada. En el servidor de producción, la programación se ejecuta en el servidor de PathScribe. **Consultar ahora** funciona tanto si este interruptor está activado como si no. | Desactivado |
| Consultar cada (minutos) | Número entero de 1 a 1440 | Obligatorio | El intervalo entre consultas programadas. Un valor fuera del intervalo o una fracción se rechazan con "El intervalo debe ser un número entero de minutos de 1 a 1440." | 5 |
| Estado del LIS (cada fila) | Texto | Obligatorio | Una de las palabras de estado propias de su LIS, por ejemplo `GROSSED`. La comparación ignora los espacios en los extremos y las mayúsculas y minúsculas. Un estado en blanco se rechaza. El mismo estado no puede figurar dos veces. | Cuatro filas, más abajo |
| Hito (cada fila) | Elección entre **Tallado completado** o **Microscopía/diagnóstico completado** | Obligatorio | Lo que significa el estado. Tallado completado activa un borrador de la fase de tallado. Microscopía/diagnóstico completado activa un borrador completo. Un estado que no está en la lista no activa nada. | Tallado completado en una fila nueva |
| Quitar | Botón | No aplicable | Quita la fila. Sin filas, la pantalla indica "No hay estados del LIS asignados. Nada activará un borrador de IA." | No aplicable |
| + Añadir estado | Botón | No aplicable | Añade una fila vacía. | No aplicable |
| Descartar cambios, Guardar | Botones | No aplicable | Los dos permanecen desactivados hasta que algo cambia. Al salir de la pantalla con cambios sin guardar, se pregunta antes. | No aplicable |

Las cuatro filas predeterminadas son `GROSS_COMPLETE` y `GROSSED` (Tallado completado), y `MICRO_COMPLETE` y `DX_COMPLETE` (Microscopía/diagnóstico completado).

Prueba de un mensaje entrante.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Formato del mensaje | Elección entre **Mensaje HL7 v2** o **Webhook JSON** | Obligatorio | Qué adaptador lee el texto pegado. | Mensaje HL7 v2 |
| Cargar ejemplo | Botón | No aplicable | Rellena el cuadro con un ejemplo del formato elegido. | No aplicable |
| Mensaje entrante | Texto libre | Obligatorio | El mensaje tal como lo enviaría el LIS. Pasa por el mismo adaptador y la misma cola de preparación que uno real y se procesa de inmediato. Un mensaje que no se puede leer muestra un motivo, por ejemplo "No es un mensaje HL7 v2 (debe comenzar por un segmento MSH)." | En blanco |
| Enviar a la cola de preparación | Botón | No aplicable | Muestra "Preparados: n, Procesados ahora: n" o el motivo. | No aplicable |

Qué leen los adaptadores. Un mensaje HL7 debe ser un ORU^R01, ORM^O01 u OML^O21; cualquier otro tipo se rechaza. Se hace una actualización por cada segmento OBR. El número de acceso es OBR-3; si no, OBR-2; si no, ORC-3. El estado es ORC-5; si no, OBR-25. La hora es OBR-22; si no, MSH-7, y una hora sin desfase se lee como UTC, por lo que debe pedir al LIS que envíe un desfase. El texto procede de OBX-5 según el código LOINC de OBX-3: `22634-0` tallado, `22635-7` microscopía y `22637-3` diagnóstico final. Un cuerpo JSON es un objeto o una lista, con `accession`, `status` y `updatedAt` (ISO 8601) obligatorios, y `grossText`, `microscopicText`, `diagnosisText`, `placerOrderNumber` y `fillerOrderNumber` opcionales. Los números de pedido se repiten en el resultado sinóptico.

Cola de preparación.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Línea de recuentos | Texto | No aplicable | Recuentos de En espera, Con error y Procesado. | No aplicable |
| Reintentar los fallidos | Botón | No aplicable | Reintenta cada entrada con error que haya tenido menos de 5 intentos. Desactivado cuando ninguna ha fallado. | No aplicable |
| Recibido, Origen, Número de acceso, Estado del LIS, Estado, Resultado, Intentos | Columnas de solo lectura | No aplicable | El origen es **Consulta**, **Mensaje HL7 v2** o **Webhook JSON**. El estado es **En espera**, **Error** o **Procesado**. El resultado es el desenlace o el error. El número de acceso está marcado como dato del paciente para su ocultación. La lista muestra las 25 filas más recientes. Una entrada deja de reintentarse después de 5 intentos. Se conservan los 200 eventos procesados más recientes. | No aplicable |

Actividad.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Consultar ahora | Botón | No aplicable | Pide los cambios al LIS de inmediato. | No aplicable |
| Línea del cursor | Texto | No aplicable | "Se han procesado los cambios hasta (hora)" o "Todavía no se ha consultado el LIS." | No aplicable |
| Tabla de ejecuciones | Columnas de solo lectura: Hora, Desencadenante, Del LIS, Nuevos en la cola, Borradores de IA, Solo texto, Omitidos, Con error | No aplicable | El desencadenante es **Consultar ahora**, **Programación**, **Mensaje entrante** o **Reintento**. El registro conserva las últimas 20 ejecuciones. | No aplicable |
| Última consulta | Columnas de solo lectura: Número de acceso, Estado del LIS, Hito, Resultado, Detalles | No aplicable | Una fila por caso en la ejecución más reciente. Un resultado es uno de los siguientes: Borrador de IA preparado; Sin cambios desde el último borrador; Caso no presente en PathScribe; Ya firmado; Con error (se reintentará); Estado no asignado; No es un caso de modo Asistencia; Texto actualizado, IA desactivada en Comportamiento de la IA; Texto actualizado, borrador ya completado. Los detalles indican los borradores nuevos, los campos sugeridos y los cambios de plantilla que se deben revisar. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Guardar los ajustes: `config:assist-polling:manage` (riesgo alto). Consultar ahora, mensaje de prueba y Reintentar los fallidos: `assist:lis-message:ingest` (riesgo alto, auditado); la consulta programada es del sistema y no se comprueba. Admin y Lab Director tienen ambas de forma predeterminada.

**Límites conocidos.** El origen de la consulta y la programación están simulados en la compilación de demostración, y ningún receptor recibe un mensaje HL7 o de webhook de un LIS real. El adaptador HL7 lee el estado de ORC-5 y después de OBR-25, y el código fuente lo describe como un ajuste por centro, pero la pantalla no tiene ningún control para ello. Un caso firmado nunca se modifica. Un tallado tardío o enmendado posterior al borrador completo solo actualiza el texto.

### Vista previa de mensajes de interfaz salientes {#screen-outbound_message_preview}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Vista previa de mensajes de interfaz salientes

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones**
**2. Elemento de mantenimiento:** Vista previa de mensajes de interfaz salientes

**3. Finalidad de negocio y alcance.** Una herramienta de comprobación. Construye el mensaje JSON que PathScribe pondría en cola para el motor de interfaces para un paciente o un caso reales, lo muestra y permite descargarlo como archivo. Utilícela para dar a un analista de interfaces un ejemplo real sobre el que trabajar, o para comprobar lo que recibirá el motor antes de crear un canal. No envía nada y no pone nada en cola. Solo previsualiza cuatro tipos de mensaje: ADT^A08, ADT^A40, ADT^A47 y ORU^R01.

**4. Requisitos previos y dependencias.** No hay nada que configurar antes. Necesita un registro de paciente existente (para los tipos ADT) o un caso con un informe sinóptico finalizado (para el resultado). Sin ellos, la pantalla indica que no se encontró al paciente o que el generador del contenido no devolvió nada.

Setup step: Reference, not part of setup
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-outbound_message_preview - Selector del tipo de mensaje, campos de identificador y salida JSON]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Tipo de mensaje | Elección entre ADT^A08 Actualización demográfica, ADT^A40 Fusión de pacientes, ADT^A47 Cambio de identificador, ORU^R01 Resultado de patología | Obligatorio | Decide qué campos aparecen debajo. Cambiarlo borra la salida. | ADT^A08 |
| ID del paciente (A08) | Texto, un id de registro de paciente | Obligatorio para A08 | El paciente cuya actualización demográfica se construye. Marcado como dato del paciente. | En blanco |
| ID del paciente anterior (fusionado) (A40) | Texto | Obligatorio para A40 | El registro que se fusionó y desaparece. | En blanco |
| ID del paciente superviviente (A40) | Texto | Obligatorio para A40 | El registro que permanece. | En blanco |
| ID del paciente temporal o de contingencia (A47) | Texto | Obligatorio para A47 | El registro temporal cuyo identificador se corrige. | En blanco |
| ID del paciente confirmado (A47) | Texto | Obligatorio para A47 | El registro confirmado. | En blanco |
| Código de motivo (A47) | Texto | Obligatorio para A47 | Por qué cambia el identificador. | En blanco |
| Notas (A47) | Texto | Obligatorio para A47 | Una nota de texto libre. | En blanco |
| ID del caso (ORU^R01) | Texto | Obligatorio para ORU | El caso. Marcado como número de acceso. | En blanco |
| ID de la instancia sinóptica (ORU^R01) | Texto | Obligatorio para ORU | Un informe sinóptico finalizado de ese caso. | En blanco |
| Estado del resultado (ORU^R01) | Elección entre **Definitivo**, **Corregido**, **Adenda** | Obligatorio para ORU | El estado del resultado que se previsualiza. | Definitivo |
| Previsualizar contenido | Botón | No aplicable | Construye y muestra el JSON. Desactivado hasta que se rellenan los campos obligatorios del tipo elegido. | No aplicable |
| Descargar JSON | Botón | No aplicable | Guarda el mensaje mostrado como `<type>_<time>.json`. La descarga queda registrada en el registro de auditoría. | No aplicable |

En la pantalla aparecen dos avisos, y los dos son ciertos. En A40 y A47, los recuentos de casos y de encuentros reasignados se muestran como 0, porque la vista previa no realiza la fusión. En ORU^R01, el PDF del informe y el texto narrativo del informe se muestran como ausentes, porque necesitan el proceso de generación de informes que esta pantalla no tiene. Todos los demás campos tienen la forma que recibiría el motor. La vista previa de ORU también necesita que el caso esté en el modo de informes del orquestador, y un PDF ausente se notifica como "El PDF del informe no está disponible para este resultado".

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Construir una vista previa y descargarla: `config:interface-preview:view` (riesgo alto). Admin y Lab Director la tienen de forma predeterminada.

**Límites conocidos.** El propio subtítulo de la pantalla dice "PathScribe never builds or sends HL7 itself". Eso no es del todo cierto: PathScribe construye HL7 para los pedidos de bloques (ORM^O01), los cargos (DFT^P03) y los resultados de patología electrónica de EE. UU. Esta pantalla previsualiza solo el JSON. Los cuatro tipos son los únicos que puede previsualizar; los demás tipos de transacción de [Tipos de mensaje](#ch7-hl7-types) no se pueden previsualizar aquí. El mensaje enviado se puede ver a posteriori en [Envíos de salida](#screen-outbound-dispatches) para los eventos de creación de pedidos.

### [FORMEDRIXAI INTERNAL ONLY] Diccionario de interfaz {#screen-interface_dictionary}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Diccionario de interfaz

> 🔒 **Ajuste restringido interno de ForMedrixAI**
> **Ámbito:** solo personal interno de servicio e implantación.
> **Explicación:** Un perfil de proveedor decide qué campos del mensaje HL7, JSON o FHIR propio de un proveedor se copian en un caso como campos de extensión. Un perfil incorrecto, o modificado sin una prueba, pondría un valor equivocado en un caso o descartaría uno obligatorio, y el registro del caso es un registro médico. Solo el personal de ForMedrixAI crea y publica perfiles, de modo que cada uno se prueba con una muestra real y tiene versiones. Las tres capacidades que lo protegen son exclusivas de la plataforma, las tiene el rol Superadmin y un hospital no puede asignarlas. La sección no es visible para quien no las tenga.

**Estado:** Parcial

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones**
**2. Elemento de mantenimiento:** Diccionario de interfaz

**3. Finalidad de negocio y alcance.** El Diccionario de interfaz contiene perfiles de proveedor. Un perfil indica, para un proveedor o dispositivo y un tipo de mensaje, dónde está cada campo del proveedor en el mensaje y en qué campo de extensión (`ext.name`) del caso se convierte, con una conversión opcional, un valor predeterminado, una traducción de códigos y un indicador de obligatorio. Un perfil sigue un ciclo fijo: borrador, prueba, publicación y, más tarde, reversión o desactivación. El mismo motor de correspondencias está pensado para leer mensajes reales, de modo que un perfil pueda añadir campos de proveedor sin una versión de código.

**Qué está construido y qué no.** Construido: la creación de perfiles, la edición de correspondencias, la prueba con un mensaje de ejemplo, la publicación, la reversión, la desactivación y la protección de ámbito. Simulado: el panel **Aplicar a un caso**, que aplica un mensaje pegado a un caso para poder ver el panel de campos del proveedor. Un aviso indica "En esta compilación no se recibe nada de ningún proveedor." No se incluye ningún perfil de proveedor de serie, por lo que la lista empieza vacía. Un perfil solo puede rellenar un campo de extensión. Cualquier otra cosa necesita una versión de código (véase la tabla de ámbito más abajo).

**4. Requisitos previos y dependencias.** Ninguno en esta guía. Para probar hace falta un mensaje de ejemplo del proveedor.

Setup step: Tier 6, step 2
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-interface_dictionary - Lista de perfiles de proveedor, editor de correspondencias, panel de prueba y versiones]

**6. Referencia de campos.**

Nuevo perfil de proveedor.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Proveedor o dispositivo | Texto | Obligatorio | El nombre del proveedor. Un nombre ya en uso se rechaza. | En blanco |
| Formato del mensaje | Elección entre **HL7 v2**, **JSON**, **FHIR** | Obligatorio | Decide la sintaxis de la ubicación en cada correspondencia. | HL7 v2 |
| Tipo de mensaje | Texto. Marcadores: `ORU^R01` (HL7), `Observation` (FHIR), opcional para JSON | Obligatorio para HL7 y FHIR | Un perfil HL7 necesita un tipo como `ORU^R01`. Un perfil FHIR necesita un tipo de recurso como `Observation`. Un mensaje de otro tipo se rechaza. | En blanco |
| Crear perfil | Botón | No aplicable | Crea el perfil sin ninguna versión en producción. | No aplicable |

Una correspondencia (una fila cada una en la copia de trabajo, con el título **Correspondencia n**).

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Dónde está en el mensaje | Texto, con la forma que usa el formato: `ZAB-3` u `OBX[2]-5.1` (HL7), `result.lotNumber` (JSON), `Observation.component[0].valueString` (FHIR) | Obligatorio | La ubicación del valor. Una ubicación que no está escrita con la forma del formato se rechaza. Una ubicación que termina en un grupo y no en un valor no supera la prueba. Aparece una etiqueta **Segmento del proveedor (Z)** cuando una ubicación HL7 está en un segmento Z. | En blanco |
| Campo de extensión | Texto: `ext.` y después un nombre que empiece por una letra minúscula, solo letras y dígitos, hasta 40 caracteres | Obligatorio | El campo del caso que recibe el valor. Una parte de la estructura propia del caso se rechaza ("Requiere una versión de código"). Dos correspondencias no pueden rellenar el mismo campo. | `ext.` |
| Nombre que se muestra en el caso | Texto | Obligatorio | La etiqueta que ve un usuario en el panel de campos del proveedor. | En blanco |
| Tipo | Elección entre Texto, Número, Fecha, Fecha y hora, Sí / no, Código | Obligatorio | El valor se comprueba con el tipo en la prueba. | Texto |
| Convertir | Elección entre Ninguna, Recortar espacios, Minúsculas, Mayúsculas, Fecha HL7 a ISO, Fecha y hora HL7 a ISO | Opcional | Las conversiones de fecha necesitan el tipo Fecha o Fecha y hora. | Ninguna |
| Valor predeterminado si falta | Texto | Opcional | Se usa cuando el mensaje no tiene valor. Debe ser adecuado para el tipo. | En blanco |
| Traducción de códigos | Texto: `vendor value = shown value`, separados por comas. Ejemplo `F=Female, M=Male` | Opcional | Cada entrada necesita los dos lados. Un valor sin traducción muestra **no hay traducción para este valor** en la prueba. | En blanco |
| Obligatorio (la prueba falla sin él) | Casilla Sí/No | Opcional | Un mensaje sin valor para una correspondencia obligatoria no supera la prueba. | Desactivado |
| Añadir una correspondencia, Eliminar, Guardar correspondencias | Botones | No aplicable | Las modificaciones se aplican solo a la copia de trabajo. Guarde antes de probar o publicar. | No aplicable |

Prueba, publicación y versiones.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Mensaje de ejemplo | Texto libre (marcado como dato del paciente) | Obligatorio para probar | Un ejemplo del proveedor. No se guarda; solo se conservan los recuentos. | En blanco |
| Ejecutar prueba | Botón | No aplicable | Muestra el campo de extensión, el valor y el resultado de cada correspondencia: **Asignado**, **Se usó el valor predeterminado**, **No está en el mensaje**, **Falta un valor obligatorio** o **Problema**. El resumen indica "Asignados n, obligatorios que faltan n, problemas n." | No aplicable |
| Publicar | Botón | No aplicable | Necesita una copia de trabajo guardada con al menos una correspondencia, sin problemas de correspondencia y con una prueba superada más reciente que el último cambio. La versión en producción pasa a ser la versión anterior. | No aplicable |
| Tabla de versiones | Solo lectura: Versión, Estado, Cuándo, Por | No aplicable | El estado es **Borrador**, **Probado**, **Activo**, **Sustituido** o **Desactivado**. | No aplicable |
| Iniciar un nuevo borrador | Botón | No aplicable | Copia la versión en producción en una nueva copia de trabajo. Solo puede haber una copia de trabajo abierta por proveedor. | No aplicable |
| Revertir | Botón | No aplicable | Publica la versión anterior como una versión nueva. | No aplicable |
| Desactivar | Botón | No aplicable | Retira el perfil, de modo que ninguna versión queda en producción. | No aplicable |
| Caso (Aplicar a un caso) | Texto, un id de caso (número de acceso) | Obligatorio | El caso que recibe los campos del mensaje pegado, leído con la versión en producción. Solo demostración, con la etiqueta **Simulado**. | En blanco |

La tabla de ámbito de la pantalla enumera lo que puede gestionar una correspondencia (los códigos del proveedor, los formatos de fecha y hora, los nombres que se muestran en el caso, los elementos adicionales de JSON o FHIR, los valores obligatorios y predeterminados, las pruebas y las versiones, y los segmentos Z de HL7 propios del proveedor) y lo que necesita una versión de código (la identidad del paciente, los datos del pedido y del número de acceso, las muestras, los bloques y las preparaciones, el diagnóstico y el contenido del informe, la firma y las enmiendas, las reglas de facturación y de cargos, las reglas de flujo de trabajo y de enrutamiento, y un tipo de mensaje nuevo).

**7. Permisos.** Las tres son exclusivas de la plataforma: `platform:interface-dictionary:manage` (crear, editar, probar, desactivar, revertir), `platform:interface-dictionary:publish` (publicar; requiere manage) y `platform:interface-dictionary:simulate` (aplicar a un caso en la demostración; requiere manage). Solo las tiene el rol Superadmin. Un hospital no puede concedérselas a sus propios roles. Sin manage, la sección está oculta. Un cambio rechazado indica "Solo el personal de ForMedrixAI puede cambiar los perfiles de proveedor."

**Límites conocidos.** No se incluye ningún perfil de proveedor de serie y todavía no se lee ningún mensaje real a través de un perfil. El encabezado de la sección en el código lo denomina Message Mapper; no existe ese nombre de menú.
## Punto de acceso FHIR R4 y credenciales de cliente OAuth2 {#ch7-fhir}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

**Estado:** No construido

PathScribe no tiene ningún punto de acceso FHIR R4. No publica un servidor FHIR, no acepta un recurso FHIR de otro sistema y no tiene ninguna pantalla para configurar una dirección base de FHIR, un id de cliente, un secreto de cliente o una dirección de token. Tampoco hay una pantalla de configuración de credenciales de cliente OAuth2. No planifique una puesta en marcha que dependa de alguna de las dos.

Lo más parecido que existe, para que sepa a qué puede referirse una pregunta:

| Qué | Qué es | Estado |
|---|---|---|
| Servicio de casos para un origen FHIR (`FHIRCaseService.ts`) | Una estructura provisional para leer casos de un servidor FHIR. La dirección base es un marcador de posición y la función que obtiene un token de acceso genera un error. No está conectada a ninguna pantalla ni ajuste. | No construido |
| FHIR como formato de mensaje en el [Diccionario de interfaz](#screen-interface_dictionary) | Se puede escribir un perfil de proveedor para un recurso FHIR como `Observation`, y la prueba lee un ejemplo pegado. Nada recibe un mensaje FHIR de un proveedor. | Parcial, solo ForMedrixAI |
| Tipo de autenticación en el Editor de centros | La pestaña **Integración con el SIL** permite elegir `OAuth2` como tipo de autenticación para la conexión del motor de un centro. Es una opción guardada. Ningún código la lee. | Solo guardado |
| Credenciales de cliente OAuth2, o TLS mutuo, para el motor de cada inquilino (tenant) | El contrato sobre cómo se identifica el motor ante la API de PathScribe (`INTERFACE_ENGINE_EDGE.md`). | Planificado |
| Inicio de sesión del personal mediante OpenID Connect (OIDC) | Inicio de sesión único para personas, no para mensajes entre sistemas. Se trata en el Nivel 1. | Construido (lado del navegador) |
| Tokens del [Canal de informes (Power BI)](#screen-bi_feed) | Tokens de portador que emite PathScribe, muestra una sola vez y conserva solo como huella. No son OAuth2. | Parcial |

La página [Mock EMR](#screen-mock-emr) contiene la nota "En producción se usa la API FHIR R4 para sincronizar con el LIS." Nada en el código respalda esa frase. Trátela como una intención de diseño.

## Integración con HCE: Epic, Cerner, MEDITECH y AthenaHealth {#ch7-ehr}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

**Estado:** No construido

PathScribe no tiene ningún conector para ninguna HCE, certificado o no. No figura en el mercado de aplicaciones de ningún proveedor y, según las pruebas de esta guía, no ha superado la validación de ninguno. Todo lo que una HCE envía o recibe pasa por el motor de interfaces, que configura el equipo de interfaces del hospital, y PathScribe solo ve los mensajes de [Tipos de mensaje](#ch7-hl7-types). No describa PathScribe a un cliente como "certificado por Epic", "certificado por Cerner" ni similar.

| HCE | Qué existe en PathScribe | Qué no existe |
|---|---|---|
| Epic | Un ajuste predefinido de formato de identificador llamado **Epic Beaker** (número de acceso y un patrón de código de barras 2D de preparación). Se establece en la pestaña Formatos de identificador del Editor de centros, Nivel 1. | Un conector, un perfil de mensaje específico de Epic, una certificación, un registro de aplicación FHIR. |
| Cerner | Un ajuste predefinido de formato de identificador llamado **Cerner PathNet**. | Lo mismo. |
| MEDITECH | Un ajuste predefinido de formato de identificador llamado **MEDITECH**. | Lo mismo. |
| AthenaHealth | Nada. El nombre no aparece en el código, en las pantallas ni en los documentos de diseño. | Todo. |

La misma lista de ajustes predefinidos contiene también Generic, CoPath, Sunquest y Custom. Un ajuste predefinido solo decide qué patrones de número de acceso y de código de barras reconoce el cuadro de escaneado. No intercambia mensajes con nada.

**Cómo es hoy una integración con una HCE.** Una HCE solo puede llegar a PathScribe a través del motor, como los mensajes salientes de [Tipos de mensaje](#ch7-hl7-types) (resultados, actualizaciones de pacientes, eventos de pedidos, eventos de acceso) y como procesadores entrantes que aún no están conectados a un receptor real. El [Diccionario de interfaz](#screen-interface_dictionary) no incluye de serie ningún perfil de proveedor para ninguna HCE. La [Correspondencia de códigos de muestra](#screen-crosswalk) asigna los códigos de muestra de una HCE cuando un pedido llega al servicio de entrada de pedidos. La HCE conserva la autoridad sobre la identidad del paciente: un mensaje A40, A24, A47 o A43 que no se puede emparejar se pone en cola como excepción de interfaz para una persona y nunca se adivina. Véase [Registros del sistema: interfaces](#screen-audit-interfaces).

### Mock EMR {#screen-mock-emr}
Breadcrumb: Inicio > Mock EMR

**Estado:** Demostración

**1. Navegación:** una ventana que se abre desde un caso en la compilación de demostración, en la dirección `/mock-emr?case=<reference>`. Solo se construye cuando las herramientas de demostración están activadas (`__DEMO_TOOLS__`); una compilación que se comunica con un servidor de API no la incluye.
**2. Elemento de mantenimiento:** Mock EMR

**3. Finalidad de negocio y alcance.** Un sustituto de la vista de paciente de una HCE, para que una demostración pueda mostrar la ventana complementaria de la HCE junto a un caso. Busca al paciente del caso por número de historia clínica en los casos de demostración y muestra un resumen clínico fijo. No lee ninguna HCE real y lleva la etiqueta **DEMO: DATOS SINTÉTICOS**. Si el número de historia clínica no corresponde a ningún paciente, indica **No se ha encontrado ningún paciente** en lugar de mostrar un paciente equivocado.

**4. Requisitos previos y dependencias.** Ninguno. Necesita un caso con un paciente en los datos de demostración.

Setup step: Reference, not part of setup
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-mock-emr - Vista de paciente de Mock EMR con la insignia de demostración]

**6. Referencia de campos.** Una página de solo lectura. No se puede cambiar nada en ella.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre del paciente, NHC, fecha de nacimiento, sexo | Texto (solo lectura, marcado como dato del paciente) | No aplicable | Del caso de demostración emparejado. La fecha de nacimiento indica "sin registrar" cuando falta. Aparece una insignia NHS cuando se ha verificado un número NHS. | No aplicable |
| Episodio, Estado, Planta | Texto (solo lectura) | No aplicable | Valores fijos de demostración (Ingresado, planta 4B Urología). | Fijo |
| Resumen clínico: Problemas activos, Medicación | Texto (solo lectura) | No aplicable | Texto fijo de demostración, no tomado del paciente. | Fijo |
| Nota de integración | Texto (solo lectura) | No aplicable | La frase sobre FHIR R4. Véase la nota en [FHIR R4 y OAuth2](#ch7-fhir). | Fijo |

**7. Permisos.** No hay ninguna capacidad y la ruta no tiene control de pantalla. La página solo existe en una compilación de demostración.

**Límites conocidos.** Solo datos sintéticos, y el resumen clínico es el mismo para todos los pacientes. No es una integración.

## Interfaces con laboratorios de referencia {#ch7-reflab}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

**Estado:** Parcial

Un laboratorio de referencia es un centro al que se envían muestras para pruebas externalizadas, por ejemplo moleculares o de inmunohistoquímica enviada fuera. PathScribe admite el envío con un manifiesto y la recepción con un mensaje de resultado. El lado saliente está construido; el lado entrante tiene un procesador pero no un punto de acceso.

No hay ninguna pantalla llamada "interfaz de laboratorio de referencia". La configuración se reparte entre pantallas que ya tiene:

1. **Convierta el laboratorio en un centro.** En el [Diccionario de centros](#screen-facility-dictionary), añada el laboratorio y asígnele el rol **Laboratorio de referencia (destino de derivación saliente)**. Ese rol permite seleccionarlo como destino de un lote de derivación. Solo se ofrece un centro activo que tenga el rol.
2. **Vincúlelo con las pruebas que realiza.** En el [Catálogo diagnóstico](#screen-stains), una prueba **Molecular** enumera los laboratorios de referencia autorizados para realizarla y cuál es el predeterminado. El predeterminado debe ser uno de los laboratorios autorizados. El vínculo solo se conserva para la categoría Molecular, y un pedido adicional de esa prueba rellena el predeterminado y ofrece solo los laboratorios autorizados.
3. **Envíe.** Los lotes de derivación se crean en [Gestión de lotes](#screen-batch-management) con el nodo de procesamiento **Derivación externa** y un centro de destino. Cuando el lote completa la conciliación, PathScribe pone en cola un mensaje `REFERRAL_MANIFEST` y crea automáticamente el registro de seguimiento. Un fallo en este punto nunca bloquea la finalización del propio lote. El manifiesto lleva el id del lote, el código de barras maestro, el centro de destino, la prueba solicitada, la prioridad (**URGENTE (STAT)** o **Rutina**), los elementos (id visible, tipo de material, número de acceso del caso y etiqueta de la muestra) y los pedidos moleculares enviados fuera. PathScribe decide qué y cuándo; el motor decide el transporte.
4. **Vigile el envío.** El mensaje aparece en la [Cola de salida](#screen-outbound-queue) bajo el canal **Derivaciones**, y en la [DLQ de interfaz saliente](#screen-outbound-interface-dlq) bajo la cola **Manifiesto de derivación**, donde se reenvía uno que ha fallado.
5. **Reciba la respuesta.** Un mensaje de resultado (`ReferralResultEventPayload`) lleva el id del lote y un resultado **discrete** (texto) o un **pdf_attachment** (un enlace a un PDF), nunca ambos, y opcionalmente los resultados de cada pedido molecular enviado fuera. El procesador comprueba la forma, encuentra el lote, registra el resultado y marca el lote como **result_received**, y después aplica los resultados codificados a los pedidos moleculares. El estado de un lote solo avanza: enviado, en tránsito, entregado, resultado recibido. Una persona puede establecer en tránsito y entregado a mano; resultado recibido se establece solo cuando llega un resultado.

**Qué no está construido.** Ningún punto de acceso recibe un mensaje de resultado, por lo que ningún resultado llega por sí solo desde un laboratorio de referencia. El procesador recuerda los ids de los mensajes que ha tratado solo en memoria, de modo que un reinicio los olvida. Devuelve una de cuatro respuestas: aplicado, ya aplicado, seguimiento no encontrado o contenido no válido. No hay ningún ejemplo de prueba de un resultado de derivación en el [Mock Interface Engine](#screen-mock-interface-engine). PathScribe no traduce el vocabulario propio de un laboratorio de referencia (sus nombres de prueba y sus códigos de resultado); eso corresponde al motor.

## Supervisión de interfaces, colas de errores y reprocesamiento {#ch7-monitoring}
Breadcrumb: Inicio > Calidad y cumplimiento

**Estado:** Construido (lado del navegador)

Todo lo que un administrador necesita para ver qué ha fallado, y para reenviarlo, retenerlo o liberarlo, está en las pantallas de esta parte. Hoy funcionan con los datos de demostración y con los servicios del servidor de API. Lo que añade el motor cuando se conecta (un latido, resultados confirmados por acuse de recibo y ventanas de reintento automático) está Planificado. Véase [Qué funciona hoy y qué está Planificado](#ch7-today).

### Reglas de reprocesamiento de un vistazo {#ch7-reprocessing}
Breadcrumb: Inicio > Calidad y cumplimiento

Un mensaje fallido nunca se descarta, y hoy nada se reenvía sin que una persona pulse un botón. Las reglas siguientes son las que aplica el código.

| Situación | Dónde aparece | Qué puede hacer | Capacidad |
|---|---|---|---|
| Un mensaje entrante de paciente no se pudo emparejar (A40, A24, A47, A43) | [Registros del sistema: interfaces](#screen-audit-interfaces), Excepciones de interfaz | Revisarlo, vincular los pacientes a mano o mover casos, o descartarlo. El mensaje nunca se adivina. | Ninguna específica. Véanse los límites conocidos allí. |
| Un código de pedido entrante no coincide con el Diccionario de muestras | Excepciones de interfaz, tipo `unmapped_order_code` | **Asignar y vincular** crea la entrada de la [Correspondencia de códigos de muestra](#screen-crosswalk), o se descarta. | `config:crosswalk:manage` para la entrada |
| Un mensaje saliente no se pudo enviar | [DLQ de interfaz saliente](#screen-outbound-interface-dlq), y la [Cola de salida](#screen-outbound-queue) como **Fallido** | **Reintentar envío** o **Enviar ahora** lo envía de nuevo al motor. | `interface:outbound:resend` |
| Un mensaje no debe salir todavía | Cola de salida, **En espera** o **Fallido** | **Retenerlo** con un motivo y después **Liberarlo**. Ninguna otra acción envía un mensaje retenido: el reintento indica "Retenido en la pantalla Cola saliente: libérelo primero allí." | `interface:outbound:hold`, `interface:outbound:release` |
| Un mensaje falló tras agotar sus reintentos automáticos | Cola de salida, **En cola de mensajes fallidos** | **Reintentar**, o **Retirar cargo** en un elemento de facturación. | `interface:outbound:resend`, `interface:outbound:retract` |
| Un registro rechazó un envío | Cola de salida, **Rechazado** | **Reintentar** (reenviar) con un motivo, o **Marcar como no notificable** con un motivo. | `interface:outbound:resend`, `interface:outbound:mark-not-reportable` |
| Un cargo debe salir antes de tiempo o cancelarse | Cola de salida, elementos de facturación | **Liberar ahora** o **Retirar cargo**. | `interface:outbound:override-release`, `interface:outbound:retract` |
| Falló la impresión, el fax o el depósito de archivo de un informe tras sus reintentos | Excepciones de entrega, en la parte superior de la DLQ de interfaz saliente | Reenviar desde su propia cola (la Cola de impresión o la Entrega de informes). Sale de la lista cuando se envía correctamente. | `interface:outbound:resend` para la entrega de informes |
| Un cargo en cola falló | La subpestaña DLQ de salida de Registros del sistema, Financiero (Nivel 7) | Véase [Registros del sistema: financiero](#screen-audit-financial). | Véase esa pantalla |

**Los roles integrados.** Admin tiene todas las capacidades `interface:outbound:*`, `interface:engine-status:view` y `jobs:server-job:view`. Lab Director no tiene ninguna de ellas y no dispone de la pantalla Cola de salida. QA Reviewer abre solo la pantalla del registro de auditoría y las exportaciones. Superadmin tiene todas las capacidades (salvo `config:ai-prompt:approve`, retirada por la separación de funciones). No hay ningún rol integrado de analista de interfaces: el hospital crea uno y le concede las capacidades que desee (el archivo de datos iniciales lo indica).

**Qué hace un reenvío.** Un reenvío construye de nuevo el mensaje a partir del registro y lo publica. Si el registro al que se refiere ya no existe, no se envía nada y la pantalla indica "No enviado: no se pudo construir el mensaje". Un resultado que todavía no tiene PDF del informe se retiene, no se envía, y sale con el PDF en un reintento posterior. Toda acción que cambia un mensaje se registra en el registro de auditoría, con una entrada por mensaje, y el texto de auditoría nunca incluye el nombre de un paciente. El reintento a nivel de transmisión (el motor que reintenta una conexión) corresponde al motor, no a PathScribe.

### Registros del sistema: interfaces {#screen-audit-interfaces}
Breadcrumb: Inicio > Calidad y cumplimiento > Registros del sistema > Registro de interfaces

**Estado:** Construido

**1. Navegación:** Inicio > **Calidad y cumplimiento** > **Registros del sistema** > pestaña **Registro de interfaces** (el nombre de la pestaña en la pantalla), en `/audit?tab=interfaces`.
**2. Elemento de mantenimiento:** Registros del sistema: interfaces

**3. Finalidad de negocio y alcance.** El único lugar donde ver qué ha ido mal en el límite con otros sistemas. Tiene cinco subpestañas: **Excepciones de interfaz** (mensajes entrantes que no se pudieron procesar), **DLQ de interfaz saliente** (mensajes salientes que han fallado o están en espera), **Envíos de salida** (el rastro de los eventos de creación de pedidos), **Cola de impresión** y **Motores** (estado del motor de interfaces, que solo se muestra con `interface:engine-status:view`). Una línea sobre las subpestañas resume los motores y abre **Motores** con un clic. La pestaña muestra una insignia con el número de excepciones pendientes.

Este capítulo documenta aquí las Excepciones de interfaz y las otras cuatro subpestañas en sus propias pantallas: [DLQ de interfaz saliente](#screen-outbound-interface-dlq), [Envíos de salida](#screen-outbound-dispatches) y [Motores de interfaces](#screen-interface-engines). La subpestaña Cola de impresión no está documentada en esta guía; véanse las preguntas abiertas.

**4. Requisitos previos y dependencias.** Aquí no se configura nada. La lista se llena cuando se genera una excepción de interfaz. Las excepciones de código de pedido sin asignar aparecen cuando la [Correspondencia de códigos de muestra](#screen-crosswalk) no tiene ninguna entrada para un código.

Setup step: Reference, not part of setup
Requires: [Correspondencia de códigos de muestra](#screen-crosswalk)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-audit-interfaces - Pestaña Registro de interfaces con la subpestaña Excepciones de interfaz, indicadores de estado y búsqueda]

**6. Referencia de campos.**

Subpestaña Excepciones de interfaz.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Indicadores de estado | Elección entre **Todos**, **Pendiente**, **Resuelto**, **Descartado**, cada uno con un recuento | Opcional | Filtra la lista. | Todos |
| Buscar | Texto, marcador "Buscar tipo de evento, motivo…" | Opcional | Coincide con el tipo de evento y el motivo. El enlace de la Correspondencia de códigos de muestra abre esta pestaña buscando `unmapped_order_code`. | En blanco |
| Exportar CSV | Botón | No aplicable | Descarga la lista filtrada. No incluye nombre del paciente, número de historia clínica ni fecha de nacimiento. Auditado. | No aplicable |
| Asociar paciente | Botón, visible cuando el usuario pertenece a una organización | No aplicable | Abre la herramienta de acceso de emergencia (break-glass) para volver a vincular una identidad de paciente de contingencia. Una acción poco frecuente y restringida. | No aplicable |
| Fecha y hora | Fecha y hora (solo lectura) | No aplicable | Cuándo se generó la excepción. | No aplicable |
| Tipo de evento | Insignia de texto (solo lectura), por ejemplo `A40`, `A24`, `A47`, `A43`, `unmapped_order_code` | No aplicable | El tipo de mensaje. Junto a él hay una etiqueta de referencia de soporte. | No aplicable |
| Motivo | Texto (solo lectura, marcado como dato del paciente) | No aplicable | El motivo exacto por el que no se pudo procesar, por ejemplo "MRG-5 does not match any known Encounter." | No aplicable |
| Paciente de origen, Paciente de destino | Texto (solo lectura, marcado como número de historia clínica) | No aplicable | Los identificadores extraídos antes del fallo. Un guion cuando no se pudo leer ninguno. | No aplicable |
| Estado | Botón **Revisar** mientras está pendiente; insignia **Resuelto** o **Descartado** después | No aplicable | **Revisar** abre la ventana siguiente. | Pendiente |
| Pie de página | "Mostrando n de n excepciones de interfaz" | No aplicable | Los recuentos mostrado y total. | No aplicable |

#### Ventana Revisar excepción de interfaz
Breadcrumb: Inicio > Calidad y cumplimiento > Registros del sistema > Registro de interfaces > Revisar excepción de interfaz

Lo que ofrece la ventana depende del tipo de evento. Descartar está disponible para todos los tipos.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Paciente de origen, Paciente de destino | Texto (solo lectura) | No aplicable | Los dos pacientes que nombraba el mensaje. "No se ha podido resolver la identidad del paciente" aparece con el identificador original cuando falló el emparejamiento. | No aplicable |
| Casos activos del paciente de origen (solo A43) | Lista de casillas con los casos, su muestra, centro y estado | Opcional | Elija qué casos, si procede, pasan al paciente de destino. | Ninguno seleccionado |
| Mover los casos seleccionados (solo A43) | Botón | No aplicable | Mueve cada caso seleccionado y registra la excepción como resuelta con una nota de cuántos se movieron y de los fallos. Desactivado hasta que se selecciona un caso y se conocen los dos pacientes. | No aplicable |
| Búsqueda y listas de pacientes (A40, A24, A47) | Cuadro de búsqueda y lista de selección, uno para cada lado. A47 solo tiene el lado de origen, "Paciente cuyo identificador se corrige". A40 muestra "Paciente anterior (fusionado)" y "Paciente que prevalece". A24 muestra "Primer registro de paciente" y "Segundo registro de paciente". | Obligatorio | Elija el o los registros a los que se refería el mensaje. "No se supone nada." | En blanco |
| Aplicar (A40, A24, A47) | Botón, "Aplicar A40" y así sucesivamente | No aplicable | Aplica el mensaje a mano a los pacientes que haya elegido. | No aplicable |
| Código de petición original, Normalizado, Sistema de codificación (`unmapped_order_code`) | Texto (solo lectura) | No aplicable | Lo que llegó y cómo se normalizó. | No aplicable |
| Asignar a una entrada del Diccionario de muestras (`unmapped_order_code`) | Lista de selección con búsqueda | Obligatorio para asignar | La entrada a la que debe resolverse este código. | En blanco |
| Asignar y vincular (`unmapped_order_code`) | Botón | No aplicable | Crea directamente la entrada de la [Correspondencia de códigos de muestra](#screen-crosswalk), de modo que los pedidos posteriores con este mismo código se resuelvan y no repitan la excepción. Una excepción generada antes de que existiera el seguimiento de centros no se puede asignar aquí; añada la entrada en la Correspondencia de códigos de muestra y después descarte. | No aplicable |
| Descartar: no requiere acción | Botón | No aplicable | Cierra la excepción sin ningún cambio. Utilícelo cuando la identidad correcta ya se ha confirmado en origen, por ejemplo con un reenvío corregido desde la HCE. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:audit-log:open`. Exportar la lista: `audit:interface-log:export` (riesgo alto). Asociar paciente: `patient:break-glass:rebind` (riesgo alto; Admin la tiene de forma predeterminada). Admin, Lab Director y QA Reviewer abren la pantalla del registro de auditoría de forma predeterminada. Para las demás subpestañas, véase [Reglas de reprocesamiento de un vistazo](#ch7-reprocessing).

**Límites conocidos.** Resolver, descartar y vincular una excepción de interfaz no tiene una capacidad propia: cualquiera que pueda abrir la pantalla puede hacerlo. La excepción de un mensaje HL7 entrante solo puede aparecer cuando se procesa el mensaje, y todavía no existe ningún receptor real, por lo que en la compilación de demostración las excepciones proceden del simulador [Mock Interface Engine](#screen-mock-interface-engine). La revisión de un tipo de evento distinto de los cinco anteriores ofrece solo Descartar.
### Motores de interfaces {#screen-interface-engines}
Breadcrumb: Inicio > Calidad y cumplimiento > Registros del sistema > Registro de interfaces > Motores

**Estado:** Parcial

**1. Navegación:** Registros del sistema, pestaña **Registro de interfaces**, subpestaña **Motores**. La subpestaña solo aparece para quien tiene `interface:engine-status:view`.
**2. Elemento de mantenimiento:** Motores de interfaces (el título en pantalla)

**3. Finalidad de negocio y alcance.** Una lista con el motor de interfaces de cada hospital, que indica si sus receptores están activos, qué está en espera y qué ha fallado. Se actualiza cada minuto y tiene un botón **Actualizar**. Es de solo lectura: los canales se inician y se detienen en el propio motor, y los mensajes salientes fallidos se reenvían desde la [DLQ de interfaz saliente](#screen-outbound-interface-dlq) (el botón **Abrir Saliente** lleva allí).

**Qué está construido y qué está Planificado.** La pantalla y las reglas de estado están construidas. Los datos proceden del latido del motor, que el motor envía cada 60 segundos a un punto de acceso Planificado (`POST /api/interface/heartbeat`; la lista es `GET /api/interface/engines`). Hasta entonces, la demostración muestra cuatro motores de ejemplo, uno por cada estado, con una insignia **Simulado**, e indica "There is no interface engine in the demo." Si no hay ningún motor registrado, la lista indica "Todavía no se ha registrado ningún motor de interfaces."

**4. Requisitos previos y dependencias.** Aquí no se configura nada. ForMedrixAI debe instalar y registrar un motor; eso está Planificado.

Setup step: Reference, not part of setup
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-interface-engines - Motores de interfaces con estado, canales, mensajes en cola y mensajes no entregados]

**6. Referencia de campos.** Una página de solo lectura.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Línea de resumen | Texto, "Motores de interfaces: ..." | No aplicable | Recuentos: en línea, degradados, sin conexión, que requieren atención, receptores caídos, mensajes en espera. | No aplicable |
| Estado | **En línea**, **Degradado**, **Sin conexión**, **Requiere atención** (solo lectura) | No aplicable | Sin conexión: sin latido durante 180 segundos, según el reloj del servidor. Degradado: el motor no puede conectarse con PathScribe, el certificado caduca en menos de 14 días, el espacio libre en disco es inferior al 15 por ciento, un canal está en error, en pausa o detenido, o un mensaje ha esperado más de 15 minutos. Requiere atención: por lo demás en buen estado, pero un canal tiene mensajes no entregados. En línea: ninguna de las anteriores. | No aplicable |
| Alojamiento | **Alojado** o **En las instalaciones** | No aplicable | Dónde se ejecuta el motor (decisión D6). | No aplicable |
| Versión, Última conexión | Texto | No aplicable | La versión del motor, y "Nunca se ha conectado" cuando no hay ninguna. | No aplicable |
| Se conecta con PathScribe | Texto | No aplicable | **Se conecta con PathScribe**, o "No se puede conectar con PathScribe: se almacenan los mensajes para reenviarlos". | No aplicable |
| Disco libre, El certificado caduca | Porcentaje, fecha | No aplicable | Los dos datos de estado indicados arriba. | No aplicable |
| Canal | Texto | No aplicable | El canal del motor. | No aplicable |
| Dirección | **Entrante (receptor)** o **Saliente** | No aplicable | | No aplicable |
| Estado | **Iniciado**, **En pausa**, **Detenido**, **Error** | No aplicable | Una línea de problema del canal lo explica: En espera más de n minutos; Mensajes no entregados por resolver; En error; En pausa, cola conservada; Detenido. | No aplicable |
| En espera, El más antiguo en espera, Mensajes no entregados | Número, minutos, número | No aplicable | Profundidad de la cola, antigüedad del mensaje en espera más antiguo y recuento de mensajes en la cola de mensajes fallidos. | No aplicable |
| Totales | Texto | No aplicable | Mensajes en espera, mensajes no entregados y receptores caídos en todos los motores. | No aplicable |
| Actualizar, Abrir Saliente | Botones | No aplicable | | No aplicable |

**7. Permisos.** `interface:engine-status:view` (riesgo estándar; requiere `screen:audit-log:open`). Admin la tiene de forma predeterminada; un hospital puede concederla a sus analistas de interfaces. Quien no la tiene no ve la subpestaña, y una lectura rechazada indica "No tiene permiso para ver los motores de interfaces."

**Límites conocidos.** Todavía ningún motor envía informes, por lo que la lista real está vacía hasta que existan el punto de acceso del latido y la imagen del motor (Planificado, fase 2e). Los límites de estado están fijados en el código y no tienen ajuste.

### DLQ de interfaz saliente {#screen-outbound-interface-dlq}
Breadcrumb: Inicio > Calidad y cumplimiento > Registros del sistema > Registro de interfaces > DLQ de interfaz saliente

**Estado:** Construido

**1. Navegación:** Registros del sistema, pestaña **Registro de interfaces**, subpestaña **DLQ de interfaz saliente**.
**2. Elemento de mantenimiento:** DLQ de interfaz saliente

**3. Finalidad de negocio y alcance.** Una cola de mensajes fallidos (DLQ) es la lista de mensajes que no se pudieron enviar. Esta pantalla muestra los mensajes de interfaz salientes fallidos y en espera de una cola cada vez y permite enviarlos de nuevo. **Enviar ahora** y **Reintentar** envían el mensaje al motor de interfaces. Los botones **Simular** son una ayuda para las pruebas y nunca envían. Un cargo fallido está en la DLQ financiera, que es independiente ([Registros del sistema: financiero](#screen-audit-financial)). El panel de excepciones de entrega (más abajo) está en la parte superior.

**4. Requisitos previos y dependencias.** Aquí no se configura nada. Un mensaje aparece después de que falle un envío saliente. Si `VITE_INTERFACE_RECEIVER_ENDPOINT` no está definida, el motor de demostración acepta o rechaza según su modo de respuesta (véase [Mock Interface Engine](#screen-mock-interface-engine)).

Setup step: Reference, not part of setup
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-outbound-interface-dlq - DLQ de interfaz saliente con selector de cola, filas con error y excepciones de entrega]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Cola | Elección entre ocho colas: Resultado de patología (ORU^R01); Resultado de citología (ORU^R01); ADT de paciente (A08/A40/A47); Sincronización de LIS en modo Asistencia; Eventos de acceso (registrado / deficiencia); Entrega de informes (fax electrónico, depósito de archivo); Manifiesto de derivación; Pedido molecular / de instrumento | Obligatorio | Selecciona la cola. Las dos primeras columnas de identificador y tipo cambian con ella (por ejemplo Caso y Estado del resultado; Paciente de origen y Tipo de evento; Código de barras del lote y Prioridad; Muestra o código de barras y Ensayo; Número de acceso y Canal e informe). Cambiar la cola borra los mensajes de resultado. | Resultado de patología |
| Con error: identificador, tipo | Texto (solo lectura, marcado como dato del paciente) | No aplicable | El registro y su tipo. | No aplicable |
| Con error: Error | Texto (solo lectura) | No aplicable | Uno de **Envío rechazado**, **Tiempo de espera del envío agotado**, **Motor inaccesible** o **Desconocido**, con el mensaje debajo. | No aplicable |
| Con error: Reintentos | Número | No aplicable | Cuántas veces se reenvió. Aparece "(máx. superado)" cuando la entrada lleva ese indicador. El envío del propio navegador no activa hoy nunca el indicador. | No aplicable |
| Con error: Reintentar envío | Botón | No aplicable | Reenvía. La respuesta aparece a su lado: "Enviado y aceptado por el motor de interfaces"; "No enviado: el motivo figura en la columna Error."; "Retenido: el PDF del informe todavía no está disponible"; "No enviado: no se pudo construir el mensaje"; "Ese mensaje ya no está en la cola."; "Retenido en la pantalla Cola saliente: libérelo primero allí"; o "No tiene permiso para reenviar mensajes de interfaz." | No aplicable |
| Con error: Registrar como CAPA | Botón | No aplicable | Registra el fallo como un elemento de acción correctiva y preventiva (CAPA). La fila muestra entonces **Registrado**. | No aplicable |
| En cola: identificador, tipo, En cola desde | Solo lectura | No aplicable | Mensajes en espera de salir. | No aplicable |
| En cola: Enviar ahora | Botón | No aplicable | Envía el mensaje ahora. | No aplicable |
| En cola: Simular rechazo, Simular tiempo de espera agotado, Simular inaccesible | Botones | No aplicable | Fabrican un fallo de ese tipo para realizar pruebas. Nunca reflejan un envío real. | No aplicable |
| Excepciones de entrega (n) | Lista de solo lectura: Caso, Canal, Intentos, Último error, Alternativa, Se abandonó | No aplicable | Impresiones, faxes y depósitos de archivos que siguieron fallando tras sus reintentos automáticos. Los canales alternativos de una regla se muestran como "Enviado por ...". Se envía un mensaje a Admin y Lab Director cuando se añade una. Una entrega que se realiza con éxito al reenviarla sale de la lista en la siguiente limpieza. "No hay excepciones de entrega." cuando está vacía. | No aplicable |

**7. Permisos.** Abrir: `screen:audit-log:open`. Enviar ahora, Reintentar envío y los botones Simular: `interface:outbound:resend` (riesgo alto, auditado). Admin la tiene de forma predeterminada. Un hospital puede concedérsela a su propio rol de analista de interfaces. Registrar como CAPA no tiene una capacidad propia.

**Límites conocidos.** El subtítulo dice "seven queues" pero la pantalla ofrece ocho. No hay reintento automático en el navegador: un mensaje fallido espera a una persona. Las ventanas de reintento planificadas están en [Qué funciona hoy y qué está Planificado](#ch7-today).

### Envíos de salida {#screen-outbound-dispatches}
Breadcrumb: Inicio > Calidad y cumplimiento > Registros del sistema > Registro de interfaces > Envíos de salida

**Estado:** Construido

**1. Navegación:** Registros del sistema, pestaña **Registro de interfaces**, subpestaña **Envíos de salida**.
**2. Elemento de mantenimiento:** Envíos de salida

**3. Finalidad de negocio y alcance.** El rastro de cada evento de creación de pedido que PathScribe envió al motor de interfaces (categoría E), con su desenlace. Es un registro, no una cola de fallos. Los envíos fallidos de resultados y de actualizaciones de pacientes están en la [DLQ de interfaz saliente](#screen-outbound-interface-dlq). Abra una fila para ver el JSON exacto que se envió. PathScribe envía JSON; el motor construye con él el mensaje HL7.

**4. Requisitos previos y dependencias.** Aquí no se configura nada. Las filas aparecen cuando se envía un mensaje de pedido creado.

Setup step: Reference, not part of setup
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-outbound-dispatches - Tabla de envíos de salida y panel lateral del contenido]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtro de estado | Elección entre **Todos**, **Entregado**, **Fallido**, **Resultado desconocido** | Opcional | Filtra la tabla. Resultado desconocido significa que el mensaje se registró pero no volvió ningún desenlace. | Todos |
| Buscar | Texto, "Buscar por ID de mensaje o número de acceso…" | Opcional | Coincide con el id del mensaje y el número de acceso. | En blanco |
| Fecha y hora | Fecha y hora (solo lectura) | No aplicable | Cuándo se envió. | No aplicable |
| ID del mensaje | Texto (solo lectura) | No aplicable | El id del mensaje. | No aplicable |
| Número de acceso | Texto (solo lectura, marcado como dato del paciente) | No aplicable | El caso. | No aplicable |
| Categoría | Texto, **E: orden** | No aplicable | La categoría de la transacción. | No aplicable |
| Tipo de mensaje | Texto (solo lectura) | No aplicable | El tipo de transacción. | No aplicable |
| Centro solicitante | Texto (solo lectura) | No aplicable | El centro del que procedía el pedido. | No aplicable |
| Estado | **Entregado**, **Fallido**, **Resultado desconocido**, con "n intentos" | No aplicable | El desenlace. | No aplicable |
| Panel del contenido saliente | JSON de solo lectura con **Copiar contenido** | No aplicable | El JSON exacto que se envió, y el error si falló. Copiar lo pone en el portapapeles. | No aplicable |
| Pie de página | "Mostrando n de n envíos de salida" | No aplicable | | No aplicable |

**7. Permisos.** Abrir: `screen:audit-log:open`. No hay ninguna capacidad en la tabla ni en el botón de copiar. Admin, Lab Director y QA Reviewer abren la pantalla del registro de auditoría de forma predeterminada.

**Límites conocidos.** En este rastro solo están los eventos de creación de pedidos. Los demás tipos de transacción están en la DLQ mientras fallan y en la [Cola de salida](#screen-outbound-queue).

### Cola de salida {#screen-outbound-queue}
Breadcrumb: Inicio > Calidad y cumplimiento > Cola de salida

**Estado:** Construido

**1. Navegación:** Inicio > **Calidad y cumplimiento** > **Cola de salida**, en `/outbound-queue`.
**2. Elemento de mantenimiento:** Cola de salida

**3. Finalidad de negocio y alcance.** Todos los mensajes salientes en un solo lugar: retenerlos, liberarlos o reintentarlos, y corregir lo que rechazó un registro. Reúne diez flujos (Resultados, ADT de paciente, Acceso, Sincronización de LIS, Facturación, Entrega de informes, Resultados de citología, Derivaciones, Pedidos moleculares, Registro) y muestra el destino de cada mensaje (Motor de interfaces, Sistema de facturación, Socio de LIS, Servicio de entrega o Registro), el transporte que utiliza el motor (REST + mTLS, SFTP, Carga en portal, PHIN-MS, TCP directo o API HTTPS, que solo se muestran como parte de la etiqueta del destino) y su estado. PathScribe decide qué se libera y cuándo; el motor se encarga del transporte.

**4. Requisitos previos y dependencias.** La cola lee cuándo sale un mensaje, y su plazo de notificación, de las [Programaciones de entrega](#screen-delivery_schedules): la programación propia del centro ejecutor; si no, la de la empresa; si no, el valor predeterminado del flujo. Sin una programación, un mensaje sigue el valor predeterminado del flujo. Los elementos de facturación siguen además los ajustes de liberación de facturación, y los elementos de registro los ajustes del registro, ambos en el Nivel 7.

Setup step: Reference, not part of setup
Requires: [Programaciones de entrega](#screen-delivery_schedules)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-outbound-queue - Cola de salida con filtros de flujo, paneles de plazos, columna de estado y barra de acciones]

**6. Referencia de campos.**

Filtros y paneles.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtrar por flujo | Diez botones de alternancia | Opcional | Muestra solo los flujos elegidos. | Todos los flujos |
| Centro | Lista de selección, **Todos los centros** o un centro | Opcional | Limita a un centro. | Todos los centros |
| Buscar por número de acceso | Texto | Opcional | Coincide con el número de acceso. | En blanco |
| Panel Requiere revisión | Interruptor con recuento | Opcional | Muestra los elementos de facturación apartados para una persona (**Requiere revisión: código CPT sin asignar**, **sin centro de componente técnico**, **cargo delta de un caso enmendado**) y los elementos de registro que requieren revisión (un campo obligatorio vacío, ningún centro ejecutor, ningún perfil de estado, una regla estatal como "El caso no tiene código ICD-O-3"). | Desactivado |
| Panel Deltas de enmienda | Recuento | No aplicable | Cargos de casos enmendados. | No aplicable |
| Paneles de plazos de notificación | Recuentos, **Vencido** y **Próximo a vencer** | No aplicable | Plazos de notificación al registro. | No aplicable |
| Ordenar por, dirección | Elección entre Flujo, Estado, Hora en cola, Hora programada, Intentos, Plazo de notificación; ascendente o descendente | Opcional | El orden predeterminado pone primero los rechazados, después los de la cola de mensajes fallidos, los fallidos, los retenidos, los en espera, los enviados, los confirmados, los no notificables y los retirados. | Orden por estado |

La lista.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Seleccionar (fila y seleccionar todo) | Casilla | Opcional | Elige mensajes para una acción masiva. El recuento indica "Seleccionados: n". | Ninguno |
| Flujo, Número de acceso, Destino | Texto (solo lectura) | No aplicable | El flujo, el caso y el destino con su transporte. | No aplicable |
| Estado | Uno de **En espera**, **Retenido**, **Enviado**, **Confirmado**, **Fallido**, **En cola de mensajes fallidos**, **Rechazado**, **No notificable**, **Retirado** | No aplicable | En espera: en cola, sale a su hora. Retenido: una persona lo detuvo. Enviado: el motor lo tiene. Confirmado: el receptor lo confirmó. Fallido: falló un envío. En cola de mensajes fallidos: falló tras agotar sus reintentos automáticos. Rechazado: un registro lo devolvió con errores. No notificable y Retirado están cerrados. | No aplicable |
| Intentos, Programado, Plazo, Detalle | Solo lectura | No aplicable | El detalle lleva el motivo de la retención ("Retenido: ..."), el error, una fecha de liberación programada, una fecha límite de corrección, "Liberado antes de lo programado (id de usuario)", "Modifica un mensaje anterior", o el motivo del registro. | No aplicable |

Acciones, que se aplican a los mensajes seleccionados y comprueban la capacidad una sola vez para toda la selección. Cada mensaje recibe su propio resultado; el rechazo de uno no detiene los demás.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Retener | Botón, y después un panel | Motivo obligatorio | Permitido para En espera y Fallido. Motivo: Inactividad del receptor, Mantenimiento del receptor, Comprobación de los datos, Revisión de facturación, Posible duplicado u Otro. Una nota opcional de hasta 200 caracteres, con el marcador "Sin datos del paciente". | No aplicable |
| Liberar | Botón | No aplicable | Permitido para Retenido. Lo devuelve a la cola. | No aplicable |
| Reintentar | Botón, y después un panel para un mensaje rechazado | Motivo obligatorio cuando está rechazado | Permitido para Fallido, En cola de mensajes fallidos y Rechazado. Un mensaje rechazado necesita el motivo de su corrección: Datos corregidos, Codificación corregida, Corregido por el patólogo u Otro. | No aplicable |
| Marcar como no notificable | Botón, y después un panel | Motivo obligatorio | Permitido para Rechazado. Motivo: No es una enfermedad de notificación obligatoria, Fuera de la jurisdicción del registro, Ya notificado u Otro. No se envía nada más. | No aplicable |
| Retirar cargo | Botón, y después un panel | Motivo obligatorio | Solo elementos de facturación; permitido para En espera, Retenido, Fallido y En cola de mensajes fallidos. Motivo: Caso enmendado, Caso retirado, Cargo duplicado u Otro. Terminal. | No aplicable |
| Liberar ahora | Botón | No aplicable | Solo elementos de facturación; permitido para En espera y Retenido. Envía antes de lo programado y registra el id del usuario. | No aplicable |

Un rechazo se notifica como un recuento: no permitido, ya no está en la cola, no se puede retener, no está retenido, no se puede reintentar, no está rechazado, no se puede retirar, no se puede liberar, motivo obligatorio, o no enviado (véase la columna Detalle). El resumen indica "Modificados: n" y "No aplicable al estado: n."

**7. Permisos.** Abrir: `screen:outbound-queue:open`. Reintentar: `interface:outbound:resend`. Retener: `interface:outbound:hold`. Liberar: `interface:outbound:release`. Marcar como no notificable: `interface:outbound:mark-not-reportable`. Retirar cargo: `interface:outbound:retract`. Liberar ahora: `interface:outbound:override-release`. Todas son de riesgo alto y auditadas. Cada una de las cinco, además de resend, necesita la capacidad de la pantalla. Admin las tiene todas y la pantalla de forma predeterminada. Lab Director y QA Reviewer no tienen la pantalla. Retener y liberar se comprueban una sola vez para una selección masiva.

**Límites conocidos.** La cola contiene los mensajes que conoce el lado de PathScribe. Que un mensaje llegara a su receptor depende del acuse de recibo del motor, que está Planificado: hoy cualquier respuesta 2xx cuenta como enviado. Confirmado aparece solo en los flujos que llevan un acuse de recibo (registro). El transporte indicado en el destino es una etiqueta, porque el motor es el propietario del transporte.

## Otras integraciones y herramientas de prueba {#ch7-other}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones

**Estado:** Parcial

Estas pantallas pertenecen al Nivel 6 pero no tratan del motor de interfaces: un canal de informes para herramientas de análisis, la importación del historial de un sistema antiguo y las herramientas de demostración que sustituyen a sistemas que no están conectados.

### Canal de informes (Power BI) {#screen-bi_feed}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Canal de informes (Power BI)

**Estado:** Parcial

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones**
**2. Elemento de mantenimiento:** Canal de informes (Power BI)

**3. Finalidad de negocio y alcance.** Permite que Power BI, Excel, Tableau o un script lean datos de PathScribe a través de una API de informes en el servidor de API. Nunca se conectan a la base de datos. Usted elige lo que ofrece el canal (conjuntos de datos y centros del laboratorio ejecutor), emite un token para cada herramienta y mantiene fuera los datos identificativos salvo que una persona concreta los haya aprobado. De forma predeterminada, un token está anonimizado: se eliminan los nombres, los números de historia clínica, las fechas de nacimiento y el texto libre, las fechas se reducen al mes y las edades de 90 años o más aparecen como 90+.

**Qué está construido y qué no.** Construido: los ajustes, el registro de aprobación, la creación, sustitución y revocación de tokens, el catálogo de campos y la prueba de extracción. Un token se muestra una vez; PathScribe conserva solo una huella y no puede volver a mostrarlo. No conectado: el propio canal. La llamada de lectura, `GET /api/bi/v1/{dataset}` con `Authorization: Bearer psbi_...`, es un contrato escrito y la tarea de servidor PS-787. En la compilación de demostración, los ajustes y los tokens se conservan en el navegador, y **Probar una extracción** solo simula cómo respondería el servidor (no devuelve filas). Un aviso así lo indica.

**4. Requisitos previos y dependencias.** Un token solo puede limitarse a centros que tengan el rol de laboratorio ejecutor, por lo que esos centros van primero. Si los omite, la pantalla indica "No hay centros de laboratorio ejecutor configurados" y no se puede crear un token, porque debe ofrecerse al menos un centro.

Setup step: Tier 6, step 4
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-bi_feed - Ajustes del canal de informes, aprobación de tokens identificados, lista de tokens, prueba de extracción y catálogo de campos]

**6. Referencia de campos.**

Lo que ofrece el canal.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| El canal de informes está activado | Interruptor Sí/No | Opcional | Mientras está desactivado, se rechaza cualquier token y no se pueden crear tokens nuevos. | Desactivado |
| Conjuntos de datos | Casillas: Resúmenes de auditoría, Eventos de facturación, Casos y tiempos de respuesta, Calidad y discordancia, Muestras, Carga de trabajo y productividad. Los que pueden identificar a un paciente llevan la etiqueta "puede identificar a un paciente" (casos, muestras, facturación, calidad). | Opcional | Los conjuntos de datos que puede leer cualquier token. Los resúmenes de auditoría son recuentos diarios sin detalle de usuario ni de paciente. La carga de trabajo no tiene datos de pacientes. | Ninguno marcado |
| Centros del laboratorio ejecutor | Casillas | Opcional | Los centros que ofrece el canal. Un token puede limitarse a algunos de ellos y nunca puede llegar a uno que no esté marcado. | Ninguno marcado |
| Descartar cambios, Guardar ajustes | Botones | No aplicable | Desactivados hasta que algo cambia. | No aplicable |

Tokens identificados.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Aprobado por | Texto, hasta 80 caracteres | Obligatorio para registrar | La persona concreta que aprobó los datos identificados. | En blanco |
| Motivo | Texto, hasta 500 caracteres | Obligatorio para registrar | Por qué se necesitan datos identificados. | En blanco |
| Registrar aprobación | Botón | No aplicable | Registra la aprobación, con quién la registró y cuándo. A partir de ese momento se pueden crear tokens identificados. | No aplicable |
| Retirar aprobación | Botón | No aplicable | La elimina. Un token identificado deja de recibir datos identificativos hasta que se registre una nueva aprobación. Se rechaza con "No hay ninguna aprobación registrada que retirar" cuando no hay ninguna. | No aplicable |

Un token nuevo.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto, hasta 60 caracteres. Marcador "Panel de calidad". | Obligatorio | Único entre los tokens activos del centro ("Otra estación de trabajo activa de este centro tiene ese nombre." es el texto que muestra la pantalla). | En blanco |
| Qué recibe el token | Elección entre **Anonimizado** o **Identificado** | Obligatorio | Identificado está bloqueado hasta que haya una aprobación registrada. Identificado solo importa para los conjuntos de datos de casos, muestras, facturación y calidad; para los demás conjuntos de datos se rechaza. | Anonimizado |
| Conjuntos de datos que este token puede leer | Casillas de los conjuntos de datos que ofrece el canal | Obligatorio (al menos uno) | Un conjunto de datos que el canal no ofrece se rechaza. | Ninguno |
| Centros que este token puede leer | Casillas de los centros que ofrece el canal | Opcional | No marque ninguno para todos los centros que ofrece el canal. | Ninguno |
| Crear token | Botón | No aplicable | Muestra el token una vez con Copiar. El texto "Copy this token now ... It is shown only once." Un token empieza por `psbi_` y dura 365 días. | No aplicable |

La lista de tokens y la prueba de extracción.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre, Conjuntos de datos, Centros, Modo, Token, Última extracción, Estado | Columnas de solo lectura | No aplicable | Token muestra los últimos cuatro caracteres y la fecha de caducidad. El estado es **Activo**, **Caduca pronto** (en un plazo de 30 días), **Token caducado** o **Revocado**. Última extracción muestra el conjunto de datos, las filas y la hora. | No aplicable |
| Token nuevo (sustituir) | Botón en una fila | No aplicable | Emite un sustituto. El token anterior sigue funcionando durante 24 horas para que se pueda actualizar la herramienta. | No aplicable |
| Revocar | Botón, y después Motivo y Nota | Motivo obligatorio | Motivos: Puede estar comprometido, Inscrito por error, Trasladado a otro centro, Equipo sustituido, Equipo retirado, Otro. La nota es obligatoria para Otro y opcional en los demás casos. **Revocar ahora** lo confirma. Un token revocado deja de funcionar de inmediato. | No aplicable |
| Token (Probar una extracción) | Texto | Obligatorio | Un token pegado. | En blanco |
| Conjunto de datos (Probar una extracción) | Elección entre los conjuntos de datos | Obligatorio | El conjunto de datos que se solicita. | Primer conjunto de datos |
| Extraer | Botón | No aplicable | Muestra cómo respondería el servidor: Aceptado (filas y campos, y el modo), o Rechazado porque no tiene la forma de un token del canal, ningún token coincide, está revocado, ha caducado, el conjunto de datos no está permitido, el canal está desactivado, un token identificado no tiene aprobación, o el token ha extraído 60 veces en el último minuto. | No aplicable |
| Catálogo de campos | Tabla de solo lectura: Campo, Tipo, Canal anonimizado | No aplicable | Cada campo de cada conjunto de datos tal como lo ve un analista en la columna. La última columna muestra **Se conserva**, **Se elimina** o **Reducido al mes**. | No aplicable |

La API de lectura devuelve 1000 filas por página de forma predeterminada y 10 000 como máximo.

**7. Permisos.** Abrir: `screen:configuration:open`. Ajustes: `config:bi-feed:manage`. Crear, sustituir y revocar tokens y Probar una extracción: `config:bi-feed-tokens:manage`. Registrar y retirar la aprobación de datos identificados: `config:bi-feed-identified:approve`. Las tres son de riesgo alto. Admin y Lab Director las tienen de forma predeterminada, de modo que la persona que crea un token identificado y la que lo aprueba pueden ser la misma, salvo que un hospital las separe en el Diccionario de roles.

**Límites conocidos.** El canal todavía no se sirve; en la compilación de demostración solo funcionan los ajustes y los tokens. Mientras se cargan los datos, y en algunos mensajes de problema, la pantalla dice "workstation" cuando se refiere a un token del canal (un error de redacción en el texto). El límite del token de 60 extracciones por minuto y la vigencia de 365 días están fijados en el código.
### Incorporación de volantes {#screen-requisition_ingestion}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Incorporación de volantes

**Estado:** Parcial

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones**
**2. Elemento de mantenimiento:** Incorporación de volantes

**3. Finalidad de negocio y alcance.** El escáner del servicio escanea por lotes los volantes en papel en una carpeta de la red del hospital o en un sistema documental de terceros (un gestor documental, el almacén de documentos del LIS, un servicio de digitalización), o bien otro sistema los envía a la API de PathScribe. Cada carpeta o sistema es un origen, configurado por su dirección; puede haber tantos como hagan falta. PathScribe lee el código de barras de registro de cada página y vincula el escaneo a su caso, solo por referencia: el caso conserva un vínculo al archivo donde está, las páginas que le corresponden, el código de barras, la hora y el origen, y PathScribe no guarda ninguna copia. Una página sin código de barras se une al volante anterior; una hoja separadora cierra un volante y no pertenece a ningún caso. Un escaneo que no corresponde a ningún caso espera en la cola de volantes sin asignar, en Registro > **📥 Bandeja de volantes**, donde el personal lo vincula escaneando o escribiendo el número de registro, o lo descarta con un motivo.

**Qué está construido y qué no.** Construido: este ajuste, las reglas de asignación y agrupación de páginas, la bandeja de volantes, el botón **📄 Volante** del caso en la pantalla del informe y la pista de auditoría. En la versión de demostración, el navegador lee una carpeta de PDF ficticios cuando alguien pulsa **Ejecutar ahora**. No construido: la tarea programada del servidor que lee su recurso compartido (`requisition.ingest`), la lectura de un número impreso cuando no hay código de barras (OCR) y la API a la que un sistema emisor envía los escaneos. Solo se leen PDF; cualquier otro archivo se rechaza y se nombra en el resumen de la ejecución.

**Varios centros ejecutores.** Cada origen pertenece a un centro ejecutor (el campo **Centro ejecutor**), o a **Todos los centros** para un escáner que comparten todos los laboratorios. Los escaneos de un origen esperan en la cola de ese centro, y cada permiso siguiente se comprueba para ese centro: una persona asignada a un solo laboratorio (Personal → sus centros) solo ve, ejecuta y resuelve los escáneres y escaneos de ese laboratorio, y solo quien trabaja para todos los centros puede añadir o cambiar un origen común. **＋ Añadir origen** añade otro escáner; los botones sobre el formulario cambian entre ellos. La asignación abarca toda la organización: un número de registro designa un único caso, así que un volante escaneado en un laboratorio encuentra también un caso ejecutado en otro.

**Funcionamiento (sin servidor).** Cada origen lo lee una tarea programada que procesa un lote y termina; nada se ejecuta de forma permanente en la nube de PathScribe. Un sistema documental de terceros se lee en su dirección https y un sistema emisor envía a la API de PathScribe. Una carpeta de la red del hospital la lee el **agente de sitio** de PathScribe ya instalado allí para impresoras y recursos compartidos ([Agentes de sitio](#screen-site_agents)): lee los códigos de barras en la red del hospital y envía a PathScribe solo la referencia del archivo, las páginas y los códigos, de modo que el PDF nunca sale del hospital. La recogida de volantes por el agente de sitio aún no está construida. La comprobación de volantes ausentes se ejecuta cada hora.

**4. Requisitos previos y dependencias.** El escáner guarda PDF (un archivo puede contener muchos volantes) en una carpeta que el servidor de la API puede leer, y las etiquetas de registro de los volantes llevan el número de registro como código de barras Code 128 o Code 39.

Setup step: Tier 6, step 7
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-requisition_ingestion - the requisition source, schedule and separator barcode]

**6. Referencia de campos.**

| Nombre del campo | Tipo / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado |
|---|---|---|---|---|
| Leer este origen | Interruptor Sí/No | Opcional | Mientras está desactivado, la tarea no lee este origen. | Activado |
| Nombre | Texto | Obligatorio | Se muestra en la bandeja de volantes. | Requisition scanner drop folder |
| Centro ejecutor | Elección: **Todos los centros** o un centro con laboratorio ejecutor | Obligatorio | De quién es este escáner: sus escaneos esperan en la cola de ese centro y los permisos se comprueban para él. | El origen de demostración: Desert Valley Medical Center; un origen nuevo: el primer laboratorio ejecutor |
| Origen de los escaneos | Elección entre **Una carpeta de la red del hospital donde guarda el escáner**, **Un sistema documental de terceros que PathScribe lee en su dirección** y **Un sistema que envía escaneos a la API de PathScribe** | Obligatorio | Determina el contenido del campo siguiente. Añada un origen por cada carpeta o sistema; puede haber tantos como hagan falta. | Una carpeta de la red del hospital donde guarda el escáner |
| Dirección de la carpeta / Dirección del sistema (https) / Sistema emisor | Texto | Obligatorio | Una carpeta: una ruta de red (por ejemplo `\\server\requisitions\inbox`) o una dirección smb://, nfs://, file:// o https://. Un sistema de terceros (un gestor documental, el almacén de documentos del LIS, un servicio de digitalización): su dirección https; el servidor lee allí los escaneos nuevos con credenciales configuradas en el servidor de la API, nunca en el navegador. Un sistema emisor: su nombre, tal como se identifica ante la API. Una dirección con forma incorrecta se marca en rojo y no puede guardarse. | `\\lab-scan01\requisitions\inbox` (demostración) |
| Leer cada (minutos) | Número entero, de 1 a 1440 | Obligatorio | Cada cuánto lee la tarea el origen. | 15 |
| Código de barras de la hoja separadora | Texto | Obligatorio | El código de barras impreso en la hoja que se coloca entre volantes de un mismo escaneo por lotes. | `PATHSCRIBE-SEPARATOR` |
| Guardar | Botón | No aplicable | Desactivado mientras nada cambie o un campo no sea válido. Muestra «Guardado por última vez» con la hora y la persona. | No aplicable |

**Volantes esperados.** La segunda tarjeta de esta pantalla decide qué casos deberían tener un volante escaneado, para la organización (**Valor predeterminado de la organización**) o para un centro ejecutor (un centro sigue el valor predeterminado hasta que se guarda su propio ajuste).

| Nombre del campo | Tipo / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado |
|---|---|---|---|---|
| Se aplica a | Elección: **Valor predeterminado de la organización** o un centro con laboratorio ejecutor | Obligatorio | El ajuste que se edita. | Valor predeterminado de la organización |
| Se espera un volante escaneado para | Casillas: **Petición electrónica HIS/LIS**, **Introducido en Registro, sin petición importada**, **Caso externo / por contrato**, **Registro en contingencia**, **Entrega en lockbox** | Opcional | Un caso debe tenerlo cuando su petición llegó de una forma marcada. Una petición electrónica HIS/LIS es la solicitud registrada (su mensaje de petición), así que por defecto no necesita papel. Un caso registrado a partir de una petición importada cuenta como electrónico. | Todo marcado salvo Petición electrónica HIS/LIS |
| Marcar un caso tras (horas) | Número entero, de 0 a 720 | Obligatorio | Horas tras el registro sin volante vinculado antes de marcar el caso. 0 lo marca enseguida. Nunca bloquea el trabajo. | 24 |
| Marcar un escaneo sin caso tras (horas) | Número entero, de 0 a 720 | Obligatorio | Horas que un escaneo puede esperar en la cola sin asignar antes de marcarse en rojo «Aún sin caso» y pasar al principio: quizá una muestra no recibida, perdida o no registrada. | 24 |
| Guardar expectativas | Botón | No aplicable | Guarda el ajuste mostrado. Auditado (Requisition Expectation Saved). | No aplicable |

Un caso marcado aparece en **Casos a la espera de un volante** en la bandeja de volantes, muestra **⚠ Falta el volante** en la pantalla del informe y recibe una deficiencia de caso **Missing Requisition** (abierta por System), seguida en el flujo de deficiencias y en los informes de calidad. Vincular su escaneo cierra la marca y la deficiencia (resolución **Requisition Received or Not Required**); también **Sin volante en papel** con un motivo (Petición electrónica registrada, Petición verbal, documentada, Petición en otro registro, Otro). La comprobación se ejecuta con la incorporación: en el servidor como tarea programada y, en la demostración, cada vez que se abre la bandeja o se pulsa **Ejecutar ahora**. Eventos de auditoría: Requisition Missing, Requisition Received, Requisition Waived, Requisition Without Case.

**La cola de volantes sin asignar (cuarentena).** Un escaneo cuyo código de barras no corresponde a ningún caso, o no se puede leer, entra en ella automáticamente (Requisition Quarantined). El personal abre **Ver** para revisar las páginas y luego lo vincula: escaneando o escribiendo el número de registro, escribiendo un nombre de paciente o un NHC para buscar (la lista **Casos encontrados**, dentro de su propio acceso), o con **Caso nuevo a partir de este escaneo**, que abre Registro con el escaneo adjunto; al guardar se vincula al caso nuevo (requiere `case:accession:create`). Cada vinculación queda auditada (Requisition Re-associated), indicando si se escribió, se encontró por búsqueda o se creó el caso.

**7. Permisos.** Abrir: `screen:configuration:open`. Cambiar el origen: `config:requisition-ingestion:manage` (riesgo alto, auditado; Admin por defecto). En la bandeja de volantes: `requisition:inbox:review` (abrirla y ver un escaneo en cola), `requisition:inbox:resolve` (vincular o descartar), `requisition:ingestion:run` (Ejecutar ahora); los roles que abren Registro tienen los tres por defecto. Desde el caso: `case:requisition:view` (los roles con acceso a casos). El registro de auditoría muestra Requisition Matched, Requisition Quarantined, Requisition Re-associated, Requisition Discarded, Requisition Viewed y Requisition Source Saved, sin nombre de archivo ni de paciente. Las órdenes de la bandeja de volantes están en la lista de acciones (Configuración → Registro de acciones y Personal → Roles, grupo **Requisition Inbox**): ir a la bandeja, ejecutar la incorporación ahora (Alt+G o por voz en la bandeja), ver un volante escaneado, vincular un volante sin asignar, descartarlo, mostrar el volante del caso. El personal de registro las tiene todas por defecto; los roles con acceso a casos, mostrar el volante del caso. Conceder una orden nunca amplía lo que permiten los permisos anteriores.

**Limitaciones conocidas.** Aún no hay una hoja separadora imprimible: imprima el código de barras con cualquier herramienta de etiquetas. Si un archivo se mueve o se elimina donde está guardado, el volante del caso ya no puede abrirse, porque PathScribe no guarda ninguna copia.

### Asignaciones de campos de migración {#screen-migration_field_mappings}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Asignaciones de campos de migración

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Asignaciones de campos de migración

**3. Finalidad de negocio y alcance.** Asigna los nombres de campo de origen propios de un LIS antiguo a los campos de destino de migración de PathScribe, para cada sistema de origen. Un cliente con varias instituciones puede migrar desde más de un sistema antiguo, por lo que cada asignación pertenece a un solo sistema de origen. La importación de registros históricos lee estas asignaciones. Un campo de origen sin asignación se notifica en la importación y no se copia.

**4. Requisitos previos y dependencias.** No hay nada que configurar antes. La importación de [Trabajos de migración de datos históricos](#screen-migration-jobs) necesita al menos una asignación activa para el sistema de origen. Si se omite este paso, la importación indica "Este sistema de origen no tiene asignaciones de campos activas."

Setup step: Tier 6, step 5
Requires: Ninguno, es un punto de partida.
Unlocks: [Trabajos de migración de datos históricos](#screen-migration-jobs)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-migration_field_mappings - Lista de asignaciones de campos de migración con filtro de sistema de origen y Añadir correspondencia]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtro de sistema de origen | Lista de selección, **Todos los sistemas de origen** o un sistema | Opcional | Filtra la lista. | Todos los sistemas de origen |
| Fila de la lista | Solo lectura: campo de origen, campo de destino, categoría, e **Inactivo** cuando está desactivada | No aplicable | Una asignación por fila, con **Editar**. "No hay asignaciones de campos registradas." cuando está vacía. | No aplicable |
| Sistema de origen heredado | Texto, marcador `LegacyLIS-Cerner` | Obligatorio | El nombre del sistema antiguo. La lista de sistemas de origen de la importación se construye con estos nombres. | En blanco |
| Categoría | Elección entre Datos demográficos, Detalle del registro, Texto macroscópico/microscópico, Codificación SNOMED/CIE-O, Inventario de portaobjetos/bloques, Archivo de informes en PDF, Campo sinóptico discreto | Obligatorio | Decide qué campos de destino se ofrecen. | Primera categoría |
| Nombre del campo de origen | Texto, marcador `PT_FNAME` | Obligatorio | El nombre del campo o de la columna del sistema antiguo, tal como aparece en la cabecera del archivo o en el JSON. | En blanco |
| Campo de destino | Lista de selección con los campos de la categoría | Obligatorio | Datos demográficos: nombre, apellidos, fecha de nacimiento, NHC, sexo. Detalle del registro: número de acceso heredado, fecha de acceso, nombre del médico solicitante, nombre del centro, descripción de la muestra. Texto macroscópico/microscópico: descripción macroscópica, descripción microscópica, diagnóstico final. Codificación: códigos SNOMED, códigos ICD-O. Inventario de portaobjetos/bloques: ids de bloques, ids de portaobjetos. Archivo en PDF: URL del informe archivado. Campo sinóptico: campos sinópticos. | Ninguno seleccionado |
| Nota de transformación (opcional) | Texto, marcador "p. ej. convertir dd/mm/aaaa a ISO" | Opcional | Una nota para la persona que lee la asignación. | En blanco |
| Añadir correspondencia, Editar, Guardar, Cancelar | Botones y ventana | No aplicable | Una segunda asignación activa para el mismo sistema de origen y el mismo campo de origen se rechaza: "Ya existe una asignación para (campo) en (sistema)." | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir y editar: `config:migration-mappings:manage` (riesgo alto). Admin y Lab Director la tienen de forma predeterminada. La misma capacidad protege la ejecución de una importación.

**Límites conocidos.** La Nota de transformación es solo un comentario: ningún código la aplica, por lo que una fecha en otro formato no se convierte escribiendo una nota. El indicador de activa de una asignación se guarda y la importación lo respeta, pero la ventana no tiene ningún interruptor para cambiarlo, por lo que una asignación nueva siempre está activa. No hay botón de eliminar.

### Trabajos de migración de datos históricos {#screen-migration-jobs}
Breadcrumb: Inicio > Configuración > Trabajos de migración

**Estado:** Parcial

**1. Navegación:** la dirección `/migration-jobs`, disponible para quien tenga la pantalla de Configuración. No hay ninguna entrada de menú que la abra, por lo que debe dar la dirección a sus administradores.
**2. Elemento de mantenimiento:** Trabajos de migración de datos históricos

**3. Finalidad de negocio y alcance.** Informes de estado y de validación cruzada de los trabajos de migración de un LIS antiguo, y la ventana **Importar archivo heredado** que inicia uno. Un trabajo notifica cuántos registros se han procesado correctamente, cuántos han fallado y cuántos requieren revisión, y concilia el recuento con el que declaró el sistema de origen. Las coincidencias ambiguas de pacientes que se encuentran durante la importación se envían a la cola existente de Revisión de coincidencias de pacientes y no se siguen por separado aquí.

**Qué está construido y qué está Simulado.** Construido: la lectura de un archivo, la aplicación de las asignaciones, la validación, la coincidencia con pacientes, el registro del trabajo y de sus resultados por registro, y la conciliación. Simulado: la importación se ejecuta en el navegador, y los casos en borrador que crea se marcan como **Simulado**. Un aviso indica que una importación masiva en el servidor la sustituye. El archivo en sí no se conserva.

**4. Requisitos previos y dependencias.** El sistema de origen debe tener asignaciones de campos activas, por lo que [Asignaciones de campos de migración](#screen-migration_field_mappings) va primero. Si se omite, la lista de sistemas de la ventana está vacía ("Ningún sistema de origen tiene todavía asignaciones de campos activas").

Setup step: Tier 6, step 6
Requires: [Asignaciones de campos de migración](#screen-migration_field_mappings)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-migration-jobs - Lista de trabajos de migración con etiquetas de estado y el botón Importar archivo heredado]

**6. Referencia de campos.**

La lista y el detalle.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Importar archivo heredado | Botón | No aplicable | Abre la ventana de importación. Aparece atenuado sin la capacidad. | No aplicable |
| Fila del trabajo | Solo lectura: sistema de origen, etiqueta de estado, etiqueta **Simulado**, insignia **Discrepancia de validación cruzada**, recuentos "n correctos, n con error, n en revisión" | No aplicable | Pulse para abrir el detalle. El estado es **Pendiente**, **En ejecución**, **Completado**, **Completado con errores** o **Con error**. "No hay trabajos de migración registrados." cuando está vacía. | No aplicable |
| Validación cruzada | Texto | No aplicable | **Conciliado** (procesados de declarados), **Discrepancia** (declarados, procesados y cuántos faltan o sobran), o "No hay recuento de origen declarado registrado, no se puede conciliar". | No aplicable |
| Recuentos | Texto | No aplicable | Correctos, con error, en revisión, del total procesado. | No aplicable |
| Registros que requieren atención | Lista: caso en borrador o mensaje de error | No aplicable | Los registros con error muestran el error; las coincidencias ambiguas muestran **Requiere revisión del MPI**. | No aplicable |
| Registros | Lista con el resultado de cada registro, con **Correcto**, **Con error** o **Requiere revisión del MPI** | No aplicable | El desenlace de cada registro y el id de su caso en borrador. | No aplicable |

La ventana Importar archivo heredado.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Sistema de origen | Lista de selección de los sistemas con asignaciones activas | Obligatorio | "Elija un sistema de origen." | Ninguno |
| Archivo heredado (CSV o JSON) | Archivo, `.csv`, `.tsv`, `.txt` o `.json`, hasta 2000 registros | Obligatorio | Un CSV necesita una fila de cabecera con los nombres de campo del sistema antiguo. JSON es una lista de registros, o un objeto con una lista `records`. Los valores anidados se dejan fuera y se cuentan. Más de 2000 registros se rechaza. | Ninguno |
| Número de registros declarado por el sistema de origen (opcional) | Número entero | Opcional | Si lo conoce, el trabajo lo concilia con los registros procesados. | En blanco |
| Crear casos en borrador a partir de los registros correctos | Casilla Sí/No | Opcional | Crea un caso en borrador marcado como **Simulado** por cada registro correcto, omitiendo un número de acceso heredado que ya se importó ("Ya importado" hace que ese registro falle). | Activado |
| Ejecutar importación | Botón | No aplicable | Ejecuta y muestra: los recuentos, los registros omitidos por estar ya importados, los casos en borrador creados (Simulado) y los campos de origen que ninguna asignación cubre. Un botón **Ver trabajo** abre el trabajo. | No aplicable |

Otros rechazos: el archivo está vacío o no es un JSON válido, la primera fila no tiene nombres de campo, el archivo no tiene registros, y "No tiene permiso para importar registros heredados."

**7. Permisos.** Abrir: `screen:configuration:open` (la ruta está controlada por la pantalla de Configuración). Importar: `config:migration-mappings:manage` (riesgo alto, auditado). Admin y Lab Director la tienen de forma predeterminada.

**Límites conocidos.** La ruta no tiene entrada de navegación. La importación es Simulada en el navegador; las importaciones grandes o de producción esperan a la importación masiva en el servidor. El tope de 2000 registros está fijado en el código.

### Bandeja de salida de correo simulada {#screen-simulated_mail}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Bandeja de salida de correo simulada

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones**
**2. Elemento de mantenimiento:** Bandeja de salida de correo simulada

**3. Finalidad de negocio y alcance.** En la compilación de demostración no hay ningún servicio de correo conectado. Todo correo electrónico que el sistema habría enviado (un seguimiento, una invitación a un comité de tumores, un evento de revisión de plantilla, una incidencia de soporte) se guarda aquí, con la etiqueta **Simulado**, para que pueda ver lo que se habría enviado. Nada sale del navegador. Un aviso emergente indica "Correo electrónico simulado registrado, no enviado" y remite a esta pantalla.

**4. Requisitos previos y dependencias.** Ninguno. Los elementos aparecen cuando una función envía correo electrónico.

Setup step: Reference, not part of setup
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-simulated_mail - Lista de la bandeja de salida de correo simulada y un mensaje abierto]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Recuento | Texto, "n correo(s) electrónico(s) simulado(s)" | No aplicable | Los elementos guardados. La bandeja de salida conserva los 200 más recientes. | No aplicable |
| Registrado, Tipo, Para, Asunto | Columnas de solo lectura | No aplicable | El tipo es **Correo electrónico** o **Evento de plantilla**. Un destinatario que elegiría el servidor muestra "(elegido por el servidor)". | No aplicable |
| Abrir | Botón | No aplicable | Muestra Para, Cc, Asunto, cuerpo y Adjuntos, con la nota "Simulado: este mensaje no se envió a nadie." | No aplicable |
| Vaciar bandeja de salida | Botón, con confirmación | No aplicable | Elimina de este navegador todos los correos electrónicos simulados. | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. La sección se muestra como editable para quien tenga `config:vendor-integrations:manage`; el botón Vaciar no tiene ninguna capacidad.

**Límites conocidos.** Solo demostración. Una compilación de servidor envía correo electrónico real mediante su servicio de correo y no conserva ninguna lista simulada.

### Mock Interface Engine {#screen-mock-interface-engine}
Breadcrumb: Inicio > Mock Interface Engine

**Estado:** Demostración

**1. Navegación:** la dirección `/dev/mock-interface-engine`, solo en la compilación de demostración (`__DEMO_TOOLS__`). Una compilación que se comunica con un servidor de API no la incluye. La página no tiene entrada de menú.
**2. Elemento de mantenimiento:** Mock Interface Engine (PS-239)

**3. Finalidad de negocio y alcance.** Una herramienta para desarrolladores y demostraciones. Responde en lugar de sistemas que todavía no existen, de modo que puede enviar una lista de trabajo molecular, un lote de escaneado de preparaciones completas o cualquier otro mensaje de interfaz y ver una respuesta realista: éxito, un rechazo concreto o una conexión bloqueada. La página se abre con el aviso "Developer tool, not real functionality." Tiene cuatro partes: los ajustes de respuesta, un simulador de mensajes entrantes, un registro de lo que recibió el motor simulado y un simulador de respuestas de registro.

**4. Requisitos previos y dependencias.** Ninguno. Necesita la compilación de demostración.

Setup step: Reference, not part of setup
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-mock-interface-engine - Ajustes de Mock Interface Engine, simulador entrante, registro del motor y simulador de respuestas de registro]

**6. Referencia de campos.**

Ajustes de respuesta.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Interruptor de activación y estado | Botón, con el estado "interceptando llamadas de envío reales", "iniciando" o "sin interceptar" | Opcional | Inicia o detiene el interceptor del navegador para la llamada de la lista de trabajo molecular. | Desactivado |
| Modo de respuesta | Elección entre **Tener éxito siempre**, **Fallar siempre**, **Tiempo de espera agotado** | Obligatorio | Tener éxito responde HTTP 200. Fallar responde con el estado de más abajo. Tiempo de espera agotado nunca responde, por lo que el envío permanece en "Enviando…". | Tener éxito siempre |
| Estado HTTP del fallo | Número entero | Opcional | Se muestra para Fallar siempre. Un valor vacío o cero vuelve a 500. | 500 |
| Responder por el escáner de portaobjetos | Casilla Sí/No | Opcional | Después de aceptar un lote de escaneado, notifica cada preparación como en escaneado y después como escaneada, de modo que se pueda mostrar el escaneado de preparaciones de principio a fin. | Activado |
| Resultados del instrumento molecular | Elección entre **Positivo**, **Negativo**, **Sin resultados** | Opcional | Después de aceptar una lista de trabajo molecular, notifica esa llamada para cada muestra de paciente, con los controles según lo esperado. | Sin resultados |

Los tres paneles.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Simulador de mensajes entrantes: Mensaje de ejemplo | Lista de selección de 14 ejemplos: A01 ingreso; A01 ingreso con número NHS verificado; A08 actualización; A24 vinculación; A34 fusión (forma antigua); A40 fusión; A40 con pacientes desconocidos (pasa a la cola de excepciones); A43 mover una visita; A45 mover una visita (nivel de visita); A47 cambio de identificador; A50 cambio de número de visita; y tres eventos (bloque dañado o perdido, resultado de VPH recibido, material trasladado al almacén) | Opcional | **Cargar ejemplo** rellena el cuadro. | Ninguno |
| Simulador de mensajes entrantes: Mensaje (HL7 o evento JSON) | Texto libre, marcado como dato del paciente | Obligatorio | Un mensaje o evento que se procesa con los mismos procesadores que usaría un receptor real. | En blanco |
| Simulador de mensajes entrantes: Procesar mensaje | Botón | No aplicable | Muestra **Procesado** o **No aplicado**. Un mensaje que no se puede emparejar se pone en cola como excepción de interfaz: "Abra Auditoría, Registro de errores, Interfaces para vincularlo a mano." Con la etiqueta **Simulado**. | No aplicable |
| Recibido por el motor de interfaz simulado | Lista de solo lectura: Cuándo, Tipo de mensaje, Resultado (**Aceptado**, **Rechazado**, **Tiempo de espera agotado**), Abrir | No aplicable | Si no hay dirección de motor definida, todo mensaje saliente acaba aquí en lugar de salir del navegador. **Abrir** muestra el mensaje; **Vaciar la lista** la vacía. | No aplicable |
| Recibir un acuse de recibo de registro: Registro, Estado, Respuesta | Listas de selección | Obligatorio | Elija lo que diría el registro ante un envío realizado: Aceptado, Aceptado con advertencias, Rechazado (se puede corregir), Rechazado (definitivo) o Sin respuesta. **Recibir** lo procesa con la función que usará el punto de acceso entrante real. Con Sin respuesta, el envío queda a la espera de una respuesta. | Ninguno |

**7. Permisos.** La ruta está controlada por la pantalla de Configuración (`screen:configuration:open`). Los controles no tienen ninguna capacidad.

**Límites conocidos.** Solo demostración. Sus ajustes se conservan en el navegador y no se comparten. Los modos Fallar siempre y Tiempo de espera agotado afectan a la llamada de la lista de trabajo molecular que gestiona el interceptor; el motor simulado del registro sigue el mismo modo de respuesta para los demás mensajes. No tiene ningún ejemplo de un resultado de derivación, por lo que la recepción de vuelta desde el laboratorio de referencia no se puede mostrar aquí.
