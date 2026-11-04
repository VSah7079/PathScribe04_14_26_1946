---
chapter: 8
id: ch8
title: Nivel 7: Facturación, gestión del ciclo de ingresos e informes a registros
---

# Nivel 7: Facturación, gestión del ciclo de ingresos e informes a registros {#ch8}

Este capítulo describe cómo decide PathScribe qué se cobra, cuándo puede salir un cargo del sistema y a qué registros de cáncer y de cribado se notifica un caso. También describe las consultas de pago que utiliza la carga útil del cargo y la página Registros del sistema, donde se vigilan los eventos financieros.

Lea primero estos tres puntos, porque fijan lo que puede esperar y lo que no.

1. **Qué hace PathScribe con el dinero.** PathScribe resuelve cada cargo una sola vez, al finalizar el caso, en un registro fijo: código CPT o HCPCS, unidades de valor relativo (RVU) y modificador. No guarda precios. **Tarifas: No construido.** No hay ningún campo de importe en dólares, precio ni tarifa de pagador en las reglas de facturación. La carga útil del cargo no lleva importes en dólares. El reembolso lo calcula su sistema de facturación o el motor de interfaces, no PathScribe.
2. **Qué hace PathScribe con los registros.** PathScribe decide si un caso es notificable, comprueba los datos obligatorios y construye una carga útil JSON estructurada. No escribe por sí mismo XML NAACCR, XML COSD ni ningún otro formato de transmisión de un registro. El motor de interfaces (el motor de ForMedrixAI, que se entrega con PathScribe) traduce y transmite. Ninguna especificación de registro del producto está confirmada con la especificación publicada por el propio registro, salvo que la sección lo indique.
3. **La mayor parte de este capítulo es hoy una Demostración.** El almacenamiento de producción es Microsoft SQL Server detrás de una API ASP.NET Core. Los servicios que hay detrás de estas pantallas son servicios de demostración que se ejecutan en el navegador, y los contratos de la API de `docs/architecture` no dicen que nada se haya probado con un servidor real. Cada pantalla indica su propio estado.

## Orden de configuración del Nivel 7

Configure las pantallas en este orden. El cuadro "Orden de configuración" de cada pantalla muestra lo que esa pantalla requiere.

