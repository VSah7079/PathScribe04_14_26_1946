---
chapter: 4
id: ch4
title: Nivel 3: Motores de flujo de trabajo y configuración operativa (configurar en tercer lugar)
---

# Nivel 3: Motores de flujo de trabajo y configuración operativa (configurar en tercer lugar) {#ch4}

El Nivel 3 es la parte de Configuración que decide cómo avanza el trabajo una vez que existen las personas, los centros, los dispositivos y los diccionarios de los Niveles 1 y 2: adónde se dirige un caso, qué comandos y macros ofrece un puesto de trabajo, cómo se retiene un caso para su revisión antes y después de la firma, y cómo se miden el tiempo de respuesta y la calidad. Configúrelo en tercer lugar. La mayoría de las pantallas de este nivel leen un diccionario del Nivel 1 o del Nivel 2 (un centro, una subespecialidad, un tipo de muestra) y muestran una lista de selección vacía hasta que ese diccionario se completa.

Lea esto antes de empezar. Cuatro cosas son distintas de lo que sugieren los títulos de pantalla del propio producto.

- **No existe ninguna "plantilla de flujo de trabajo de entrada de pedidos" ni "plantilla de flujo de trabajo de registro".** El comportamiento del registro está repartido entre ajustes que se documentan donde se encuentran; [Dónde están los ajustes del registro](#ch4-accession-settings) los enumera. **No construido.**
- **Varias pantallas guardan sus valores en el navegador del equipo con el que se configuran** (Enrutamiento de casos, Reglas de enrutamiento, Registro de acciones, Modo de validación del entintado, Seguimiento de controles posteriores, Correlación biopsia-resección, Ajustes de contribución y los interruptores de despliegue de la pestaña Voz). El estado de la pantalla lo indica. Otros puestos de trabajo no ven estos ajustes hasta que exista la versión con servidor de la API.
- **La patología digital es sobre todo un diccionario de proveedores.** PathScribe enumera proveedores y una dirección de lanzamiento del visor; no tiene controlador de escáner y no muestra por sí mismo las imágenes de las preparaciones. Consulte [Patología digital](#ch4-digital-pathology).
- **Casi todos los ajustes de firma y de calidad tienen un valor predeterminado de la organización y una excepción por laboratorio.** La excepción se establece en la ventana de edición de Configuración de centros ([Diccionario de centros](#screen-facility-dictionary)) o dentro de la propia pantalla.

Configure el Nivel 3 en este orden. Cada pantalla de configuración incluye un cuadro de secuencia de configuración con la misma información, y el generador comprueba que ninguna pantalla requiera otra que venga después. Las pantallas marcadas como referencia son páginas de uso diario y no forman parte de la configuración.

1. [Reglas de enrutamiento](#screen-routing_rules): reglas de palabras clave que envían un caso a un grupo de subespecialidad.
2. [Enrutamiento de casos](#screen-case_routing): los ajustes de asignación a grupos y el editor de reglas más completo.
3. [Registro de acciones (pestaña)](#screen-tab-actions): los comandos, sus atajos y sus frases de voz.
4. [Grupos de acciones](#screen-action_groups): conjuntos con nombre de comandos para un puesto de trabajo.
5. [Macros (pestaña)](#screen-tab-macros): macros de texto compartidas y la importación de AutoTexto de Word.
6. [Voz (pestaña)](#screen-tab-voice): interruptores de reconocimiento de voz, ajustes de voz personales y el pedal.
7. [Excepciones de ruta de tallado](#screen-grossing_route_overrides): una ruta de tallado fija para un centro y un tipo de muestra.
8. [Modo de validación del entintado](#screen-inking_validation_mode): advertir o exigir ante problemas de tinta.
9. [Integraciones con proveedores](#screen-vendor_integrations): proveedores de patología digital, de visor WSI, de almacén de imágenes y de imágenes macroscópicas.
10. [Revisión por pares antes de la validación](#screen-peer_review_gate): dónde espera la firma a una revisión por pares.
11. [Revisión de concordancia preliminar-definitivo](#screen-concordance_review_settings): comparación entre lo preliminar y lo definitivo.
12. [Búfer de liberación tras la validación](#screen-release_buffer): el plazo de retirada tras la firma.
13. [Reglas de firma por país](#screen-country_signing_rules): normas nacionales por tipo de participación (solo administrador de la plataforma).
14. [Motivos de revisión](#screen-revision_reasons): qué motivos de enmienda y corrección recomiendan una CAPA.
15. [Reglas de marcado automático para comité de tumores](#screen-tumor_board_rules): qué incluye un caso en la lista de un comité.
16. [Correlación biopsia-resección](#screen-biopsy_resection_correlation): la ventana entre biopsia y resección.
17. [Correlación citología-histología](#screen-cytology_histology_correlation): la ventana entre citología y biopsia.
18. [Seguimiento de controles posteriores](#screen-follow_up_tracking): avisos y correo electrónico al clínico por controles posteriores que no han llegado.
19. [Resultados críticos intraoperatorios](#screen-intraop_critical_results): resultados de biopsia intraoperatoria que van directamente al cirujano.
20. [Terminales del quirófano](#screen-or_suite_terminals): pantallas de quirófano y sus tokens.
21. [Perfiles de visualización](#screen-display_profiles): pantallas murales para el panel Operaciones del centro.
22. [Centro de configuración de calidad](#screen-qa_config_center): actividades de calidad, muestreo y activadores de CAPA.
23. [Política de tendencia de discordancias](#screen-qa_trend_policy): cuándo se señala una discordancia repetida.
24. [Configuración de TRT (pestaña)](#screen-tab-tat): objetivos de tiempo de respuesta.
25. [Objetivos de rendimiento](#screen-performance_targets): las cifras con las que se mide a un patólogo.
26. [Reglas de control de calidad de citología](#screen-cytology_qc_rules): quién se selecciona para la revisión por pares de citología.
27. [Tasas de selección aleatoria del control de calidad de citología](#screen-cytology_qc_settings): los porcentajes de muestreo aleatorio.
28. [Límite diario de carga de trabajo de citología](#screen-cytology_workload_cap): el límite diario de preparaciones y la jornada de cribado.
29. [Ajustes de contribución](#screen-contribution_settings): la página Mi contribución.
30. [Comentarios](#screen-feedback): el botón de comentarios de calidad.
31. [Canal de investigación](#screen-research_feed): el titular de PubMed en Inicio.
32. [Motivos del puesto de trabajo](#screen-bench_reasons): los motivos de un toque del puesto, con las palabras de su laboratorio.

Páginas de referencia, que no forman parte de la configuración: [Gestión de lotes](#screen-batch-management), [Estación de inclusión](#screen-embedding-station), [Estación de microtomía](#screen-microtomy-workstation), [Estación de distribución de preparaciones](#screen-slide-distribution-station), [Inicio](#screen-home), [Buzón de depósito](#screen-lockbox-drop-off), [Garantía de calidad](#screen-quality-assurance), [Revisión de excepciones de márgenes](#screen-margin-exception-review) y [Cola de control de calidad de citología](#screen-cytology-qc-queue).

## Entrada de pedidos y registro: enrutamiento y conjuntos de acciones {#ch4-order-entry}
Breadcrumb: Inicio > Configuración

Esta parte describe los ajustes que deciden adónde va un caso después de crearse y qué comandos ofrece un puesto de trabajo. Lea primero [Dónde están los ajustes del registro](#ch4-accession-settings): PathScribe no tiene una única pantalla de "plantilla de flujo de trabajo de entrada de pedidos", y esa sección indica qué existe en su lugar.

### Dónde están los ajustes del registro {#ch4-accession-settings}
Breadcrumb: Inicio > Configuración > Sistema

**Estado:** Parcial

Hoy PathScribe no tiene ninguna pantalla configurable de "plantilla de flujo de trabajo de entrada de pedidos" ni de "plantilla de flujo de trabajo de registro". **No construido.** La pantalla Registro (Inicio > Registro) toma su comportamiento de los diccionarios y las reglas siguientes, cada uno configurado en su propia pantalla. La propia pantalla Registro no tiene una página de ajustes propia. La lista se ha elaborado a partir de los servicios a los que llama la pantalla Registro.

| Qué cambia en el registro | Dónde se configura | Capítulo |
|---|---|---|
| El formato del número de acceso | [Configuración de máscara de casos](#screen-case_mask_config) | Nivel 1 |
| Qué campos deben estar rellenos antes de poder registrar el caso (ids de página `accession` y `clinicalHistory`) | [Requisitos de los campos](#screen-field_requirements) | Nivel 1 |
| La lista de departamentos y la plantilla de tallado con la que empieza un departamento | [Departamentos](#screen-departments) | Nivel 2 |
| La lista de selección de muestras y la lista de selección de recipientes | [Diccionario de muestras](#screen-specimens) y [Tipos de recipiente](#screen-container_types) | Nivel 2 |
| La lista de selección de médicos peticionarios | [Médicos](#screen-physicians) | Nivel 2 |
| Los motivos de deficiencia que se pueden notificar en la recepción | [Deficiencias de muestras](#screen-deficiencies) | Nivel 2 |
| La ruta de tallado que se asigna a una muestra en el registro, cuando se aplica una excepción específica de un centro | [Excepciones de ruta de tallado](#screen-grossing_route_overrides) | Nivel 3 |
| A qué grupo se dirige un caso sin asignar (esto se ejecuta al completar el tallado, no en el registro) | [Enrutamiento de casos](#screen-case_routing) y [Reglas de enrutamiento](#screen-routing_rules) | Nivel 3 |

Los pedidos entrantes del motor de interfaces se asocian mediante la tabla de correspondencias de códigos de muestra, que se configura en Tipos de pedido y reglas de entrada, en el Nivel 6. Las llamadas al servidor para pedidos entrantes, la tabla de correspondencias, los borradores y la cola de salida del registro se describen en `docs/architecture/ACCESSIONING_API.md`.

**Límites conocidos.** Planificado: una plantilla que agrupe estos ajustes por flujo de trabajo. No hay fecha fijada. Hasta entonces, cada ajuste se cambia en su propia pantalla.

### Reglas de enrutamiento {#screen-routing_rules}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Reglas de enrutamiento

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones**
**2. Elemento de mantenimiento:** Reglas de enrutamiento

**3. Finalidad y alcance.** Una regla de enrutamiento envía un caso a un grupo de subespecialidad según las palabras de la descripción de la muestra. Esta pantalla es el editor sencillo de las reglas de palabras clave: una regla es un grupo, una lista de palabras clave, una prioridad y una nota. Las reglas se evalúan por orden de prioridad y gana la primera coincidencia. PathScribe incluye ocho reglas integradas (colorrectal, digestivo alto, hepatobiliar y pancreático, mama, genitourinario, ginecológico, dermatopatología, hematopatología; prioridades de 10 a 60). Las reglas integradas se pueden editar y desactivar, pero no eliminar. Las mismas reglas se muestran también, con más opciones (coincidencia por tipo de muestra, un laboratorio ejecutor, grupos de reserva por laboratorio), en [Enrutamiento de casos](#screen-case_routing); ambas pantallas leen y escriben una única lista almacenada.

**4. Requisitos previos y dependencias.** Una regla apunta a un grupo, y un grupo es una subespecialidad con **Grupo / grupo de trabajo** activado. Si omite las subespecialidades, la lista **Dirigir al grupo** queda vacía, se muestra una advertencia y no se puede guardar una regla.

Setup step: Tier 3, step 1
Requires: [Subespecialidades](#screen-subspecialties)
Unlocks: [Enrutamiento de casos](#screen-case_routing)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-routing_rules - Lista de Reglas de enrutamiento con el cuadro Probar enrutamiento, la búsqueda y el filtro]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Probar enrutamiento (descripción de la muestra) | Texto | Opcional | Escriba una descripción y seleccione **Probar**. La pantalla muestra el grupo de la primera regla activa que coincide, junto con la nota y la prioridad de la regla, o una advertencia de que ninguna regla coincide y de que el caso iría al grupo de reserva. Solo prueba reglas de palabras clave y siempre como un conjunto de reglas globales (no se aplica ningún laboratorio ejecutor). | En blanco |
| Buscar palabras clave o notas | Texto | Opcional | Filtra la lista por palabra clave o por texto de la nota. | En blanco |
| Filtrar reglas de enrutamiento | Opción: Todas, Activas, Inactivas, Solo personalizadas | Opcional | Filtra la lista. **Solo personalizadas** oculta las reglas integradas. | Todas |
| Prio. | Número entero | No aplicable | Prioridad, que se muestra en la lista. La más baja se evalúa primero. | No aplicable |
| Se dirige al grupo | Nombre del grupo | No aplicable | El grupo de destino, que se muestra en la lista. | No aplicable |
| Palabras clave | Etiquetas | No aplicable | Las ocho primeras palabras clave y después "+N más". | No aplicable |
| Nota | Texto | No aplicable | La nota de la regla. | No aplicable |
| Estado (interruptor de la lista) | Interruptor Activa / Inactiva | Opcional | Activa o desactiva la regla al instante. Los cambios se guardan automáticamente. | No aplicable |
| Editar, Duplicar, Eliminar | Botones de fila | No aplicable | **Duplicar** abre la ventana **Añadir regla de enrutamiento** rellenada con una copia de la regla. **Eliminar** (solo reglas personalizadas) pide confirmación y elimina la regla. Las reglas integradas no muestran **Eliminar**. | No aplicable |

#### Ventana Añadir regla de enrutamiento y Editar regla

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Dirigir al grupo | Lista de selección de subespecialidades activas que tienen activado Grupo / grupo de trabajo (de [Subespecialidades](#screen-subspecialties)) | Obligatorio | El grupo al que va el caso. Muestra "Seleccione un grupo" cuando está vacía. | El primer grupo de la lista |
| Palabras clave | Palabras escritas que se añaden con **Añadir** o con Intro y se muestran como etiquetas | Obligatorio (al menos una) | Si la descripción de una muestra contiene alguna palabra clave, la regla coincide. La coincidencia no distingue mayúsculas de minúsculas, es parcial y se ignora la puntuación. Se rechaza una palabra clave que ya esté en la lista. Las palabras clave se guardan en minúsculas. | Ninguna |
| Prioridad | Número entero | Obligatorio | La más baja se evalúa primero. La ventana rechaza una prioridad que ya usa otra regla ("La prioridad N ya la usa otra regla"). Las reglas integradas usan de 10 a 60. | 100 |
| Nota (opcional) | Texto | Opcional | Texto libre para el administrador. Se puede buscar en la lista. | En blanco |
| Estado | Interruptor Activa / Inactiva | Opcional | Una regla inactiva se omite al enrutar. | Activa |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, duplicar, eliminar, activar o desactivar: `config:case-routing:manage` (riesgo alto, por lo que cada comprobación se audita). Admin y Director de laboratorio la tienen de forma predeterminada; Superadmin tiene todo el catálogo (salvo `config:ai-prompt:approve`, retirada por la separación de funciones).
**Límites conocidos.** Las reglas se guardan en el almacén de demostración del navegador; todavía no existe un contrato de servidor para las reglas de enrutamiento (las llamadas al servidor `routing-rules` de `docs/architecture/ROUTING_API.md` corresponden a otra función: las correspondencias de centros, médicos y protocolos). Esta pantalla no puede establecer un laboratorio ejecutor ni asociar por tipo de muestra; para eso utilice [Enrutamiento de casos](#screen-case_routing). Su comprobación de prioridad, que rechaza una prioridad duplicada, no se aplica en Enrutamiento de casos.

### Enrutamiento de casos {#screen-case_routing}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Enrutamiento de casos

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones**
**2. Elemento de mantenimiento:** Enrutamiento de casos

**3. Finalidad y alcance.** Enrutamiento de casos decide cómo llega a un grupo de subespecialidad un caso sin patólogo asignado. La pantalla contiene el interruptor general, el grupo de reserva (un grupo global y una excepción opcional para cada laboratorio ejecutor), las reglas de enrutamiento con ámbito por tipo de muestra y por laboratorio ejecutor, un cuadro de prueba y un botón que asigna ahora todos los casos sin asignar. El diagrama en pantalla "Cómo funciona la asignación" indica el orden: llega un caso; PathScribe comprueba si hay una asignación directa (un caso que ya tiene patólogo no se toca); después las reglas propias del laboratorio, después las reglas globales, después el grupo de reserva del laboratorio, después el grupo de reserva global y, si no hay ninguno, el caso se marca para asignación manual. Un grupo marcado como Predeterminado / Comodín en Subespecialidades tiene prioridad sobre las reservas definidas aquí.

**Cuándo se ejecuta el enrutamiento.** El enrutamiento se ejecuta al completar el tallado de un caso (un caso URGENTE (STAT) usa la ruta URGENTE), y solo la primera vez que empieza en él el trabajo diagnóstico real. No se ejecuta en el registro. Un caso sin muestras no se enruta.

**4. Requisitos previos y dependencias.** Los grupos proceden de [Subespecialidades](#screen-subspecialties) (con Grupo / grupo de trabajo activado), los tipos de muestra del [Diccionario de muestras](#screen-specimens) y los laboratorios ejecutores del [Diccionario de centros](#screen-facility-dictionary) (centros con el rol de laboratorio ejecutor). Si omite los grupos, la pantalla muestra "No se han encontrado grupos activos" y no se puede elegir ninguna reserva; si omite los centros, la tabla por laboratorio y las listas de selección de laboratorio quedan vacías.

Setup step: Tier 3, step 2
Requires: [Reglas de enrutamiento](#screen-routing_rules), [Subespecialidades](#screen-subspecialties), [Diccionario de muestras](#screen-specimens), [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-case_routing - Enrutamiento de casos con el diagrama, el grupo de reserva, la tabla de reglas y la ejecución manual]

**6. Referencia de campos.**

#### Configuración del enrutamiento

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Asignación automática a grupos | Casilla Sí/No | Opcional | Activada, los casos sin asignación del LIS se enrutan por tipo de muestra. Desactivada, el enrutamiento devuelve "sin enrutar" y el caso queda sin asignar. | Activada |
| Los casos URGENTES se enrutan de inmediato | Casilla Sí/No | Opcional | Desactivada, un caso URGENTE no se enruta en absoluto al completar el tallado (el resultado es "El enrutamiento inmediato de casos URGENTES está desactivado"). | Activada |
| Tiempo de espera de asignación (segundos) | Número entero, de 0 a 3600 | Opcional | En pantalla se describe como el tiempo que PathScribe espera a que el LIS asigne antes de enrutar a un grupo; 0 enruta de inmediato. El valor se guarda, pero hoy ningún código de enrutamiento lo lee, por lo que no tiene efecto. | 300 |
| Grupo de reserva global | Lista de selección de grupos activos sin laboratorio ejecutor (de [Subespecialidades](#screen-subspecialties)), más "Ninguno (se requiere asignación manual)" | Opcional | Adónde va un caso cuando ninguna regla coincide y no se aplica ninguna reserva de laboratorio ni ningún grupo Predeterminado / Comodín. | Patología general (`general`) |
| Excepción del grupo de reserva (una fila por laboratorio ejecutor) | Lista de selección de grupos que son globales o pertenecen a ese laboratorio, más "Usar el valor global predeterminado" | Opcional | Un grupo de reserva para los casos de ese laboratorio ejecutor. Un grupo Predeterminado / Comodín marcado en Subespecialidades prevalece sobre esta excepción, y la excepción prevalece sobre la reserva global. | Usar el valor global predeterminado |
| Guardar configuración de asignación | Botón | No aplicable | Guarda los interruptores, el tiempo de espera y los grupos de reserva. Las reglas se guardan por separado, a medida que las cambia. | No aplicable |

#### Tabla de reglas de enrutamiento

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar por palabra clave o nota | Texto | Opcional | Filtra la lista. | En blanco |
| Filtrar por estado | Opción: Todas, Activas, Inactivas | Opcional | Filtra la lista. | Todas |
| Filtrar por laboratorio | Opción: Todos los laboratorios, Solo global o un laboratorio ejecutor | Opcional | Filtra la lista. | Todos los laboratorios |
| Prioridad, Coincidencia, Grupo, Laboratorio ejecutor, Estado | Columnas | No aplicable | Coincidencia muestra "N tipos de muestra" cuando la regla asocia tipos de muestra y, en caso contrario, las cuatro primeras palabras clave. La lista muestra primero las reglas específicas de laboratorio y después las reglas globales, cada grupo por prioridad. Las reglas integradas llevan una insignia **INTEGRADA**. | No aplicable |
| Editar, Duplicar, Desactivar / Reactivar | Botones de fila | No aplicable | Aquí no se puede eliminar (use [Reglas de enrutamiento](#screen-routing_rules) para eliminar una regla personalizada). **Duplicar** abre la ventana **Añadir regla de enrutamiento** con una copia. | No aplicable |
| + Añadir regla de enrutamiento | Botón | No aplicable | Abre la ventana siguiente. | No aplicable |

#### Ventana Añadir regla de enrutamiento y Editar regla de enrutamiento

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Tipos de muestra asociados | Lista de casillas con las entradas activas del [Diccionario de muestras](#screen-specimens), con un cuadro de búsqueda | Obligatorio, salvo que se introduzca una palabra clave | La coincidencia determinista: una muestra elegida del Diccionario de muestras se asocia por su id. La ventana cuenta cuántas hay seleccionadas. | Ninguno seleccionado |
| Palabras clave de reserva | Palabras separadas por comas | Obligatorio, salvo que se asocie un tipo de muestra | Se usa solo para una muestra que no tiene entrada en el Diccionario de muestras (entrada manual o heredada). No distingue mayúsculas de minúsculas; coincidencia parcial. | En blanco |
| Grupo de destino | Lista de selección de grupos activos, mostrados como "Nombre, Global" o "Nombre, laboratorio". Cuando se elige un Laboratorio ejecutor, solo se ofrecen los grupos globales y los de ese laboratorio | Obligatorio | El grupo al que va el caso. Error: "Se necesita un grupo de destino." | Ninguno |
| Prioridad | Número entero, al menos 1 | Obligatorio | La más baja se evalúa primero dentro del nivel específico de laboratorio y dentro del nivel global. Error: "La prioridad debe ser un número positivo." Esta ventana no rechaza una prioridad que ya use otra regla. | 100 |
| Laboratorio ejecutor | Lista de selección de laboratorios ejecutores, o "Global (se comprueba para todos los laboratorios)" | Opcional | Una regla específica de laboratorio se comprueba antes que las reglas globales para los casos propios de ese laboratorio. | Global |
| Nota | Texto | Opcional | Texto libre, con posibilidad de búsqueda. | En blanco |
| Estado | Interruptor Activa / Inactiva | Opcional | Una regla inactiva se omite. | Activa |

#### Probar enrutamiento

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Entrada del diccionario de muestras | Lista de selección de entradas de muestra activas, o "Ninguna (probar en su lugar las palabras clave de reserva)" | Opcional | Prueba la coincidencia por tipo de muestra. | Ninguna |
| Descripción de la muestra | Texto | Opcional | Prueba las palabras clave de reserva. | En blanco |
| Como laboratorio ejecutor | Lista de selección de laboratorios ejecutores, o "Solo global" | Opcional | Prueba como caso de ese laboratorio. El resultado indica el grupo, si la coincidencia fue por tipo de muestra o por palabra clave, y el laboratorio de la regla. | Solo global |

#### Ejecución manual del enrutamiento

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Asignar ahora los casos sin asignar | Botón | No aplicable | Enruta todos los casos que no tienen patólogo asignado, que aún no están en un grupo y que no están finalizados. Requiere `case:routing:run`; sin ella no se ejecuta nada. Después, la pantalla muestra los recuentos de Enrutados, Omitidos y Fallidos y una línea por caso con el motivo. Es útil tras cambiar reglas o tras una caída del LIS. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar la configuración y las reglas: `config:case-routing:manage` (riesgo alto, auditada). Ejecutar el enrutamiento manual: `case:routing:run` (riesgo alto, auditada). Admin y Director de laboratorio tienen ambas de forma predeterminada; Superadmin tiene todo el catálogo (salvo `config:ai-prompt:approve`, retirada por la separación de funciones).
**Límites conocidos.** Demostración: las reglas y la configuración se guardan en el almacén de demostración del navegador y todavía no existe un contrato de servidor. **Tiempo de espera de asignación** se guarda, pero no se usa. El enrutamiento se ejecuta solo al completar el tallado; no hay enrutamiento en el registro.
### Grupos de acciones {#screen-action_groups}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Grupos de acciones

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Grupos de acciones

**3. Finalidad y alcance.** Un grupo de acciones es un conjunto con nombre de comandos del Registro de acciones (por ejemplo, "Registrar preparación / bloque"). Un grupo de estaciones de trabajo hace referencia a grupos de acciones para las acciones que permite de forma predeterminada y las que puede añadir. Una acción puede pertenecer a más de un grupo.

**4. Requisitos previos y dependencias.** Los grupos eligen entre los comandos que figuran en la pestaña [Registro de acciones](#screen-tab-actions). No se puede guardar un grupo sin ninguna acción seleccionada.

Setup step: Tier 3, step 4
Requires: [Registro de acciones](#screen-tab-actions)
Unlocks: [Grupos de estaciones de trabajo](#screen-workstation_groups)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-action_groups - Lista de grupos de acciones con búsqueda y Añadir grupo de acciones]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar grupos de acciones | Texto | Opcional | Filtra la lista por el nombre del grupo. | En blanco |
| Nombre (lista) | Texto | No aplicable | El nombre del grupo. | No aplicable |
| Acciones (lista) | Texto | No aplicable | Los nombres de las tres primeras acciones y después "+N más". | No aplicable |
| Estado (lista) | Activo / Inactivo | No aplicable | Se muestra en la lista. **Desactivar** y **Reactivar** lo cambian al instante. | No aplicable |
| Editar, Duplicar, Desactivar / Reactivar | Botones de fila | No aplicable | **Duplicar** abre **Añadir grupo de acciones** con las mismas acciones ya rellenadas y un nombre de copia. No se puede eliminar. | No aplicable |

#### Ventana Añadir grupo de acciones y Editar

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | El nombre del grupo. Error: "Obligatorio". | Ninguno |
| Acciones | Lista de selección con todas las acciones del Registro de acciones, mostradas como "Etiqueta (categoría)", con un cuadro de búsqueda | Obligatorio (al menos una) | Los comandos del conjunto. Error: "Seleccione al menos una acción". | Ninguna seleccionada |
| Activo | Interruptor Activo / Inactivo | Opcional | Un grupo inactivo se conserva, pero queda marcado como Inactivo. | Activo |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, duplicar, desactivar y reactivar: `config:action-groups:manage` (riesgo alto, auditado; se comprueba en el servicio). Admin y Lab Director la tienen de forma predeterminada.
**Límites conocidos.** Ninguno conocido. La versión del servidor de la API se describe en `docs/architecture/CONFIG_SERVICES_API.md` (`IActionGroupService`).

## Plantillas de tallado, macros de voz y bibliotecas de autotexto {#ch4-grossing-macros}
Breadcrumb: Inicio > Configuración

Esta parte trata los comandos, los atajos de texto y los ajustes de voz que aceleran el tallado y el dictado, y los dos controles de tallado (excepciones de ruta y comprobación del marcado con tinta). Las tres rutas de tallado (Ruta A Tejido estándar, Ruta B Líquido / Bloque celular, Ruta C Solo histología / Triaje directo) están integradas y no se pueden ampliar. La ruta de partida de un departamento se establece en [Departamentos](#screen-departments). Las plantillas de tallado propiamente dichas son plantillas de informe marcadas como no diagnósticas; se redactan en la [pestaña Plantillas de informe](#screen-tab-templates), no aquí.

### Registro de acciones (pestaña) {#screen-tab-actions}
Breadcrumb: Inicio > Configuración > Registro de acciones

**Estado:** Demostración

**1. Navegación:** pestaña **Registro de acciones** de Configuración
**2. Elemento de mantenimiento:** Registro de acciones del sistema

**3. Finalidad y alcance.** El Registro de acciones enumera todos los comandos que PathScribe puede ejecutar mediante un atajo de teclado o por voz (por ejemplo, "imprimir el casete actual"). La lista de comandos es fija en el producto; aquí no se puede añadir ni cambiar el nombre de ningún comando. De cada comando se puede cambiar el atajo de teclado, las frases habladas que lo activan y los perfiles de estación a los que se limita. Las frases de voz que aprende cada persona son un ajuste personal y no se cambian aquí.

**4. Requisitos previos y dependencias.** Ninguno para la propia pestaña. Los [Grupos de acciones](#screen-action_groups) eligen comandos de esta lista, de modo que un comando que no figure aquí no se puede incluir en un conjunto.

Setup step: Tier 3, step 3
Requires: Ninguno, es un punto de partida.
Unlocks: [Grupos de acciones](#screen-action_groups)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: tab-actions - Registro de acciones del sistema con búsqueda, filtro de categoría y botones Editar]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar acciones o activadores de voz | Texto | Opcional | Filtra por el nombre de la acción o por una frase de activación. | En blanco |
| Botones de categoría | Un botón por categoría, más **Todas** | Opcional | Muestra solo una categoría. | Todas |
| Acción | Texto (solo lectura) | No aplicable | El nombre del comando, con el rol que exige debajo. Un comando desactivado en el producto muestra una insignia **Desactivada** y su botón **Editar** aparece en gris. | No aplicable |
| Atajo (lista) | Combinación de teclas (solo lectura) | No aplicable | El atajo actual. Un comando que puede quedar oculto por una tecla propia de la pantalla muestra además "Alt+J, y después (tecla)", que siempre lo alcanza. | No aplicable |
| Activadores de voz (lista) | Frases (solo lectura) | No aplicable | Las frases habladas. | No aplicable |
| Descargar plantilla | Botón | No aplicable | Descarga `pathscribe_system_config.csv` con todos los comandos (ID, etiqueta, categoría, atajo, activadores de voz). La descarga se registra como una exportación. | No aplicable |
| Importación masiva | Botón de archivo CSV | No aplicable | Lee de vuelta el mismo formato de archivo. Solo se aplican las columnas Atajo y Activadores de voz, según el ID de comando existente. Se omiten las filas con un ID desconocido, un ID repetido, una etiqueta o categoría modificada, un comando desactivado, un atajo repetido en el archivo o un atajo reservado, y un resumen enumera los cinco primeros de cada resultado. Los activadores de voz del archivo se separan con punto y coma. No se aceptan filas nuevas. | No aplicable |

#### Ventana Editar acción

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Atajo | Combinación de teclas, que se registra pulsando las teclas | Opcional | Haga clic en el campo y pulse la combinación. Una combinación que ya usa otro comando muestra un error con el nombre de ese comando y una oferta de un clic **Usar (sugerencia) en su lugar**; **Guardar cambios** está desactivado mientras se muestra el error. **Borrar** elimina el atajo. | El atajo integrado del comando |
| Activadores de voz | Frases separadas por comas | Opcional | Las frases habladas que ejecutan el comando. | Las frases integradas del comando |
| Perfiles de estación | Casillas: todas las áreas funcionales de Histología, Citología, Molecular y Autopsia | Opcional | Limita el comando a los perfiles de estación elegidos. Deje todas sin marcar para permitirlo en todas partes. | Ninguna marcada (permitido en todas partes) |

**7. Permisos.** Abrir la pestaña: `screen:configuration:open`. Cambiar un atajo, un activador o un perfil de estación (edición o importación masiva): `config:actions:manage` (riesgo alto, auditado; se comprueba en el servicio). Admin y Lab Director la tienen de forma predeterminada. Los comandos de voz aprendidos son un ajuste propio de cada persona y no necesitan ninguna capacidad.
**Comandos añadidos desde que se escribió la guía por primera vez (lotes 650 a 665).** Añadir colaborador (Ctrl+Alt+Shift+0; requiere `case:team:manage` sobre el caso, igual que la ventana Equipo del caso, y un citotécnico no puede añadirse como Consultor); Editar campo (Alt+E) y Cancelar (Ctrl+Alt+J), que ya figuraban en la lista y ahora funcionan; Añadir adenda; Firmar y siguiente; Casos en colaboración (Ctrl+Alt+F, antes «Filtrar mis casos»); Ir a la fila (Alt+7) y Abrir caso por número de acceso (Alt+8) en la lista de trabajo; y Ver ayuda, que pasó de Alt+V a **F1** (Alt+V es Vista completa en la pantalla del informe, y el botón Ayuda siempre funciona). Cada comando pulsa el mismo botón que el ratón, por lo que se atenúa con la misma capacidad: Firmar el caso, Finalizar y Firmar y siguiente requieren `surgical:report:sign-out`; Aceptar requiere `case:pool:claim`; Pasar requiere `case:pool:pass`. Veintinueve comandos registrados siguen sin gestor de pantalla; cada uno figura con su motivo en `docs/product/KNOWN_GAPS.md`, y una prueba de la compilación falla cuando se registra un comando nuevo sin ningún oyente y sin motivo anotado. El mensaje al colaborador es un aviso de la aplicación enviado en nombre de la persona, por lo que no requiere permiso de mensajería; se almacena en inglés, igual que el mensaje de solicitud de revisión.
**Límites conocidos.** Demostración: el registro se guarda en el almacén de demostración del navegador y no existe ningún contrato de servidor para él en `docs/architecture/`. La lista de comandos es código, no datos. La importación masiva no avisa de un atajo que choque con un comando ajeno al archivo; solo lo comprueba la ventana Editar.

### Macros (pestaña) {#screen-tab-macros}
Breadcrumb: Inicio > Configuración > Macros

**Estado:** Construido

**1. Navegación:** pestaña **Macros** de Configuración
**2. Elemento de mantenimiento:** Mis macros (macros de texto e importación de AutoTexto de Word)

**3. Finalidad y alcance.** Una macro es un bloque de texto con formato que se expande cuando alguien escribe su atajo (por ejemplo, `;normcolon`) en el editor de informes y pulsa la barra espaciadora. Las macros existen en uno de tres niveles: Empresa (todos los centros), Centro (un laboratorio ejecutor) o Personal (una persona). Cualquiera puede tener macros personales y de centro; las macros de Empresa y las macros personales de otras personas son solo para administradores. Aquí también se carga una biblioteca de autotexto: **Importar desde Word** lee las entradas de AutoTexto y de Bloques de creación de una plantilla de Word.

**4. Requisitos previos y dependencias.** Las macros de centro se archivan bajo un laboratorio ejecutor del [Diccionario de centros](#screen-facility-dictionary); si se omite, la lista de centros queda vacía y no se puede guardar una macro de Centro. La lista de fuentes del editor es fija en la pestaña y no lee las [Fuentes aprobadas](#screen-fonts).

Setup step: Tier 3, step 5
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: tab-macros - Pestaña Macros con la lista a la izquierda y el editor de macros a la derecha]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Pestañas de nivel | **Todas** (solo administradores), **Empresa**, **Centro**, **Personal**, cada una con un recuento | Opcional | **Todas** enumera todas las macros agrupadas por Empresa, después por cada centro y después por cada persona, ordenadas por nombre. Un administrador abre en **Todas**; los demás abren en **Empresa**. | Todas (administradores) o Empresa |
| Seleccione un centro | Lista de selección de laboratorios ejecutores | Opcional | Se muestra en la pestaña **Centro**; la lista permanece vacía hasta que se elige un centro. | Ninguno |
| Lista de macros | Botones con el nombre y el atajo | No aplicable | Selecciona una macro para editarla. | No aplicable |
| + Nueva | Botón | No aplicable | Inicia una macro nueva en el nivel actual. | No aplicable |
| Importar desde Word | Botón de archivo, acepta `.dotx`, `.dotm`, `.docx`, `.docm` | Opcional | Abre la ventana de importación que se describe más abajo. | No aplicable |

#### Editor de macros

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre de la macro | Texto | Obligatorio | El nombre de la macro. | Ninguno |
| Atajo de activación | Texto que empieza por `;` | Obligatorio | Se escribe en el editor y se pulsa la barra espaciadora para expandirlo. Un atajo que no empieza por `;` se rechaza ("El atajo debe empezar por ;"). | Ninguno |
| Visibilidad | Opción: Empresa, Centro, Personal | Obligatorio | Empresa solo se ofrece a los administradores (roles admin, pathologist-admin, superadmin). Una persona sin derechos sobre la macro la ve en solo lectura ("Solo un administrador puede modificar esta macro."). | El primer nivel que la persona puede usar |
| Centro | Lista de selección de laboratorios ejecutores | Obligatorio cuando la Visibilidad es Centro | El laboratorio ejecutor al que pertenece la macro. | Ninguno |
| Contenido | Editor de texto enriquecido | Opcional | El texto que sustituye al atajo. Fuentes disponibles: Arial, Times New Roman, Courier New, Roboto. | En blanco |
| Eliminar | Botón | No aplicable | Pregunta "¿Eliminar la macro (nombre)?" y desactiva la macro (sale de la lista). Solo se muestra cuando puede editarla. | No aplicable |
| Crear macro / Guardar cambios | Botón | No aplicable | Guarda. Está desactivado hasta que cambia algo. | No aplicable |

#### Ventana Importar desde Word

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Lista de entradas | Una casilla por cada entrada de AutoTexto o de Bloques de creación, con una vista previa de 100 caracteres | Opcional | Muestra cuántas entradas se han encontrado. Las entradas de **AutoTexto** aparecen marcadas; los demás tipos de Bloques de creación (portadas, encabezados, tablas) se enumeran, pero no se marcan. Las entradas sin texto se omiten al importar. | Entradas de AutoTexto marcadas |
| Importar como | Opción: Personal, Centro, Empresa | Obligatorio | El nivel en el que se crean las macros importadas. | Personal |
| Centro | Lista de selección de laboratorios ejecutores | Obligatorio cuando Importar como es Centro | Error "Seleccione a qué centro pertenecen estas macros importadas." si está vacío. | Ninguno |
| Importar N macros | Botón | No aplicable | Crea una macro por cada entrada marcada, con la categoría Personalizada. El atajo se genera a partir del nombre de la entrada y se hace único. | No aplicable |

**7. Permisos.** Abrir la pestaña: `screen:configuration:open`. Cualquiera puede crear y modificar sus propias macros personales sin ninguna capacidad. Crear o modificar una macro de Empresa o de Centro, o la macro personal de otra persona, requiere `config:macros:manage` (riesgo alto, auditado; se comprueba en el servicio). Admin y Lab Director la tienen de forma predeterminada.
**Límites conocidos.** La lista de fuentes del editor es una lista fija de cuatro fuentes, no el diccionario de Fuentes aprobadas. Eliminar una macro la desactiva; no hay ninguna pantalla para reactivarla. Las frases activadas por voz son independientes y están en la [pestaña Voz](#screen-tab-voice).

### Voz (pestaña) {#screen-tab-voice}
Breadcrumb: Inicio > Configuración > Voz

**Estado:** Parcial

**1. Navegación:** pestaña **Voz** de Configuración
**2. Elemento de mantenimiento:** Integración de voz, Ajustes del usuario, Reglas de procesamiento del habla, Pedal

**3. Finalidad y alcance.** Una pestaña con cuatro áreas. La primera (Integración de voz) es un interruptor de despliegue para todos. Las otras tres son personales o propias de cada puesto de trabajo: el perfil de acento regional, las macros de voz de cada persona (frase hablada y texto resultante, llamadas "Macros de voz y dictado") y las asignaciones del pedal de este equipo.

**4. Requisitos previos y dependencias.** Ninguno. Los propios comandos de voz se definen en el [Registro de acciones](#screen-tab-actions).

Setup step: Tier 3, step 6
Requires: [Registro de acciones](#screen-tab-actions)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: tab-voice - Pestaña Voz con Integración de voz, acento, sensibilidad del micrófono, macros de voz y pedal]

**6. Referencia de campos.**

#### Integración de voz (para todo el despliegue)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Comandos de voz y dictado | Interruptor Activado / Desactivado | Opcional | Cuando está desactivado, el botón del micrófono aparece en gris y la voz no está disponible para nadie. El refinado del dictado con IA está disponible automáticamente si el despliegue tiene configurada una clave de IA. El ajuste de entorno `VITE_VOICE_ENABLED=false` elimina la voz por completo y prevalece sobre este interruptor. | Activado |
| Coincidencia flexible de comandos en inglés en otros idiomas | Interruptor Activado / Desactivado | Opcional | Cuando una persona dicta en francés, alemán, neerlandés o coreano y nada en ese idioma coincide, una coincidencia aproximada puede ejecutarse igualmente como comando en inglés. Desactívelo cuando ya estén en marcha los comandos propios de ese idioma. Las frases exactas en inglés siguen funcionando. | Activado |
| Instrucciones de refinado de la IA por idioma | Lista desplegable de solo lectura | No aplicable | Muestra las instrucciones exactas que se envían a la IA cuando refina el texto dictado, por convención ortográfica del inglés y por cada otro idioma. Las entradas que aún no ha comprobado un hablante nativo se marcan "requiere revisión por un hablante nativo". | No aplicable |

#### Ajustes del usuario

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Perfil de acento regional | Opción entre 15 perfiles de acento del inglés y francés (Francia), alemán, neerlandés (Bélgica), neerlandés (Países Bajos), español (España) y coreano | Opcional | Establece el idioma que escucha el motor de voz. Se guarda por persona que ha iniciado sesión. Neerlandés (Bélgica) muestra una nota que indica que ningún hablante belga lo ha probado. | Inglés estándar (EE. UU.) |
| Sensibilidad del micrófono | Control deslizante, mostrado al 85 % | No aplicable | Solo visualización. El control deslizante no está conectado a nada; la ganancia la gestiona el navegador. | 85 % (visualización) |

#### Macros de voz y dictado

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Probar voz | Botón | No aplicable | Escucha y muestra "Escuchado: (texto)" para que la persona pueda comprobar el micrófono. | No aplicable |
| Importación masiva | Botón de archivo CSV | Opcional | Una macro por línea con la forma `name, resulting text`. Todo lo que sigue a una segunda coma se descarta. | No aplicable |
| Añadir macro | Botón | No aplicable | Añade una fila vacía en modo de edición, propiedad de la persona que ha iniciado sesión. | No aplicable |
| Buscar macros | Texto | Opcional | Filtra por el nombre hablado o por el texto resultante. | En blanco |
| Filtro de estado | Opción: Todos los estados, Solo activas, Solo inactivas | Opcional | Filtra la lista. | Todos los estados |
| Nombre | Texto | Obligatorio en la práctica | La frase hablada. | Macro nueva: en blanco |
| Texto resultante | Texto | Opcional | El texto que se escribe cuando se oye la frase. | En blanco |
| Estado | Interruptor Activa / Inactiva, editable solo en modo de edición | Opcional | Una macro inactiva no se usa. | Activa |
| Editar, Guardar, Eliminar (icono de papelera) | Botones de fila | No aplicable | **Eliminar** quita la fila al instante, sin confirmación. | No aplicable |

#### Pedal (este puesto de trabajo)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Pedal 1, Acción principal | Tecla o botón de pedal asignado | Opcional | Pulsar para hablar en la firma, confirmar el número de fragmentos en la inclusión. | Sin asignar |
| Pedal 2, Avanzar / Siguiente | Tecla o botón de pedal asignado | Opcional | Siguiente campo en la firma, imprimir o grabar el siguiente en microtomía. | Sin asignar |
| Pedal 3, Pausar / Repetir último segmento | Tecla o botón de pedal asignado | Opcional | Solo dictado en la firma. Pausar funciona una vez asignado; Repetir necesita además acceso al micrófono, que puede solicitarse en la primera sesión de firma. | Sin asignar |
| Asignar, Reasignar, Cancelar, Borrar | Botones | No aplicable | **Asignar** espera la siguiente pulsación del pedal real y guarda lo que envíe (una tecla del teclado o un botón de tipo mando). La asignación pertenece al navegador de este equipo, no a la cuenta de la persona. | No aplicable |

**7. Permisos.** Abrir la pestaña: `screen:configuration:open`. Los interruptores de Integración de voz necesitan `config:voice:manage` (riesgo alto, auditado; se comprueba al guardar el ajuste, y sin ella el área se muestra en solo lectura). El acento, las macros de voz y el pedal son personales o propios de cada puesto de trabajo y no necesitan ninguna capacidad. Admin y Lab Director tienen `config:voice:manage` de forma predeterminada.
**Límites conocidos.** Los dos interruptores de despliegue se guardan en la configuración del sistema almacenada en el navegador. Existe un contrato de servidor para la configuración del sistema (`docs/architecture/DICTIONARIES_CONFIG_API.md`, `ISystemConfigService`), pero esta pestaña todavía no lo invoca, de modo que, con el servidor de la API conectado, los interruptores no se conservan entre sesiones. Las macros de voz tienen un contrato de servidor (`docs/architecture/MACROS_API.md`). La sensibilidad del micrófono es solo de visualización. No hay ninguna pantalla para publicar macros de voz compartidas (de Empresa o de Centro); la pestaña gestiona las de la persona que ha iniciado sesión.
### Excepciones de ruta de tallado {#screen-grossing_route_overrides}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Excepciones de ruta de tallado

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Excepciones de ruta de tallado

**3. Finalidad y alcance.** Una excepción establece que, para un centro, un tipo de muestra usa siempre una ruta de tallado con nombre. Tras el registro, PathScribe propone una plantilla de tallado para cada muestra. Una muestra que coincide con una excepción activa (mismo centro y exactamente el mismo tipo de muestra) toma la ruta de la excepción con una confianza del 100 por ciento y no se envía en absoluto a la IA. Todo lo que no figura en la lista usa el enrutamiento normal.

**4. Requisitos previos y dependencias.** El centro procede del [Diccionario de centros](#screen-facility-dictionary) y el tipo de muestra debe coincidir exactamente con el campo de tipo de una entrada del [Diccionario de muestras](#screen-specimens) (al escribir se ofrecen los tipos conocidos). Si se omiten los centros, la lista de Centro queda vacía.

Setup step: Tier 3, step 7
Requires: [Diccionario de centros](#screen-facility-dictionary), [Diccionario de muestras](#screen-specimens)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-grossing_route_overrides - Lista de Excepciones de ruta de tallado y Añadir excepción]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Centro (lista) | Nombre del centro | No aplicable | El centro al que se aplica la excepción. | No aplicable |
| Tipo de muestra (lista) | Texto | No aplicable | El tipo de muestra al que se aplica la excepción. | No aplicable |
| Ruta de excepción (lista) | Nombre de la ruta | No aplicable | La ruta que se asigna a la muestra. | No aplicable |
| Estado (lista) | Activo / Inactivo | No aplicable | Solo se aplican las excepciones activas. | No aplicable |
| Editar, Quitar | Botones de fila | No aplicable | **Quitar** elimina la excepción al instante, sin confirmación. Ponga la excepción en Inactivo para conservarla. | No aplicable |

#### Ventana Añadir excepción de ruta de tallado y Editar

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Centro | Lista de selección de centros (del [Diccionario de centros](#screen-facility-dictionary)) | Obligatorio | Se compara con el centro del caso en el registro. | El primer centro de la lista |
| Tipo de muestra | Texto con sugerencias a partir de los valores de tipo del Diccionario de muestras | Obligatorio | Debe ser igual al tipo del Diccionario de muestras (la coincidencia es exacta). Error "Obligatorio" cuando está vacío. Un valor que no coincide con ningún tipo del diccionario se acepta y, sencillamente, nunca coincide. | Ninguno |
| Ruta de excepción | Opción: Tallado de tejido estándar (ruta A), Tallado de líquidos / bloque celular (ruta B), Solo histología / triaje directo (ruta C) | Obligatorio | La ruta que recibe la muestra. | Tallado de tejido estándar (ruta A) |
| Estado | Interruptor Activo / Inactivo | Opcional | Una excepción inactiva se ignora. | Activo |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar y quitar: `config:grossing-routes:manage` (riesgo alto, auditado; se comprueba en el servicio). Admin y Lab Director la tienen de forma predeterminada.
**Límites conocidos.** Los datos de demostración contienen una excepción (Riñón a la Ruta C en el centro `c-westside`). La excepción solo la aplica la propuesta de plantilla de tallado que se ejecuta tras el registro. Una ruta elegida en el nivel de departamento ([Departamentos](#screen-departments)) no la cambia una excepción.

### Modo de validación del entintado {#screen-inking_validation_mode}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Modo de validación del entintado

**Estado:** Parcial

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Modo de validación del entintado

**3. Finalidad y alcance.** La comprobación estructurada del marcado con tinta revisa todos los márgenes de un caso cuando alguien selecciona **Completar tallado** y de nuevo en la firma. Detecta tres tipos de incidencia: un margen no marcado como examinado (Gravedad 2), un margen sin tinta registrada (Gravedad 2) y un código de color de tinta que no está en el diccionario de colores de tinta activos (Gravedad 3). Esta pantalla elige, para un centro, entre **Solo aviso** y **Cumplimiento estricto**.

**Qué hace hoy el código (verificado en el código fuente).** El texto de la pantalla dice que Cumplimiento estricto bloquea de forma absoluta **Completar tallado** ante una incidencia de Gravedad 2. La barrera que detiene Completar tallado no hace eso en ninguno de los dos modos:
- La Gravedad 3 (color de tinta sin correspondencia) bloquea siempre Completar tallado. En la firma bloquea, o pide una anulación a una persona que tenga `case:inking-gate:override`.
- La Gravedad 2 en Completar tallado muestra una confirmación **Continuar con nota de aviso** y después deja completar el tallado, en ambos modos.
- La única diferencia visible hoy es el aviso de la pantalla de Tallado: "Cumplimiento estricto: las incidencias que se muestran abajo bloquearán la firma hasta que se corrijan" frente a "Aviso y advertencia: las incidencias que se muestran abajo no bloquean la firma".
- Si no se puede cargar el diccionario de colores de tinta, la barrera se niega a continuar (paleta no disponible).
La diferencia entre el texto de la pantalla y la barrera figura para Pete en `open-questions/ch4.md`.

**4. Requisitos previos y dependencias.** La comprobación compara los colores de tinta registrados con los colores de tinta activos. Si se omiten los [Colores de tinta](#screen-ink_colors), todos los colores de tinta registrados quedan sin correspondencia (Gravedad 3), lo que bloquea Completar tallado. Los centros proceden del [Diccionario de centros](#screen-facility-dictionary).

Setup step: Tier 3, step 8
Requires: [Colores de tinta](#screen-ink_colors), [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-inking_validation_mode - Modo de validación del entintado con la lista de centros y dos opciones]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Centro | Lista de selección de centros | Obligatorio | El modo se guarda por centro. Al elegir otro centro se carga el modo que tiene guardado. | El primer centro de la lista |
| Modo de validación del entintado | Opción (botones de radio): Solo aviso, Cumplimiento estricto | Obligatorio | Solo aviso: las incidencias de Gravedad 2 se señalan, pero nunca bloquean (es el valor predeterminado). Cumplimiento estricto: se describe en la pantalla como bloqueo de Completar tallado ante la Gravedad 2; véase "Qué hace hoy el código" más arriba. La Gravedad 3 bloquea siempre. | Solo aviso |
| Guardar | Botón | No aplicable | Solo se activa tras un cambio. Muestra "Guardado." o "No tiene permiso para cambiar esto." Un cambio se escribe en el registro de auditoría como "Modo de validación del entintado cambiado", con el modo anterior y el nuevo. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar el modo: `config:inking-validation-mode:manage` (riesgo alto, auditado; se comprueba en el servicio para ese centro). Admin y Lab Director la tienen de forma predeterminada. Anular una detención de Gravedad 3 en la firma: `case:inking-gate:override`, que tienen Admin y Lab Director.
**Límites conocidos.** Parcial por el motivo anterior: el modo se guarda y se muestra, pero Cumplimiento estricto no añade una detención absoluta en Completar tallado. El ajuste se conserva en el almacén de ajustes del sitio del navegador; todavía no existe en `docs/architecture/` ningún contrato de servidor para los ajustes del sitio.

## Listas de trabajo de histología y estaciones de inclusión, microtomía y tinción {#ch4-histology}
Breadcrumb: Inicio > Gestión de lotes

Esta parte trata las pantallas de mesa del flujo de trabajo de histología. Son pantallas de trabajo diario, no pantallas de mantenimiento, por lo que cada una usa la disposición de referencia: qué muestra, qué necesita tener configurado antes y qué ajustes cambian su comportamiento. No existe una pantalla de configuración independiente para las propias estaciones. El comportamiento de una estación se establece en pantallas de otros capítulos: las pantallas [Estaciones de escaneado](#screen-scan_stations) y [Perfiles de impresora](#screen-printer_profiles) (qué impresora usa una estación), el [Diseñador de etiquetas](#screen-label_designer) (qué muestra la etiqueta impresa), [Requisitos de los campos](#screen-field_requirements) (qué campos hay que rellenar, por página: `batchManagement`, `embedding`, `microtomy`, `slideDistribution`) y la [pestaña Voz](#screen-tab-voice) (pedal). Una estación de tinción no tiene pantalla propia: las ejecuciones de tinción son lotes (véase Gestión de lotes), y la lista de tinciones es el [Catálogo diagnóstico](#screen-stains).

### Gestión de lotes {#screen-batch-management}
Breadcrumb: Inicio > Gestión de lotes

**Estado:** Construido

**1. Navegación:** Inicio > **Gestión de lotes** (no está en Configuración). Se abre con `screen:batch-management:open`.
**2. Elemento de mantenimiento:** No aplicable. Es un centro de trabajo de mesa.

**3. Finalidad y alcance.** Gestión de lotes sigue los grupos de casetes y portaobjetos a través de los nodos de procesamiento (Descalcificación / Procesamiento especial, Procesamiento, Inclusión, Microtomía / Corte, Tinción, Salida, Derivación externa, Procesamiento de citología, Tinción de citología, Imagen de citología) mediante el código de barras del contenedor. Ofrece escaneo de la cadena de custodia, conciliación y un conjunto de páginas de colas e informes a las que se llega desde mosaicos. Un lote es un contenedor (una gradilla de tinción, una cesta del procesador de tejidos, una bandeja de archivo, un recipiente de descalcificación o un lote ad hoc) con un código de barras maestro y un manifiesto de los elementos escaneados en él.

**4. Requisitos previos y dependencias.** La pantalla lee la estación de escaneado establecida para este equipo (para rellenar de antemano el puesto de trabajo de destino y para limitar la Cola de eliminación y Pendiente de carga al centro de la estación), los lotes de reactivos y las tinciones para los lotes de tinción y de citología, y los centros con el rol de Laboratorio de referencia para los lotes de derivación. Sin nada de esto la página se abre igualmente, pero los campos correspondientes de **Nuevo contenedor** quedan vacíos.

Setup step: Reference, not part of setup
Requires: [Estaciones de escaneado](#screen-scan_stations), [Diccionario de centros](#screen-facility-dictionary), [Lotes de reactivos y soluciones](#screen-reagent_lots), [Catálogo diagnóstico](#screen-stains), [Requisitos de los campos](#screen-field_requirements)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-batch-management - Gestión de lotes con mosaicos de nodos, mosaicos de herramientas y la lista de lotes activos]

**6. Referencia de campos.** Esta es una página de referencia: las tablas enumeran controles, columnas y filtros.

#### Página principal

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Mosaicos de nodo (uno por nodo de procesamiento) | Mosaico con el recuento de lotes abiertos | Opcional | Seleccione un mosaico para mostrar solo los lotes de ese nodo; selecciónelo de nuevo para restablecer. | Sin filtro |
| Escanee o introduzca un código de barras de lote maestro | Texto o entrada de escáner | Opcional | Un código de barras de lote abre ese lote. Un código `CONT-` o `RACK-` escaneado que coincide con una gradilla reutilizable disponible abre **Nuevo contenedor** con esa gradilla ya rellenada. Una gradilla que ya está retirada, o un código desconocido, muestra un error y un tono. | En blanco |
| Nuevo contenedor | Botón | No aplicable | Abre la ventana siguiente. | No aplicable |
| Activos y en conciliación | Lista con recuento | No aplicable | Lotes abiertos, con el número de elementos y la marca URGENTE (STAT). | No aplicable |
| Completados y anulados | Lista con recuento | No aplicable | Lotes cerrados. | No aplicable |
| Mosaicos de herramientas | Eliminación, Informe de seguimiento de residuos, Retenciones de conservación, Pendiente de carga, Reimpresión de etiquetas, Escaneo de portaobjetos, Monitor del grabador, Registro de equipos | No aplicable | Cada uno abre una de las páginas que se describen más abajo. | No aplicable |

#### Ventana Nuevo contenedor

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Tipo de contenedor | Opción: Gradilla de tinción, Cesta del procesador de tejidos, Bandeja de archivo, Recipiente de descalcificación, Lote ad hoc | Obligatorio | El tipo de soporte. La lista de gradillas reutilizables se filtra a las gradillas de este tipo que están Disponibles. | Gradilla de tinción |
| Puesto de trabajo de destino | Lista de selección de estaciones de escaneado, o "Sin estación" | Opcional | Al elegir una estación se establece el Nodo de procesamiento a partir de la fase propia de la estación. Si la estación suele ser de otro nodo, un aviso pide que lo compruebe. | La estación establecida para este equipo |
| Nodo de procesamiento | Opción entre los diez nodos | Obligatorio | Decide cuáles de los campos adicionales siguientes aparecen. | Descalcificación / Procesamiento especial, o el de la estación |
| Protocolo / parámetros de ejecución | Texto | Obligatorio (bloqueado) | Por ejemplo, "Standard H&E Overnight Run". No se puede desactivar en Requisitos de los campos. | Ninguno |
| Prioridad | Opción: Rutina, URGENTE | Obligatorio | Marca el lote. | Rutina |
| Tipo de solución | Opción: EDTA, NBF al 10 % (ventana de fijación), Descalcificación rápida (fórmico/HCl) | Obligatorio en un nodo de descalcificación | La solución de descalcificación. | La primera opción |
| Duración objetivo / temporizador de alerta | Horas y minutos | Obligatorio en un nodo de descalcificación (bloqueado) | Establece el temporizador. Una alerta de aviso aparece 15 minutos antes del objetivo. | 4 h 0 min |
| Destino del laboratorio de referencia | Lista de selección de centros con el rol de Laboratorio de referencia | Obligatorio en un nodo de derivación externa (bloqueado) | Adónde va el lote. Si no existe ninguno, la ventana indica que primero debe añadir uno en los ajustes de Centro. | Ninguno |
| Prueba / panel solicitado (opcional) | Texto | Opcional (se puede hacer obligatorio) | La prueba solicitada al laboratorio de referencia. | En blanco |
| Protocolo de tinción | Lista de selección de tinciones (del [Catálogo diagnóstico](#screen-stains)) | Obligatorio en un nodo de tinción de citología (bloqueado) | La tinción a la que se destina el lote. | Ninguno |
| Lotes de reactivos / soluciones utilizados | Lista de selección de lotes activos (de [Lotes de reactivos y soluciones](#screen-reagent_lots)) | Opcional (se puede hacer obligatorio) en un nodo de tinción | Registra los lotes de la ejecución. Se pueden escanear más tarde. | Ninguno |
| Modo de identificador del contenedor | Opción: Etiqueta desechable, Gradilla reutilizable | Obligatorio | Desechable: el sistema genera una etiqueta de un solo uso con marca de tiempo. Reutilizable: se usa una gradilla grabada existente y no se imprime ninguna etiqueta. | Etiqueta desechable |
| ID de gradilla | Escaneo o texto | Obligatorio para Gradilla reutilizable (bloqueado) | La gradilla que se retira. | En blanco |
| Generar e imprimir / Iniciar sesión | Botón | No aplicable | Crea el lote. Muestra "Aún obligatorio: (campos)" hasta que se rellenan los campos obligatorios. Para una etiqueta desechable, el paso siguiente muestra el código de barras del lote maestro con **Imprimir**; para una gradilla, indica que la gradilla queda retirada y no se imprime nada. **Continuar, escanear elementos** abre el lote. | No aplicable |

#### Página de detalle del lote

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Escanee un código de barras de casete o de portaobjetos | Entrada de escáner (sin hacer clic) | Opcional | Añade el elemento al manifiesto. Se rechaza con un mensaje cuando el código no coincide con ningún casete ni portaobjetos, ya está en este lote o está en otro lote activo. | No aplicable |
| Manifiesto | Lista con recuento | No aplicable | Elementos del lote, cada uno con **Mover** (a otro lote activo) y **Quitar**. | No aplicable |
| Iniciar conciliación | Botón | No aplicable | Inicia la verificación fuera de proceso: escanee cada elemento físico al salir del soporte. Los elementos muestran Coincide, Falta o Inesperado. | No aplicable |
| Completar lote | Botón | No aplicable | Está desactivado mientras faltan elementos o hay elementos inesperados (la información emergente indica los recuentos), y se rechaza mientras una desviación de la cadena de frío no esté confirmada. | No aplicable |
| Anulación del supervisor (Anular y completar) | Enlace y ventana con un **Motivo** obligatorio | Motivo obligatorio | Completa con discrepancias. Se registra a nombre de la persona. Requiere `batch:reconciliation:override`. | No aplicable |
| Anular lote | Botón y ventana con un **Motivo** obligatorio | Motivo obligatorio | El lote y el manifiesto se conservan para auditoría, se marcan como Anulado y no admiten más escaneos. Requiere `batch:run:abort`. | No aplicable |
| Confirmar recepción (desviación de la cadena de frío) | Botón y ventana con una **Nota** obligatoria | Nota obligatoria | Se muestra cuando un contenedor inteligente ha notificado una temperatura fuera de rango. Requiere `batch:cold-chain-excursion:acknowledge`. | No aplicable |
| Transferir a procesamiento | Botón | No aplicable | Traslada los elementos a un nuevo lote de Procesamiento. | No aplicable |
| Liberar gradilla | Botón | No aplicable | Devuelve una gradilla reutilizable a Disponible. | No aplicable |
| Estado de la derivación | Texto | No aplicable | Para un lote de derivación: enviado, en tránsito, entregado, resultado recibido (con un enlace cuando el resultado es un PDF). | No aplicable |
| Informes del instrumento; panel de cadena de frío | Texto | No aplicable | Estado del instrumento de citología; lecturas de temperatura de un lote en un contenedor inteligente. | No aplicable |

#### Cola de eliminación

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Escanee un código de barras de casete o de portaobjetos | Entrada de escáner | Opcional | Elimina el elemento al instante y muestra un destello de confirmación. Requiere `retention:material:dispose`. | No aplicable |
| Aptos para eliminación | Lista con recuento | No aplicable | Bloques y portaobjetos cuyo periodo de conservación ha transcurrido, sin retención activa y no eliminados ya, calculados de nuevo cada vez a partir de los datos del caso. Limitada al centro de la estación; si no hay estación de escaneado establecida, se muestran todas las ubicaciones. | No aplicable |

#### Informe de seguimiento de residuos

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtrar por centro | Lista de selección | Opcional | Limita el informe. | Todos los centros |
| Filtrar por tipo de material | Lista de selección | Opcional | Limita el informe. | Todos los tipos de material |
| Fecha desde, Fecha hasta | Fechas | Opcional | Limita por fecha de eliminación. | En blanco |
| Total eliminado | Número | No aplicable | Recuento de las filas mostradas. | No aplicable |
| Columnas | Eliminado, Tipo, ID del elemento, Caso, Muestra, Eliminado por, Ubicación | No aplicable | Una fila por elemento eliminado. | No aplicable |
| Exportar | Botón | No aplicable | Descarga un CSV con las mismas columnas. Requiere `retention:disposal-report:export`. | No aplicable |

#### Retenciones de conservación

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Buscar caso, motivo o persona | Texto | Opcional | Filtra la lista. | En blanco |
| Columnas | Caso, Motivo, Nota, Aplicada por, Aplicada, Acciones | No aplicable | Una fila por retención activa ("N retenciones activas"). | No aplicable |
| Levantar | Botón y ventana con una **Nota de levantamiento** | Nota obligatoria | Levanta la retención. Requiere `case:retention-hold:release`. | No aplicable |
| Exportar CSV | Botón | No aplicable | Requiere `retention:holds-queue:export`. | No aplicable |

#### Pendiente de carga

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Escanee o escriba para buscar | Texto o escáner | Opcional | Filtra por identificador de casete o de portaobjetos, caso o muestra. **Borrar** restablece. | En blanco |
| Actualizar | Botón | No aplicable | Recalcula la cola. | No aplicable |
| Pendiente de carga en lote | Lista agrupada por caso | No aplicable | Casetes y portaobjetos impresos o grabados, pero no escaneados en ningún lote activo, obtenidos de nuevo a partir de los datos del caso. Limitada al centro de la estación; si no hay estación establecida, se muestran todos los centros. | No aplicable |

#### Reimpresión de etiquetas

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Registrado desde, Registrado hasta | Fechas | Opcional | Busca casos por fecha de registro. | En blanco |
| Número de acceso desde, Número de acceso hasta | Texto | Opcional | Busca casos por intervalo de números de acceso. Hace falta al menos uno de los cuatro; un filtro vacío no encuentra nada. | En blanco |
| Buscar casos | Botón | No aplicable | Enumera los casos encontrados, del más antiguo al más reciente, cada uno con una casilla **Reimprimir** y sus muestras. | No aplicable |
| Etiquetas | Casillas: Casetes, Contenedores de muestras, Solicitud | Opcional | Qué tipos de etiqueta se imprimen. | Ninguna marcada |
| Impresora de casetes | Lista de selección de impresoras | Obligatorio cuando se eligen casetes | Error "Elija primero la impresora de casetes." | Ninguno |
| Reimprimir etiquetas | Botón | No aplicable | Imprime una etiqueta cada vez (con unos 0,25 segundos de separación) y muestra el progreso. Todas las etiquetas se auditan. Requiere `label:batch:reprint` (la tienen Histotechnologist y Admin de forma predeterminada). Después, un resumen muestra las impresas, las fallidas y las bloqueadas por la salvaguarda de impresión bajo demanda, y **Reintentar N etiquetas fallidas**. | No aplicable |

#### Escaneo de portaobjetos

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Cola de escaneo | Tabla: Elegir, Caso, Portaobjetos, Prioridad, Enrutado a, Gradilla / posición | No aplicable | Portaobjetos enrutados a Digital en la estación de distribución de portaobjetos. | No aplicable |
| Escáner de portaobjetos | Lista de selección de equipos del tipo "Escáner de portaobjetos" (de [Equipos](#screen-equipment)) | Obligatorio | Si no existe ninguno, la página indica que debe añadirlos en Configuración, Equipos. | Ninguno |
| Cargar N portaobjetos | Botón | No aplicable | Crea un lote de escaneo en el escáner. Requiere `wsi:scan-batch:load`. | No aplicable |
| Lotes de escaneo | Tabla: Lote, Escáner, Estado, Progreso, Cargado, Acciones | No aplicable | El progreso muestra los escaneados, los fallidos y los que esperan. Un lote que no se envió muestra "No enviado (código, hora)" con un reintento. Los fallos del control de calidad de imagen muestran el motivo. | No aplicable |
| Enviar, Descargar | Botones | No aplicable | **Enviar** (`wsi:scan-batch:send`) envía el manifiesto de escaneo al motor de interfaces. **Descargar** (`wsi:scan-batch:unload`) cierra el lote cuando todos los portaobjetos tienen un resultado; los portaobjetos que no se escanearon vuelven a la cola. | No aplicable |

#### Monitor del grabador

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtrar por organización | Lista de selección | Opcional | Limita los dispositivos. | Todas las organizaciones |
| Dispositivos | Tarjetas con el estado, los avisos, los avisos de suministro por color de casete y "Notificado (hora)" | No aplicable | Un resumen de solo lectura que se actualiza cada 30 segundos aproximadamente. Una insignia **Simulado** aparece cuando no hay configurada ninguna fuente en vivo. | No aplicable |
| Iniciar diagnósticos del motor | Enlace | No aplicable | Abre la página de diagnóstico propia del motor de casetes cuando el dispositivo notifica un enlace. | No aplicable |

#### Registro de equipos

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Tabla de equipos | Cada instrumento activo con su estado de mantenimiento y calibración | No aplicable | Las filas con una alerta de servicio aparecen resaltadas. Añadir o modificar equipos se hace en [Equipos](#screen-equipment). | No aplicable |
| Registrar entrada | Botón por instrumento | No aplicable | Registra el mantenimiento o la calibración. Requiere `equipment:maintenance:record` (la tienen Histotechnologist, Cytotechnologist, Molecular Technologist, Admin y Lab Director). | No aplicable |

**Gradillas reutilizables (Batch 761).** El escaneo de una gradilla registrada (RACK-…) encuentra su tanda abierta, nunca una anterior terminada. Si su última tanda está cerrada, el escaneo inicia una tanda nueva (Nuevo contenedor rellenado con la gradilla). Si la última tanda se selló o se puso en el teñidor y nunca se cerró, la gradilla se abre con el aviso «La última tanda de … nunca se cerró.» Ciérrela (complétela o use la anulación de supervisor) antes de volver a usar la gradilla.

**7. Permisos.** Abrir la pantalla: `screen:batch-management:open` (Histotechnologist, Cytotechnologist, Molecular Technologist y Admin). Histotechnologist, Cytotechnologist y Molecular Technologist también empiezan con `batch:reconciliation:override`, `batch:run:abort`, `batch:cold-chain-excursion:acknowledge` (todas de riesgo alto y auditadas), `retention:material:dispose`, `retention:disposal-report:export`, `retention:holds-queue:export` y las tres capacidades `wsi:scan-batch:*`. Admin abre la pantalla, pero no tiene ninguna de ellas; Admin sí tiene `label:batch:reprint` y `equipment:maintenance:record`. `case:retention-hold:release` la tiene cada rol de caso (Pathologist, Fellow, Resident, PA, Accessioner y los tres roles de técnico).
**Límites conocidos.** El Monitor del grabador lee una colección de Firebase (`engraver_devices`) cuando Firebase está configurado y, en caso contrario, muestra dispositivos simulados; Firebase no es la base de datos de producción y esto se sustituirá. El `README.md` de `src/pages/BatchManagement/` sigue diciendo que la cola de Retenciones de conservación no está construida; la página y el mosaico existen. Los lotes están Construidos (`IBatchService` en `docs/architecture/CASE_WORKFLOWS_API.md`).
### Estación de inclusión {#screen-embedding-station}
Breadcrumb: Inicio > Estación de inclusión

**Estado:** Construido

**1. Navegación:** Inicio > **Estación de inclusión**. Se abre con `screen:embedding:open` (Histotechnologist y PA).
**2. Elemento de mantenimiento:** No aplicable. Es una pantalla de mesa de trabajo.

**3. Finalidad y alcance.** La pantalla de la mesa de inclusión. Un técnico escanea un casete, verifica el número de fragmentos con el tallado, registra el molde y la orientación, notifica cualquier discrepancia, agrupa los bloques que comparten una misma muestra y reimprime la etiqueta del casete cuando hace falta.

**4. Requisitos previos y dependencias.** La impresión de etiquetas de casete necesita una estación de escaneado establecida para este equipo, con la impresión activada y un perfil de impresora de casetes; sin ello, el panel de la impresora dice "Esta estación no está configurada para imprimir etiquetas de cassette reales." La vista previa de la etiqueta usa el diseño de etiqueta del [Diseñador de etiquetas](#screen-label_designer). Qué entradas son obligatorias lo determinan los [Requisitos de los campos](#screen-field_requirements) (página `embedding`).

Setup step: Reference, not part of setup
Requires: [Estaciones de escaneado](#screen-scan_stations), [Perfiles de impresora](#screen-printer_profiles), [Diseñador de etiquetas](#screen-label_designer), [Requisitos de los campos](#screen-field_requirements)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-embedding-station - Estación de inclusión con resumen del bloque, número de fragmentos y panel de impresión del casete]

**6. Referencia de campos.** Página de referencia: los controles de la pantalla.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Escanee un código de barras de casete | Escáner o texto | Obligatorio para empezar | Carga el bloque. Los escaneos que empiezan por `STATION:` se ignoran. | En blanco |
| Barra de contexto | Registro, Paciente, Fecha de nacimiento, Muestra/Bloque, Tipo | No aplicable | Los campos del paciente se etiquetan como datos del paciente para poder ocultarlos en las capturas de pantalla. **Escanear el siguiente casete** borra la pantalla. | No aplicable |
| Bloques de la muestra | Lista | No aplicable | Los bloques de la muestra y su estado, con el actual marcado. | No aplicable |
| Recuento observado; Confirmar | Número entero | Obligatorio, salvo que se haga opcional en Requisitos de los campos | Verificación del número de fragmentos frente al recuento esperado del tallado. | En blanco |
| Tamaño del molde base | Opción: 7x7mm, 15x15mm, 24x24mm, 24x30mm, Molde grande | Opcional (se puede hacer obligatorio) | Se registra en el bloque. | Ninguno |
| Instrucciones de orientación | Texto libre, con rellenos rápidos "Incluir de canto", "Superficie epitelial hacia abajo", "Corte transversal hacia arriba" | Opcional (se puede hacer obligatorio) | Se registra en el bloque. | En blanco |
| Notificación de discrepancias | Botones de un toque: Falta tejido/cassette vacía, Tejido sobrante encontrado, Cassette sin abrir/tejido sin procesar, Cassette dañada/bisagra rota | Opcional | Señala el bloque; muestra "Última señalización: (motivo) (por nombre)". | Ninguno |
| Indicadores de alerta | Tejido diminuto, Frágil, Requiere descalcificación | Opcional | Marca el bloque. | Desactivado |
| Multicassette / bloque dividido | Opción entre otros bloques sin agrupar de la misma muestra | Opcional | **Agrupar como cassettes divididas** los vincula. | Ninguno |
| Comentarios del bloque | Panel con texto de **Comentario** y **Añadir comentario** | Opcional (el texto se puede hacer obligatorio) | Comentarios sobre el bloque. | En blanco |
| Reimpresión de cassette | Botón y después una ventana con una lista de selección de **Motivo** | Motivo obligatorio | Motivos: Acumulación de parafina, Código de barras desvaído, Atasco mecánico, Otro. Se muestran el recuento y el último motivo. | No aplicable |
| Estado del dispositivo, Vista previa de la etiqueta | Visualización | No aplicable | El estado de la impresora y una vista previa de la etiqueta del casete. | No aplicable |
| Pedal | Equipo físico | Opcional | El pedal 1 confirma el número de fragmentos (véase la [pestaña Voz](#screen-tab-voice)). | Sin asignar |

**7. Permisos.** Abrir la pantalla: `screen:embedding:open`. Los pasos protegidos (reimpresión, comentarios) se registran con la persona; no se aplica ninguna capacidad de configuración independiente.
**Límites conocidos.** Las listas de motivos de reimpresión, tamaños de molde y discrepancias son fijas en el producto y no se pueden editar.

### Estación de microtomía {#screen-microtomy-workstation}
Breadcrumb: Inicio > Estación de microtomía

**Estado:** Construido

**1. Navegación:** Inicio > **Estación de microtomía**. Se abre con `screen:microtomy:open` (Histotechnologist).
**2. Elemento de mantenimiento:** No aplicable. Es una pantalla de mesa de trabajo.

**3. Finalidad y alcance.** La pantalla de la mesa de corte. Un técnico escanea un bloque (o un contenedor de decantado o de líquido en citología), añade los portaobjetos que se van a cortar por tinción y nivel, imprime o graba las etiquetas de los portaobjetos de una en una o por lotes, reimprime indicando un motivo, señala un bloque como agotado y vigila la facturación del bloque.

**4. Requisitos previos y dependencias.** La lista de selección de tinciones es el [Catálogo diagnóstico](#screen-stains). La impresión de etiquetas de portaobjetos necesita una estación de escaneado con impresión de portaobjetos y un perfil de impresora. Las entradas obligatorias proceden de los [Requisitos de los campos](#screen-field_requirements) (página `microtomy`).

Setup step: Reference, not part of setup
Requires: [Estaciones de escaneado](#screen-scan_stations), [Perfiles de impresora](#screen-printer_profiles), [Catálogo diagnóstico](#screen-stains), [Requisitos de los campos](#screen-field_requirements)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-microtomy-workstation - Estación de microtomía con la cuadrícula de portaobjetos y el panel de impresión]

**6. Referencia de campos.** Página de referencia: los controles de la pantalla.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Escanee un código de barras de bloque o de contenedor de decantado/líquido | Escáner o texto | Obligatorio para empezar | Carga el bloque. | En blanco |
| Resumen del bloque | Visualización | No aplicable | Estado, número de fragmentos, tejido, comentarios del bloque, historial previo de portaobjetos y, en un bloque de matriz, los cilindros que contiene con su posición y muestra. | No aplicable |
| Cuadrícula de portaobjetos | Tabla: Nivel, Tinción, Estado de impresión, Acciones | No aplicable | Una fila por portaobjetos. **Imprimir** imprime uno; **Reimprimir** requiere un motivo; **Quitar** en un portaobjetos impreso requiere un motivo de cancelación. Se puede emparejar un portaobjetos de **Control**. | No aplicable |
| Tinción (añadir portaobjetos) | Lista de selección con búsqueda | Obligatorio (se puede desactivar) | La tinción de un portaobjetos nuevo. | Ninguno |
| Duplicados | Número entero | Opcional | Cuántos de la misma tinción. | 1 |
| Profundidad del nivel | Número en µm | Opcional (se puede hacer obligatorio) | Profundidad del corte. **+ Nivel** corta otro nivel de la misma tinción. | En blanco |
| Motivo de la reimpresión | Opción: Atasco, Cristal rayado, Error de impresión, Otro | Motivo obligatorio | Se registra con el portaobjetos. | Ninguno |
| Motivo de la cancelación (portaobjetos impreso) | Opción: Corte dañado, Pedido por error, Tejido agotado, Otro | Motivo obligatorio | Cancelación de un portaobjetos que ya se ha impreso. | Ninguno |
| Modo de impresión | Opción: Bajo demanda, Lote | Opcional | Bajo demanda usa **Imprimir/grabar siguiente** para el siguiente portaobjetos sin imprimir; Lote imprime los portaobjetos marcados con una ventana de progreso. | Bajo demanda |
| Comentarios del portaobjetos y del bloque | Panel con **Comentario** y una casilla "Imprimir este comentario en la etiqueta física" | Opcional (el texto se puede hacer obligatorio) | Un comentario sobre un portaobjetos puede imprimirse en la etiqueta. | En blanco |
| Bloque agotado | Botón y ventana con una **Nota** obligatoria | Nota obligatoria | Envía un correo electrónico al patólogo que hizo el pedido y bloquea el corte hasta que apruebe el corte destructivo o cancele o cambie el pedido. La aprobación requiere `add-on:exception:approve-destructive-cut`. | No aplicable |
| Panel de líquido de muestra / decantado | Volumen total (mL); Aspecto: Claro, Hemático, Turbio; Rendimiento del decantado: Bajo, Moderado, Alto | Opcional | Entradas de líquidos de citología. Muestra una preparación sugerida con **Aceptar sugerencia**. | En blanco |
| Panel de facturación | Visualización | No aplicable | Cargos de los portaobjetos del bloque, con avisos de los cargos pendientes de aprobación; **Revisión completa de facturación** requiere el permiso de revisión de facturación. | No aplicable |
| Pedal | Equipo físico | Opcional | El pedal 2 imprime o graba el siguiente portaobjetos (véase la [pestaña Voz](#screen-tab-voice)). | Sin asignar |

**7. Permisos.** Abrir la pantalla: `screen:microtomy:open`. Aprobar el corte destructivo: `add-on:exception:approve-destructive-cut` (Pathologist, Fellow, Resident). Revisión completa de facturación: `billing:applied-code:review`.
**Límites conocidos.** Las listas de motivos son fijas en el producto.

### Estación de distribución de portaobjetos {#screen-slide-distribution-station}
Breadcrumb: Inicio > Estación de distribución de portaobjetos

**Estado:** Construido

**1. Navegación:** Inicio > **Estación de distribución de portaobjetos**. Se abre con `screen:slide-distribution:open` (Histotechnologist).
**2. Elemento de mantenimiento:** No aplicable. Es una pantalla de mesa de trabajo.

**3. Finalidad y alcance.** La pantalla de entrega de portaobjetos. Un técnico escanea portaobjetos en una cola de trabajo y después enruta cada uno a una retirada física (un patólogo o un grupo, con una carpeta, una bandeja o una bolsa de mensajería) o a un escáner digital (una gradilla y una ranura), y registra las excepciones de escaneo.

**4. Requisitos previos y dependencias.** Los patólogos y los grupos proceden de la lista de personal y de los grupos de [Subespecialidades](#screen-subspecialties). Los escáneres son equipos del tipo "Escáner de portaobjetos" en [Equipos](#screen-equipment); sin ellos, la lista de selección indica que no hay ninguno configurado. Las entradas obligatorias proceden de los [Requisitos de los campos](#screen-field_requirements) (página `slideDistribution`).

Setup step: Reference, not part of setup
Requires: [Equipos](#screen-equipment), [Subespecialidades](#screen-subspecialties), [Requisitos de los campos](#screen-field_requirements)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-slide-distribution-station - Estación de distribución de portaobjetos con la cola y el panel de destino]

**6. Referencia de campos.** Página de referencia: los controles de la pantalla.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Escanee un código de barras de portaobjetos o de bloque/casete | Escáner o texto | Opcional | La cola crece de forma continua. | En blanco |
| Cola de trabajo | Lista con recuento | No aplicable | Portaobjetos con tinción, estado y enrutamiento; **Quitar de la cola** quita uno. Se puede agrupar por grupo de subespecialidad o Sin asignar. | No aplicable |
| Modo de destino | Opción: Retirada física, Escáner digital | Obligatorio | Elige el formulario de destino. | Retirada física |
| Patólogo o grupo | Lista de selección con búsqueda | Obligatorio (se puede desactivar) | Quién recibe el portaobjetos. | Ninguno |
| ID de carpeta de portaobjetos, Número de bandeja, Bolsa de transporte del mensajero | Texto | Opcional (cada uno se puede hacer obligatorio) | Detalle de la ubicación física. **Confirmar ruta física** guarda. | En blanco |
| Escáner | Lista de selección de escáneres de portaobjetos | Obligatorio para Digital | El escáner. | Ninguno |
| ID de gradilla, Posición en la ranura | Texto | Opcional (cada uno se puede hacer obligatorio) | Posición en el escáner. **Confirmar ruta al escáner** guarda y pone el portaobjetos en la cola de escaneo. | En blanco |
| Portaobjetos activo, Cadena de custodia | Visualización | No aplicable | El estado y el historial del portaobjetos seleccionado. | No aplicable |
| Generar etiqueta de reemplazo | Botón y ventana con **Motivo** | Motivo obligatorio | Motivos: Etiqueta dañada, Código de barras ilegible, Impresión borrosa, Otro. Se conserva en el registro de la cadena de custodia. | No aplicable |
| Registro de excepciones de escaneo | Escaneos sin resolver con **Resolver** y una **Nota** opcional | Opcional (la nota se puede hacer obligatoria) | Motivos: Código de barras ilegible, Acceso sin asignar, Falta el vidrio. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:slide-distribution:open`. No se aplica ninguna capacidad de configuración independiente.
**Límites conocidos.** Las listas de motivos son fijas en el producto. El modelo de datos del enrutamiento (carpeta de portaobjetos, bandeja, bolsa de transporte del mensajero) no tiene ningún diccionario detrás; los valores son texto libre.

## Patología digital, integración de escáneres WSI y ajustes del visor {#ch4-digital-pathology}
Breadcrumb: Inicio > Configuración > Sistema

Esta parte trata lo que PathScribe ofrece hoy para la patología digital. Sea exacto con el alcance. Hay dos piezas. La primera, los diccionarios de proveedores de [Integraciones con proveedores](#screen-vendor_integrations), que son listas de nombres y direcciones web. La segunda, la cola de escaneo de portaobjetos de [Gestión de lotes](#screen-batch-management), que envía un manifiesto de escaneo al motor de interfaces y recibe un estado de vuelta. **No construido:** un controlador de escáner específico de un proveedor o un conector de proveedor. Ninguna pantalla configura un escáner, salvo darle nombre como Equipo del tipo "Escáner de portaobjetos" en [Equipos](#screen-equipment). PathScribe no tiene visor de portaobjetos: un portaobjetos escaneado muestra la vista previa de su escáner y se abre en la aplicación de patología digital del laboratorio, configurada en **Imágenes de portaobjetos** dentro de Integraciones con proveedores (lote 750). La página del visor simulado es solo una demostración.

### Integraciones con proveedores {#screen-vendor_integrations}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Integraciones con proveedores

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Integraciones con proveedores (cuatro categorías en una lista a la izquierda: Patología digital / IA, Visores de WSI, Sistemas de gestión de imágenes, Imagen macroscópica y telepatología)

**3. Finalidad y alcance.** Una pantalla contiene cuatro diccionarios de productos externos. Cada uno es una lista con **Añadir**, **Editar**, **Desactivar / Reactivar** y un interruptor **Mostrar inactivos**. Las entradas no se eliminan nunca. Las listas son datos de referencia: listas de selección y enlaces que leen otras partes de PathScribe. Las listas de Patología digital / IA, Sistemas de gestión de imágenes e Imagen macroscópica son nombres y ajustes que se registran y se muestran; el producto no contiene ningún conector específico de un proveedor que actúe sobre ellos. Solo la categoría Visores de WSI tiene un uso real: sus ajustes de **Imágenes de portaobjetos** indican la dirección que abre un portaobjetos en la aplicación de patología digital del laboratorio y la dirección de su vista previa, y la **Plantilla de URL de apertura** de su lista se usa cuando allí no hay ninguna dirección de visor.

**4. Requisitos previos y dependencias.** Ninguno aparte del acceso de la persona. Defina la dirección del visor en Imágenes de portaobjetos (o un visor de WSI con plantilla de apertura) antes de poder abrir portaobjetos en la aplicación del laboratorio; el equipo escáner es una lista aparte (Equipos).

Setup step: Tier 3, step 9
Requires: Ninguno.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-vendor_integrations - Integraciones con proveedores con las cuatro categorías y la lista de Visores de WSI]

**6. Referencia de campos.**

#### Patología digital / IA (ventana de alta y edición)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre del proveedor | Texto | Obligatorio | Guardar está desactivado cuando está vacío. | Ninguno |
| Nombre del producto | Texto | Obligatorio | Guardar está desactivado cuando está vacío. | Ninguno |
| Modalidad | Texto | Obligatorio | Por ejemplo, el área clínica que cubre el producto. Guardar está desactivado cuando está vacío. | Ninguno |
| Aprobado por la FDA | Casilla | Opcional | Se muestra junto a la entrada en la lista. | Desactivado |
| Mostrar inactivos | Interruptor | Opcional | Muestra las entradas que se desactivaron. | Desactivado |

Los datos de demostración contienen seis entradas: Paige Prostate, Ibex Prostate Detect, PathAI AISight Dx, Proscia Concentriq AP-Dx, Hologic Genius Digital Diagnostics (todas aprobadas por la FDA) y BD FocalPoint GS Imaging System (no marcada como aprobada).

#### Visores de WSI (ventana de alta y edición)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre (proveedor / nombre del producto) | Texto | Obligatorio | Guardar está desactivado cuando está vacío. | Ninguno |
| Plantilla de URL de apertura | Dirección web que contiene el token `{{wsiUniqueId}}` | Opcional | PathScribe sustituye el token por el identificador del portaobjetos. Solo se usa cuando no hay dirección de visor en Imágenes de portaobjetos: la primera entrada activa con una dirección https válida abre el portaobjetos. Aparece un aviso cuando el texto no contiene el token. | En blanco |
| Mostrar inactivos | Interruptor | Opcional | | Desactivado |

Todas las entradas de demostración tienen la plantilla en blanco (la entrada de demostración de example.com se retiró en el lote 750).

#### Imágenes de portaobjetos (Visores de WSI, encima de la lista)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Dirección del visor | Dirección web https con `{{slideId}}` y, si se desea, `{{accession}}` | Opcional | Abre el portaobjetos en la aplicación de patología digital del laboratorio, en una ventana aparte que recuerda su posición en cada puesto de trabajo. No debe contener un nombre de usuario, una contraseña ni un nombre de paciente; el inicio de sesión corresponde a esa aplicación. La apertura queda en el registro de auditoría y requiere `case:slide-image:open`. | `VITE_SLIDE_VIEWER_URL_TEMPLATE` de la implantación, si está definida |
| Dirección de la imagen de vista previa | Dirección web https con `{{slideId}}` y, si se desea, `{{accession}}` | Opcional | La vista previa del portaobjetos procedente del escáner o del sistema de imágenes, mostrada sin modificar con "Vista previa de referencia. No apta para diagnóstico." cuando el portaobjetos está escaneado. Añada su host a la política de seguridad (img-src). | `VITE_SLIDE_THUMBNAIL_URL_TEMPLATE` de la implantación, si está definida |
| Centros con su propio sistema | Un centro y, después, las mismas dos direcciones | Opcional | Para un centro con su propio escáner o aplicación; en blanco se usa la dirección del laboratorio. | Ninguno |

Para guardar se requiere `config:vendor-integrations:manage`. Sin dirección de visor, el usuario ve "No se ha definido ninguna dirección de visor. Consulte a su administrador." al abrir un portaobjetos. Cada puesto de trabajo elige dónde se abre la ventana de portaobjetos desde el menú del puesto (Ventana de imágenes de portaobjetos, Definir posición).

#### Sistemas de gestión de imágenes (ventana de alta y edición)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | Guardar está desactivado cuando está vacío. | Ninguno |
| Despliegue | Opción: IMS de empresa, Servidor de archivos local | Opcional | Dónde se ejecuta el almacén de imágenes. | IMS de empresa |
| Autenticación | Opción: Ninguna, URL firmada, OAuth 2.0 Bearer, mTLS | Opcional | Cómo se accede al almacén. Solo se registra la opción. | Ninguna |
| URL base | Texto | Opcional | Dirección del almacén. La ventana advierte de que no se incluyan tokens ni secretos. Una entrada sin dirección muestra "sin URL base". | En blanco |

#### Imagen macroscópica y telepatología (ventana de alta y edición)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | Guardar está desactivado cuando está vacío. | Ninguno |
| Autenticación | Opción (las mismas cuatro de arriba) | Opcional | Solo se registra. | Ninguna |
| URL base | Dirección web https | Opcional | Una dirección que no es https muestra un error y Guardar queda desactivado. | En blanco |
| Admite telepatología en directo | Casilla | Opcional | La lista muestra "con capacidad de telepatología" o "solo estático". Nada fuera de esta lista lo lee. | Desactivado |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar y desactivar: `config:vendor-integrations:manage` (Admin y Lab Director de forma predeterminada). Los demás ven las listas en solo lectura.
**Límites conocidos.** El contrato está en `docs/architecture/DIGITAL_PATHOLOGY_API.md`. **Solo demostración: visor de WSI simulado.** Una ruta `/wsi-viewer?caseId=` abre `MockWsiViewerPage`, que muestra un aviso de "simulado", la identidad del caso y un marcador en blanco donde iría un portaobjetos. Solo existe cuando la compilación tiene activadas las herramientas de demostración, una prueba la excluye de las compilaciones de producción y no es un ajuste de administrador. PathScribe no muestra por sí mismo ninguna imagen de preparación completa. Ni la IA ni la cola del escáner leen ningún registro de proveedor.

## Ajustes de validación, revisión, calidad y operaciones del patólogo {#ch4-signout}
Breadcrumb: Inicio > Configuración > Sistema

Esta parte trata todos los ajustes que dan forma a la validación del informe y a las pantallas de calidad, tiempo de respuesta y operaciones que la rodean. Las pantallas se agrupan así: reglas de validación y revisión; intraoperatorio y visualización; tiempo de respuesta; garantía de calidad y control de calidad de citología; y otros (contribución, comentarios, canal de investigación). Las páginas de uso diario (Inicio, Garantía de calidad, Depósito del buzón, Revisión de excepciones de márgenes, Cola de control de calidad de citología) son páginas de referencia y están al final de la parte.

Casi todas las pantallas siguientes siguen un mismo patrón: un valor predeterminado de la organización que cada laboratorio ejecutor puede heredar o reemplazar en la ventana de edición de **Configuración de centros** ([Diccionario de centros](#screen-facility-dictionary), Nivel 1). El laboratorio ejecutor es el laboratorio que valida el caso, determinado a partir del centro solicitante. Todos son configuración de riesgo alto: de forma predeterminada, solo Admin y Lab Director (y el superadministrador de ForMedrixAI) tienen el permiso para cambiarlos, y una persona que no lo tiene ve la pantalla en solo lectura.

### Revisión por pares antes de la validación {#screen-peer_review_gate}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Revisión por pares antes de la validación

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Revisión por pares antes de la validación

**3. Finalidad y alcance.** Una primera neoplasia maligna (determinada a partir de los casos previos del paciente) siempre lleva la recomendación de una revisión por pares independiente. Esta pantalla decide dónde la validación del informe también **espera** a esa revisión. Está desactivada de forma predeterminada. Prevalece el ajuste más específico: departamento, luego laboratorio ejecutor y luego la organización. Cuando la barrera está activada, un patólogo todavía puede validar el informe antes de la revisión por atención urgente, indicando un motivo; la revisión queda entonces pendiente en un plazo de 24 horas.

**4. Requisitos previos y dependencias.** Las filas proceden de los laboratorios ejecutores ([Diccionario de centros](#screen-facility-dictionary)) y de las subespecialidades ([Subespecialidades](#screen-subspecialties), que se muestran como "Servicio"). Sin ellos solo está disponible el interruptor de la organización.

Setup step: Tier 3, step 10
Requires: [Diccionario de centros](#screen-facility-dictionary), [Subespecialidades](#screen-subspecialties)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-peer_review_gate - Revisión por pares antes de la validación con el interruptor de la organización y dos tablas]

**6. Referencia de campos.** Cada cambio se guarda al instante y muestra "Guardado".

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| La validación del informe espera a la revisión por pares en toda la organización | Casilla | Opcional | El ajuste de toda la organización. | Desactivado |
| Laboratorio ejecutor (tabla Por centro): La validación espera a la revisión | Opción por laboratorio: Heredar, Activado, Desactivado | Opcional | Heredar usa el ajuste de la organización. | Heredar |
| Servicio (tabla Por servicio): La validación espera a la revisión | Opción por subespecialidad: Heredar, Activado, Desactivado | Opcional | Heredar usa el ajuste del laboratorio. | Heredar |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:peer-review:manage` (riesgo alto, auditado; Admin y Lab Director).
**Límites conocidos.** Existe una versión de servidor (`QUALITY_SETTINGS_API.md`, `QUALITY_API.md`); la demostración conserva los ajustes en el navegador.
### Revisión de concordancia preliminar-definitivo {#screen-concordance_review_settings}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Revisión de concordancia preliminar-definitivo

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Revisión de concordancia preliminar-definitivo

**3. Finalidad y alcance.** Controla la comparación automática de un hallazgo preliminar (por ejemplo, un diagnóstico de biopsia intraoperatoria) con el diagnóstico definitivo, y una pantalla de revisión opcional en la validación del informe. La decisión sobre la concordancia la toma siempre el patólogo; estos dos ajustes solo deciden si el sistema ayuda a ponerla de manifiesto.

**4. Requisitos previos y dependencias.** Ninguno para el valor predeterminado de la organización. Una excepción de laboratorio se establece en la ventana de edición de Configuración de centros ([Diccionario de centros](#screen-facility-dictionary)).

Setup step: Tier 3, step 11
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-concordance_review_settings - Revisión de concordancia preliminar frente a final con dos interruptores]

**6. Referencia de campos.** Cada interruptor se guarda al instante y muestra "Guardado".

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Activar la comparación automática | Interruptor | Opcional | El sistema compara un hallazgo preliminar con el diagnóstico definitivo correspondiente y señala una discordancia real para su revisión por el patólogo. Nunca califica por sí mismo un resultado. | Activado |
| Exigir pantalla de revisión al firmar | Interruptor | Opcional | Una pantalla adicional muestra la comparación entre lo preliminar y lo definitivo antes de que pueda terminar la validación del informe. | Activado |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:concordance-review:manage` (riesgo alto; Admin y Lab Director).
**Límites conocidos.** El ajuste también se guarda por laboratorio en el registro del centro. Existe una versión de servidor (`QUALITY_SETTINGS_API.md`).

### Búfer de liberación tras la validación {#screen-release_buffer}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Búfer de liberación tras la validación

**Estado:** Parcial

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Búfer de liberación tras la validación (título en pantalla: Plazo de espera de emisión tras la validación)

**3. Finalidad y alcance.** Una retención temporal entre la validación del informe y su emisión externa real. Mientras el informe está retenido en **Pendiente de emisión**, el patólogo que lo validó puede retirarlo y corregirlo sin una modificación formal. Estos son los valores predeterminados de toda la organización. Un laboratorio ejecutor puede heredarlos o establecer sus propios valores de activación, duración y omisión para casos URGENTES (STAT) en la ventana de edición de Configuración de centros; la marca de agua y la restricción de impresión son solo de toda la organización.

**Qué hace hoy el código (verificado en el código fuente).** La hora de validación que alimenta los informes de tiempo de respuesta se sigue registrando en la validación. Una hora independiente de "emisión" se registra cuando termina la retención. La retención la finaliza un temporizador que se ejecuta en cualquier pantalla abierta de PathScribe (y un barrido en segundo plano en cualquier pantalla abierta). Un programador del lado del servidor que emitiría un caso que nadie tiene abierto está previsto con el servidor de la API y **no está construido**, de modo que la emisión puede retrasarse cuando no hay ninguna pantalla abierta.

**4. Requisitos previos y dependencias.** Ninguno para los valores predeterminados. Excepciones de laboratorio: [Diccionario de centros](#screen-facility-dictionary).

Setup step: Tier 3, step 12
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-release_buffer - Ajustes del búfer de liberación tras la validación]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Activar plazo de espera de emisión tras la validación | Interruptor | Opcional | Un informe validado se retiene en Pendiente de emisión durante la duración del búfer, salvo que se aplique una omisión. | Activado |
| Duración del plazo de espera | Número entero de minutos, de 1 a 30 | Obligatorio | Un valor fuera del intervalo se ajusta al límite más próximo. | 10 |
| Omitir el plazo de espera en casos urgentes | Interruptor | Opcional | Los casos URGENTES (STAT) se emiten de inmediato. | Activado |
| Texto de la marca de agua | Texto | Opcional | Se dibuja en diagonal sobre cualquier vista en pantalla de un informe Pendiente de emisión y se envía al generador de PDF. PathScribe envía el texto; no puede verificar que el generador independiente lo dibuje. | PENDING FINAL RELEASE - DO NOT DISTRIBUTE |
| Política de impresión durante la retención de emisión | Opción: Permitir, Advertir y confirmar, Anulación por supervisor, Bloquear | Opcional | Qué ocurre cuando alguien imprime un informe que aún está en su plazo de espera de emisión (lote 654; sustituye al antiguo interruptor «Restringir la impresión en papel interna»). **Permitir** imprime de inmediato. **Advertir y confirmar** avisa de que la copia es un borrador con marca de agua y pide a la persona que confirme. **Anulación por supervisor** deja imprimir solo a quien posea `print:release-hold:override`, y esa persona debe indicar un motivo; a todos los demás se les rechaza. **Bloquear** no permite imprimir hasta que el informe se haya emitido. Toda copia impresa lleva la marca de agua de emisión pendiente. Un ajuste antiguo activado pasó a Advertir y confirmar; desactivado pasó a Permitir. El ajuste es válido para toda la organización y aparece atenuado mientras el plazo de espera de emisión está desactivado. | Advertir y confirmar |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:release-buffer:manage` (riesgo alto; Admin y Lab Director). Imprimir un informe durante su retención de emisión con la opción Anulación por supervisor: `print:release-hold:override` («Imprimir un informe durante su retención de emisión (anulación por supervisor)»; Lab Director y Admin la tienen de forma predeterminada; concédala a cualquier otro rol que deba imprimir informes retenidos).
**Límites conocidos.** Parcial por lo indicado sobre el programador. El trabajo de barrido de emisión en el servidor, que emitiría un informe que nadie tiene abierto, está diseñado (`docs/architecture/RELEASE_SWEEP_SERVER_JOB.md`: un barrido cada minuto; una ventana que se pierde emite con retraso y el caso se marca) y **no está construido**. Cuando se construya, nunca emitirá un informe que esté bajo una retención de firma quirúrgica; marcará el caso para que lo atienda una persona. Existe una versión de servidor de los ajustes (`REPORTS_API.md`).

### Reglas de firma por país {#screen-country_signing_rules}
Breadcrumb: Inicio > Configuración > Sistema > Consultas clínicas > Reglas de firma por país

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Consultas clínicas**. Solo uso interno: un administrador del cliente ve la pantalla en solo lectura.
**2. Elemento de mantenimiento:** Reglas de firma por país

**3. Finalidad y alcance.** Las normas nacionales de cada tipo de participación: su denominación local, si puede validar informes, si su trabajo necesita una cofirma y si puede ver el caso completo. Todos los laboratorios del país heredan las reglas, salvo que tengan una excepción propia en Tipos de participación. Las reglas reflejan la normativa nacional, de modo que solo el administrador de la plataforma de ForMedrixAI puede cambiarlas. Cada guardado requiere un motivo y se escribe en el registro de auditoría.

**4. Requisitos previos y dependencias.** Las filas son los tipos de participación.

Setup step: Tier 3, step 13
Requires: [Tipos de participación](#screen-participation_types)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-country_signing_rules - Reglas de firma por país con una tarjeta por tipo de participación]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| País | Lista de selección: US, CA, GB (England and Wales), GB (Scotland), GB (Northern Ireland), IE, AU, NZ, KR, BE, NL, DE, FR, ES | Obligatorio | Cambiar de país con ediciones sin guardar está bloqueado ("Guarde o descarte los cambios antes de cambiar de país"). | GB (England and Wales) |
| Ofrecer en este país / Dejar de ofrecer aquí | Botón en una tarjeta cuyo tipo no es global | Opcional | Añade o quita el tipo para el país. Quitar el último país se rechaza (desactive el tipo en su lugar). | No aplicable |
| Denominación local | Texto | Opcional | El nombre que da el país al tipo. El texto de ejemplo muestra la denominación de la plataforma. | En blanco (denominación de la plataforma) |
| Puede finalizar / firmar | Opción: Valor predeterminado de la plataforma (valor), Sí, No | Opcional | Si el tipo puede validar informes. | Valor predeterminado de la plataforma |
| Requiere cofirma | Opción: Valor predeterminado de la plataforma, Sí, No | Opcional | Si el trabajo del tipo necesita una cofirma. | Valor predeterminado de la plataforma |
| Puede ver el caso completo | Opción: Valor predeterminado de la plataforma, Sí, No | Opcional | | Valor predeterminado de la plataforma |
| Base normativa | Texto de varias líneas | Opcional | La norma del organismo regulador o del colegio profesional que sigue el ajuste. | En blanco |
| Motivo del cambio | Texto | Obligatorio para guardar | Error "Introduzca un motivo para el cambio." Se muestra con "Último cambio de (nombre) el (fecha). Motivo". | En blanco |
| Descartar cambios, Guardar cambios | Botones | No aplicable | **Guardar cambios** informa de un fallo parcial ("los tipos guardados antes se conservaron y se auditaron"). | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `platform:signing-rules:manage` (solo de plataforma, riesgo alto; solo el superadministrador de ForMedrixAI). Admin y Lab Director no pueden cambiarlo.
**Límites conocidos.** Contrato en `docs/architecture/LAB_DICTIONARIES_API.md`.

### Motivos de revisión {#screen-revision_reasons}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Motivos de revisión

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Motivos de revisión

**3. Finalidad y alcance.** Enumera los motivos que elige un patólogo al modificar o corregir un informe emitido, y permite al administrador marcar cuáles implican que el informe original pudo haber afectado al manejo clínico. Emitir una revisión por un motivo marcado recomienda una CAPA al responsable de calidad. Esta pantalla solo cambia la marca; no añade ni cambia el nombre de los motivos.

**4. Requisitos previos y dependencias.** Ninguno.

Setup step: Tier 3, step 14
Requires: Ninguno.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-revision_reasons - Motivos de revisión en dos grupos con un interruptor de clínicamente significativo]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Motivos de modificación (revisión diagnóstica), Motivos de corrección (administrativa) | Dos listas | No aplicable | Motivos iniciales. Modificación: Revisión de la interpretación diagnóstica, Reevaluación de los márgenes quirúrgicos, Cambio de la estadificación patológica, Reclasificación de la muestra/localización. Corrección: Error tipográfico, Actualización de datos del paciente/demográficos, Actualización del médico solicitante, Corrección del etiquetado de la muestra. | No aplicable |
| Motivo, Descripción | Texto | No aplicable | Aquí solo de lectura. Los motivos inactivos muestran una etiqueta "Inactivo". | No aplicable |
| Clínicamente significativo | Interruptor por motivo | Opcional | Activado muestra "Recomienda una CAPA"; desactivado muestra "Sin CAPA". | Activado en los cuatro motivos de modificación, desactivado en los cuatro motivos de corrección |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:revision-reasons:manage` (riesgo alto; Admin y Lab Director).
**Límites conocidos.** En el producto, los valores iniciales son: diagnóstico, margen, estadio y reclasificación del tejido activados; correcciones administrativas desactivadas (`revisionReasonRules.ts`). El servicio permite añadir, editar, desactivar y reactivar motivos, pero esta pantalla no tiene ningún botón para ello; así consta para Pete en `open-questions/ch4.md`. Contrato: `docs/architecture/LAB_DICTIONARIES_API.md`.

### Motivos del puesto de trabajo {#screen-bench_reasons}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Motivos del puesto de trabajo

**Estado:** Construido (lote 736)

**1. Navegación:** pestaña de configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Motivos del puesto de trabajo

**3. Finalidad y alcance.** Los motivos que el personal toca en el puesto en lugar de escribirlos, en cinco grupos: micrótomo (bloque agotado); pedidos adicionales sobre un bloque agotado (pedido y respuesta del patólogo, incluida la aprobación del corte destructivo); anulación de lote; lote completado con excepciones; desviación de la cadena de frío. Cada laboratorio los redacta a su manera. Un motivo conserva su **código** al reformularlo, y cada registro y entrada de auditoría guarda el código junto al texto, de modo que los informes (columna **Código del motivo** del informe de excepciones de conciliación) lo cuentan igual antes y después de reformularlo. La nota sigue siendo opcional.

**4. Requisitos previos y dependencias.** Ninguno. Los motivos predeterminados se suministran en los seis idiomas.

Setup step: Tier 3, step 32
Requires: None.
Unlocks: None.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-bench_reasons - Motivos del puesto en cinco grupos]

**6. Campos.** Redacción (con **Reformular**; un motivo predeterminado se muestra en el idioma de cada usuario, uno reformulado tal como se escribió), Código (solo lectura, no cambia nunca), ↑ / ↓ (orden), **Usar la redacción predeterminada**, **Retirar** / **Restablecer**, **Añadir motivo**.

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:bench-reasons:manage` (riesgo alto; administrador y director de laboratorio).
**Limitaciones conocidas.** Una lista para toda la organización; un centro aún no puede tener su propia redacción.

### Reglas de marcado automático para comité de tumores {#screen-tumor_board_rules}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Reglas de marcado automático para comité de tumores

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Reglas de marcado automático para comité de tumores (título en pantalla: Reglas de marcado automático del comité de tumores)

**3. Finalidad y alcance.** En la validación del informe, PathScribe incluye un caso en la lista de un comité de tumores cuando una regla coincide con el informe firmado, y registra el motivo. Hay cuatro nombres de comité: Comité de mama, Comité digestivo, Comité torácico y Ginecología oncológica. Existen dos tipos de regla. Una regla de margen incluye el caso cuando un margen está más cerca que un umbral. Una regla de diagnóstico y biomarcador incluye el caso cuando se cumplen todos los criterios. Los valores de la empresa se pueden reemplazar o desactivar para un centro. Un cierre de agrupación independiente bloquea la lista de casos de un comité antes de su reunión.

**4. Requisitos previos y dependencias.** Las excepciones de centro usan el [Diccionario de centros](#screen-facility-dictionary). Los criterios se comparan por la etiqueta del campo y la redacción del informe firmado, así que pruebe una regla con una plantilla de informe real antes de confiar en ella.

Setup step: Tier 3, step 15
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-tumor_board_rules - Reglas de marcado automático del comité de tumores con reglas de margen, reglas de criterios, cierre y excepciones de centro]

**6. Referencia de campos.** Los errores aparecen encima de las tarjetas.

#### Base de la empresa (reglas de margen)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Lista de reglas (comité y descripción) | Una fila por comité | No aplicable | Cuatro reglas iniciales, una por comité, "Margen cercano o positivo (< 1mm)". | No aplicable |
| Umbral de margen (mm) | Número mayor que 0 | Obligatorio | Error "Introduzca un umbral de margen superior a 0." | 1 |
| Activo | Casilla | Opcional | Desactiva la regla para la empresa. | Activado |
| Guardar | Botón | No aplicable | Solo se activa tras un cambio. | No aplicable |

#### Reglas de diagnóstico y biomarcadores

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Descripción de la regla | Texto, de 1 a 80 caracteres | Obligatorio | El motivo que se registra cuando se incluye un caso en la lista. | En blanco |
| Comité | Lista de selección de los cuatro comités | Obligatorio | Error "Elija un comité." | No aplicable |
| Tipo del criterio (n) | Opción: El diagnóstico contiene, Resultado de biomarcador, Margen inferior a (mm) | Obligatorio | Deben cumplirse todos los criterios. Una regla tiene de 1 a 6 criterios y al menos un criterio de diagnóstico o de biomarcador. | No aplicable |
| Texto del diagnóstico para el criterio (n) | Texto, de 2 a 60 caracteres | Obligatorio para un criterio de diagnóstico | | En blanco |
| Biomarcador; Resultado para el criterio (n) | Dos cuadros de texto, cada uno de hasta 60 caracteres | Obligatorio para un criterio de biomarcador | | En blanco |
| Umbral de margen (criterio) | Número mayor que 0 | Obligatorio para un criterio de margen | | En blanco |
| Activo | Casilla | Opcional | | Activado |
| + Añadir regla, + Añadir criterio, Eliminar criterio, Eliminar, Guardar, Cancelar | Botones | No aplicable | Como máximo 25 reglas de diagnóstico y biomarcadores ("Se ha alcanzado el límite de 25 ..."). | Sin reglas |

#### Cierre de agrupación

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Cierre (horas antes de la reunión) | Número, 0 o más | Obligatorio | Los cambios de programación se rechazan dentro de esta ventana. La autoasignación de ponente sigue funcionando hasta la reunión e incluso después. | 48 |

#### Excepciones por centro

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Centro | Lista de selección | Obligatorio | Error "Elija un centro." | El primer centro |
| Regla | Lista de selección de las reglas de margen y las reglas de criterios | Obligatorio | La regla que se reemplaza. | La primera regla |
| Umbral de margen (mm) | Número mayor que 0 | Obligatorio para una regla de margen | No se usa para una regla de criterios. | El valor de la regla |
| Activo | Casilla | Opcional | Desactivado deshabilita la regla en ese centro (la lista muestra "desactivada"). | Activado |
| Enviar al comité | Lista de selección, o "El comité propio de la regla" | Opcional | Envía el caso a otro comité en ese centro. | El comité propio de la regla |
| Guardar, Cancelar, Eliminar | Botones | No aplicable | | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:tumor-board-rules:manage` (riesgo alto; Admin y Lab Director).
**Límites conocidos.** Contrato: `docs/architecture/TUMOR_BOARD_API.md`. La lista de comités es fija en el producto.

### Correlación biopsia-resección {#screen-biopsy_resection_correlation}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Ventana biopsia-resección

**Estado:** Parcial

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Ventana biopsia-resección (título en pantalla: Ventana de correlación entre biopsia y resección)

**3. Finalidad y alcance.** Cuánto tiempo después de una biopsia quirúrgica se busca una resección posterior del mismo paciente como candidata a correlación, y desde qué fecha empieza esa ventana. Una resección coincide cuando se recoge o se recibe dentro de la ventana. Se establece para la empresa, para cada jurisdicción y para cada centro; prevalece el ajuste más específico. La pantalla es el mismo control que [Correlación citología-histología](#screen-cytology_histology_correlation), aplicado a los ajustes quirúrgicos.

**4. Requisitos previos y dependencias.** Las excepciones de centro usan el [Diccionario de centros](#screen-facility-dictionary).

Setup step: Tier 3, step 16
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Seguimiento de controles posteriores](#screen-follow_up_tracking)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-biopsy_resection_correlation - Ventana de correlación entre biopsia y resección con el valor predeterminado de la empresa, reglas de jurisdicción y excepciones de centro]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Valor predeterminado de la empresa: Plazo (días) | Número entero de 1 a 1825 | Obligatorio | Error "Introduzca un número entero de días de 1 a 1825." | 180 |
| Valor predeterminado de la empresa: Comienza desde | Opción: Fecha de recogida, Fecha de recepción en el laboratorio, (firma) | Obligatorio | La fecha desde la que empieza la ventana. La opción de firma se titula "Firma de la citología" en pantalla incluso aquí. | Fecha de recogida |
| Guardar | Botón | No aplicable | | No aplicable |
| Por jurisdicción: + Añadir regla de jurisdicción | Lista de selección de jurisdicciones sin regla, Plazo (días), Comienza desde; Guardar, Cancelar, Eliminar | Opcional | Una regla por jurisdicción. La lista muestra "N días desde (ancla)". | Ninguna |
| Excepciones de centro: + Añadir excepción de centro | Lista de selección de centros, Plazo (días), Comienza desde; Guardar, Cancelar, Eliminar | Opcional | "Elija un centro." es el error cuando no se elige ninguno. | Ninguna |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:biopsy-resection-correlation:manage` (riesgo alto; Admin y Lab Director).
**Límites conocidos.** Parcial: el servicio es una simulación en el almacén del navegador exportada desde `services/index.ts`; no hay versión de servidor. La ventana de citología sí la tiene (Construido). Que la etiqueta "Firma de la citología" aparezca en la pantalla de biopsia consta en `open-questions/ch4.md`.

### Correlación citología-histología {#screen-cytology_histology_correlation}
Breadcrumb: Inicio > Configuración > Citología > Ventana de correlación

**Estado:** Construido

**1. Navegación:** pestaña **Citología** de Configuración > **Ventana de correlación**
**2. Elemento de mantenimiento:** Ventana de correlación (título en pantalla: Plazo de correlación citohistológica)

**3. Finalidad y alcance.** Cuánto tiempo después de un resultado anormal de citología cervical se busca una biopsia posterior como candidata a correlación, y desde qué fecha empieza la ventana. El reloj clínico empieza cuando se recogen las células, por lo que la recogida es el valor predeterminado. Una biopsia coincide cuando se recoge o se recibe dentro de la ventana. Se establece para la empresa, para cada jurisdicción y para cada centro; prevalece el más específico. El equivalente quirúrgico es [Correlación biopsia-resección](#screen-biopsy_resection_correlation).

**4. Requisitos previos y dependencias.** Las excepciones de centro usan el [Diccionario de centros](#screen-facility-dictionary).

Setup step: Tier 3, step 17
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Seguimiento de controles posteriores](#screen-follow_up_tracking)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_histology_correlation - Plazo de correlación citohistológica con reglas de jurisdicción y de centro]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Valor predeterminado de la empresa: Plazo (días) | Número entero de 1 a 1825 | Obligatorio | Error "Introduzca un número entero de días de 1 a 1825." | 180 |
| Valor predeterminado de la empresa: Comienza desde | Opción: Fecha de recogida, Fecha de recepción en el laboratorio, Firma de la citología | Obligatorio | Error "Elija la fecha desde la que comienza el plazo." | Fecha de recogida |
| Guardar | Botón | No aplicable | | No aplicable |
| Por jurisdicción: + Añadir regla de jurisdicción | Lista de selección de jurisdicciones (solo las que no tienen regla), Plazo (días), Comienza desde; Guardar, Cancelar, Eliminar | Opcional | La lista muestra "N días desde (ancla)". Sin ninguna: "Todas las jurisdicciones usan el valor predeterminado de la empresa." | Ninguna |
| Excepciones de centro: + Añadir excepción de centro | Lista de selección de centros, Plazo (días), Comienza desde; Guardar, Cancelar, Eliminar | Opcional | Error "Elija un centro." | Ninguna |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:cytology-histology-correlation:manage` (riesgo alto; Admin y Lab Director).
**Límites conocidos.** Contrato: `docs/architecture/CYTOLOGY_API.md` (`ICytologyHistologyCorrelationSettingsService`).

### Seguimiento de controles posteriores {#screen-follow_up_tracking}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Seguimiento de controles posteriores

**Estado:** Parcial

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Seguimiento de controles posteriores

**3. Finalidad y alcance.** Establece cuándo se avisa al laboratorio de una muestra de control posterior esperada que no ha llegado, y si el personal puede escribir por correo electrónico al médico solicitante al respecto. Los plazos del seguimiento se establecen en [Correlación citología-histología](#screen-cytology_histology_correlation) y [Correlación biopsia-resección](#screen-biopsy_resection_correlation). Un correo electrónico al médico nunca se envía automáticamente: un usuario revisa cada uno y pulsa Enviar.

**4. Requisitos previos y dependencias.** Las excepciones de centro usan el [Diccionario de centros](#screen-facility-dictionary). Sin las ventanas de correlación no hay nada de lo que avisar.

Setup step: Tier 3, step 18
Requires: [Diccionario de centros](#screen-facility-dictionary), [Correlación biopsia-resección](#screen-biopsy_resection_correlation), [Correlación citología-histología](#screen-cytology_histology_correlation)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-follow_up_tracking - Seguimiento de controles posteriores con la tarjeta de la empresa y las excepciones de centro]

**6. Referencia de campos.** La tarjeta de la empresa y cada excepción de centro usan los mismos cuatro campos.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Avisar con estos días de antelación a la fecha de vencimiento | Número entero de 0 a 365 | Obligatorio | 0 avisa solo cuando ya está vencido. Error "Introduzca un número entero de días entre 0 y 365." | 30 |
| Permitir que el personal envíe correos al médico solicitante | Casilla | Opcional | Añade la acción "Enviar correo al médico solicitante". | Desactivado |
| Asunto del correo (vacío = redacción predeterminada) | Texto de hasta 200 caracteres | Opcional | Redacción predeterminada: "Follow-up specimen requested: {{accession}}". | En blanco |
| Mensaje de correo (vacío = redacción predeterminada) | Texto de hasta 4000 caracteres | Opcional | Solo se rellenan estos marcadores: accession, windowStart, dueDate, clinicianName, labName, senderName. No hay deliberadamente ningún marcador para el nombre del paciente ni el diagnóstico. Un marcador desconocido se rechaza. | En blanco |
| Guardar | Botón | No aplicable | Está desactivado mientras un valor no es válido. | No aplicable |
| Excepciones de centro: Centro, Añadir excepción, Eliminar | Lista de selección y botones | Opcional | Una excepción de centro aparece en la lista como "Avisar N días antes, correo al médico activado/desactivado". Todos los centros sin excepción usan la tarjeta de la empresa. | Ninguna |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:follow-up-tracking:manage` (riesgo alto; Admin y Lab Director).
**Límites conocidos.** Parcial: los ajustes los guarda un servicio del almacén del navegador (`followUpSettings.ts`); el servicio de seguimiento del servidor devuelve los ajustes con su lista, pero no tiene escritura para ellos. La cola de seguimiento está en `docs/architecture/` bajo la API de calidad.
### Resultados críticos intraoperatorios {#screen-intraop_critical_results}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Resultados críticos intraoperatorios

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Resultados críticos intraoperatorios (título en pantalla: Resultados críticos intraoperatorios)

**3. Finalidad y alcance.** Un diccionario de resultados de la biopsia intraoperatoria que deben llegar directamente al cirujano que opera. Una muestra coincide con una entrada por su categoría preliminar o por un término de su diagnóstico intraoperatorio (las frases negadas se ignoran). Una coincidencia señala el aviso verbal como resultado crítico, que el patólogo confirma o descarta. Las entradas no se eliminan nunca; se desactivan.

**4. Requisitos previos y dependencias.** Ninguno. Las categorías son las cuatro categorías preliminares de la lista de trabajo Intraoperatoria.

Setup step: Tier 3, step 19
Requires: Ninguno.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-intraop_critical_results - Diccionario de resultados críticos intraoperatorios]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Lista de entradas | Nombre, descripción, "Categorías: ... Términos: ...", etiqueta Inactivo | No aplicable | Cuatro entradas iniciales: Malignidad en la biopsia intraoperatoria (categoría Maligno); Margen positivo o cercano (términos); Atípico o sospechoso de malignidad (categoría Atípico / Sospechoso); Ganglio linfático positivo (términos). | No aplicable |
| Mostrar entradas inactivas | Interruptor | Opcional | | Desactivado |
| + Añadir entrada, Editar, Desactivar / Reactivar | Botones | No aplicable | La ventana se describe a continuación. Sin el permiso, la pantalla dice "Puede ver este diccionario, pero no modificarlo." | No aplicable |

#### Ventana Añadir resultado crítico y Editar resultado crítico

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | Mensaje "Póngale un nombre y al menos un término o una categoría." hasta que existan un nombre y una coincidencia. | En blanco |
| Descripción | Texto | Opcional | | En blanco |
| Términos | Texto, uno por línea o separados por comas | Obligatorio si no hay categoría | Se comparan como palabras completas, con independencia de mayúsculas y minúsculas. | En blanco |
| Categorías preliminares que coinciden | Casillas: Benigno, Maligno, Atípico / Sospechoso, Diferido | Obligatorio si no hay término | | Ninguna marcada |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:intraop-critical-results:manage` (riesgo alto, auditado; solo Admin, Lab Director no la tiene de forma predeterminada; se comprueba en el servicio).
**Límites conocidos.** Contrato: `docs/architecture/INTRAOP_CRITICAL_RESULTS_API.md`. Esta pantalla no figura en la tabla de sección a capacidad (`configSectionAccess.ts`), de modo que depende solo de la comprobación del servicio; la pantalla se abre en solo lectura para una persona sin el permiso.

### Terminales del quirófano {#screen-or_suite_terminals}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Terminales del quirófano

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Terminales del quirófano

**3. Finalidad y alcance.** Registra la pantalla mural o de mesa de cada sala de quirófano que muestra el Panel intraoperatorio. Cada terminal está vinculado a una Ubicación existente, de modo que dos centros pueden tener cada uno un "OR 1" sin que choquen los nombres. Un terminal se puede marcar como apto para la Vista general de varios quirófanos (para una enfermera responsable, un enlace del laboratorio o un circulante itinerante). El acceso se hace con un token de pantalla (véase más abajo), no con el inicio de sesión de una persona.

**4. Requisitos previos y dependencias.** Los centros y sus ubicaciones (la lista de salas) proceden del [Diccionario de centros](#screen-facility-dictionary) (las Ubicaciones de la ventana de edición del Centro). La lista de selección de Ubicación permanece vacía hasta que se elige un centro.

Setup step: Tier 3, step 20
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-or_suite_terminals - Lista de Terminales del quirófano]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Lista de terminales | Nombre, ubicación, "Apto para varios quirófanos", etiqueta Inactivo | No aplicable | | No aplicable |
| + Añadir terminal, Editar, Desactivar / Reactivar, Mostrar inactivos | Botones e interruptor | No aplicable | | Mostrar inactivos desactivado |
| Token de pantalla | Botón por terminal | No aplicable | Abre la ventana siguiente. | No aplicable |

#### Ventana Añadir terminal de quirófano y Editar terminal de quirófano

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Identidad del terminal / estación | Texto (ejemplo OR-Suite-04) | Obligatorio | | En blanco |
| Centro | Lista de selección | Obligatorio | Al seleccionarlo se cargan las ubicaciones de ese centro. | Ninguno |
| Ubicación (quirófano/sala) | Lista de selección de las ubicaciones del centro | Obligatorio | El terminal queda vinculado a esta Ubicación. | Ninguna |
| Puede ver la Vista general de varios quirófanos (enfermera responsable, enlace del laboratorio, circulante itinerante) | Casilla | Opcional | | Desactivado |

#### Ventana Token de pantalla (compartida con Perfiles de visualización)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Estado del token | Texto | No aplicable | "No se ha emitido ningún token. Esta pantalla no se puede iniciar.", "El token que termina en (pista) es válido hasta (fecha)", "El token caducó el (fecha)" o "El token se revocó el (fecha)". | No aplicable |
| Válido durante | Opción: 30, 90, 180, 365, 730 días | Obligatorio | Periodo de validez de un token nuevo. | 365 días |
| Emitir token / Emitir un token nuevo | Botón | No aplicable | Muestra el token nuevo una sola vez ("Nuevo token: cópielo ahora"; no se volverá a mostrar). Solo se guarda una huella. Emitir un token nuevo anula el anterior al instante. | No aplicable |
| Revocar | Botón | No aplicable | Deja la pantalla en blanco en el plazo de un minuto. Está desactivado cuando ya está revocado. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar y desactivar: `config:or-suite-terminals:manage`. Emitir o revocar un token: el mismo permiso (riesgo alto; Admin y Lab Director).
**Límites conocidos.** Contrato: `docs/architecture/DISPLAY_ACCESS_API.md` (llamadas de token). El Panel intraoperatorio que muestra el terminal es una pantalla de mesa de trabajo que queda fuera de la lista de este capítulo.

### Perfiles de visualización {#screen-display_profiles}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Perfiles de visualización

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Perfiles de visualización (título en pantalla: Perfiles de pantalla (paneles de operaciones del centro))

**3. Finalidad y alcance.** Un registro de las pantallas murales que muestran el Panel de operaciones del centro. Cada perfil vincula una pantalla a un laboratorio ejecutor y a una o más de cinco vistas de departamento, y puede alternar entre las vistas con un temporizador. El botón **Abrir el Panel de operaciones del centro** abre la página del panel. No se comprueba ni se exige ningún vínculo con un equipo físico: el campo del dispositivo es una nota. El acceso a una pantalla lo controla su Token de pantalla (véase la ventana descrita en [Terminales del quirófano](#screen-or_suite_terminals)).

**4. Requisitos previos y dependencias.** Los laboratorios ejecutores proceden del [Diccionario de centros](#screen-facility-dictionary).

Setup step: Tier 3, step 21
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-display_profiles - Lista de Perfiles de visualización con el botón Abrir el Panel de operaciones del centro]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Lista de perfiles | Nombre, laboratorio, vistas, intervalo | No aplicable | | No aplicable |
| Abrir el Panel de operaciones del centro | Botón | No aplicable | Abre `/facility-ops-dashboard`. | No aplicable |
| + Añadir perfil de pantalla, Editar, Desactivar / Reactivar, Mostrar inactivos | Botones e interruptor | No aplicable | | Mostrar inactivos desactivado |
| Token de pantalla | Botón por perfil | No aplicable | La ventana de token descrita en Terminales del quirófano. | No aplicable |

#### Ventana Añadir perfil de pantalla y Editar perfil de pantalla

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre de la pantalla | Texto (ejemplo "Histology Bench 3 - Wall Display") | Obligatorio | | En blanco |
| Laboratorio ejecutor | Lista de selección de laboratorios ejecutores activos | Obligatorio | | Ninguno |
| Vistas del panel asignadas | Casillas: Tallado y recepción; Inclusión y microtomía; Tinción e IHQ; Envíos y laboratorio de referencia; Firma diagnóstica / escáner | Obligatorio (al menos una) | Con más de una vista, el perfil las alterna. | Ninguna marcada |
| Intervalo del carrusel (segundos) | Número entero (ejemplo 20) | Opcional | Tiempo por vista cuando hay más de una asignada. | En blanco |
| Token del dispositivo / MAC / IP (opcional) | Texto | Opcional | Solo una nota del activo; el acceso lo controla el Token de pantalla. | En blanco |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, desactivar y emitir o revocar un token: `config:display-profiles:manage` (riesgo alto; Admin y Lab Director).
**Límites conocidos.** Contrato: `docs/architecture/INTRAOP_OPS_API.md` y `DISPLAY_ACCESS_API.md`. El registro son solo datos: PathScribe no verifica que una pantalla física corresponda a un perfil.

### Centro de configuración de calidad {#screen-qa_config_center}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Centro de configuración de calidad

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Centro de configuración de calidad

**3. Finalidad y alcance.** Define las actividades de garantía de calidad que realiza un laboratorio. Una actividad se basa en uno de dos arquetipos: **Revisión con resultado** (se revisa y se califica un caso, por ejemplo Correlación entre biopsia intraoperatoria y definitivo) o **Supervisión / asignación** (se supervisa a un profesional durante un número de casos o un periodo, por ejemplo FPPE). Las actividades **Estándar** las cura PathScribe para la jurisdicción del laboratorio; no se pueden desactivar ni convertir en personalizadas, y solo se pueden configurar su muestreo, su activador de CAPA y ajustes similares. Las actividades **Personalizadas** son propias del laboratorio; la vía más rápida es duplicar una actividad estándar o personalizada, porque sus campos de revisión vienen ya preparados. Nada abre una CAPA automáticamente: un activador solo la recomienda al responsable de calidad, que la confirma o la descarta.

Las actividades de revisión estándar incluyen: Correlación entre biopsia intraoperatoria y definitivo, Correlación citología-histología, Confirmación de hallazgo anormal o crítico, Segundo cribado de citología ginecológica, Revisión por pares quirúrgica posterior a la validación, Correlación quirúrgica entre biopsia y resección, Revisión por pares previa a la validación, Correlación clinicopatológica y Correlación de consulta externa. La lista que se muestra depende de la jurisdicción.

**4. Requisitos previos y dependencias.** El activador de CAPA nombra un tipo de deficiencia de [Deficiencias de la muestra](#screen-deficiencies). La mezcla de casos esperada usa [Subespecialidades](#screen-subspecialties).

Setup step: Tier 3, step 22
Requires: [Deficiencias de la muestra](#screen-deficiencies), [Subespecialidades](#screen-subspecialties)
Unlocks: [Configuración de TRT](#screen-tab-tat), [Política de tendencia de discordancias](#screen-qa_trend_policy)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-qa_config_center - Centro de configuración de calidad con las pestañas Estándar y Personalizada]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Pestañas Estándar, Personalizada | Pestañas | No aplicable | Estándar muestra solo las actividades que se aplican a la jurisdicción (en caso contrario, "No se aplica ninguna actividad estándar a (jurisdicción)"). | Estándar |
| Lista de actividades | Nombre, Arquetipo, Jurisdicciones ("Todas" o una lista), Muestreo %, Activador de CAPA, Estado, Acciones | No aplicable | Activador de CAPA se lee "(gravedades) a (deficiencia)" con "(solo después de la emisión)". | No aplicable |
| Configurar (estándar), Editar (personalizada), Duplicar, Desactivar / Reactivar | Botones de fila | No aplicable | Desactivar se rechaza en una actividad estándar. | No aplicable |
| + Añadir actividad personalizada | Botón y después un selector | No aplicable | Elija **Nueva actividad de revisión con resultado** o **Nueva actividad de supervisión/asignación**, o Cancelar. El selector recomienda duplicar en su lugar. | No aplicable |

#### Ventana Configurar, Editar y Duplicar

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | Solo lectura en una actividad estándar. Un duplicado empieza como "(nombre) (Copia)". | En blanco |
| Descripción | Texto | Opcional | Solo lectura en una actividad estándar. | En blanco |
| Campos de revisión | Editor de campos (arquetipo de revisión) | Obligatorio (al menos un campo) | Solo lectura en una actividad estándar y en un duplicado ("de Duplicar: solo lectura aquí"). Cada campo tiene una etiqueta, un tipo (Texto corto, Texto largo, Número, Selección única, Selección múltiple, Lista desplegable), una indicación, Obligatorio y opciones para un tipo de selección; los campos se pueden subir y bajar. Un campo guardado se puede renombrar o hacer opcional, pero no quitar ni cambiar de tipo, y una opción guardada no se puede quitar: las revisiones pasadas conservan sus respuestas. Se pueden añadir campos nuevos en cualquier momento. | Un único campo Notas |
| Recoger comentarios de docencia e incorporación | Casilla (arquetipo de revisión) | Opcional | Desactivada en una actividad estándar. | Desactivado |
| Porcentaje de muestreo | Número de 0 a 100 (arquetipo de revisión) | Opcional | Fracción de los casos aptos que se selecciona al azar. En blanco significa que no hay muestreo automático. | En blanco |
| Activador de CAPA: recomendar una CAPA cuando | Casillas: baja, media, alta (gravedad de la discordancia) | Opcional | La gravedad de la discordancia se registra siempre; esto solo decide si se recomienda una CAPA. | Ninguna |
| Activador de CAPA: Tipo de deficiencia | Lista de selección de Deficiencias de la muestra, o "Ningún tipo de deficiencia seleccionado" | Opcional | La deficiencia que nombra la recomendación. | Ninguno |
| Solo para revisiones posteriores a la liberación del informe | Casilla | Opcional | | Desactivado |
| Mezcla de casos esperada (opcional) | Recuentos mínimos por subespecialidad (arquetipo de supervisión) | Opcional | "+ Añadir objetivo de subespecialidad..." añade una fila con **Recuento mínimo** y **Eliminar**. Vacío muestra solo la cobertura real, sin ninguna expectativa. | Vacío |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |
| Añadir / Crear duplicado / Guardar cambios, Cancelar | Botones | No aplicable | | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:qa-types:manage` (riesgo alto; Admin y Lab Director; el bloqueo de las actividades estándar también se aplica en el servicio).
**Límites conocidos.** Contrato: `docs/architecture/QUALITY_API.md`.

### Política de tendencia de discordancias {#screen-qa_trend_policy}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Política de tendencia de discordancias

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Política de tendencia de discordancias (título en pantalla: Política de tendencias de discordancia)

**3. Finalidad y alcance.** Decide cuándo se señalan al Lab Director las discordancias mayores repetidas, ya sea para el trabajo revisado de un patólogo o para un tipo de muestra, con independencia de quién la leyó. Un patrón es una recomendación: nunca abre una CAPA. La política de la organización se aplica a todos los laboratorios ejecutores que no tienen la suya; las revisiones se juzgan con la política del laboratorio que realizó el caso.

**4. Requisitos previos y dependencias.** Las revisiones proceden de las actividades de calidad del [Centro de configuración de calidad](#screen-qa_config_center). Las políticas de laboratorio usan los laboratorios ejecutores del [Diccionario de centros](#screen-facility-dictionary).

Setup step: Tier 3, step 23
Requires: [Centro de configuración de calidad](#screen-qa_config_center), [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-qa_trend_policy - Política de tendencias de discordancia con la política de la organización y las políticas de los laboratorios ejecutores]

**6. Referencia de campos.** Los mismos campos están en el bloque de la organización y en cada laboratorio ejecutor que tiene marcado "(laboratorio) tiene su propia política".

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Vigilar el trabajo revisado de cada patólogo | Casilla | Opcional | | Activado |
| Vigilar cada tipo de muestra (una señal de proceso) | Casilla | Opcional | | Activado |
| Ventana (meses) | Número entero de 1 a 36 | Obligatorio | Hasta cuándo hacia atrás se cuentan las revisiones. | 3 |
| Mínimo de revisiones en la ventana | Número entero, al menos 1 | Obligatorio | Por debajo de esta cifra no se juzga nada; protege al personal de poco volumen y de jornada parcial. | 20 |
| Gravedades que cuentan como mayores | Casillas: baja, media, alta | Obligatorio (al menos una) | La gravedad que el revisor asigna a una revisión discordante. | alta |
| Discordancias mayores que activan | Número entero | Obligatorio | 0 desactiva esta prueba. | 3 |
| Tasa de discordancias mayores que activa (%) | Número de 0 a 100 | Obligatorio | Sobre las revisiones de la ventana. 0 desactiva esta prueba. Con ambas pruebas en 0, la política se rechaza ("Establezca un recuento o una tasa"). | 10 |
| Cuando se supera un umbral | Opción: Pedir una decisión al director del laboratorio, Anotarlo solo en la lista de tendencias | Obligatorio | Ninguna de las dos opciones abre una CAPA. | Pedir una decisión al director del laboratorio |
| (Laboratorio) tiene su propia política | Casilla por laboratorio ejecutor | Opcional | Al marcarla se muestran los mismos campos para ese laboratorio. | Desactivado |
| Guardar política | Botón | No aplicable | Muestra "Guardado" o el motivo por el que no se guardó. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:qa-trend-policy:manage` (riesgo alto; Admin y Lab Director).
**Límites conocidos.** Contrato: `docs/architecture/QUALITY_SETTINGS_API.md`.

### Configuración de TRT (pestaña) {#screen-tab-tat}
Breadcrumb: Inicio > Configuración > Configuración de TRT

**Estado:** Construido

**1. Navegación:** pestaña **Configuración de TRT** de Configuración (se abre para quienes tienen `config:tat-targets:manage`; la pestaña está protegida por una barrera de sección).
**2. Elemento de mantenimiento:** Configuración de TRT (título en pantalla: Configuración de plazos de respuesta)

**3. Finalidad y alcance.** Establece los objetivos de tiempo de respuesta por tipo, urgencia, centro, muestra y subespecialidad. Cuando se mide un caso, prevalece la regla coincidente más específica. Un caso recurre a un valor predeterminado integrado del sistema cuando no coincide ninguna regla personalizada. Los objetivos determinan las marcas de a tiempo y de retraso en la Búsqueda, los paneles de calidad y el tablero intraoperatorio (tiempo de aviso de la biopsia intraoperatoria).

**Orden de resolución (de lo más específico a lo menos):** Centro + Muestra + Urgencia; Centro + Muestra; Centro + Subespecialidad + Urgencia; Centro + Subespecialidad; Solo Centro; Solo Muestra; Valor predeterminado del sistema (alternativa). Un **Simulador de resolución** muestra qué regla prevalece para un caso dado.

**4. Requisitos previos y dependencias.** Los selectores de ámbito proceden del [Diccionario de centros](#screen-facility-dictionary), el [Diccionario de muestras](#screen-specimens) y las [Subespecialidades](#screen-subspecialties). Las actividades de calidad aparecen como tipos de TRT adicionales una vez que existen en el [Centro de configuración de calidad](#screen-qa_config_center).

Setup step: Tier 3, step 24
Requires: [Diccionario de centros](#screen-facility-dictionary), [Diccionario de muestras](#screen-specimens), [Subespecialidades](#screen-subspecialties), [Centro de configuración de calidad](#screen-qa_config_center)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: tab-tat - Lista de Configuración de TRT con filtros, jerarquía y simulador]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Lista de reglas | Tabla: Tipo, Objetivo, Urgencia, Ámbito, Notas, Estado, Acciones | No aplicable | Reglas agrupadas como "Empresa (n)" y por laboratorio ejecutor. Una fila muestra el objetivo, la urgencia (URGENTE, Rutina, Cualquiera), el ámbito, "avisar a N min" para la biopsia intraoperatoria y "Rol: ..." para los tipos de consulta. | No aplicable |
| Filtro de tipo | Lista de selección: Todos los tipos, cada tipo de TRT, cada actividad de calidad | Opcional | | Todos los tipos |
| Filtrar por laboratorio ejecutor, Filtrar por centro solicitante | Listas de selección | Opcional | | Todos |
| Mostrar inactivos | Interruptor | Opcional | | Desactivado |
| + Añadir regla, Editar, Duplicar, Eliminar | Botones | No aplicable | **Eliminar** se rechaza en un valor predeterminado del sistema; desactívelo en su lugar. **Duplicar** inicia una regla nueva a partir de una existente. | No aplicable |
| Simulador | Botón y panel | No aplicable | Véase la tabla del simulador más abajo. | No aplicable |

#### Ventana Añadir regla de plazo de respuesta y Editar regla de plazo de respuesta

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Tipo de plazo | Lista de selección en dos grupos. Flujo de trabajo clínico: Primer contacto, Caso completo, Biopsia intraoperatoria, Isquemia fría, Tallado, Validación, Consulta (mi respuesta), Consulta (a la espera de respuesta), Plazo de diagnóstico anatómico preliminar de autopsia, Plazo de diagnóstico anatómico definitivo de autopsia. Actividades de calidad: cada actividad del Centro de configuración de calidad | Obligatorio | Error "El tipo de plazo es obligatorio". | Primer contacto |
| Horas objetivo | Número, incremento 0,25, al menos 0,1 | Obligatorio | Error "Las horas objetivo deben ser mayores que 0". Muestra "= (formateado)". | Ninguno |
| Avisar cuando queden estos minutos | Número entero de minutos | Opcional | Solo Biopsia intraoperatoria. El tablero Intraoperatorio se pone ámbar en este punto. Debe ser mayor que 0 y menor que el objetivo. | 5 |
| Urgencia | Opción: Cualquiera (rutina + URGENTE), Solo rutina, Solo URGENTE | Opcional | | Cualquiera |
| Se aplica a: Laboratorio ejecutor | Lista de selección o "Todos los laboratorios ejecutores" | Opcional | | Todos |
| Se aplica a: Centro solicitante | Lista de selección o "Todos los centros solicitantes" | Opcional | | Todos |
| Se aplica a: Tipo de muestra | Lista de selección o "Todos los tipos de muestra" | Opcional | | Todos |
| Se aplica a: Subespecialidad | Lista de selección o "Todas las subespecialidades" | Opcional | | Todas |
| Se aplica a: Rol | Opción: Todos los roles, Residente, Fellow, Patólogo, Externo | Opcional | Lo usan los tipos de consulta. | Todos |
| Notas del administrador | Texto | Opcional | No afecta a la coincidencia. | En blanco |
| Estado | Activo / Inactivo | Opcional | Se rechaza una regla activa con la misma combinación de tipo y urgencia ("Ya existe una regla activa para esta combinación"). | Activo |
| Añadir regla / Guardar cambios, Cancelar | Botones | No aplicable | Una línea en directo indica a qué se aplica la regla, o "Es un valor predeterminado del sistema: se aplica a todos los casos". | No aplicable |

#### Simulador de resolución

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Laboratorio ejecutor, Centro solicitante, Muestra, Subespecialidad | Listas de selección ("Ninguno en concreto ...") | Opcional | El caso que se prueba. | Ninguno |
| Urgencia | Opción | Opcional | | Rutina |
| Resultado por tipo | Insignia para cada tipo, la regla ganadora, "valor predeterminado del sistema" o "regla personalizada", o "Ninguna regla coincidente" | No aplicable | | No aplicable |

Los valores integrados predeterminados (ids que empiezan por `sys-`, en horas): Primer contacto 4 rutina, 1 URGENTE; Caso completo 24 rutina, 4 URGENTE; Biopsia intraoperatoria 0,5 rutina, 0,33 URGENTE; Isquemia fría 1; Tallado 4 rutina, 2 URGENTE; Validación 4 rutina, 2 URGENTE; Respuesta de consulta y a la espera 24 (Residente), 48 (Patólogo), 120 (Externo). Se pueden editar y desactivar, pero no eliminar. Al desactivar uno se quita del orden de resolución, así que compruebe que una regla personalizada cubre el hueco.

**7. Permisos.** Abrir la pestaña: `config:tat-targets:manage` mediante la barrera de sección (riesgo alto; Admin y Lab Director).
**Límites conocidos.** Contrato: `docs/architecture/TAT_AND_DELEGATION_API.md`. El servidor de la API también siembra la lista integrada.
### Objetivos de rendimiento {#screen-performance_targets}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Objetivos de rendimiento

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Objetivos de rendimiento (título en pantalla: Objetivos de rendimiento)

**3. Finalidad y alcance.** Las cifras con las que se mide a cada patólogo. Un cambio se guarda al instante. El panel de Productividad mide los casos y los RVU frente a estos objetivos; allí solo se muestran los objetivos de casos mensuales y de RVU mensuales, y los demás se conservan para los informes.

**4. Requisitos previos y dependencias.** Ninguno.

Setup step: Tier 3, step 25
Requires: Ninguno.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-performance_targets - Tabla de objetivos de rendimiento con el formulario para añadir]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Objetivo (nombre) | Texto | Obligatorio al añadir | Error "Póngale un nombre al objetivo." Las filas integradas llevan una insignia "Integrado". | No aplicable |
| Valor | Número mayor que cero | Obligatorio | Error "Introduzca un valor mayor que cero." Se rechaza un porcentaje superior a 100. | Véase más abajo |
| Unidad | Opción: Casos, RVU, Porcentaje, Horas | Obligatorio | | Véase más abajo |
| Periodo | Opción: Diario, Semanal, Mensual, Trimestral, Anual | Obligatorio | | Véase más abajo |
| Quitar | Botón por fila | No aplicable | Los objetivos integrados no se pueden quitar. | No aplicable |
| Añadir un objetivo: Nombre del objetivo, Valor, unidad, periodo, Añadir objetivo | Formulario | Obligatorio | Error "Ya existe un objetivo con ese nombre." | En blanco |

Las cinco filas iniciales: Casos al mes 120 casos mensuales (integrado); TRT rutinario 48 horas mensuales (integrado); TRT URGENTE 4 horas mensuales (integrado); Tasa de validación con control de calidad 98 por ciento trimestral (integrado); RVU mensuales 350 RVU mensuales (no integrado).

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:tat-targets:manage` (el mismo permiso que la pestaña de TRT; riesgo alto; Admin y Lab Director).
**Límites conocidos.** Contrato: `docs/architecture/CONFIG_DICTIONARIES_API.md`. Las filas "TRT rutinario" y "TRT URGENTE" de aquí son independientes de las reglas de tiempo de respuesta por caso de la pestaña [Configuración de TRT](#screen-tab-tat); el producto no las vincula.

### Reglas de control de calidad de citología {#screen-cytology_qc_rules}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Reglas de control de calidad de citología

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Reglas de control de calidad de citología (título en pantalla: Reglas de asignación de control de calidad de citología)

**3. Finalidad y alcance.** Las reglas automáticas que muestrean, asignan y encaminan los casos de citología para la revisión por pares de control de calidad. Una regla indica qué casos abarca (criterios), cuántos de ellos se seleccionan (lógica de muestreo), cuán urgente es la revisión (nivel de prioridad y plazo de resolución) y quién puede revisar. Las reglas se evalúan desde la Prioridad de evaluación más alta hacia abajo. Las reglas no se pueden eliminar; se desactivan. El trabajo resultante es la [Cola de control de calidad de citología](#screen-cytology-qc-queue).

Los datos de demostración contienen reglas con nombre para EE. UU. (nuevo cribado de Papanicolaou dirigido de alto riesgo de CLIA, 100 por ciento), el Reino Unido (nuevo cribado rápido de NHS / RCPath, 20 por ciento), la UE (revisión por pares de patólogos según ISO 15189, 2 por ciento) y un nuevo cribado aleatorio de las validaciones negativas del citotécnico (10 por ciento).

**4. Requisitos previos y dependencias.** No se exige ninguno. El criterio del centro que realiza la prueba se escribe como una lista de identificadores de centro (no es una lista de selección), así que tome los identificadores del [Diccionario de centros](#screen-facility-dictionary). Las tasas de selección aleatoria de [Tasas de selección aleatoria del control de calidad de citología](#screen-cytology_qc_settings) son independientes de estas reglas.

Setup step: Tier 3, step 26
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Cola de control de calidad de citología](#screen-cytology-qc-queue)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-cytology_qc_rules - Lista de Reglas de asignación de control de calidad de citología]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Lista de reglas | Nombre, "Prioridad N", nivel de prioridad, etiqueta Inactiva | No aplicable | | No aplicable |
| + Añadir regla, Editar, Duplicar, Desactivar / Reactivar, Mostrar inactivos | Botones e interruptor | No aplicable | **Duplicar** da a la copia el nombre "(nombre) (Copia)". | Mostrar inactivos desactivado |

#### Ventana Añadir regla de control de calidad y Editar regla de control de calidad

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre de la regla | Texto | Obligatorio | | En blanco |
| Descripción | Texto | Opcional | | En blanco |
| Prioridad de evaluación (la más alta se evalúa primero) | Número entero | Obligatorio | | 50 |
| Plazo de resolución (horas) | Número | Obligatorio | El tiempo permitido para completar la revisión. | 24 |
| Nivel de prioridad de revisión por pares | Opción: Prioridad 1 — Escalado alto, Prioridad 2 — Dirigido de alta consecuencia, Prioridad 3 — Aleatorio rutinario | Obligatorio | | Prioridad 3 — Aleatorio rutinario |
| Activo | Casilla | Opcional | | Activado |
| Lógica de muestreo | Opción: Porcentaje, Intervalo (cada N.º caso), Volumen fijo (primeros N casos) | Obligatorio | Un cuadro numérico sigue a la opción: Tasa %, Cada N.º caso, Primeros N casos. | Porcentaje, 10 por ciento |
| Jurisdicciones | Casillas de países | Opcional | Deje todas sin marcar para aplicar la regla en todas las jurisdicciones. | Ninguna marcada |
| Identificadores de los centros que realizan la prueba | Texto separado por comas | Opcional | | En blanco |
| Función del profesional | Casillas: Patólogo, Citotécnico | Opcional | Se aplica a los casos leídos por esa función. | Ninguna marcada |
| Situación de incorporación | Casillas: Nuevo ingreso, En periodo de prueba | Opcional | Se aplica al personal en periodo de incorporación. | Ninguna marcada |
| Funciones de revisor admitidas | Texto separado por comas | Opcional | Quién puede recibir la asignación de la revisión. | En blanco |
| Categoría de muestra | Casillas: Citología cervicovaginal (Papanicolaou), Líquido no ginecológico, Punción-aspiración con aguja fina (PAAF) | Opcional | | Ninguna marcada |
| Adecuación | Casillas: Satisfactoria, Insatisfactoria, Limitada | Opcional | | Ninguna marcada |
| Filtro de resultado | Opción: Cualquier resultado, Solo negativos, Solo no negativos | Opcional | | Cualquier resultado |
| Indicadores de alto riesgo | Texto separado por comas | Opcional | | En blanco |
| Clasificaciones Bethesda | Texto separado por comas | Opcional | | En blanco |
| Códigos de concepto SNOMED | Texto separado por comas | Opcional | | En blanco |
| Guardar, Cancelar | Botones | No aplicable | | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:cytology-qc-rules:manage` (riesgo alto; Admin y Lab Director).
**Límites conocidos.** Contrato: `docs/architecture/CYTOLOGY_QC_API.md`.

### Tasas de selección aleatoria del control de calidad de citología {#screen-cytology_qc_settings}
Breadcrumb: Inicio > Configuración > Citología > Tasa de selección aleatoria de control de calidad

**Estado:** Construido

**1. Navegación:** pestaña **Citología** de Configuración > **Tasa de selección aleatoria de control de calidad**
**2. Elemento de mantenimiento:** Tasa de selección aleatoria de control de calidad (título en pantalla: Tasas de selección aleatoria del control de calidad de citología)

**3. Finalidad y alcance.** Dos tasas independientes: el porcentaje de resultados ginecológicos Negativos y el porcentaje de resultados ginecológicos No negativos que se seleccionan al azar para el grupo de control de calidad. Hay un valor predeterminado de la empresa y excepciones opcionales por centro y por miembro del personal. Una excepción de personal prevalece sobre una excepción de centro, que prevalece sobre el valor predeterminado de la empresa. Use una excepción de personal para una tasa más alta con un empleado nuevo o un estudiante.

**4. Requisitos previos y dependencias.** Centros ([Diccionario de centros](#screen-facility-dictionary)) y personal ([Miembros del personal](#screen-staff-members)) para las excepciones.

Setup step: Tier 3, step 27
Requires: [Diccionario de centros](#screen-facility-dictionary), [Miembros del personal](#screen-staff-members)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_qc_settings - Tasas de selección aleatoria de control de calidad con excepciones de centro y de personal]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Valor predeterminado de la empresa: Negativo | Número de 0 a 100 (porcentaje) | Obligatorio | | 10 |
| Valor predeterminado de la empresa: No negativo | Número de 0 a 100 (porcentaje) | Obligatorio | | 10 |
| Guardar | Botón | No aplicable | Muestra "Cambio sin guardar" hasta que se guarda. | No aplicable |
| Excepciones de centro: + Añadir excepción | Lista de selección de centros; tasas de Negativo y No negativo; Guardar, Cancelar, Eliminar | Opcional | Una excepción puede dejar una tasa en blanco para heredarla ("(valor) % (heredado)"). La lista se lee "Neg x, No neg y". | Ninguna ("No hay excepciones de centro") |
| Excepciones de miembros del personal: + Añadir excepción | Lista de selección de miembros del personal; tasas de Negativo y No negativo; Guardar, Cancelar, Eliminar | Opcional | Prevalece sobre cualquier excepción de centro. | Ninguna ("No hay excepciones de personal") |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:cytology-qc-rates:manage` (riesgo alto; Admin y Lab Director).
**Límites conocidos.** Contrato: `docs/architecture/CYTOLOGY_API.md` (`ICytologyQcSettingsService`).

### Límite diario de carga de trabajo de citología {#screen-cytology_workload_cap}
Breadcrumb: Inicio > Configuración > Citología > Límite diario de carga de trabajo

**Estado:** Construido

**1. Navegación:** pestaña **Citología** de Configuración > **Límite diario de carga de trabajo**
**2. Elemento de mantenimiento:** Límite diario de carga de trabajo (título en pantalla: Límite diario de carga de trabajo de citología)

**3. Finalidad y alcance.** El número máximo de preparaciones de citología ginecológica que un citotécnico puede cribar en un día (el límite de carga de trabajo de CLIA), con los mismos tres niveles que las tasas de control de calidad: valor predeterminado de la empresa, excepciones de centro y excepciones de miembros del personal (el personal prevalece sobre el centro). También establece la hora a la que empieza el día de cribado, para el cierre de horas de fin de día y el informe de carga de trabajo. El propio límite se comprueba sobre 24 horas consecutivas y no usa el inicio del día.

**4. Requisitos previos y dependencias.** Centros y personal para las excepciones. La zona horaria del laboratorio se establece en los ajustes del Sistema (fuera de este capítulo).

Setup step: Tier 3, step 28
Requires: [Diccionario de centros](#screen-facility-dictionary), [Miembros del personal](#screen-staff-members)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_workload_cap - Límite diario de carga de trabajo con el inicio del día y las excepciones]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Valor predeterminado de la empresa (preparaciones / día) | Número entero de 1 a 100 | Obligatorio | Error "El límite debe ser un número entero de preparaciones de 1 a 100." | 100 |
| Guardar | Botón | No aplicable | Muestra "Cambio sin guardar". | No aplicable |
| El día de cribado empieza a las | Lista de selección de horas | Obligatorio | Medianoche de forma predeterminada; las 6:00 mantienen en una misma fecha un turno de noche de 22:00 a 6:00. Un cambio se aplica desde ese momento; los días anteriores conservan la hora de inicio vigente entonces. Error "No tiene permiso para cambiar esto." | Medianoche |
| Excepciones de centro: + Añadir excepción | Lista de selección de centros, Límite diario (de 1 a 100); Guardar, Cancelar, Eliminar | Opcional | Cuando todos los centros ya tienen una: "Todos los centros ya tienen una excepción. Elimine una para volver a establecerla." | Ninguna |
| Excepciones de miembros del personal: + Añadir excepción | Lista de selección de miembros del personal, Límite diario (de 1 a 100); Guardar, Cancelar, Eliminar | Opcional | Use un límite más bajo para un empleado nuevo o un estudiante. | Ninguna |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:cytology-workload-cap:manage` (riesgo alto; Admin y Lab Director).
**Límites conocidos.** Contrato: `docs/architecture/CYTOLOGY_API.md` (`ICytologyWorkloadCapSettingsService`).

### Ajustes de contribución {#screen-contribution_settings}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Panel de contribución

**Estado:** Parcial

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Panel de contribución (título en pantalla: Ajustes del panel de contribución)

**3. Finalidad y alcance.** Controla lo que los patólogos ven en su propia página **Mi contribución** y en qué zona horaria se agrupan las métricas mensuales y del año en curso (recuentos de casos y RVU). Los administradores, los administradores patólogos y los superadministradores ven siempre los datos de comparación con compañeros y con la institución; el interruptor de compañeros solo restringe la vista que tiene el patólogo corriente de sí mismo frente a los demás. El almacenamiento es siempre en UTC; la zona horaria solo decide cómo se asigna a un día o a un mes un caso validado (una validación a las 23:00 cuenta para ese mismo día).

**4. Requisitos previos y dependencias.** Ninguno.

Setup step: Tier 3, step 29
Requires: Ninguno.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-contribution_settings - Ajustes del panel de contribución con la zona horaria y la comparación con compañeros]

**6. Referencia de campos.** Cada cambio se guarda al instante y muestra "Guardado".

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Zona horaria del centro | Lista de selección: Hora del este (EE. UU.), Hora central (EE. UU.), Hora de las Montañas Rocosas (EE. UU.), Hora de Arizona (EE. UU., sin horario de verano), Hora del Pacífico (EE. UU.), Hora de Alaska (EE. UU.), Hora de Hawái (EE. UU., sin horario de verano), Hora del Reino Unido, UTC | Obligatorio | Una lista de nueve; no se pueden elegir otras zonas. | Hora de Arizona (EE. UU., sin horario de verano) |
| Mostrar a los anatomopatólogos las medias de compañeros y las comparaciones con los mejores resultados | Casilla ("Visibilidad de la comparación entre compañeros") | Opcional | Desactivado: los patólogos ven solo sus propios recuentos de casos y su progreso hacia los objetivos de la institución. Activado: también se muestran cifras anonimizadas de la media de compañeros y de los mejores resultados. | Desactivado |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:contribution-settings:manage` (riesgo alto; Admin y Lab Director; se comprueba al guardar el cambio).
**Límites conocidos.** Parcial: los valores los conserva el almacén de configuración del sistema de la aplicación, que hoy escribe en el almacenamiento del navegador. El almacenamiento en el servidor, para que todos los puestos de trabajo vean los mismos ajustes, está previsto (PS-345, `systemConfigStore.ts`) y el contrato de servidor de la configuración del sistema existe en `docs/architecture/DICTIONARIES_CONFIG_API.md`. Hasta entonces, un ajuste hecho en un equipo no se ve en otro. El seguimiento de los RVU por caso más allá de este interruptor no está construido (a la espera de revisión jurídica y de cumplimiento).

### Comentarios {#screen-feedback}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Comentarios

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Comentarios

**3. Finalidad y alcance.** El botón de comentarios de control de calidad permite a los probadores notificar un problema desde cualquier pantalla, con una captura de pantalla y sin datos del paciente. Esta pantalla elige cuándo se muestra el botón y quién recibe los informes. De forma predeterminada, el botón está oculto en una instancia de producción y visible en una instancia de validación.

**4. Requisitos previos y dependencias.** Ninguno.

Setup step: Tier 3, step 30
Requires: Ninguno.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-feedback - Ajustes de Comentarios con los tres modos y las listas de destinatarios]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Botón de comentarios de control de calidad | Opción (botones de radio): Predeterminado de esta instancia, Siempre visible, Siempre oculto | Obligatorio | Una línea indica si es una instancia de producción o de validación y cuál es el valor predeterminado. Error "Elija cuándo se muestra el botón." | Predeterminado de esta instancia |
| Destinatarios de control de calidad | Direcciones de correo electrónico separadas por comas | Obligatorio siempre que se muestre el botón | Error "Añada al menos un destinatario: el botón se muestra en esta instancia y los comentarios no tendrían adónde ir." Una dirección no válida se rechaza. | En blanco |
| Copia al administrador (cc) | Direcciones de correo electrónico separadas por comas | Opcional | | En blanco |
| Guardar | Botón | No aplicable | Muestra "Guardado" o el motivo. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:feedback:manage` (riesgo alto; Admin y Lab Director; el botón Guardar depende del permiso).
**Límites conocidos.** Contrato: `docs/architecture/CONFIG_DICTIONARIES_API.md`.

### Canal de investigación {#screen-research_feed}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Canal de investigación

**Estado:** Construido

**1. Navegación:** pestaña **Sistema** de Configuración > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Canal de investigación

**3. Finalidad y alcance.** El titular de la bibliografía en el panel de Inicio. Los artículos proceden directamente de NCBI PubMed, ordenados por fecha de publicación. Es un canal automatizado, no una selección curada ni revisada, y nunca debe presentarse a los clínicos como una guía. El navegador de la persona obtiene el canal directamente de NCBI; un canal que falla no muestra nada y nunca detiene el panel.

**4. Requisitos previos y dependencias.** El navegador del puesto de trabajo debe poder llegar a NCBI.

Setup step: Tier 3, step 31
Requires: Ninguno.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-research_feed - Ajustes del Canal de investigación con el estado de la recuperación]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Última recuperación correcta; Último intento | Visualización | No aplicable | Muestra "Nunca" antes del primer éxito. | No aplicable |
| Mostrar la fuente en el panel | Casilla | Opcional | | Activado |
| Consulta de búsqueda | Texto (sintaxis de PubMed) | Obligatorio | Error "La consulta de búsqueda no puede estar vacía." Las exclusiones de publicaciones retiradas, preimpresiones, editoriales, comentarios y cartas son el único filtro de calidad del canal; quitarlas puede hacer aparecer un artículo retirado. | digital pathology OR synoptic reporting, inglés, excluyendo retiradas, preimpresiones, editoriales, comentarios y cartas |
| URL del artículo | Dirección https con `{PMID}` | Obligatorio | Debe contener `{PMID}` y ser https en un host aprobado (nih.gov, nlm.nih.gov, doi.org). | https://pubmed.ncbi.nlm.nih.gov/{PMID}/ |
| Punto de conexión de la API | Dirección https | Obligatorio | URL base de NCBI eUtils, sin barra final, solo host aprobado. Cámbiela solo si NCBI traslada el servicio. | https://eutils.ncbi.nlm.nih.gov/entrez/eutils |
| Restaurar valores predeterminados, Guardar | Botones | No aplicable | Tras guardar: "Los artículos en caché existentes se actualizan en un plazo de 24 horas." | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:research-feed:manage` (riesgo alto; Admin y Lab Director).
**Límites conocidos.** Contrato: `docs/architecture/REFERRAL_RESEARCH_API.md` (los ajustes). La obtención de los artículos es una llamada del navegador a NCBI, sin ningún servidor de PathScribe de por medio.

## Páginas de uso diario que controlan estos ajustes {#ch4-reference-pages}
Breadcrumb: Inicio

Estas cinco páginas son páginas de mesa de trabajo o de colas, no pantallas de mantenimiento. Se describen para que un administrador sepa qué muestra cada una, quién puede abrirla y qué ajuste la cambia. Ninguna forma parte de la configuración.

### Inicio {#screen-home}
Breadcrumb: Inicio

**Estado:** Construido

**1. Navegación:** La página que se muestra tras iniciar sesión (`/`).
**2. Elemento de mantenimiento:** No aplicable. Es una página de inicio.

**3. Finalidad y alcance.** Un conjunto de mosaicos, uno por cada lugar al que puede ir la persona que ha iniciado sesión. Un mosaico solo se muestra cuando al menos una de las pantallas a las que lleva está concedida a uno de los roles de la persona. Una persona sin ninguna pantalla ve "Ninguno de sus roles le da acceso todavía a una pantalla. Pida a su administrador que le asigne una." Un pie de página muestra la línea de derechos de autor y el estado real del sistema: un punto de color con "Comprobando", y después "Operativo", "Degradado" o "No disponible", o "Estado no disponible" cuando falla la propia comprobación. El estado procede de la comprobación de salud del servidor de API (`GET /api/health/health-status/check`), que se hace al abrir el inicio y de nuevo cuando la pestaña vuelve a ser visible pasados cinco minutos (nunca con un temporizador). Informa de cuatro componentes fijos (base de datos, mensajería, colas, motor de interfaces) sin datos de pacientes, y el servidor decide el estado global. En la demostración no hay servidor, por lo que el estado se marca como simulado. El pie de página no hace ninguna declaración de cumplimiento.

**4. Requisitos previos y dependencias.** El acceso lo establecen el rol y la capacidad configurados en el Capítulo 2 (roles del personal) y las semillas de capacidades. No hay ningún ajuste de mosaicos propio.

Setup step: Reference, not part of setup
Requires: [Roles del personal](#screen-staff-roles)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-home - Inicio con los mosaicos de un rol]

**6. Columnas, filtros y botones.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Le damos de nuevo la bienvenida, (nombre) | Texto | No aplicable | | No aplicable |
| Acceso | Mosaico | No aplicable | Abre Acceso. Requiere `screen:accession:open` (PA, Accessioner). | No aplicable |
| Lista de trabajo | Mosaico | No aplicable | Abre la Lista de trabajo y las vistas de control de calidad de citología y de garantía de calidad quirúrgica. Se muestra si se tiene alguna de `screen:worklist:open`, `screen:cytology-qc-queue:open`, `screen:surgical-qa-worklist:open`. | No aplicable |
| Búsqueda | Mosaico | No aplicable | `screen:search:open`. | No aplicable |
| Cola intraoperatoria | Mosaico | No aplicable | `screen:intraop-queue:open` (Pathologist, Fellow, Resident, PA). | No aplicable |
| Entrega en Lockbox | Mosaico | No aplicable | `screen:lockbox-drop-off:open` (Accessioner, Admin). | No aplicable |
| Mi contribución | Mosaico | No aplicable | `screen:my-contributions:open` (Pathologist, Fellow, Resident, PA, Lab Director). | No aplicable |
| Contribuciones del banco de trabajo | Mosaico | No aplicable | `screen:bench-contributions:open` (Accessioner y los roles de técnico). | No aplicable |
| Espacio de trabajo de Anatomía Patológica | Mosaico de centro de trabajo | No aplicable | Lleva a Espacio de trabajo de citología, Microtomía, Inclusión, Distribución de portaobjetos, Molecular, Gestión de lotes y Revisión de excepciones de márgenes. Se muestra si se concede alguna. | No aplicable |
| Calidad y cumplimiento | Mosaico de centro de trabajo | No aplicable | Lleva a Registro de auditoría, Garantía de calidad, Excepciones de registros, Paneles de autopsias y la Cola de salida. Una insignia muestra cuántos envíos a registros necesitan intervención de una persona. | No aplicable |
| Comité de Tumores / MDT | Mosaico | No aplicable | `screen:tumor-board:open` (Pathologist, Fellow, Resident, PA). | No aplicable |
| Configuración | Mosaico | No aplicable | `screen:configuration:open` (Admin, Template Author, Template Approver, Lab Director). | No aplicable |

**7. Permisos.** Cada mosaico tiene la capacidad de pantalla indicada arriba; no hay ninguna capacidad para Inicio en sí. Cualquier persona que ha iniciado sesión llega a Inicio.
**Límites conocidos.** Los Pedidos adicionales y las vistas de garantía de calidad posteriores a la validación no son mosaicos: son una acción sobre un caso y vistas dentro de la Lista de trabajo. Los paneles de operaciones del centro no están en Inicio.
### Entrega en Lockbox {#screen-lockbox-drop-off}
Breadcrumb: Inicio > Entrega en Lockbox

**Estado:** Construido

**1. Navegación:** Inicio > **Entrega en Lockbox** (`/lockbox-drop-off`).
**2. Elemento de mantenimiento:** No aplicable. Es una pantalla de mesa de trabajo.

**3. Finalidad y alcance.** Un quiosco para las muestras que se dejan en el lockbox fuera de horario. La persona escanea cada contenedor; PathScribe escribe un resguardo inmutable de "Recibido en Lockbox", con un marcador provisional cuando no coincide ningún pedido. El equipo de la mañana trabaja desde la **Carpeta nocturna** hasta que todos los resguardos están registrados. Tiene dos pestañas: **Entrega** y **Carpeta nocturna**.

**4. Requisitos previos y dependencias.** Las listas de clientes solicitantes y de médicos del formulario de marcador provisional proceden de [Clientes](#screen-clients) y [Médicos](#screen-physicians). Un código de barras coincide con un pedido cuando existe un pedido con él; sin pedido, se conserva un marcador provisional y no se genera ningún número de acceso.

Setup step: Reference, not part of setup
Requires: [Clientes](#screen-clients), [Médicos](#screen-physicians)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-lockbox-drop-off - Cuadro de escaneo de Entrega en Lockbox y Carpeta nocturna]

**6. Columnas, filtros y botones.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Escanee el código de barras del envase | Entrada de escáner y después Intro | Obligatorio | No hay que confirmar nada más. Un código de barras recibido antes muestra el resguardo anterior y no genera uno nuevo. | En blanco |
| Urgente | Conmutador | Opcional | Marca el resguardo como "Urgente, prioridad alta". | Desactivado |
| Número de devolución de llamada (opcional) | Texto | Opcional | Se muestra cuando está marcado Urgente. | En blanco |
| Tarjeta del resguardo | Centro solicitante ("Sin registrar" si no hay), Médico solicitante, Recibido, Recibido por, Número de devolución de llamada | No aplicable | Termina con "Escanee el siguiente contenedor." | No aplicable |
| Formulario de marcador provisional ("No hay ningún pedido pendiente para este código de barras") | Código de barras; Cliente solicitante (o "No figura o se desconoce" más un cliente en texto libre); Médico solicitante; Hora de la entrega | Opcional (todos los campos) | La Hora de la entrega empieza con la hora actual; cámbiela solo si la entrega fue antes. **Registrar entrega** guarda; **Cancelar** descarta. | Hora actual |
| Carpeta nocturna: Actualizar | Botón | No aplicable | | No aplicable |
| Resumen de Tiempo hasta la recepción (CC) | En espera ahora, Espera más larga, Registradas, Mediana, Media, Más larga, Mediana de urgentes | No aplicable | Desde la entrega en el lockbox hasta el registro. "Aún no hay datos" cuando está vacío. | No aplicable |
| Tabla de la Carpeta nocturna | Columnas: Número de acceso o marcador provisional, Prioridad, Centro solicitante, Recibido, Recibido por, Espera, Estado, Acciones | No aplicable | Estado: Pedido asociado, Marcador provisional sin vincular, Marcador provisional vinculado a un pedido. Vacía: "No hay nada en espera." | No aplicable |
| Vincular a un pedido | Botón y después Pedido real o número de acceso y **Vincular** / **Cancelar** | Obligatorio para vincular | Requiere `lockbox:placeholder:resolve`. | No aplicable |
| Marcar como registrado | Botón | No aplicable | Requiere `lockbox:folder:review`. | No aplicable |
| Abrir acceso | Botón | No aplicable | Abre Acceso para el resguardo. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:lockbox-drop-off:open` (Accessioner y Admin; riesgo estándar; la apertura no se audita). Escanear y registrar un resguardo: `lockbox:specimen:receive` (riesgo alto, auditado; Accessioner). Carpeta nocturna, resumen y Marcar como registrado: `lockbox:folder:review` (Accessioner, y Admin para supervisión). Vincular un marcador provisional: `lockbox:placeholder:resolve` (Accessioner).
**Límites conocidos.** Contrato: `docs/architecture/LOCKBOX_API.md`. Los resguardos no contienen datos del paciente. En la demostración, la carpeta empieza con seis resguardos de ejemplo (dos urgentes y uno ya registrado); **Restablecimiento completo** en **Restablecer demostración** elimina todo lo hecho en la pantalla y carga un conjunto nuevo.

### Garantía de calidad {#screen-quality-assurance}
Breadcrumb: Inicio > Calidad y cumplimiento > Garantía de calidad

**Estado:** Construido

**1. Navegación:** Inicio > **Calidad y cumplimiento** > **Garantía de calidad** (`/quality-assurance`; se puede indicar un pilar en la dirección, `?pillar=`).
**2. Elemento de mantenimiento:** No aplicable. Es una cola de trabajo.

**3. Finalidad y alcance.** La cola de trabajo de calidad. Está organizada en ocho "pilares". **Operaciones** hace el seguimiento de las no conformidades y de las métricas de calidad clínica. **Financiero** hace el seguimiento de las deficiencias de facturación y de codificación generadas en la validación. **Motor CAPA** rige el ciclo de vida de la acción correctiva: una corrección no se cierra por sí sola, se escala aquí hasta que alguien confirma que funcionó, con revisión periódica por la dirección. **Garantía de calidad de citología** y **Panel de calidad** informan de la actividad de revisión, **Modo de inspección** la empaqueta como evidencia de auditoría, **Consolidado de la empresa** es un consolidado entre laboratorios y **Actividades** enumera las actividades de calidad definidas en el [Centro de configuración de calidad](#screen-qa_config_center).

**4. Requisitos previos y dependencias.** Los tipos de deficiencia proceden de [Deficiencias de la muestra](#screen-deficiencies); las actividades y los activadores de CAPA, del [Centro de configuración de calidad](#screen-qa_config_center); los patrones, de la [Política de tendencia de discordancias](#screen-qa_trend_policy); los seguimientos vencidos, de [Seguimiento de controles posteriores](#screen-follow_up_tracking).

Setup step: Reference, not part of setup
Requires: [Centro de configuración de calidad](#screen-qa_config_center), [Política de tendencia de discordancias](#screen-qa_trend_policy), [Deficiencias de la muestra](#screen-deficiencies)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-quality-assurance - Garantía de calidad con las pestañas de pilares y los mosaicos]

**6. Columnas, filtros y botones.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Pestañas de pilares | Operaciones, Financiero, Motor CAPA, Garantía de calidad de citología, Consolidado de la empresa, Panel de calidad, Modo de inspección, Actividades | No aplicable | | Operaciones |
| Mosaicos de Operaciones | Deficiencias (con "N vencidas"), Seguimiento no recibido, Vinculación de biopsias intraoperatorias, Discordancia, Plazo de cofirma, Revisión de acreditación, Desviación posterior al informe final, Revisión de coincidencia de paciente, Gestión de pacientes, Solicitudes de acceso, Discordancia de la IA | No aplicable | Cada uno abre su lista. Las deficiencias se dividen en A nivel de caso y A nivel de muestra. | Deficiencias |
| Acciones de Operaciones | Registrar deficiencia, Escalar a CAPA, Contención inmediata, Verificar eficacia, Iniciar revisión por la dirección | No aplicable | **Registrar deficiencia**: identificador del caso (Buscar), muestra opcional, Tipo de deficiencia, "Qué se observó". **Escalar a CAPA**: Tipo de resolución, Acción correctora, Causa raíz, Acción preventiva (opcional), Fecha de la comprobación de eficacia; el elemento pasa a Pendiente de verificación, no a Cerrado. **Contención inmediata**: "Qué se hizo"; se cierra al instante, sin causa raíz ni comprobación posterior. **Verificar eficacia**: "¿Funcionó realmente la acción correctora?" con Eficaz: cerrar o Recurrente: reabrir. | No aplicable |
| Mosaicos del Motor CAPA | Recomendada, Patrones de discordancia, Escalado a CAPA, Cerrado, Revisiones por la dirección | No aplicable | **Recomendada**: recomendaciones de CAPA de las actividades de calidad (se muestra el responsable) que un responsable de calidad confirma o descarta. **Patrones de discordancia**: se muestra solo a quienes tienen `qa:pathologist-trend:view`. Un elemento recurrente muestra "Reabierto tras una comprobación de eficacia fallida". | Recomendada |
| Mosaicos de Financiero | Deficiencias de facturación, Resuelto, Grupo de revisión de códigos, Cargos pendientes de aprobación, Envíos fallidos ("en Configuración") | No aplicable | **Resolver deficiencia de facturación**: Motivo de la resolución y después **Continuar con la corrección**. **Grupo de revisión de códigos**: Revisión con Resultado de la revisión (Sin incidencias o Registrar deficiencia de facturación), el cargo y Notas del auditor. **Iniciar corrección** abre la corrección de facturación. Envíos fallidos abre la Cola de salida en Configuración. | Deficiencias de facturación |
| Exportar | Botón en las listas | No aplicable | Cada lista tiene su propia capacidad de exportación. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:quality-assurance:open` (Admin, Lab Director, QA Reviewer). Enviar una revisión por la dirección: `qa:management-review:submit` (riesgo alto, requiere la pantalla Garantía de calidad; se concede junto con las demás acciones sobre deficiencias de calidad; lote 659). Un cambio que vuelve como «no guardado» ahora deja la ventana abierta con lo que se había escrito. Decidir sobre las recomendaciones de CAPA: `qa:capa-recommendation:decide` (Admin, Lab Director, QA Reviewer). Ver y decidir sobre los patrones de discordancia: `qa:pathologist-trend:view` y `qa:pathologist-trend:decide` (solo Lab Director de forma predeterminada). Registrar un seguimiento: `qa:follow-up:record` (Admin, Lab Director, QA Reviewer). Exportaciones: una capacidad por lista (`qa:deficiencies:export`, `qa:management-reviews:export`, `qa:billing-deficiencies:export`, `qa:inspection-evidence:export` y otras; todas de riesgo alto; Admin y QA Reviewer tienen la mayoría). Corregir la facturación: `billing:applied-code:correct`.
**Límites conocidos.** Las "Auditorías de pagadores y de autorización previa" no están construidas (no existe ninguna detección), por lo que Financiero no tiene tal pestaña. Una CAPA no se abre nunca automáticamente: toda recomendación espera a una persona. Contrato: `docs/architecture/QUALITY_API.md`.

### Revisión de excepciones de márgenes {#screen-margin-exception-review}
Breadcrumb: Inicio > Espacio de trabajo de Anatomía Patológica > Revisión de excepciones de márgenes

**Estado:** Construido

**1. Navegación:** Inicio > **Espacio de trabajo de Anatomía Patológica** > **Revisión de excepciones de márgenes** (`/margin-exception-review`).
**2. Elemento de mantenimiento:** No aplicable. Es una cola de trabajo.

**3. Finalidad y alcance.** Enumera las respuestas de distancia al margen en texto libre que PathScribe no pudo convertir con seguridad en un número, para que una persona pueda etiquetar la distancia real o descartar el elemento indicando un motivo.

**4. Requisitos previos y dependencias.** Los elementos llegan de informes sinópticos (Capítulo 6) cuyo campo de margen es texto libre.

Setup step: Reference, not part of setup
Requires: Ninguno.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-margin-exception-review - Lista de Revisión de excepciones de márgenes]

**6. Columnas, filtros y botones.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Fila | Nombre del paciente y número de acceso; etiqueta del campo; el texto original; el motivo | No aplicable | Motivos: Todavía no se ha dado ninguna respuesta; No se encontró ningún número en el texto; Se encontró un número, pero rodeado de texto en el que este analizador no confía. | No aplicable |
| Distancia de margen (mm) | Número, 0 o más, incremento 0,1 | Obligatorio para resolver | Error "Introduzca una distancia de margen de 0 o más." | En blanco |
| Resolver | Botón | No aplicable | Guarda la distancia etiquetada. Requiere `case:margin-exception:resolve`. | No aplicable |
| Descartar | Botón y después una ventana con **Por qué este campo no tiene distancia que indicar** | Motivo obligatorio | **Descartar** o Cancelar. Se registran la persona y el motivo. | No aplicable |
| Abrir caso | Botón | No aplicable | Abre el informe y vuelve aquí. | No aplicable |
| Lista vacía | Texto | No aplicable | "No hay excepciones de distancia al margen pendientes." | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:margin-exception-review:open` (Pathologist, Fellow, Resident, PA). Resolver o descartar: `case:margin-exception:resolve` (riesgo alto; los mismos roles).
**Límites conocidos.** Ninguna pantalla de configuración establece el analizador; la regla está en el producto.

### Cola de control de calidad de citología {#screen-cytology-qc-queue}
Breadcrumb: Inicio > Lista de trabajo > Control de calidad de citología

**Estado:** Construido

**1. Navegación:** Inicio > **Lista de trabajo**, vista **Control de calidad de citología** (`/cytology-qc-queue` redirige a la vista de la Lista de trabajo). Título: Cola de revisión por pares de control de calidad de citología.
**2. Elemento de mantenimiento:** No aplicable. Es una cola de trabajo.

**3. Finalidad y alcance.** El trabajo de revisión que producen las [Reglas de control de calidad de citología](#screen-cytology_qc_rules) y las [tasas de selección aleatoria de control de calidad](#screen-cytology_qc_settings). Cada elemento es un caso seleccionado para revisión por pares con un plazo derivado del plazo de resolución de su regla. Dos vistas: **Cola** y **Cumplimiento**.

**4. Requisitos previos y dependencias.** Sin reglas de control de calidad no se selecciona nada. El grupo de revisores de un elemento procede de las funciones de revisor admitidas de la regla.

Setup step: Reference, not part of setup
Requires: [Reglas de control de calidad de citología](#screen-cytology_qc_rules)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: screen-cytology-qc-queue - Cola de revisión por pares de control de calidad de citología]

**6. Columnas, filtros y botones.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Cola / Cumplimiento | Pestañas | No aplicable | Cumplimiento muestra el panel de cumplimiento del control de calidad. | Cola |
| Todos los elementos, Escalados y discrepancias, Rutinarios y aleatorios | Pestañas | No aplicable | Filtra la cola. | Todos los elementos |
| Fila | Caso, nombre de la regla, nivel de prioridad, estado del plazo, "Seleccionado por (motivos)", "Grupo de revisores (roles)" | No aplicable | Estado del plazo: En plazo, Próxima a incumplir el plazo, Plazo incumplido. | No aplicable |
| Abrir caso | Botón | No aplicable | | No aplicable |
| Asignarme | Botón | No aplicable | Se rechaza si usted validó el caso ("otro patólogo debe revisarlo") o no está en el grupo de revisores. | No aplicable |
| Registrar concordancia, Registrar discrepancia | Botones | No aplicable | Registran la revisión. Una discrepancia abre una ventana para los detalles. Requiere `cytology:qc-review:record`. Un caso "Asignado a otro revisor" no muestra botones. | No aplicable |
| Escalar | Botón y ventana ("¿Escalar esta revisión vencida?") con **Motivo** | Motivo obligatorio | Devuelve a la cola, sin asignar, una revisión vencida. | No aplicable |
| Omisión por el supervisor | Botón y ventana ("¿Omitir la revisión de control de calidad de este caso?") con **Justificación** | Justificación obligatoria | Aprueba el caso sin revisión de control de calidad para evitar un retraso clínico. El nombre y la justificación se conservan en el registro de auditoría. | No aplicable |
| Vacía | Texto | No aplicable | "No hay casos en esta cola." | No aplicable |

**7. Permisos.** Abrir la vista: `screen:cytology-qc-queue:open` (Pathologist, Fellow). Registrar una revisión o escalar: `cytology:qc-review:record` (Pathologist, Fellow; riesgo alto). Omisión por el supervisor: `cytology:qc-review:bypass` (riesgo alto; ningún rol la tiene de forma predeterminada, solo el superadministrador de ForMedrixAI; un administrador debe asignarla).
**Límites conocidos.** Contrato: `docs/architecture/CYTOLOGY_QC_API.md`.