1. [Diccionario de modificadores CPT](#screen-modifier_dictionary): la lista de modificadores que ofrece el Diccionario de facturación.
2. [Mapa de códigos RVU](#screen-rvu_code_map): la lista de CPT y valores relativos a la que apunta cada regla de facturación.
3. [Diccionario de facturación (captura de cargos)](#screen-billing_dictionary): las reglas de facturación con versiones.
4. [Reglas de edición NCCI](#screen-ncci_edit_rules): los pares de agrupación (usted los carga; no se entrega ninguno).
5. [Aprobaciones pendientes de reglas de facturación](#screen-pending_approvals): una segunda persona aprueba los pasos 1 a 4 antes de que nada entre en vigor.
6. [Activadores de liberación de cargos](#screen-billing_type_triggers): el hito del caso en el que cada tipo de facturación crea su cargo.
7. [Liberación de facturación](#screen-billing_release): reglas de retención y de lotes para los cargos que están listos.
8. [Diccionario maestro de tipos de pago](#screen-master_payment_types): las categorías de pago.
9. [Asignación de pagos por jurisdicción](#screen-jurisdiction_payment_mappings): los esquemas locales de pagadores asignados a esas categorías.
10. [Vista previa de la exportación de facturación](#screen-dft_export_preview): compruebe lo que enviaría un caso real.
11. [Notificación al registro de cáncer](#screen-cancer_registry_settings): el registro de cada centro y la aprobación de la puesta en marcha.
12. [Registro de cáncer del Reino Unido (COSD)](#screen-cosd_destination): ajustes del destino de Inglaterra.
13. [Anatomía Patológica electrónica de EE. UU.](#screen-us_epath): perfiles de cada estado para el canal ePath de EE. UU.
14. [Notificación al registro de citología](#screen-cytology_registry): ajustes del programa de cribado cervical.
15. [Archivos por lotes para registros](#screen-batch_registry_feed): entregas a registros basadas en archivos.

La [pestaña financiera de Registros del sistema](#screen-audit-financial) es una página de referencia. No forma parte de la configuración.

No están construidos en este capítulo: las tarifas, las sugerencias de facturación con IA o en lenguaje natural a partir del texto del informe, la salida X12 837P, KVDT y SESAM-Vitale, los archivos por lotes XML NAACCR y la notificación de calidad MIPS y MACRA.

## Arquitectura del motor de facturación {#ch8-billing-architecture}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos

**Cómo se modela un cargo.** PathScribe divide un cargo en un componente técnico, un componente profesional o ambos juntos. El producto los llama tipos de facturación:

| Tipo de facturación | Etiqueta en pantalla | Qué cubre | Conjunto de modificadores |
|---|---|---|---|
| TC | Técnico (TC) | Trabajo de laboratorio: tallado, procesamiento, preparaciones, tinciones | `-TC` |
| 26 | Profesional (26) | La interpretación del patólogo | `-26` |
| Global | Combinado (Global) | Ambas partes facturadas juntas | Ninguno |

PathScribe fija el modificador a partir del tipo de facturación sin excepciones: TC lleva `-TC`, 26 lleva `-26` y Global no lleva ninguno. Los demás modificadores son solo informativos.

**Cuándo se crea un cargo.** De forma predeterminada, el componente técnico se crea cuando se talla la muestra. Los componentes profesional y global se crean en la firma final. Puede cambiarlo para toda la empresa o para un centro en [Activadores de liberación de cargos](#screen-billing_type_triggers).

**Los cargos son fijos una vez creados.** Al finalizar el caso, PathScribe resuelve el cargo una sola vez en un registro de cargo inmutable que conserva una instantánea del CPT, el HCPCS, las RVU y el modificador. Las ediciones posteriores de una regla de facturación no cambian un cargo ya creado. Una corrección posterior a la firma utiliza un par de abono y refacturación, no una edición.

**Las reglas de facturación tienen versiones.** Una regla de facturación se identifica por el código de facturación, el ámbito y la versión. Las versiones solo se añaden, nunca se modifican. Los estados son DRAFT, PENDING_APPROVAL, ACTIVE, REJECTED y RETIRED. La persona que redacta o envía una versión no puede aprobarla (el principio de los cuatro ojos, aplicado en los servicios). Al aprobarse, la nueva versión entra en vigor y la versión a la que sustituye termina.

**Ámbito.** Una regla se aplica a toda la empresa o a un solo centro. En estas pantallas se utiliza la palabra Sede (Site), no Centro (Facility).

**Casos divididos.** Cuando el componente técnico se realiza en un laboratorio distinto del que hace la lectura profesional, el caso lleva un centro del componente técnico y el centro ejecutor. La decisión de liberación lo comprueba (véase [Liberación de facturación](#screen-billing_release)).

**Adónde van los cargos.** Los cargos listos van a la Cola de salida. El barrido de salida omite un cargo en estado PENDING_APPROVAL o HOLD. El motor de interfaces se encarga del transporte, la traducción y los reintentos. PathScribe solo decide qué se libera y cuándo.

**Aprobación opcional de cargos.** Un cargo puede quedar retenido a la espera de aprobación. La capacidad de aprobación `billing:charge:approve` se comprueba por cada laboratorio ejecutor. Está en el catálogo de capacidades, pero ningún rol integrado la tiene de forma predeterminada; concédala a través de [Roles](#screen-staff-roles) si utiliza la aprobación de cargos.

### Activadores de liberación de cargos (TC/26/Global) {#screen-billing_type_triggers}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos > Activadores de liberación de cargos (TC/26/Global)

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas financieras y de ingresos**
**2. Elemento de mantenimiento:** Activadores de liberación de cargos (TC/26/Global)

**3. Finalidad comercial y alcance.** Fija el hito del caso en el que cada tipo de facturación crea su cargo. Los valores predeterminados son: TC cuando la muestra está tallada, y 26 y Global cuando el caso está firmado. Puede anular un valor predeterminado para toda la empresa o para un centro. Un centro sin anulación propia utiliza el ajuste de la empresa.

**4. Requisitos previos y dependencias.** Una anulación por centro solo se puede fijar para un centro que exista, de modo que configure antes los centros. Si no hay ningún centro en la lista, aun así puede fijar los activadores de toda la empresa.

Setup step: Tier 7, step 6
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Liberación de facturación](#screen-billing_release)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-billing_type_triggers - Activadores de liberación de cargos con una lista de hitos por tipo de facturación]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Selector de ámbito | Elección entre Empresa o un centro | Obligatorio | Elige de quién se ven y se modifican los activadores. | Empresa |
| Activador técnico (TC) | Elección entre hitos del caso | Obligatorio | El hito en el que se crea el cargo técnico. Al cambiar la lista desplegable se guarda de inmediato. | Muestra tallada (`SPECIMEN_GROSSED`) |
| Activador profesional (26) | Elección entre hitos del caso | Obligatorio | El hito en el que se crea el cargo profesional. Se guarda de inmediato. | Caso firmado (`CASE_SIGNED_OUT`) |
| Activador combinado (Global) | Elección entre hitos del caso | Obligatorio | El hito en el que se crea el cargo global. Se guarda de inmediato. | Caso firmado (`CASE_SIGNED_OUT`) |
| Restablecer valores predeterminados | Botón | Opcional | Elimina la anulación del ámbito elegido y lo devuelve al valor predeterminado integrado. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:billing-triggers:manage`. Admin y Lab Director la tienen de forma predeterminada. Cada cambio escribe un evento de auditoría ("Charge release trigger changed", "Charge release triggers reset to default").

**Límites conocidos.** Solo servicio de demostración. Un cambio de activador afecta a los cargos que se creen a partir de ese momento y no modifica los cargos ya creados.

## Reglas de captura de cargos, asignación CPT/HCPCS y tarifas {#ch8-charge-capture}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos

**Tarifas: No construido.** El esquema pide tarifas. No hay pantalla, contrato ni campo para un importe en dólares, un precio o una tarifa específica de un pagador. Una regla de facturación lleva solo el código CPT, el código HCPCS y los valores RVU de trabajo, gastos de la consulta (PE) y responsabilidad profesional (MP). Lo más parecido que existe son los valores RVU del [Diccionario de facturación](#screen-billing_dictionary) y del [Mapa de códigos RVU](#screen-rvu_code_map). La comprobación llamada `ZERO_FEE_MAPPING_ERROR` está redactada como una comprobación de tarifa, pero detecta un cargo que se resolvió con RVU cero en trabajo, PE y MP y que no tiene aviso de supresión.

**Carga masiva de códigos.** Para cargar en bloque listas de CPT, HCPCS u otros códigos, utilice [Importación de códigos (masiva)](#screen-code_import). Está documentada junto con las demás consultas.

**Codificación automática.** Véase el párrafo de estado en [Motor de codificación automática y reglas de retención de facturación](#ch8-autocoding-holds).

### Diccionario de modificadores CPT {#screen-modifier_dictionary}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos > Diccionario de modificadores CPT

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas financieras y de ingresos**
**2. Elemento de mantenimiento:** Diccionario de modificadores CPT

**3. Finalidad comercial y alcance.** La lista de códigos de modificadores CPT (por ejemplo 26, TC, 59, XS) que ofrece la pestaña Reglas de codificación del Diccionario de facturación. Los modificadores de aquí son informativos. PathScribe no comprueba ni añade ningún modificador distinto de la regla fija de TC y 26 descrita en la introducción del capítulo.

Las descripciones que se entregan son marcadores de posición como "Modifier 59", marcados como sintéticos, porque el texto de la American Medical Association (AMA) tiene licencia. Si dispone de una licencia, cargue sus propias descripciones.

**4. Requisitos previos y dependencias.** Es un punto de partida. Cada cambio se convierte en una versión nueva que espera aprobación, por lo que hace falta una segunda persona con derechos de aprobación antes de que un cambio entre en vigor.

Setup step: Tier 7, step 1
Requires: Ninguno, es un punto de partida.
Unlocks: [Diccionario de facturación (captura de cargos)](#screen-billing_dictionary), [Aprobaciones pendientes de reglas de facturación](#screen-pending_approvals)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-modifier_dictionary - Diccionario de modificadores CPT con la versión activa y la lista de códigos]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Etiqueta de versión | Texto, solo lectura | No aplicable | La versión activa del diccionario. Id de la versión inicial `modifier-v-seed-2026`. También se entrega una segunda versión pendiente con licencia. | Versión inicial |
| Código | Texto, solo lectura | No aplicable | El código del modificador. Incluidos: 26, TC, 22, 52, 53, 59, XE, XS, XP, XU, 76, 77, 90, 91, 92 (15 códigos). | 15 códigos incluidos |
| Descripción | Texto | Obligatorio al editar una fila | La descripción que ve el personal. Al guardar se crea una versión nueva en PENDING_APPROVAL; nunca se activa automáticamente. | "Modifier {code}" (sintético) |
| Estado de la licencia | Texto, solo lectura | No aplicable | Muestra `synthetic` para los marcadores de posición entregados. | synthetic |
| Cargar CSV | Archivo, CSV | Opcional | Sustituye el diccionario con un archivo con las columnas Code y Description. Plantilla: `ModifierDictionaryTemplate.csv`. Crea una versión pendiente. | Ninguno |
| Confirmación de la licencia | Casilla de verificación | Obligatorio para cargar | Usted confirma que tiene derecho a utilizar las descripciones cargadas. La carga no continúa sin ella. | Sin marcar |
| Etiqueta de la versión de la carga | Texto | Opcional | Da nombre a la versión pendiente. | Ninguno |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Crear o editar: `config:billing-modifiers:manage`. Aprobar, rechazar o activar una versión: `config:billing-tables:approve`, que se utiliza en [Aprobaciones pendientes de reglas de facturación](#screen-pending_approvals). Admin y Lab Director tienen ambas de forma predeterminada. La persona que envió una versión no puede aprobarla.

**Límites conocidos.** El diccionario es solo una lista. Ninguna pantalla ni comprobación impone un modificador en un cargo. El texto entregado es sintético.

### Mapa de códigos RVU (productividad) {#screen-rvu_code_map}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos > Mapa de códigos RVU (productividad)

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas financieras y de ingresos**
**2. Elemento de mantenimiento:** Mapa de códigos RVU (productividad)

**3. Finalidad comercial y alcance.** Una lista breve y seleccionada de códigos CPT con sus unidades de valor relativo, que se utiliza para la productividad del patólogo (RVU de trabajo) y como lista de origen de la que el Diccionario de facturación toma los códigos CPT. No es un sistema de facturación y no lleva importes en dólares. La lista inicial es un subconjunto del archivo de valores relativos de la tarifa de médicos 2026 de CMS, con la etiqueta "CMS 2026 (April update)" (id de versión `rvu-v-seed-2026`). Varias filas no tienen RVU de trabajo y aparecen como Sin verificar.

**4. Requisitos previos y dependencias.** Es un punto de partida. Una versión pendiente o rechazada nunca se utiliza para resolver un cargo, de modo que nada de lo que cargue cuenta hasta que una segunda persona lo apruebe.

Setup step: Tier 7, step 2
Requires: Ninguno, es un punto de partida.
Unlocks: [Diccionario de facturación (captura de cargos)](#screen-billing_dictionary), [Aprobaciones pendientes de reglas de facturación](#screen-pending_approvals)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-rvu_code_map - Tabla del Mapa de códigos RVU con carga y edición]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Versión | Texto, solo lectura | No aplicable | La etiqueta de la versión activa. | CMS 2026 (April update) |
| Buscar | Texto | Opcional | Filtra la tabla. | Ninguno |
| Cargar CSV | Archivo, CSV | Opcional | Columnas: Code o HCPCS, Description, WorkRVU. Respeta el código de estado de CMS (solo las filas A, R y T son facturables) y omite las filas de modificadores. A las filas cargadas se les deduce el nivel a partir de la descripción (muestra de forma predeterminada) y el tipo de facturación Global. Crea una versión pendiente. Plantilla: `RvuCodeMapTemplate.csv`. | Ninguno |
| Etiqueta de la versión de la carga | Texto | Opcional | Da nombre a la versión pendiente. | Ninguno |

#### Ventana de edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Código | Texto | Obligatorio | El código CPT. Bloqueado al editar una fila existente. Se rechaza un código duplicado. | Ninguno |
| Código de facturación | Texto | Obligatorio | El código de facturación de PathScribe. Bloqueado al editar. | Ninguno |
| Descripción | Texto | Opcional | Descripción sencilla. | Ninguno |
| Nivel | Elección: muestra, bloque, tinción, decantación | Obligatorio | Aquello a lo que se asocia el código. | muestra |
| Tipo de componente | Elección: TC, 26, Global | Obligatorio | El tipo de facturación al que se aplica esta fila. | Global |
| RVU de trabajo | Número positivo | Opcional | Déjelo en blanco para marcar la fila como Sin verificar. | En blanco |
| RVU — Gastos de práctica | Número | Opcional | RVU de gastos de la consulta (PE). | En blanco |
| RVU — Responsabilidad civil | Número | Opcional | RVU de responsabilidad profesional (MP). | En blanco |
| Código HCPCS | Texto | Opcional | Código de nivel II, si se aplica alguno. | En blanco |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Editar o cargar: `config:billing-rvu:manage`. Aprobar: `config:billing-tables:approve`. Admin y Lab Director tienen ambas de forma predeterminada. Se aplica el principio de los cuatro ojos.

**Límites conocidos.** La lista es un subconjunto seleccionado, no el archivo completo de CMS. La selección del código base por muestra (88302, 88305, 88309) no se puede deducir de los datos del caso, por lo que no es automática.

### Diccionario de facturación (captura de cargos) {#screen-billing_dictionary}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos > Diccionario de facturación (captura de cargos)

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas financieras y de ingresos**
**2. Elemento de mantenimiento:** Diccionario de facturación (captura de cargos)

**3. Finalidad comercial y alcance.** La lista de reglas de facturación con versiones. Cada regla vincula un código de facturación de PathScribe con un código CPT, un código HCPCS opcional, un tipo de facturación y valores RVU, para la empresa o para un centro. Una anulación por centro sustituye a la regla de la empresa para ese centro. Los cargos se resuelven a partir de estas reglas cuando se finaliza un caso.

**4. Requisitos previos y dependencias.** El selector de CPT lee el Mapa de códigos RVU y las casillas de modificadores leen el Diccionario de modificadores CPT. Si los omite, la búsqueda de CPT está vacía y no se ofrece ningún modificador.

Setup step: Tier 7, step 3
Requires: [Mapa de códigos RVU](#screen-rvu_code_map), [Diccionario de modificadores CPT](#screen-modifier_dictionary)
Unlocks: [Aprobaciones pendientes de reglas de facturación](#screen-pending_approvals), [Liberación de facturación](#screen-billing_release)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-billing_dictionary - Tabla del Diccionario de facturación con selector de centro]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Viendo | Elección entre Empresa o un centro | Obligatorio | De quién muestra las reglas la tabla. | Empresa |
| Código de facturación | Texto, columna | No aplicable | El código de facturación de PathScribe. | Ninguno |
| CPT | Texto, columna | No aplicable | El código CPT. | Ninguno |
| Descripción | Texto, columna | No aplicable | La descripción de la regla. | Ninguno |
| UVR (trabajo) | Número, columna | No aplicable | RVU de trabajo. Aparece la marca "Mapa de códigos: N" cuando el RVU almacenado difiere del Mapa de códigos RVU. | Ninguno |
| Vigente desde | Fecha, columna | No aplicable | La fecha en que empieza la versión activa. | Ninguno |
| Ámbito | Texto, columna | No aplicable | Toda la organización, Excepción por centro o Heredado. | Ninguno |
| Estado | Texto, columna | No aplicable | El estado de la versión. | Ninguno |
| Versiones | Número, columna | No aplicable | Cuántas versiones existen. | Ninguno |
| Acciones | Botones | Opcional | Historial, Duplicar, Nueva versión. | No aplicable |

#### Ventana Nueva versión, pestaña Facturación y UVR

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Código de facturación | Texto | Obligatorio para un código nuevo | El código al que pertenece esta regla. | Ninguno |
| Ámbito | Elección entre Empresa o un centro | Obligatorio | Dónde se aplica la regla. | El ámbito que se está viendo |
| País | Elección: US, UK, AU, CA, los 27 estados de la UE, NZ | Opcional | El país al que está destinado el código. | Ninguno |
| Código HCPCS | Búsqueda | Opcional | Busca en el diccionario HCPCS de nivel II de dominio público incorporado. | En blanco |
| Código CPT | Búsqueda en las entradas del Mapa de códigos RVU | Obligatorio | El código CPT que se factura. | Ninguno |
| Descripción | Texto | Opcional | Descripción de la regla. | En blanco |
| Nivel | Elección: muestra, bloque, tinción, decantación | Obligatorio | Aquello a lo que se asocia el código. | muestra |
| Tipo de componente | Elección: TC, 26, Global | Obligatorio | El tipo de facturación. | Global |
| UVR — Trabajo, UVR — Gastos de la consulta, UVR — Responsabilidad profesional | Números | Opcional | Los tres valores RVU. | En blanco |
| Vigente desde | Fecha | Obligatorio | Fecha de inicio de la versión. | Ninguno |
| Motivo del cambio | Texto | Obligatorio cuando el ámbito ya tiene versiones | Se conserva en la versión para la auditoría. | En blanco |
| Notas | Texto | Opcional | Notas libres. | En blanco |

#### Ventana Nueva versión, pestaña Reglas de codificación

Son informativas y nunca se imponen.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Modificadores asociados habitualmente | Casillas del Diccionario de modificadores CPT | Opcional | Recordatorio de los modificadores que suelen acompañar a este código. | Ninguna marcada |
| Regla de cantidad (descriptiva) | Texto | Opcional | Indicación sobre las unidades. | En blanco |
| Regla de agrupación (descriptiva) | Texto | Opcional | Indicación sobre la agrupación. Los pares NCCI se guardan en [Reglas de edición NCCI](#screen-ncci_edit_rules). | En blanco |
| Requisitos de documentación (descriptivo) | Texto separado por comas | Opcional | Lo que debe constar en el registro. | En blanco |
| Aviso de supresión (descriptivo, nunca se aplica automáticamente) | Texto | Opcional | Marca una regla de RVU cero como intencionada, para que la comprobación de tarifa cero no avise. | En blanco |

#### Ventana Historial

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Versión | Número, columna | No aplicable | Número de versión. | Ninguno |
| CPT | Texto, columna | No aplicable | CPT de esa versión. | Ninguno |
| UVR (trabajo) | Número, columna | No aplicable | RVU de trabajo. | Ninguno |
| Vigente desde, Vigente hasta | Fechas, columnas | No aplicable | El período en que se aplicó la versión. | Ninguno |
| Estado | Texto, columna | No aplicable | DRAFT, PENDING_APPROVAL, ACTIVE, REJECTED o RETIRED. | Ninguno |
| Motivo del cambio | Texto, columna | No aplicable | El motivo introducido. | Ninguno |
| Acciones | Botones | Opcional | Duplicar. Enviar para aprobación (versiones DRAFT). Retirar (versiones ACTIVE). | No aplicable |

Una versión nueva se guarda siempre como DRAFT. **Enviar para aprobación** la pasa a PENDING_APPROVAL.

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Crear, enviar y retirar: `config:billing-rules:manage`. Aprobar o rechazar: `config:billing-tables:approve`. Admin y Lab Director tienen ambas de forma predeterminada. Se escriben eventos de auditoría al enviar, aprobar y rechazar ("Billing rule submitted for approval").

**Límites conocidos.** No hay campo de precio ni de tarifa (véase Tarifas más arriba). Las reglas de codificación son solo orientativas.
## Motor de codificación automática y reglas de retención de facturación {#ch8-autocoding-holds}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos

**Motor de codificación automática: Parcial.** Lo que está construido se basa en reglas y siempre lo confirma una persona:

- Códigos sugeridos a partir de datos estructurados del caso: categorías de tinción, 88312 para una tinción especial, 88342 y +88341 para la inmunohistoquímica por muestra, y 88331 o 88332 para una biopsia intraoperatoria.
- Una lista de reserva de códigos predeterminados. No está lista para facturar.
- Introducción manual de códigos en la ventana de códigos y en el panel de revisión de facturación.

**No construido:** las sugerencias a partir del texto del informe mediante IA o procesamiento del lenguaje natural. Ese trabajo depende de la opinión de los asesores jurídicos y de cumplimiento. Los códigos base de muestra (88302, 88305, 88309) no se deducen automáticamente. La pantalla de configuración más cercana es [Captura inteligente](#screen-smart_capture).

**Comprobaciones de facturación en la firma.** En la firma, PathScribe ejecuta seis comprobaciones y registra una deficiencia por cada hallazgo:

| Activador | Código | Gravedad |
|---|---|---|
| A | `UNSUPPORTED_CPT_LEVEL` | COMPLIANCE_WARNING |
| B | `NCCI_BUNDLING_VIOLATION` (solo los pares con indicador de modificador 0) | CRITICAL_REJECTION_RISK |
| C | `MISSING_DIAGNOSTIC_ICD10` | CRITICAL_REJECTION_RISK |
| D | `UNATTACHED_ANCILLARY_ORDER` | COMPLIANCE_WARNING |
| E | `MODIFIER_MISMATCH` | CRITICAL_REJECTION_RISK |
| F | `ZERO_FEE_MAPPING_ERROR` | REVENUE_LEAKAGE |

`MISSING_CHARGE`, `POST_SIGNOUT_CORRECTION` y `BLOCK_DELETED` se generan fuera de la firma. Estas comprobaciones nunca impiden que el patólogo firme. Un aviso emergente indica que se han marcado elementos de facturación para GC y los hallazgos van a GC. Sí bloquean la exportación: un caso no se puede exportar mientras alguna deficiencia esté OPEN o UNDER_REVIEW. Los estados son OPEN, UNDER_REVIEW, RESOLVED y OVERRIDDEN_WITH_JUSTIFICATION.

### Reglas de edición NCCI (agrupación) {#screen-ncci_edit_rules}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos > Reglas de edición NCCI (agrupación)

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas financieras y de ingresos**
**2. Elemento de mantenimiento:** Reglas de edición NCCI (agrupación)

**3. Finalidad comercial y alcance.** Contiene los pares procedimiento-procedimiento de la National Correct Coding Initiative (NCCI): un código de la columna 1 y un código de la columna 2 que no pueden facturarse juntos. Un par con indicador de modificador 0 genera una deficiencia en la firma. No se entregan datos reales de CMS. La lista inicial es un único par sintético (88305 con 88300, indicador 0, trimestre `DEMO`) y la pantalla muestra una advertencia. El titular de la licencia carga el CSV.

**4. Requisitos previos y dependencias.** Es un punto de partida. Una carga o una edición se convierte en una importación pendiente, por lo que hace falta aprobación antes de utilizar los pares.

Setup step: Tier 7, step 4
Requires: Ninguno, es un punto de partida.
Unlocks: [Aprobaciones pendientes de reglas de facturación](#screen-pending_approvals)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-ncci_edit_rules - Reglas de edición NCCI con la advertencia de datos sintéticos y la tabla de pares]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Versión del trimestre | Texto, por ejemplo `2026Q3` | Obligatorio para cargar | Da nombre a la importación. | Ninguno |
| Cargar CSV | Archivo, CSV | Opcional | Columnas: Column 1, Column 2, Modifier Indicator (0, 1 o 9), Effective Date, Deletion Date. Plantilla: `NcciPtpEditTemplate.csv`. Crea una importación pendiente. | Ninguno |
| Tabla de pares | Tabla, solo lectura | No aplicable | Columna 1, columna 2, indicador y fechas de la importación activa. | Un par sintético |
| Advertencia de datos sintéticos | Aviso | No aplicable | Se muestra mientras la importación activa es la lista inicial sintética. | Se muestra |

#### Ventana de edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Indicador de modificador | Elección: 0 nunca se omite, 1 se puede omitir con un modificador, 9 la edición no se aplica | Obligatorio | Solo los pares con 0 generan una deficiencia en la firma. | El valor actual |
| Fecha de eliminación | Fecha | Opcional | La fecha en que el par deja de aplicarse. | En blanco |

Cada edición vuelve a enviar la tabla completa como una importación nueva en PENDING_APPROVAL llamada "Manual edit" con el par.

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cargar o editar: `config:billing-ncci:manage`. Aprobar: `config:billing-tables:approve`. Admin y Lab Director tienen ambas de forma predeterminada.

**Límites conocidos.** No se entregan datos reales de NCCI. Los indicadores 1 y 9 no generan una deficiencia.

### Aprobaciones pendientes de reglas de facturación {#screen-pending_approvals}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos > Aprobaciones pendientes de reglas de facturación

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas financieras y de ingresos**
**2. Elemento de mantenimiento:** Aprobaciones pendientes de reglas de facturación

**3. Finalidad comercial y alcance.** La cola de aprobación por una segunda persona. Aquí esperan las versiones de reglas de facturación, las versiones del diccionario de modificadores, las importaciones NCCI, las versiones RVU y los trabajos de importación de códigos. Nada entra en vigor hasta que lo aprueba una persona distinta de quien lo envió.

**4. Requisitos previos y dependencias.** La cola solo muestra los elementos que han enviado las pantallas anteriores. La persona que aprueba necesita la capacidad de aprobación y no debe ser quien lo envió.

Setup step: Tier 7, step 5
Requires: [Diccionario de modificadores CPT](#screen-modifier_dictionary), [Mapa de códigos RVU](#screen-rvu_code_map), [Diccionario de facturación (captura de cargos)](#screen-billing_dictionary), [Reglas de edición NCCI](#screen-ncci_edit_rules)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-pending_approvals - Tablas de Aprobaciones pendientes de reglas de facturación y de Actualizaciones de diccionarios pendientes]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Código de facturación | Texto, columna | No aplicable | Tabla de reglas: el código de la regla. | Ninguno |
| CPT | Texto, columna | No aplicable | Tabla de reglas. | Ninguno |
| RVU (trabajo) | Número, columna | No aplicable | Tabla de reglas. | Ninguno |
| Vigente desde | Fecha, columna | No aplicable | Tabla de reglas. | Ninguno |
| Ámbito | Texto, columna | No aplicable | Tabla de reglas. | Ninguno |
| Redactado por | Texto, columna | No aplicable | Tabla de reglas: la persona que redactó. | Ninguno |
| Enviado por | Texto, columna | No aplicable | Tabla de reglas: la persona que envió. | Ninguno |
| Motivo del cambio | Texto, columna | No aplicable | Tabla de reglas. | Ninguno |
| Diccionario | Texto, columna | No aplicable | Tabla de diccionarios: qué diccionario (importación de códigos, modificadores, NCCI, RVU). | Ninguno |
| Etiqueta | Texto, columna | No aplicable | Tabla de diccionarios: etiqueta de la versión o del trabajo. | Ninguno |
| Aprobar | Botón | Opcional | Activa el elemento. En una importación de códigos aplica el trabajo completo. Si usted lo envió, el botón está bloqueado y una indicación explica el motivo. | No aplicable |
| Rechazar | Botón | Opcional | Abre un cuadro de motivo; **Confirmar rechazo** termina el elemento. | No aplicable |
| Motivo del rechazo | Texto | Obligatorio para rechazar | Se guarda con la decisión. | En blanco |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Aprobar y rechazar: `config:billing-tables:approve`. Admin y Lab Director la tienen de forma predeterminada. Las decisiones escriben eventos de auditoría.

**Límites conocidos.** En un sistema de una sola persona nadie puede aprobar, porque quien envía no puede aprobar su propio elemento.

### Liberación de facturación {#screen-billing_release}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Liberación de facturación

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Liberación de facturación

**3. Finalidad comercial y alcance.** Las reglas de retención. Cada regla indica a qué cargos se aplica y qué hacer con ellos: liberarlos de inmediato, retenerlos durante un tiempo o liberarlos en un lote programado, con revisión manual o sin ella. Gana la regla coincidente más específica. PathScribe decide qué y cuándo. El motor de interfaces mueve el mensaje.

**Puntos de especificidad:** centro 100, tipo de facturación 8, tipos de caso 4, centro solicitante 4, patólogo 2, modificación 1.

**Cuando ninguna regla coincide:** liberar en el hito, con revisión manual activada y liberación automática activada.

**Se aplica siempre:** un cambio de modificación se aparca para su revisión; un cargo cuyo CPT no tiene asignación se aparca (`unmappedCpt`); un caso dividido sin centro técnico se aparca (`missingTechnicalFacility`).

**4. Requisitos previos y dependencias.** Una regla puede nombrar un centro o un centro solicitante, de modo que configúrelos antes. Un lote programado se envía según un calendario definido en Programaciones de entrega.

Setup step: Tier 7, step 7
Requires: [Diccionario de centros](#screen-facility-dictionary), [Activadores de liberación de cargos](#screen-billing_type_triggers), [Programaciones de entrega](#screen-delivery_schedules)
Unlocks: [Vista previa de la exportación de facturación](#screen-dft_export_preview)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-billing_release - Lista de reglas de Liberación de facturación con el panel Probar un cargo]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Tipo de facturación | Elección: TC, 26, Global, cualquiera | Obligatorio | Criterio. | cualquiera |
| Tipos de caso | Lista separada por comas | Opcional | Criterio. | En blanco (cualquiera) |
| Centro solicitante | Elección entre centros | Opcional | Criterio. | Cualquiera |
| Patólogo principal | Elección entre el personal | Opcional | Criterio. | Cualquiera |
| Modificación | Elección: cualquiera, original, modificada | Obligatorio | Criterio. | cualquiera |
| Modo de liberación | Elección: DYNAMIC_WITH_HOLD, SCHEDULED_BATCH | Obligatorio | Liberar tras una retención o en el siguiente lote. | DYNAMIC_WITH_HOLD |
| Duración de la retención (minutos) | Número entero, de 0 a 43.200 | Obligatorio para una retención | Cuánto tiempo se retiene antes de liberar. | 0 |
| Calendario del lote | Ajustes de programación | Obligatorio para un lote | El editor comienza en semanal, de lunes a viernes, 22:00, America/New_York. | Véase a la izquierda |
| Liberación automática al completarse | Sí/No | Opcional | Libera cuando termina la retención. | Activada |
| Revisión manual obligatoria | Sí/No | Opcional | Una persona revisa antes de liberar. | Activada |
| Probar un cargo | Panel de prueba | Opcional | Ejecuta la decisión para un cargo de ejemplo y muestra la regla que coincidió. | No aplicable |

Las comprobaciones de reglas generan estos códigos de problema: `billingTypeInvalid`, `modeInvalid`, `holdInvalid`, `batchRequired`, `amendmentInvalid`, `caseTypesInvalid`. Se incluyen tres reglas de empresa (TC, 26, Global), cada una con DYNAMIC_WITH_HOLD, 0 minutos, liberación automática activada y revisión manual activada.

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:billing-release:manage`. Admin y Lab Director la tienen de forma predeterminada. Los guardados se auditan. Liberar, retener, retirar y reenviar mensajes son capacidades de interfaz independientes (`interface:outbound:release`, `hold`, `retract`, `resend`), que tiene Admin.

**Límites conocidos.** Conectada a la Cola de salida solo en el servicio de demostración.

### Vista previa de la exportación de facturación {#screen-dft_export_preview}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos > Vista previa de la exportación de facturación

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas financieras y de ingresos**
**2. Elemento de mantenimiento:** Vista previa de la exportación de facturación

**3. Finalidad comercial y alcance.** Busque un caso y vea lo que PathScribe enviaría a facturación. La carga útil JSON es lo que envía PathScribe. El texto HL7 DFT^P03 es una vista previa de lo que construiría el motor de interfaces. PathScribe no genera ni envía HL7. X12 837P, KVDT y SESAM-Vitale no existen.

**4. Requisitos previos y dependencias.** Necesita un caso finalizado con cargos. Si el caso tiene una deficiencia de facturación abierta, la exportación queda bloqueada.

Setup step: Tier 7, step 10
Requires: [Diccionario de facturación (captura de cargos)](#screen-billing_dictionary), [Liberación de facturación](#screen-billing_release), [Asignación de pagos por jurisdicción](#screen-jurisdiction_payment_mappings)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-dft_export_preview - Vista previa de la exportación de facturación con la carga útil JSON y la vista previa HL7]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Id del caso o número de acceso | Texto | Obligatorio | El caso del que se muestra la vista previa. | En blanco |
| Carga útil JSON | Texto, solo lectura | No aplicable | La carga útil del webhook más la clase financiera. | Ninguno |
| Vista previa HL7 DFT^P03 | Texto, solo lectura | No aplicable | Solo ilustrativa. | Ninguno |
| Enviar al motor de facturación | Botón | Opcional | Envía al motor simulado (distintivo "Simulado"). Bloqueado mientras haya una deficiencia abierta. | No aplicable |
| Enviar clase financiera (vista previa) | Botón | Opcional | Muestra la carga útil de la clase financiera. | No aplicable |

**7. Permisos.** Abrir y utilizar: `config:interface-preview:view`. Admin y Lab Director la tienen de forma predeterminada.

**Límites conocidos.** El envío es simulado. No hay conectado ningún motor de facturación real.

## Configuración del registro de cáncer {#ch8-cancer-registry}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio

**Qué existe.** PathScribe tiene 14 definiciones de registros de cáncer y 12 definiciones de registros de cribado cervical. Todos los registros de cáncer están marcados como `configurable`, lo que significa que la especificación no está verificada con la especificación publicada por el registro. De los registros de cribado, tres están marcados como verificados: el sistema de gestión del cribado cervical del Reino Unido (CSMS), PALGA en los Países Bajos y el National Cancer Screening Register (NCSR) de Australia.

| Id del registro de cáncer | Formato de transmisión indicado |
|---|---|
| `naaccr_us` | XML NAACCR |
| `epath_npcr_us` | HL7 v2 ORU |
| `cpac_canada` | XML NAACCR |
| `cosd_uk` | XML COSD (GB_EW) |
| `phs_scotland` | HL7 v2 ORU |
| `nicr_northern_ireland` | HL7 v2 ORU |
| `ncri_ireland` | HL7 v2 ORU |
| `nkr_netherlands` | Protocolo PALGA |
| `inca_france` | CDA CR-ACP |
| `adt_gekid_germany` | XML oBDS |
| `bcr_belgium` | JSON HD-S4S |
| `aihw_australia` | HL7 v2 ORU |
| `nz_cancer_registry` | HL7 v2 ORU |
| `kccr_korea` | HL7 v2 ORU |

**Qué significa hoy cada formato.** PathScribe construye una sola carga útil JSON estructurada. El formato indicado es el destino al que la traduciría el motor de interfaces. PathScribe no escribe XML NAACCR, XML COSD, oBDS, CDA ni los demás formatos. **No hay registro de cáncer de España ni registro de cribado de España**, aunque España es una jurisdicción del producto. **XML NAACCR como archivo por lotes: No construido.** **MIPS y MACRA: No construido** (véase [Notificación de calidad y de salud pública](#ch8-quality-reporting)).

**Reglas de notificación incorporadas.**

- El activador es únicamente la firma de anatomía patológica quirúrgica. La citología nunca activa una notificación de cáncer. La notificación se envía sin esperar respuesta y nunca retiene la firma.
- Datos obligatorios: fecha de nacimiento, fecha del diagnóstico, diagnóstico primario y código ICD-O. Un registro que se basa en un identificador de paciente necesita también ese identificador. Una notificación a la que faltan datos queda retenida como `HOLD_MISSING_MANDATORY_DATA` y aparece en Excepciones de registros.
- Notificabilidad: solo están construidas las exclusiones documentadas de NAACCR (carcinoma in situ de cuello uterino y CIN III, neoplasia intraepitelial prostática III, y carcinoma basocelular y espinocelular de piel). La lista no es exhaustiva.
- Barrera de envío: una instancia de validación nunca envía casos reales. Una instancia de producción retiene una notificación hasta que se aprueba la puesta en marcha para ese registro.
- Exclusión voluntaria del paciente: el ajuste **Honours opt-out** está desactivado de forma predeterminada. Cuando está desactivado, un paciente que ha ejercido la exclusión voluntaria se notifica igualmente y el registro de auditoría lo deja constancia.

### Notificación al registro de cáncer {#screen-cancer_registry_settings}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Notificación al registro de cáncer

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Notificación al registro de cáncer

**3. Finalidad comercial y alcance.** Elige a qué registro de cáncer notifica la empresa de forma predeterminada y permite que un centro lo anule. También contiene la aprobación de puesta en marcha de cada registro. Cada fila de registro muestra su distintivo de estado de la especificación, sus jurisdicciones, su identificador y su formato de transmisión.

**4. Requisitos previos y dependencias.** Las anulaciones por centro se eligen de la lista de centros, de modo que configure antes los centros. Si no se elige ningún registro, no se genera ninguna notificación de cáncer.

Setup step: Tier 7, step 11
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Archivos por lotes para registros](#screen-batch_registry_feed), [Registro de cáncer del Reino Unido (COSD)](#screen-cosd_destination), [Patología electrónica de EE. UU.](#screen-us_epath)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-cancer_registry_settings - Registro predeterminado de la empresa, anulaciones por centro y panel de conexión con el registro]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Registro predeterminado de la empresa | Elección entre Ninguno y los 14 registros | Obligatorio | El registro que utiliza cualquier centro sin anulación. | Ninguno (la lista inicial de demostración asigna Metro General a `naaccr_us`) |
| Honours opt-out | Casilla de verificación | Opcional | Si está marcada, un paciente que ha ejercido la exclusión voluntaria no se notifica. | Desactivado |
| Guardar | Botón | Opcional | Guarda los dos campos anteriores. | No aplicable |
| Registro (puesta en marcha) | Elección | Obligatorio cuando se usa más de un registro | Elige qué registro muestra el panel de conexión de más abajo. | El primero en uso |
| Añadir excepción | Botón | Opcional | Abre una nueva fila de anulación por centro. | No aplicable |
| Centro | Elección entre centros | Obligatorio para una anulación | El centro al que se aplica la anulación. | Ninguno |
| Registro | Elección entre los 14 registros | Obligatorio para una anulación | El registro de ese centro. | Ninguno |
| Guardar, Cancelar, Quitar | Botones | Opcional | Guardan o descartan una anulación, o quitan una guardada. | No aplicable |

#### Panel de conexión con el registro (puesta en marcha)

El mismo panel aparece en [Notificación al registro de citología](#screen-cytology_registry). Hace pasar a un registro por Pendiente, En pruebas, Validado y En producción. Una instancia tiene uno de dos roles. Una instancia de validación nunca envía datos reales y solo ejecuta el conjunto de pruebas. Una instancia de producción envía resultados reales solo a registros en producción con una aprobación vigente; en los demás casos los resultados quedan retenidos y se envían al aprobarse.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Versión y estado de la plantilla | Texto, solo lectura | No aplicable | La versión de la plantilla del registro y si está vigente. | Ninguno |
| Qué ha cambiado | Lista, solo lectura | No aplicable | Cambios desde la versión que confirmó por última vez. | Ninguno |
| Referencia del acuerdo | Texto | Obligatorio para registrar | La referencia del acuerdo de intercambio de datos. **Registrar acuerdo** la guarda. | En blanco |
| Ejecutar conjunto de pruebas | Botón (instancia de validación) | Opcional | Ejecuta los casos de prueba sintéticos (pacientes `SYN-`): 3 de cribado y 2 de cáncer. Se necesita al menos 1 resultado aceptado (`REGISTRY_GO_LIVE_MIN_TEST_ACCEPTS`). | No aplicable |
| Exportar registro de validación | Botón (instancia de validación) | Opcional | Descarga el archivo del registro de validación. | No aplicable |
| Archivo del registro de validación | Archivo JSON (instancia de producción) | Opcional | Importa un registro exportado desde una instancia de validación. | Ninguno |
| Comprobaciones previas a la puesta en marcha | Lista, solo lectura | No aplicable | `agreementRecorded`, `templateCurrent`, `validationRecord`, `testEvidence`, `specificationConfirmed`, `codesMapped`, `identifierHold`, `overridesReviewed`. | Ninguno |
| Referencia de conformidad de la prueba del registro | Texto | Opcional | La referencia de conformidad que da el propio registro. | En blanco |
| Especificación confirmada | Casilla de verificación | Obligatorio para los registros `configurable` | Usted confirma la especificación con la del propio registro. | Sin marcar |
| Solicitar puesta en producción | Botón | Opcional | Inicia la aprobación. | No aplicable |
| Apruebo en calidad de | Elección: Administrador del centro, Director del laboratorio, Persona designada por el director delegado del laboratorio | Obligatorio para aprobar | La calidad en la que aprueba. | Ninguno |
| Aprobar con mis credenciales | Botón | Opcional | Le pide que vuelva a introducir sus credenciales y después registra la aprobación. | No aplicable |
| Retirar solicitud, Detener la comunicación en producción | Botones | Opcional | Cancelan una solicitud pendiente o detienen un registro en producción. | No aplicable |
| Parte de la plantilla | Elección | Obligatorio para una regla local | Qué parte de la plantilla afecta un cambio local. | Ninguno |
| Qué hace la regla | Texto | Obligatorio para una regla local | Describe el cambio local o la regla del adaptador. | En blanco |
| Añadir regla, Quitar, Confirmar como revisado | Botones | Opcional | Gestionan las reglas locales y confirman que se revisaron. | No aplicable |
| La persona que solicita la puesta en marcha también puede aprobarla | Sí/No (solo producción) | Opcional | Permite que quien la solicita la apruebe. | Activado |
| Aprobaciones necesarias | Número entero, de 1 a 3 (solo producción) | Opcional | Cuántas aprobaciones hacen falta. | 1 |
| Historial de puesta en marcha | Lista, solo lectura | No aplicable | Cada solicitud, aprobación y detención. | Ninguno |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar los ajustes del registro: `config:cancer-registry:manage`. Ejecutar el conjunto de pruebas: `registry:test-suite:run`. Aprobar la puesta en marcha: `registry:live-register:approve`. Admin las tiene de forma predeterminada; el Lab Director no tiene `config:cancer-registry:manage` y tiene la aprobación de la puesta en marcha mediante su propia asignación inicial. La aprobación exige volver a introducir las credenciales.

**Límites conocidos.** La captura de ICD-O-3 está abierta: la pestaña ICD-O de la ventana de códigos guarda identificadores de morfología SNOMED, no códigos como `8500/3`. Las especificaciones de los registros no están verificadas. Esta pantalla no tiene en la tabla de acceso una capacidad de cambio a nivel de sección; sus botones se desactivan mediante los botones de capacidad.
### Registro de cáncer del Reino Unido (COSD) {#screen-cosd_destination}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Registro de cáncer del Reino Unido (COSD)

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Registro de cáncer del Reino Unido (COSD)

**3. Finalidad comercial y alcance.** Ajustes de destino del Cancer Outcomes and Services Dataset (COSD), que en pantalla aparece como COSD (Inglaterra). Usted fija la etiqueta de transporte, el plazo de corrección y las fechas no laborables, una vez para la empresa y, opcionalmente, una vez por centro. Los nombres de los elementos del panel de comprobación son el modelo simplificado de PathScribe, no el esquema oficial de COSD.

**4. Requisitos previos y dependencias.** Elija antes el registro COSD en la pantalla del registro de cáncer. Al quitar la entrada de un centro, ese centro vuelve a los ajustes de la empresa.

Setup step: Tier 7, step 12
Requires: [Notificación al registro de cáncer](#screen-cancer_registry_settings)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-cosd_destination - Ajustes de destino de COSD con el panel de comprobación y el calculador del vencimiento de la corrección]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Ámbito | Empresa o un centro | Obligatorio | Una entrada por ámbito. | Empresa |
| Transporte | Elección: restMtls, sftp, portalUpload | Obligatorio | Solo una etiqueta. El motor de interfaces guarda la dirección y las credenciales. | API segura (restMtls) |
| Días laborables para corregir | Número entero, de 1 a 30 | Obligatorio | Días laborables de que se dispone para corregir un envío rechazado. | 5 |
| Fechas no laborables | Lista de fechas, AAAA-MM-DD | Opcional | Días que no se cuentan como laborables. No se supone ninguno. | Ninguno |
| Quitar | Botón | Opcional | Solo entradas de centro; vuelve a los ajustes de la empresa. | No aplicable |

#### Comprobar un envío de ejemplo

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Número del NHS | Texto | Obligatorio | El paciente de ejemplo. | En blanco |
| Fecha de nacimiento | Fecha | Obligatorio | Ejemplo. | En blanco |
| Fecha del diagnóstico | Fecha | Obligatorio | Ejemplo. | En blanco |
| CIE-O-3 | Texto | Obligatorio | Ejemplo. | En blanco |
| Diagnóstico principal | Texto | Obligatorio | Ejemplo. | En blanco |

#### ¿Cuándo vence una corrección?

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Rechazado el | Fecha | Obligatorio | Cuenta hacia delante los días laborables de corrección, omitiendo los fines de semana y sus fechas no laborables. | En blanco |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:cosd-destination:manage`. Admin y Lab Director la tienen de forma predeterminada.

**Límites conocidos.** Lo que queda por confirmar con la especificación real de COSD es: los nombres de los elementos, la lista de elementos obligatorios, los valores de las listas de códigos, las reglas de fechas, el sobre de envío, los códigos de rechazo y el inicio del plazo de corrección.

### Anatomía Patológica electrónica de EE. UU. {#screen-us_epath}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Anatomía Patológica electrónica de EE. UU.

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Anatomía Patológica electrónica de EE. UU.

**3. Finalidad comercial y alcance.** Notificación de patología electrónica (ePath) a los registros estatales de cáncer de EE. UU. Un mensaje base genérico del National Program of Cancer Registries (NPCR) (HL7 v2.5.1 ORU^R01) se ajusta mediante un perfil estatal y se envía por un transporte (PHIN-MS, SFTP, TCP directo o una API HTTPS). El estado se toma del estado del centro ejecutor, nunca de la dirección del paciente. Solo se entrega un perfil de ejemplo con su etiqueta.

**4. Requisitos previos y dependencias.** El centro necesita tener su estado fijado en el Diccionario de centros. Sin centro o sin perfil, la notificación se aparca (`routing:noFacility`, `routing:noProfile`) y la firma no se retiene.

Setup step: Tier 7, step 13
Requires: [Diccionario de centros](#screen-facility-dictionary), [Notificación al registro de cáncer](#screen-cancer_registry_settings)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-us_epath - Lista de perfiles ePath de EE. UU. y asignaciones]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Ámbito de la asignación | Empresa o un centro | Obligatorio | Dónde se aplica un perfil. Un centro recurre a un perfil de su propio estado y después al valor predeterminado de la empresa. | Empresa |
| Perfil asignado | Elección entre perfiles | Obligatorio | El perfil que se utiliza. | Ninguno |

#### Ventana de perfil

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Estado | Dos letras | Obligatorio | El estado al que corresponde el perfil. | Ninguno |
| Nombre | Texto | Opcional | Nombre para mostrar. | En blanco |
| Campos obligatorios | Lista de códigos de segmento-campo como `PID-11` | Opcional | Deben estar rellenados. Nunca `MSH`. No pueden coincidir con los campos opcionales. | Ninguno |
| Campos opcionales | Lista de códigos de segmento-campo | Opcional | Se envían cuando existen. | Ninguno |
| Transporte | Elección: PHIN-MS, SFTP, TCP directo, API HTTPS | Obligatorio | Etiqueta de transporte para el motor de interfaces. | Ninguno |
| Qué centro determina el estado | Elección: centro del componente técnico, centro de lectura | Obligatorio | Elige el centro cuyo estado selecciona el perfil. | Componente técnico |
| Solo informe final | Sí/No | Opcional | Comprobación. | Desactivado |
| Se exige morfología ICD-O | Sí/No | Opcional | Comprobación. | Desactivado |
| Se exige SNOMED | Sí/No | Opcional | Comprobación. | Desactivado |
| Se exige el identificador de la muestra | Sí/No | Opcional | Comprobación. | Desactivado |
| Se exige el NPI del profesional | Sí/No | Opcional | Comprobación. Falla en los casos de demostración, que no tienen NPI. | Desactivado |
| Campos específicos del estado | Filas con campo, modo (obligatorio o fijo) y valor | Opcional | Reglas estatales adicionales. | Ninguno |

Una notificación que no supera una comprobación queda retenida para su revisión (`HOLD_EPATH_PROFILE`).

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:us-epath:manage`. Admin y Lab Director la tienen de forma predeterminada.

**Límites conocidos.** Los identificadores OBR y OBX son valores predeterminados, pendientes de confirmar con la guía del NPCR. Ningún perfil estatal está verificado.

### Notificación al registro de citología {#screen-cytology_registry}
Breadcrumb: Inicio > Configuración > Citología > Notificación al registro

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Citología** > sección **Notificación al registro**
**2. Elemento de mantenimiento:** Notificación al registro

**3. Finalidad comercial y alcance.** Notificación a programas de cribado cervical, independiente de los registros de cáncer. Un resultado de cribado nunca activa una notificación de cáncer. Hay 12 definiciones: `csms_uk`, `nicsp_northern_ireland`, `sccrs_scotland`, `cervicalcheck_ireland`, `palga_netherlands`, `germany_okfe`, `france_crcdc`, `belgium_chr`, `ncsr_australia`, `ncsp_new_zealand`, `canada_provincial` y `kncsp_kccr_korea`. No hay registro de cribado de EE. UU. ni de España. La asignación de cada registro conecta sus categorías de citología con los códigos del registro para idoneidad, interpretación principal, interpretación adicional y recomendación.

**4. Requisitos previos y dependencias.** La tabla de asignación enumera sus categorías de interpretación de citología, de modo que estas van primero. Si las omite, la tabla está vacía.

Setup step: Tier 7, step 14
Requires: [Interpretación y recomendaciones](#screen-cytology_categories), [Sistema de nomenclatura](#screen-cytology_nomenclature), [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Archivos por lotes para registros](#screen-batch_registry_feed)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_registry - Notificación al registro de citología con el valor predeterminado de la empresa, las excepciones y la tabla de asignación]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Registro predeterminado de la empresa | Elección entre Ninguno y los 12 registros | Obligatorio | Lo utiliza cualquier centro sin excepción. | Ninguno |
| Guardar | Botón | Opcional | Guarda el valor predeterminado. | No aplicable |
| Añadir excepción | Botón | Opcional | Inicia una excepción por centro. | No aplicable |
| Centro | Elección entre centros | Obligatorio para una excepción | El centro. | Ninguno |
| Registro | Elección entre los 12 registros | Obligatorio para una excepción | El registro de ese centro. | Ninguno |
| Guardar, Cancelar, Configurar, Quitar | Botones | Opcional | Guardan o descartan una excepción, abren su configuración o la quitan. | No aplicable |

#### Configuración del registro

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Registro | Elección | Obligatorio | El registro que se configura. | El primero |
| Retener un resultado hasta que todas las categorías que use tengan un código del registro | Casilla de verificación | Opcional | Desactivada para los registros integrados. | Desactivado |
| Retener un resultado salvo que el paciente tenga un identificador verificado | Casilla de verificación | Opcional | Solo se muestra cuando el registro tiene un formato de identificador. | Desactivado |
| Categoría | Texto, columna | No aplicable | Su categoría de citología. | Ninguno |
| Campo | Texto, columna | No aplicable | Idoneidad, interpretación principal, interpretación adicional o recomendación. | Ninguno |
| Código del registro | Texto | Opcional | El código del registro. | En blanco |
| Texto del registro | Texto | Opcional | El texto del registro, para los registros que codifican con texto. | En blanco |
| Guardar la configuración del registro | Botón | Opcional | Guarda la asignación. | No aplicable |

El **panel de conexión con el registro** se describe en [Notificación al registro de cáncer](#screen-cancer_registry_settings). Aquí utiliza las capacidades de cribado.

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:screening-registry:manage`. Ejecutar el conjunto de pruebas: `registry:test-suite:run`. Aprobar la puesta en marcha: `registry:live-register:approve`. Admin las tiene de forma predeterminada. El Lab Director no tiene `config:screening-registry:manage` de forma predeterminada.

**Límites conocidos.** Tres registros están marcados como verificados (CSMS, PALGA, NCSR); los demás son configurables y no están verificados. Alemania, Francia y Bélgica son registros de archivos por lotes (véase Archivos por lotes para registros).

### Archivos por lotes para registros {#screen-batch_registry_feed}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Archivos por lotes para registros

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Archivos por lotes para registros

**3. Finalidad comercial y alcance.** Para un registro que admite archivos en lugar de mensajes, un perfil de lote indica qué registros entran, cómo se organiza el archivo y cómo se nombra. Formatos: CSV, XML y XML NAACCR. **El XML NAACCR figura en la lista pero No está construido**: el perfil NAACCR que se entrega está desactivado. Se entrega un perfil de ejemplo (basado en `germany_okfe`, CSV, delimitador `;`, 10 columnas, desactivado) que no es una especificación de programa. Los diseños reales de los programas No están construidos.

**4. Requisitos previos y dependencias.** Un lote se genera según el calendario de Programaciones de entrega y lo envía el motor de interfaces por SFTP. Elija antes el registro en la pantalla de cáncer o de citología.

Setup step: Tier 7, step 15
Requires: [Notificación al registro de cáncer](#screen-cancer_registry_settings), [Notificación al registro de citología](#screen-cytology_registry), [Programaciones de entrega](#screen-delivery_schedules)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-batch_registry_feed - Tarjetas de perfil de Archivos por lotes para registros]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| En espera | Recuentos, solo lectura | No aplicable | **Comprobar lo que está pendiente** muestra los registros en espera, los pendientes ahora, los retenidos, los fuera de plazo y el próximo archivo. | Ninguno |
| Generar el archivo ahora | Botón | Opcional | Genera un archivo a mano. Se descarga una vez y nunca se almacena. Un manifiesto enumera SHA-256, secuencia, recuentos y registros retenidos. | No aplicable |
| Activar, Desactivar | Botón | Opcional | Activa el perfil. | Desactivado |
| Editar | Botón | Opcional | Abre el editor del perfil. | No aplicable |
| Quitar | Botón | Opcional | No está disponible para los perfiles que se entregan. | No aplicable |
| Estado de la ejecución | Texto, solo lectura | No aplicable | awaitingAck, accepted, partlyRejected o rejected. | Ninguno |

#### Editor de perfil

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre del programa | Texto | Obligatorio | Da nombre al programa. | En blanco |
| Registro | Elección entre los 26 registros (de cribado y de cáncer) | Obligatorio | Qué registro. | Ninguno |
| Formato de archivo | Elección: CSV, XML, XML NAACCR | Obligatorio | El XML NAACCR se rechaza (`formatNotAvailable`). | CSV |
| Delimitador | Elección: coma, punto y coma, tabulación | Obligatorio para CSV | Separador de columnas. | Coma |
| La primera fila contiene los encabezados | Sí/No | Opcional | Escribe una fila de encabezados. | Activado |
| Proteger frente a fórmulas de hoja de cálculo | Sí/No | Opcional | Protege el texto que empieza como una fórmula. | Activado |
| Raíz XML y elemento de registro | Texto, dos cuadros | Obligatorio para XML | Nombres válidos y distintos. | Results, Result |
| Código en el nombre del archivo | Texto, de 1 a 20 letras, dígitos, guion o guion bajo | Opcional | El código del programa en el nombre del archivo. | En blanco |
| Patrón del nombre de archivo | Texto con {program} {date} {time} {seq} | Obligatorio | Debe contener {date} o {seq}. | `{program}_{date}_{seq}` |
| Columnas | Lista: campo (15 campos), Encabezado, Obligatorio, subir, bajar, quitar, Añadir una columna | Obligatorio | Cada campo una sola vez. Un registro al que falta una columna obligatoria queda retenido como `REGISTRY_NOT_READY`. | Ninguno |
| Vista previa en directo | Texto, solo lectura | No aplicable | Muestra el diseño del archivo. | Ninguno |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Gestionar perfiles: `config:batch-registry-feed:manage` (Admin y Lab Director). Generar un archivo: `registry:batch-file:generate` (Admin, y necesita la primera capacidad).

**Límites conocidos.** Un reenvío de un solo registro desde Excepciones de registros sigue enviando un mensaje para un programa por lotes. El calendario procede de Programaciones de entrega. La entrega por SFTP corresponde al motor de interfaces.

## Notificación de calidad y de salud pública (MIPS/MACRA) {#ch8-quality-reporting}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio

**Estado:** No construido

PathScribe no tiene ninguna medida, pantalla, exportación ni contrato del Merit-based Incentive Payment System (MIPS), de la Medicare Access and CHIP Reauthorization Act (MACRA) ni del Quality Payment Program. Una búsqueda en el código fuente y en los documentos no encontró ninguno. Nada de lo que hay aquí calcula una medida de calidad ni construye un archivo de envío.

**Lo más parecido que existe:**

- El [canal de informes](#screen-bi_feed) envía los datos de los casos a una herramienta de inteligencia empresarial, en la que puede construir sus propias medidas.
- Exportaciones: los usuarios con la capacidad adecuada pueden descargar exportaciones de la aplicación, y la [pestaña financiera de Registros del sistema](#screen-audit-financial) exporta los eventos de facturación como CSV.
- La notificación a registros de cáncer y de cribado cervical (más arriba) es la notificación de salud pública que está construida, dentro de los límites descritos.

## Asignaciones de pagos por jurisdicción, tipos de pago maestros y registro financiero {#ch8-payment-reference}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos

PathScribe describe quién paga en dos capas. Un **tipo de pago maestro** es una categoría que se utiliza en todas partes (por ejemplo, el seguro comercial). Una **asignación de pagos por jurisdicción** indica que un esquema local (por ejemplo `DE_GKV`) pertenece a una categoría y a qué formato de salida está destinado. La clase financiera que acompaña a un cargo se construye con ambos. Los formatos de salida que nombra la asignación son solo etiquetas: X12 837P, KVDT y SESAM-Vitale están Planificados y no se genera ninguno.

### Diccionario maestro de tipos de pago {#screen-master_payment_types}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos > Diccionario maestro de tipos de pago

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas financieras y de ingresos**
**2. Elemento de mantenimiento:** Diccionario maestro de tipos de pago

**3. Finalidad comercial y alcance.** Las categorías de pago que utilizan las asignaciones, el registro de casos y la carga útil del cargo. Se incluyen once: SELF_PAY, PATIENT_COPAY_GAP, COMMERCIAL_INSURANCE, MUTUELLE_COMPLEMENTARY, STATUTORY_SOCIAL_HEALTH, PUBLIC_UNIVERSAL_BENEFIT, PUBLIC_NHS (etiqueta de identificador "NHS Number"), RECIPROCAL_INTERNATIONAL, SPONSOR_CLINICAL_TRIAL, OCCUPATIONAL_WORKERS_COMP (etiqueta de identificador "Claim #") y DIRECT_CONTRACT_INSTITUTIONAL.

**4. Requisitos previos y dependencias.** Es un punto de partida para el pago. Las asignaciones solo pueden elegir aquí un tipo activo.

Setup step: Tier 7, step 8
Requires: Ninguno, es un punto de partida.
Unlocks: [Asignación de pagos por jurisdicción](#screen-jurisdiction_payment_mappings)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-master_payment_types - Lista del Diccionario maestro de tipos de pago]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Id | Texto | Obligatorio | Se guarda en mayúsculas y los espacios pasan a guiones bajos. Queda bloqueado tras crearlo, porque las asignaciones lo referencian. Se rechaza un duplicado. | Ninguno |
| Nombre para mostrar | Texto | Obligatorio | El nombre que ve el personal. | Ninguno |
| Requiere ID de suscriptor | Sí/No | Opcional | El personal debe introducir un número de suscriptor o de póliza. | Desactivado |
| Etiqueta del ID de suscriptor | Texto | Opcional | La etiqueta de ese número (por ejemplo "Claim #"). | En blanco |
| Requiere garante | Elección: obligatorio, opcional, no obligatorio | Obligatorio | Si hace falta un garante. | no obligatorio |
| Admite facturación dividida | Sí/No | Opcional | Si las partes técnica y profesional pueden ir a pagadores distintos. | Desactivado |
| Notas | Texto | Opcional | Notas libres. | En blanco |
| Activo | Sí/No | Opcional | Botones **Desactivar** y **Reactivar**. | Activo |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:payment-types:manage`. Admin y Lab Director la tienen de forma predeterminada.

**Límites conocidos.** Desactivar un tipo no se comprueba frente a las asignaciones que lo utilizan.

### Asignación de pagos por jurisdicción {#screen-jurisdiction_payment_mappings}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos > Asignación de pagos por jurisdicción

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas financieras y de ingresos**
**2. Elemento de mantenimiento:** Asignación de pagos por jurisdicción

**3. Finalidad comercial y alcance.** Asigna cada esquema local de pagador a un tipo de pago maestro. La pestaña "Datos del paciente externo" del registro de casos lee estas asignaciones (selector Jurisdicción principal), y la carga útil de la clase financiera las utiliza. Se incluyen trece filas: US_MEDICARE, US_COMMERCIAL, CA_OHIP (código de país CA_ON), UK_NHS_TRUST, DE_GKV, DE_BG, FR_CPAM, FR_MUTUELLE, NL_BASIS, BE_MUT, AU_MBS, NZ_ACC y KR_NHIS. **No hay ninguna fila para España, Escocia, Irlanda del Norte ni Irlanda**, aunque el código define 14 jurisdicciones, entre ellas España.

**4. Requisitos previos y dependencias.** La lista de tipos maestros debe contener antes la categoría. Solo se ofrecen los tipos activos.

Setup step: Tier 7, step 9
Requires: [Diccionario maestro de tipos de pago](#screen-master_payment_types), [Resumen de jurisdicciones](#screen-jurisdiction_overview)
Unlocks: [Vista previa de la exportación de facturación](#screen-dft_export_preview)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-jurisdiction_payment_mappings - Lista de Asignación de pagos por jurisdicción con filtro de país]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtro de país | Elección entre países | Opcional | Reduce la lista. | Todos |
| Mostrar inactivos | Interruptor Sí/No | Opcional | Incluye las filas inactivas. | Desactivado |
| Código de país | Texto | Obligatorio | Se guarda en mayúsculas. Texto libre, no se comprueba con la lista de jurisdicciones. | Ninguno |
| Código del esquema local | Texto | Obligatorio | Se guarda en mayúsculas. | Ninguno |
| Terminología local mostrada | Texto | Obligatorio | El nombre que ve el personal. | Ninguno |
| Tipo de pago maestro | Elección entre tipos maestros activos | Obligatorio | La categoría. | Ninguno |
| Formato de salida principal | Texto | Obligatorio | Una etiqueta como X12 837P. No se genera ningún archivo. | Ninguno |
| Notas | Texto | Opcional | Notas libres. | En blanco |
| Activo | Sí/No | Opcional | Las filas inactivas se ocultan del selector Jurisdicción principal. | Activo |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:payment-mappings:manage`. Admin y Lab Director la tienen de forma predeterminada.

**Límites conocidos.** No hay comprobación de duplicados por código de país y código de esquema. La salida X12 837P, KVDT y SESAM-Vitale está Planificada.
### Registros del sistema: Financiero {#screen-audit-financial}
Breadcrumb: Inicio > Registros del sistema > Financiero

**Estado:** Demostración

**1. Navegación:** página **Registros del sistema** > pestaña **Financiero**
**2. Elemento de mantenimiento:** No aplicable, es una página de registro.

**3. Finalidad comercial y alcance.** Una vista de solo lectura de los eventos de facturación y de los cargos salientes fallidos o en cola. Tiene dos subpestañas: **Registros de facturación** y **DLQ de salida** (cola de mensajes fallidos, la lista de cargos cuyo envío falló).

**4. Requisitos previos y dependencias.** Solo muestra datos cuando ya existen cargos.

Setup step: Reference, not part of setup
Requires: [Diccionario de facturación (captura de cargos)](#screen-billing_dictionary), [Liberación de facturación](#screen-billing_release)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-audit-financial - Pestaña Financiero de Registros del sistema, filtros y resultados de Registros de facturación]

**6. Referencia de campos.**

#### Filtros de Registros de facturación

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Número de caso | Texto | Opcional | Filtro. | En blanco |
| Nombre del paciente | Texto | Opcional | Filtro. | En blanco |
| Intervalo de nombres de pacientes (A–Z) | Dos letras | Opcional | Filtro. | En blanco |
| ID del paciente (NHC, MPI) | Texto | Opcional | Filtro. | En blanco |
| Fecha del evento de facturación desde, hasta | Fechas | Opcional | Filtro por la fecha del evento. | En blanco |
| Fecha del servicio desde, hasta | Fechas | Opcional | Filtro. | En blanco |
| Fecha de firma del informe desde, hasta | Fechas | Opcional | Filtro. | En blanco |
| Tipo | Elección: Cargo, Abono, Deficiencia, Revisión de códigos, Envío, Modificación, Auditoría | Opcional | Filtro. | Todos |
| Tipo de facturación | Elección | Opcional | Filtro. | Todos |
| Estado | Elección: Borrador, Pendiente de aprobación, Aprobado, Exportado, Rechazado, En espera | Opcional | Filtro. | Todos |
| Personal, Patólogo firmante, Centro solicitante | Búsquedas (Explorar) | Opcional | Filtros. | En blanco |
| Búsqueda en el texto del detalle | Texto | Opcional | Busca en el texto del detalle. | En blanco |
| Consultas guardadas | Elección y Guardar | Opcional | Se conservan como ajustes personales. | Ninguno |
| Borrar, Buscar | Botones | Opcional | Restablecen o ejecutan. | No aplicable |
| Exportar CSV | Botón | Opcional | Necesita `audit:billing-log:export`. | No aplicable |

#### Resultados de Registros de facturación

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Caso, Paciente, ID del paciente | Columnas | No aplicable | Los datos del paciente están etiquetados como información sanitaria protegida. | Ninguno |
| Marca de tiempo, Tipo, Tipo de facturación, Estado, Evento, Detalle | Columnas | No aplicable | El evento. | Ninguno |
| Personal, Patólogo, Centro | Columnas | No aplicable | Quién y dónde. | Ninguno |

La búsqueda muestra como máximo 50 casos. Cuando coinciden más, aparece el mensaje "Se alcanzó el límite de casos".

#### DLQ de salida

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtro de laboratorio | Elección, "Todos los laboratorios de realización" | Opcional | Limita ambas tablas. | Todos los laboratorios de realización |
| Fallidos: Caso, Laboratorio de realización, Componente, Error, Reintentos | Columnas | No aplicable | Códigos de error: `MISSING_ICD10`, `MISSING_PROVIDER_NPI`, `DISPATCH_TIMEOUT`, `DISPATCH_REJECTED`. Los dos últimos solo aparecen mediante los botones de prueba. | Ninguno |
| Corregir y reintentar: Guardar y volver a encolar | Botón | Opcional | Adjunta al caso un código CIE-10 o el NPI del profesional (se audita) y lo vuelve a poner en cola. | No aplicable |
| Corregir y reintentar: Reintentar envío | Botón | Opcional | Vuelve a intentarlo. | No aplicable |
| CAPA: Registrar como CAPA | Botón | Opcional | Genera una deficiencia de tipo `def-outbound-dispatch-failure`. | No aplicable |
| En cola: Caso, Laboratorio de realización, Componente, Origen | Columnas | No aplicable | Cargos a la espera de envío. | Ninguno |
| Simular tiempo de espera agotado, Simular rechazo | Botones | Opcional | Solo para pruebas. El envío real no está construido. | No aplicable |

**7. Permisos.** Abrir: `screen:audit-log:open`, que tienen Admin, Lab Director y QA Reviewer de forma predeterminada. Exportar los registros de facturación a CSV: `audit:billing-log:export`. La misma página tiene las pestañas Registro de auditoría, Registro de errores, Registro de interfaces, Garantía de calidad, Alertas críticas, Enlaces de consulta y Trabajos del servidor; véanse [Registros de interfaces](#screen-audit-interfaces) y [Registro de auditoría](#screen-audit-log).

**Límites conocidos.** La simulación del envío es una ayuda para las pruebas. Ningún sistema de facturación real recibe cargos.
