---
chapter: 3
id: ch3
title: Nivel 2: diccionarios maestros y datos clínicos básicos (configurar en segundo lugar)
---

# Nivel 2: diccionarios maestros y datos clínicos básicos (configurar en segundo lugar) {#ch3}

El nivel 2 es el conjunto de listas entre las que se elige en el trabajo diario del laboratorio: departamentos, tipos de muestra, tinciones, protocolos, recipientes, colores de casete, médicos, niveles de servicio de los clientes y las listas de códigos y de clasificaciones que se usan en los informes. Ninguna de estas listas funciona por sí sola. Un tipo de muestra apunta a un departamento, a una subespecialidad y a un protocolo. Una regla de casete apunta a un protocolo y a un color. Un nivel de servicio del cliente apunta a un centro cliente. Por eso el nivel 2 va después del nivel 1 (los centros, las personas y los dispositivos del [capítulo 2](#ch2)) y tiene su propio orden.

Configure el nivel 2 en el orden siguiente. Cada pantalla incluye un cuadro **Orden de configuración** con la misma información, y el generador comprueba que ninguna pantalla requiera otra que venga después.

1. [Organismos reguladores](#screen-governing_bodies): los organismos de normalización y sus cifras de conservación. Solo para uso interno de ForMedrixAI.
2. [Sistemas de codificación](#screen-code_systems): qué sistemas de códigos de diagnóstico están desactivados, son opcionales u obligatorios en cada país, y las licencias que usted posee.
3. [Servicios de terminología](#screen-terminology): una comprobación del estado de los servicios de búsqueda de códigos.
4. [Importación de códigos (masiva)](#screen-code_import): una importación en CSV de códigos de facturación.
5. [Departamentos](#screen-departments): la clasificación general de una muestra en la recepción.
6. [Subespecialidades](#screen-subspecialties): los grupos de trabajo de patología y su encaminamiento.
7. [Catálogo diagnóstico](#screen-stains): tinciones, anticuerpos, pruebas moleculares, protocolos de corte y macros de pedido rápido.
8. [Diccionario de protocolos](#screen-protocols): el flujo de procesamiento de una muestra.
9. [Tipos de recipiente](#screen-container_types): los recipientes en los que llegan las muestras.
10. [Diccionario de muestras](#screen-specimens): los tipos de muestra, que enlazan las listas anteriores.
11. [Marcas](#screen-flags): marcas de caso y de muestra.
12. [Diccionario de ubicación de activos](#screen-asset_locations): ubicaciones físicas con nombre y posiciones de almacenamiento del depósito de cadáveres.
13. [Cadena de frío](#screen-cold_chain): unidades de almacenamiento, tipos de condición y lecturas de temperatura.
14. [Deficiencias de muestras](#screen-deficiencies): tipos de deficiencia y de resolución.
15. [Mapas de órganos](#screen-organ_maps): colores, patrones y vinculaciones de preguntas de los mapas anatómicos.
16. [Colores de casete](#screen-cassette_colors): el diccionario de colores.
17. [Reglas de encaminamiento de casetes](#screen-cassette_routing_rules): qué color recibe un casete.
18. [Colores de tinta](#screen-ink_colors): los colores de la tinta para marcar márgenes.
19. [Lotes de reactivos y soluciones](#screen-reagent_lots): lote, caducidad y estado de CC de los reactivos.
20. [Médicos](#screen-physicians): médicos solicitantes y remitentes.
21. [Configuración de centros](#screen-clients): cuentas de clientes (la misma pantalla que el [diccionario de centros](#screen-facility-dictionary)).
22. [Niveles de servicio de clientes](#screen-client_sla): plazos de respuesta prometidos a cada cliente.
23. [Reglas de activación por resultado anómalo](#screen-abnormal_trigger_rules): los pares de campo y valor que marcan un caso.
24. [Pestaña Citología](#screen-tab-cytology): la página de inicio de la configuración de citología.
25. [Sistema de nomenclatura](#screen-cytology_nomenclature): qué sistema de notificación utiliza la citología.
26. [Interpretación y recomendaciones](#screen-cytology_categories): las listas de categorías de citología.
27. [Clasificación no ginecológica (Milán/París)](#screen-non_gyn_cytology_categories): categorías salivales y urinarias.
28. [Estrategia de cribado](#screen-cytology_screening_strategy): prueba conjunta o VPH primero, y plazos de recitación.
29. [Encaminamiento no ginecológico](#screen-cytology_routing): a qué lista de trabajo va un caso no ginecológico.
30. [Reglas del país y del laboratorio](#screen-cytology_compliance_features): límite de carga de trabajo, revisión retrospectiva, firma urgente e intervalos de cribado.
31. [Instrumentación asistida](#screen-cytology_instrumentation): imagen de preparación completa o revisión tradicional.
32. [Correlación citohistológica (SNOMED)](#screen-snomed_histology_severity_mapping): los rangos de gravedad de SNOMED que se utilizan en la correlación.

Las partes siguientes siguen el tema, no el orden de configuración: la [parte A](#ch3-anatomic-specialties) las especialidades de anatomía patológica, la [parte B](#ch3-specimen-tissue) las muestras y el tejido, la [parte C](#ch3-container-cassette) los recipientes, los casetes y la tinta, la [parte D](#ch3-stains-protocols) las tinciones y los protocolos, la [parte E](#ch3-code-libraries) las bibliotecas de códigos y la [parte F](#ch3-physicians-clients) los médicos, los clientes y los organismos reguladores.

**Palabras de estado.** Cada pantalla muestra una de las cinco palabras de estado del estándar de redacción: Construido, Demostración, Parcial, Planificado, No construido. Casi todos los diccionarios de este capítulo tienen un servicio de producción y un contrato de API escrito, por lo que la mayoría están **Construidos**. Las excepciones se indican en la pantalla: la configuración de los [Mapas de órganos](#screen-organ_maps) y la política de [Sistemas de codificación](#screen-code_systems) se guardan solo en el navegador, y las lecturas de la [Cadena de frío](#screen-cold_chain) son simuladas.

**Qué comparten todas las pantallas de diccionario.**
- Un cambio requiere la capacidad `config:...:manage` propia de la pantalla. Sin ella puede abrir la pantalla y ver los datos, pero los controles aparecen atenuados. Las capacidades de este capítulo están marcadas como de riesgo alto, por lo que cada comprobación (permitida o rechazada) se escribe en el registro de auditoría.
- La mayoría de los diccionarios de aquí se mantienen por **laboratorio ejecutor** o **Global** (todos los laboratorios). Un nombre o un código debe ser único dentro de un laboratorio, o dentro de Global.
- La mayoría de las listas no eliminan registros. Una fila se pasa a **Inactivo**, lo que conserva todos los registros que ya la utilizan.
- Un nombre o un código que llega con una petición y no coincide con nada crea una fila **Sin verificar** (lo hacen Departamentos, Médicos, Ubicaciones de activos y Centros). La fila funciona, pero alguien debe revisarla y seleccionar **Verificar**.

## Parte A: especialidades de anatomía patológica {#ch3-anatomic-specialties}
Breadcrumb: Inicio > Configuración

Esta parte contiene las pantallas que configuran los departamentos y los grupos de trabajo del laboratorio, y la pestaña Citología. PathScribe no tiene una pantalla única de «especialidad». Las cinco especialidades de anatomía patológica se configuran mediante varias pantallas que se enumeran aquí, por lo que la tabla indica para cada una qué existe y qué no existe.

| Especialidad | Qué puede configurar hoy | Qué no existe |
|---|---|---|
| Patología quirúrgica | El [departamento](#screen-departments) Tejido quirúrgico y su plantilla de tallado predeterminada; la categoría de muestra SURGICAL_TISSUE del [Diccionario de muestras](#screen-specimens); los [mapas de órganos](#screen-organ_maps) y los diccionarios de protocolos y de casetes de las partes B a D. | Una pantalla de configuración independiente de «patología quirúrgica». |
| Citopatología | El [departamento](#screen-departments) Líquidos / Citología; las categorías de muestra GYN_CYTOLOGY y NON_GYN_CYTOLOGY; toda la [pestaña Citología](#screen-tab-cytology) (ocho pantallas de este capítulo y cuatro más en los capítulos 4 y 8). | Nada. Es la única especialidad con su propia pestaña de configuración. |
| Dermatopatología | Una [subespecialidad](#screen-subspecialties) llamada Dermatopatología (incluida de serie) y una regla de encaminamiento de casos integrada que le envía las palabras clave de piel. Los mapas de etapas de la cirugía micrográfica de Mohs forman parte de los [mapas de órganos](#screen-organ_maps). | Un departamento, una categoría de muestra o una pantalla de configuración de dermatopatología. |
| Hematopatología | Una [subespecialidad](#screen-subspecialties) llamada Hematopatología (incluida de serie) y una regla de encaminamiento de casos integrada que le envía las palabras clave de hematología. | Un departamento, una categoría de muestra o una pantalla de configuración de hematopatología. |
| Autopsia | La categoría de muestra AUTOPSY del [Diccionario de muestras](#screen-specimens); las posiciones de almacenamiento del depósito de cadáveres y una vista de ocupación en el [Diccionario de ubicación de activos](#screen-asset_locations); los protocolos de corte de autopsia del [Diccionario de protocolos](#screen-protocols); la disciplina AUTOPSY de los grupos de estaciones de trabajo ([Grupos de estaciones de trabajo](#screen-workstation_groups)); y los tipos de objetivo de tiempo de respuesta AUTOPSY_PAD y AUTOPSY_FAD de la [pestaña Configuración de TDR](#screen-tab-tat). | Una pestaña de autopsia o una pantalla de mantenimiento específica de autopsia. |

Las reglas de encaminamiento de casos integradas que utilizan estas subespecialidades están en [Reglas de encaminamiento](#screen-routing_rules) (capítulo 4).

### Departamentos {#screen-departments}
Breadcrumb: Inicio > Configuración > Sistema > Consultas clínicas > Departamentos

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas clínicas**
**2. Elemento de mantenimiento:** Departamentos

**3. Finalidad y alcance.** Un departamento es la clasificación general de una muestra en la recepción: por ejemplo Tejido quirúrgico, Líquidos / Citología, Solo histología / Consulta. Decide con qué plantilla de tallado empieza un caso, si el departamento conserva los registros durante un período distinto del predeterminado de la jurisdicción, y qué director del laboratorio y qué número de acreditación se imprimen en el encabezado de su informe. El enlace Máscara de caso de la ventana de edición lleva a [Configuración de máscara de caso](#screen-case_mask_config), donde se define la máscara del número de acceso del departamento.

**4. Requisitos previos y dependencias.** La excepción de conservación se comprueba frente al mínimo definido en [Organismos reguladores](#screen-governing_bodies) para la jurisdicción actual. Si ningún organismo tiene una cifra de conservación para la jurisdicción, no hay un mínimo con el que comprobar. La lista de plantillas de tallado está fija en el producto (tres opciones), por lo que no depende de otra pantalla. Los departamentos los leen el [Diccionario de muestras](#screen-specimens) (cada tipo de muestra indica un departamento), el [Diccionario de protocolos](#screen-protocols) (un protocolo nuevo de un departamento de líquidos empieza como una vía de decantación) y la entrada de peticiones, que crea un departamento Sin verificar cuando una petición indica uno que no existe.

Setup step: Tier 2, step 5
Requires: [Organismos reguladores](#screen-governing_bodies)
Unlocks: [Diccionario de muestras](#screen-specimens), [Diccionario de protocolos](#screen-protocols), [Configuración de máscara de caso](#screen-case_mask_config)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-departments - Lista de departamentos con búsqueda, filtro de estado y Añadir departamento]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Búsqueda | Texto | Opcional | Reduce la lista por nombre de departamento. | En blanco |
| Filtro de estado | Opción: Todos, Activo, Inactivo, Sin verificar | Opcional | Los departamentos sin verificar se crearon automáticamente a partir de una petición. | Todos |
| Columna Departamento | Texto | No aplicable | Nombre y descripción. | No aplicable |
| Columna Plantilla de tallado predeterminada | Texto | No aplicable | La vía de tallado con la que empieza el departamento. | No aplicable |
| Columna Máscara de caso | Texto | No aplicable | Muestra «DEFINED» seguido de la máscara cuando el departamento tiene una en Configuración de máscara de caso. | No aplicable |
| Columna Excepción de conservación | Texto | No aplicable | Los días de excepción por tipo de material, si hay alguno. | No aplicable |
| Columna Estado | Texto | No aplicable | Activo, Inactivo o Sin verificar. Aparece una nota de creación automática cuando el departamento procede de una petición. | No aplicable |
| + Añadir departamento | Botón | No aplicable | Abre la ventana de edición con un departamento en blanco. | No aplicable |
| Verificar | Botón de fila | No aplicable | Se muestra solo para los departamentos sin verificar. Marca el departamento como revisado. | No aplicable |
| Editar | Botón de fila | No aplicable | Abre la ventana de edición. | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | El nombre del departamento tal como lo ve el personal en el registro. | Ninguno |
| Descripción | Texto libre | Opcional | Qué tipos de muestra pertenecen aquí. | Ninguno |
| Plantilla de tallado predeterminada | Opción: Tejido estándar, Líquido / Bloque celular, Solo histología | Obligatorio | La vía de tallado con la que empieza un caso de este departamento. Las tres opciones son fijas. Se guardan como `grossing_standard_tissue`, `grossing_fluid_cytology` y `grossing_histology_only`. | Tejido estándar |
| Máscara de caso | Enlace (solo en edición) | No aplicable | Abre [Configuración de máscara de caso](#screen-case_mask_config). | No aplicable |
| Estado | Interruptor Activo / Inactivo | Opcional | Un departamento inactivo no se ofrece en la recepción. Si las entradas del Diccionario de muestras aún indican el departamento, una ventana **El departamento sigue en uso** le pide que confirme con **Desactivar de todos modos**. Esas entradas no se modifican. | Activo |
| Excepción de conservación: Bloque, Preparación, Tejido húmedo | Número entero de días mayor que 0, una casilla por tipo de material | Opcional | Una casilla en blanco utiliza el valor predeterminado de la jurisdicción. Un valor inferior al mínimo del organismo regulador abre una ventana de confirmación (más abajo). | En blanco |
| Nombre del director del laboratorio | Texto | Opcional | Marca del encabezado del informe para este departamento. Si está vacío, se usa el del centro y después el de la empresa. | En blanco |
| Número de acreditación CLIA / ISO | Texto | Opcional | La misma regla de sustitución. | En blanco |
| URL del logotipo del encabezado | Enlace https | Opcional | Una dirección de imagen alojada. Solo se guarda la dirección, nunca la imagen. Debe empezar por `https`. | En blanco |

#### Ventana de confirmación por debajo del mínimo

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Justificación | Texto libre | Obligatorio | Por qué este departamento conserva los registros durante menos tiempo que el mínimo del organismo regulador. | Ninguno |
| Confirmar excepción por debajo del mínimo | Botón | No aplicable | Guarda la excepción y escribe el evento de auditoría «Retention Override Below Floor». | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, verificar, desactivar: `config:departments:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** La única comprobación de referencias al desactivar es el Diccionario de muestras. La lista de plantillas de tallado del departamento está fija en tres opciones y no se puede ampliar. Los departamentos incluidos de serie son Tejido quirúrgico, Líquidos / Citología, Solo histología / Consulta y un departamento Sin verificar creado automáticamente, Corte por congelación.

### Subespecialidades {#screen-subspecialties}
Breadcrumb: Inicio > Configuración > Sistema > Consultas clínicas > Subespecialidades

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas clínicas**
**2. Elemento de mantenimiento:** Subespecialidades

**3. Finalidad y alcance.** Una subespecialidad es un grupo de trabajo de patología como Digestivo, Mama, Dermatopatología o Hematopatología. Cada una puede ser un **grupo de trabajo** (los casos se asignan a patólogos con nombre) o un **grupo** (cualquier miembro puede reclamar un caso). Una subespecialidad posee una lista de tipos de muestra, una lista de patólogos y residentes, y una lista de centros. Las reglas de encaminamiento le envían casos, y el selector rápido de distribución de preparaciones muestra las activas. Un grupo gestionado por el sistema llamado Patología general es la reserva para los casos que no coinciden con nada más.

**4. Requisitos previos y dependencias.** La pestaña Médicos muestra el personal cuyo rol es Patólogo o Residente, y la pestaña Centros muestra los centros activos. Cree ambos antes en el nivel 1 ([Miembros](#screen-staff-members), [Diccionario de centros](#screen-facility-dictionary)); de lo contrario, esas pestañas aparecen vacías. Los tipos de muestra se pueden vincular aquí, o más tarde desde el editor del [Diccionario de muestras](#screen-specimens), donde cada tipo de muestra indica una subespecialidad. Un tipo de muestra solo puede pertenecer a una subespecialidad.

Setup step: Tier 2, step 6
Requires: [Miembros](#screen-staff-members), [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Diccionario de muestras](#screen-specimens), [Reglas de encaminamiento](#screen-routing_rules)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-subspecialties - Lista de subespecialidades con búsqueda, filtro de estado y Añadir subespecialidad]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Búsqueda | Texto | Opcional | Reduce la lista por nombre de subespecialidad. | En blanco |
| Filtro de estado | Opción: Todos, Activo, Inactivo | Opcional | | Todos |
| Columna Nombre de la subespecialidad | Texto | No aplicable | Nombre con un punto de grupo de trabajo, una insignia SISTEMA para el grupo gestionado por el sistema, la descripción y el laboratorio ejecutor. | No aplicable |
| Columna Estado | Texto | No aplicable | Activo o Inactivo. | No aplicable |
| Editar | Botón de fila | No aplicable | Abre la ventana de edición. El grupo gestionado por el sistema muestra **Solo lectura** en su lugar. | No aplicable |
| Pie Sincronización del sistema en directo | Texto | No aplicable | El número de subespecialidades que se muestran. | No aplicable |

#### Ventana de edición: panel izquierdo

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | Único para el laboratorio ejecutor, o único en todo el sistema cuando la subespecialidad es Global. | Ninguno |
| Estado | Interruptor Activo / Inactivo | Opcional | Al inactivar se pide confirmación (más abajo). Al reactivar se muestra un aviso de que los vínculos anteriores no se restauran. | Activo |
| Modo de asignación | Opción: grupo de trabajo o grupo | Obligatorio | Grupo de trabajo: los casos se asignan a patólogos con nombre. Grupo: cualquier miembro del grupo puede reclamar un caso. Las reclamaciones de grupo se aplican cuando un caso se reclama o se acepta. | Grupo de trabajo |
| Laboratorio ejecutor | Opción: Global o un laboratorio ejecutor activo | Opcional | Se ofrece para un grupo. Limita al ámbito de ese laboratorio el nombre y el indicador de comodín. | Global |
| Comodín | Casilla de verificación | Opcional | Como máximo una subespecialidad por ámbito de laboratorio es el comodín. Al guardar, el indicador se quita del titular anterior. | Desactivado |
| Descripción | Texto libre | Opcional | | Ninguno |

#### Ventana de edición: panel derecho

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Pestaña Muestras | Lista de selección de entradas del Diccionario de muestras | Opcional | Al marcar una entrada se escribe esta subespecialidad en el tipo de muestra. Una entrada que ya pertenece a otra subespecialidad muestra «Currently in: X». | Ninguna marcada |
| Pestaña Médicos | Lista de selección del personal con el rol de Patólogo o Residente | Opcional | Los miembros del grupo de trabajo. | Ninguno marcado |
| Pestaña Centros | Lista de selección de centros activos | Opcional | Los centros a los que atiende el grupo de trabajo. Se guarda como la lista de clientes de la subespecialidad. | Ninguno marcado |
| Resumen del pie | Texto | No aplicable | Recuentos de las muestras, los médicos y los centros marcados. | No aplicable |

#### Ventana de confirmación para inactivar

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Lista de impacto | Texto | No aplicable | Enumera las muestras que se desvincularán, los médicos que se desasignarán, las entradas de Configuración de TDR que siguen limitadas a ella y las reglas de encaminamiento que aún la tienen como destino. | No aplicable |
| Inactivar y desvincular | Botón | No aplicable | Inactiva la subespecialidad y elimina los vínculos con muestras y médicos. Las entradas de TDR y las reglas de encaminamiento se enumeran, pero no se modifican. | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. Añadir, editar, inactivar: `config:subspecialties:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** Las subespecialidades incluidas de serie son Digestivo, Mama, Dermatopatología, Neuro, Hematopatología, Ginecología quirúrgica, Uro, Torácico, un grupo de Oncología y el grupo gestionado por el sistema Patología general. Inactivar una subespecialidad no elimina las reglas de encaminamiento ni las entradas de TDR que aún la nombran. Corríjalas en sus propias pantallas.

### Pestaña Citología {#screen-tab-cytology}
Breadcrumb: Inicio > Configuración > Citología

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Citología**
**2. Elemento de mantenimiento:** Configuración de citología (una barra lateral de doce secciones)

**3. Finalidad y alcance.** La pestaña Citología reúne todos los ajustes específicos de la citopatología. Es una barra lateral de doce secciones. Ocho se documentan en este capítulo, tres (ajustes de CC, límite de carga de trabajo y correlación histológica) en el [capítulo 4](#screen-cytology_qc_settings), y una (el registro) en el capítulo 8. Cada sección comprueba su propia capacidad. Una persona que no la tenga ve la sección en solo lectura. Si pasa de una sección a otra con cambios sin guardar, se le pide que confirme antes.

| Etiqueta de la barra lateral | Pantalla |
|---|---|
| Interpretación y recomendaciones | [Interpretación y recomendaciones](#screen-cytology_categories) |
| Clasificación no ginecológica (Milán/París) | [Clasificación no ginecológica](#screen-non_gyn_cytology_categories) |
| Sistema de nomenclatura | [Sistema de nomenclatura](#screen-cytology_nomenclature) |
| Estrategia de cribado | [Estrategia de cribado](#screen-cytology_screening_strategy) |
| Encaminamiento no ginecológico | [Encaminamiento no ginecológico](#screen-cytology_routing) |
| Reglas del país y del laboratorio | [Reglas del país y del laboratorio](#screen-cytology_compliance_features) |
| Instrumentación asistida | [Instrumentación asistida](#screen-cytology_instrumentation) |
| Correlación citohistológica (SNOMED) | [Correlación citohistológica (SNOMED)](#screen-snomed_histology_severity_mapping) |
| Ajustes de CC | [Capítulo 4](#screen-cytology_qc_settings) |
| Límite de carga de trabajo | [Capítulo 4](#screen-cytology_workload_cap) |
| Correlación histológica | [Capítulo 4](#screen-cytology_histology_correlation) |
| Registro | [Capítulo 8](#screen-cytology_registry) |

**4. Requisitos previos y dependencias.** La pestaña en sí no necesita nada. Sus excepciones por centro muestran los centros del [Diccionario de centros](#screen-facility-dictionary), así que configúrelo primero.

Setup step: Tier 2, step 24
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Sistema de nomenclatura](#screen-cytology_nomenclature), [Interpretación y recomendaciones](#screen-cytology_categories), [Clasificación no ginecológica](#screen-non_gyn_cytology_categories), [Estrategia de cribado](#screen-cytology_screening_strategy), [Encaminamiento no ginecológico](#screen-cytology_routing), [Reglas del país y del laboratorio](#screen-cytology_compliance_features), [Instrumentación asistida](#screen-cytology_instrumentation), [Correlación citohistológica (SNOMED)](#screen-snomed_histology_severity_mapping)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: tab-cytology - Pestaña Citología con su barra lateral de secciones]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Barra lateral | Lista de doce secciones | No aplicable | Al seleccionar una sección, se abre a la derecha. Una sección cuya capacidad usted no tiene se abre en solo lectura. | Primera sección |
| Aviso de cambios sin guardar | Ventana de confirmación | No aplicable | Aparece cuando sale de una sección con ediciones sin guardar. | No aplicable |

**7. Permisos.** Abrir: `screen:configuration:open`. Cada sección indica su propia capacidad. Admin, Lab Director y Superadmin tienen de forma predeterminada las capacidades de citología, con una excepción que se indica en [Reglas del país y del laboratorio](#screen-cytology_compliance_features).

**Límites conocidos.** Ninguno conocido.

### Sistema de nomenclatura {#screen-cytology_nomenclature}
Breadcrumb: Inicio > Configuración > Citología > Sistema de nomenclatura

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Citología** > barra lateral **Sistema de nomenclatura**
**2. Elemento de mantenimiento:** Sistema de nomenclatura

**3. Finalidad y alcance.** Elige el sistema de notificación de citología que utiliza el laboratorio. La empresa tiene un valor predeterminado y cada centro puede tener el suyo. La elección decide qué lista de categorías ven el citotécnico y el patólogo cuando interpretan un caso.

**4. Requisitos previos y dependencias.** La lista de centros para las excepciones procede del [Diccionario de centros](#screen-facility-dictionary). Si se omite, **+ Añadir excepción** no tiene ningún centro que elegir. Las listas de categorías de cada sistema se editan en [Interpretación y recomendaciones](#screen-cytology_categories).

Setup step: Tier 2, step 25
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Interpretación y recomendaciones](#screen-cytology_categories)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_nomenclature - Valor predeterminado de la empresa y excepciones de centro]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Valor predeterminado de la empresa | Opción: Bethesda, BSCC/RCPath, München III, SFCC (Bethesda en francés), PALGA CISOE-A | Obligatorio | Lo utiliza todo centro que no tenga una excepción propia. Guardar lo escribe. | Bethesda |
| + Añadir excepción | Botón | No aplicable | Abre una fila para elegir un centro y un sistema. | No aplicable |
| Centro (fila de excepción) | Lista de selección de centros | Obligatorio | El centro al que se refiere la excepción. | Ninguno |
| Sistema (fila de excepción) | Opción entre los mismos cinco sistemas | Obligatorio | El sistema de notificación que utiliza ese centro. | Ninguno |
| Quitar | Botón de fila | No aplicable | Quita la excepción. El centro vuelve al valor predeterminado de la empresa. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:cytology-nomenclature:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada.

**Límites conocidos.** Aquí se puede elegir PALGA CISOE-A, pero [Interpretación y recomendaciones](#screen-cytology_categories) no tiene un editor de categorías para este sistema.

### Interpretación y recomendaciones {#screen-cytology_categories}
Breadcrumb: Inicio > Configuración > Citología > Interpretación y recomendaciones

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Citología** > barra lateral **Interpretación y recomendaciones**
**2. Elemento de mantenimiento:** Interpretación y recomendaciones (el diccionario de categorías de citología)

**3. Finalidad y alcance.** Contiene las listas de categorías con las que se construye un informe de citología para el sistema de nomenclatura elegido: adecuación de la muestra, categorización general, interpretación o resultado, y recomendaciones. Cada entrada indica si un patólogo debe revisarla antes de la firma y qué gravedad sugiere a la detección de resultados anómalos. La lista de Bethesda es la maestra. La vista SFCC es una copia de solo lectura de Bethesda con el texto en francés.

**4. Requisitos previos y dependencias.** Defina primero el sistema en uso en [Sistema de nomenclatura](#screen-cytology_nomenclature), para editar la lista que verá el personal. La gravedad sugerida la leen la comprobación de discordancia clínica y la detección de resultados anómalos cuando se firma un caso. Si se omite esta pantalla, se utilizan las listas integradas.

Setup step: Tier 2, step 26
Requires: [Sistema de nomenclatura](#screen-cytology_nomenclature)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_categories - Lista de categorías del sistema elegido con pestañas de sección]

**6. Referencia de campos.**

#### Controles de la página

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Sistema de nomenclatura | Opción: Bethesda, BSCC/RCPath, München III, SFCC | Obligatorio | La lista que se edita. SFCC es de solo lectura y se deriva de Bethesda. PALGA CISOE-A no se ofrece aquí. | Bethesda |
| Pestañas de sección | Pestañas: Adecuación de la muestra, Categorización general, Interpretación / resultado, Recomendaciones | Obligatorio | Cada pestaña es una lista de categorías. | Adecuación de la muestra |
| Mostrar inactivos | Casilla de verificación | Opcional | Incluye las categorías desactivadas. | Desactivado |
| + Añadir categoría | Botón | No aplicable | Abre la ventana de alta. Está oculto para SFCC. | No aplicable |
| Exportar traducciones al francés (CSV) | Botón | No aplicable | Descarga la lista de Bethesda con su texto en francés. La exportación se escribe en el registro de auditoría. | No aplicable |
| Importar traducciones al francés (CSV) | Botón | No aplicable | Vuelve a leer el texto en francés por el Id de la categoría. | No aplicable |
| Etiquetas de fila | Texto | No aplicable | Revisión por el anatomopatólogo, la gravedad sugerida, Inactivo y una etiqueta «built-in» (integrada). | No aplicable |
| Desactivar / Reactivar | Botón de fila | No aplicable | Cambia el indicador Activo. | No aplicable |
| Editar | Botón de fila | No aplicable | Abre la ventana de edición. | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Etiqueta | Texto | Obligatorio | La categoría tal como aparece en el informe. | Ninguno |
| Etiqueta en francés (SFCC) | Texto | Opcional | Solo Bethesda. Alimenta la vista SFCC. | En blanco |
| Abreviatura | Texto | Opcional | | En blanco |
| Grupo | Opción | Opcional | Solo en la pestaña Interpretación / resultado. Agrupa la entrada. | Ninguno |
| Descripción | Texto libre | Opcional | | En blanco |
| Descripción en francés | Texto libre | Opcional | Solo Bethesda. | En blanco |
| Requiere revisión por el anatomopatólogo antes de la firma | Casilla de verificación | Opcional | Un citotécnico no puede firmar por sí solo un caso con esta categoría. | Desactivado |
| Gravedad sugerida para la detección de resultados anómalos | Opción: ninguna, Anormal, Crítico, Maligno | Opcional | Una sugerencia para la detección de resultados anómalos. El patólogo siempre confirma o rechaza una coincidencia. | Ninguno |
| Activo | Casilla de verificación | Opcional | | Activado |

#### Tarjeta de política de cambios reactivos (solo Bethesda)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Cambios reactivos: quién firma el informe | Texto de estado: citotécnico, mixto o patólogo | No aplicable | Muestra el ajuste actual de las entradas de cambios reactivos. | Citotécnico |
| Permitir que firme un citotécnico | Botón | No aplicable | Elimina el requisito de revisión de las entradas de cambios reactivos (aquellas cuyo id empieza por `cyto-nonneo-reactive-`). | No aplicable |
| Exigir un patólogo | Botón | No aplicable | Establece el requisito de revisión en las mismas entradas. Solo se aplica a las revisiones nuevas. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar, incluidos los dos botones de política: `config:cytology-categories:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada.

**Límites conocidos.** La ventana no muestra tres propiedades almacenadas (`usage`, `diagnosticRank` y `isUnsatisfactory`). La importación del CSV en francés busca las coincidencias por Id y no añade categorías nuevas.

### Clasificación no ginecológica (Milán/París) {#screen-non_gyn_cytology_categories}
Breadcrumb: Inicio > Configuración > Citología > Clasificación no ginecológica (Milán/París)

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Citología** > barra lateral **Clasificación no ginecológica (Milán/París)**
**2. Elemento de mantenimiento:** Clasificación no ginecológica

**3. Finalidad y alcance.** Contiene las categorías diagnósticas numeradas de los dos sistemas de notificación no ginecológicos: el Sistema Milán (glándula salival) y el Sistema París (vías urinarias). Cada categoría tiene un número, una etiqueta y un riesgo de malignidad opcional.

**4. Requisitos previos y dependencias.** Independiente. Las categorías aparecen en el informe de citología no ginecológica. Si se omite, se utilizan las categorías integradas.

Setup step: Tier 2, step 27
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: cytology-non_gyn_cytology_categories - Lista de categorías de Milán y París]

**6. Referencia de campos.**

#### Controles de la página

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Botones de sistema | Opción: Milán (salival), París urinario | Obligatorio | La lista que se edita. | El primer sistema |
| Mostrar inactivos | Casilla de verificación | Opcional | | Desactivado |
| + Añadir categoría | Botón | No aplicable | Abre la ventana de alta. | No aplicable |
| Desactivar / Reactivar | Botón de fila | No aplicable | | No aplicable |
| Editar | Botón de fila | No aplicable | | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Número de categoría | Número entero | Obligatorio | El número de la categoría en el sistema. | Ninguno |
| Etiqueta | Texto | Obligatorio | | Ninguno |
| Abreviatura | Texto | Opcional | | En blanco |
| Descripción | Texto libre | Opcional | | En blanco |
| Riesgo de malignidad (%) | Número, de 0 a 100 | Opcional | Se muestra junto a la categoría. | En blanco |
| Requiere revisión del patólogo | Casilla de verificación | Opcional | | Activado |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:cytology-categories:manage` (riesgo alto, auditado), la misma capacidad que [Interpretación y recomendaciones](#screen-cytology_categories). Admin, Lab Director y Superadmin la tienen de forma predeterminada.

**Límites conocidos.** Ninguno conocido.

### Estrategia de cribado {#screen-cytology_screening_strategy}
Breadcrumb: Inicio > Configuración > Citología > Estrategia de cribado

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Citología** > barra lateral **Estrategia de cribado**
**2. Elemento de mantenimiento:** Estrategia de cribado

**3. Finalidad y alcance.** Define cómo se realiza el cribado cervical (prueba conjunta, VPH primero o solo citología), para la empresa y para cada centro, y contiene los plazos de recitación y el texto de recitación de Australia y Nueva Zelanda.

**4. Requisitos previos y dependencias.** La lista de centros para las excepciones procede del [Diccionario de centros](#screen-facility-dictionary). La tarjeta de plazos de recitación se guarda dentro de los ajustes de la estrategia, por lo que se aplica el mismo permiso.

Setup step: Tier 2, step 28
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_screening_strategy - Estrategia predeterminada, excepciones de centro y tarjeta de plazos de recitación]

**6. Referencia de campos.**

#### Estrategia

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Valor predeterminado de la empresa | Opción: Cotest, VPH primario con reflejo a citología, Solo citología | Obligatorio | Lo utiliza todo centro que no tenga una excepción. | Cotest |
| + Añadir excepción | Botón | No aplicable | Abre una fila para elegir un centro y una estrategia. | No aplicable |
| Excepción de centro | Lista de selección más las mismas tres opciones | Obligatorio | | Ninguno |
| Quitar | Botón de fila | No aplicable | Quita la excepción. | No aplicable |

#### Tarjeta de plazos de recitación

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| País | Opción: Australia, Nueva Zelanda | Obligatorio | El país cuyos plazos y texto se editan. La opción está desactivada mientras el formulario tenga cambios sin guardar. | Australia |
| Urgente (VPH 16/18): desde, hasta | Semanas enteras, de 1 a 52 | Opcional | El primer cuadro no puede ser posterior al segundo. Si ambos están vacíos, significa «lo antes posible». | de 2 a 4 semanas |
| Rutinaria: desde, hasta | Semanas enteras, de 1 a 52 | Opcional | Las mismas reglas. | de 6 a 12 semanas |
| Repetición de la toma: desde, hasta | Semanas enteras, de 1 a 52 | Opcional | Se muestra como el plazo de Australia o el de Nueva Zelanda según el país elegido. | Australia de 6 a 12 semanas, Nueva Zelanda vacío |
| Idioma | Opción: inglés, francés, alemán, neerlandés, coreano, español | Obligatorio | El idioma del texto que se edita. | Inglés |
| Texto: recitación del médico por CBL | Texto libre, hasta 1000 caracteres | Opcional | Si está vacío, se utiliza el texto integrado. Solo se permiten los marcadores `{{type}}` y `{{next}}`. | En blanco |
| Texto: repetición de la toma | Texto libre, hasta 1000 caracteres | Opcional | Si está vacío, se utiliza el texto integrado. No se permite ningún marcador. | En blanco |
| Guardar | Botón | No aplicable | Guarda los plazos y el texto. Auditado como `RECALL_SETTINGS_CHANGED`. | No aplicable |
| Descartar cambios | Botón | No aplicable | Devuelve la tarjeta a los valores guardados. | No aplicable |
| Restablecer valores predeterminados | Botón | No aplicable | Vuelve a poner en el formulario los plazos integrados. Seleccione Guardar para conservarlos. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:cytology-screening-strategy:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada.

**Límites conocidos.** En el servicio existe una regla de cribado por edad, pero no tiene pantalla. Los plazos de recitación existen solo para Australia y Nueva Zelanda.

### Encaminamiento no ginecológico {#screen-cytology_routing}
Breadcrumb: Inicio > Configuración > Citología > Encaminamiento no ginecológico

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Citología** > barra lateral **Encaminamiento no ginecológico**
**2. Elemento de mantenimiento:** Encaminamiento no ginecológico

**3. Finalidad y alcance.** Decide a qué lista de trabajo va un caso de citología no ginecológica: la lista de trabajo de Anatomía Patológica quirúrgica o la lista de trabajo de citología. Los casos ginecológicos van siempre a la lista de trabajo de citología.

**4. Requisitos previos y dependencias.** Las excepciones utilizan la lista de centros del [Diccionario de centros](#screen-facility-dictionary). La categoría de muestra no ginecológica del [Diccionario de muestras](#screen-specimens) decide a qué casos se aplica.

Setup step: Tier 2, step 29
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_routing - Valor predeterminado de la empresa y excepciones de centro]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Valor predeterminado de la empresa | Opción: Lista de trabajo de Anatomía Patológica quirúrgica, Lista de trabajo de citología | Obligatorio | Adónde van los casos no ginecológicos salvo que se aplique una excepción de centro. | Lista de trabajo de Anatomía Patológica quirúrgica |
| + Añadir excepción | Botón | No aplicable | Abre una fila para elegir un centro y una lista de trabajo. | No aplicable |
| Excepción de centro | Lista de selección más las dos opciones | Obligatorio | | Ninguno |
| Quitar | Botón de fila | No aplicable | | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:cytology-routing:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada.

**Límites conocidos.** Ninguno conocido.

### Reglas del país y del laboratorio {#screen-cytology_compliance_features}
Breadcrumb: Inicio > Configuración > Citología > Reglas del país y del laboratorio

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Citología** > barra lateral **Reglas del país y del laboratorio**
**2. Elemento de mantenimiento:** Reglas del país y del laboratorio

**3. Finalidad y alcance.** Activa o desactiva tres controles de citología específicos de cada país, para la empresa y para cada centro, y contiene las reglas de intervalo de cribado por país. Los controles hacen lo que dicen. Por sí solos no hacen que un laboratorio cumpla una norma.

**4. Requisitos previos y dependencias.** Las excepciones de centro utilizan el [Diccionario de centros](#screen-facility-dictionary). Cada función en Automático sigue el país del centro, por lo que debe estar definida la jurisdicción del centro.

Setup step: Tier 2, step 30
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_compliance_features - Tres funciones y tarjeta de intervalos de cribado]

**6. Referencia de campos.**

#### Funciones

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Límite diario de carga de trabajo CLIA | Opción: Automático, Activado, Desactivado | Obligatorio | Limita las preparaciones que un citotécnico examina en un día. Automático significa Activado para los centros de EE. UU. | Automático |
| Revisión retrospectiva de 5 años del CAP | Opción: Automático, Activado, Desactivado | Obligatorio | Automático significa Activado para los centros de EE. UU. | Automático |
| Firma para los informes preliminares urgentes | Opción: Automático, Activado, Desactivado | Obligatorio | Automático significa que se exige firma en todas partes. | Automático |
| Excepción de centro | Lista de selección más las tres opciones, por función | Opcional | Sustituye el ajuste de la empresa para un centro. | Ninguno |
| Guardar | Botón | No aplicable | Guarda las funciones. Auditado. | No aplicable |

#### Tarjeta de intervalos de cribado

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Código de país | Texto, convertido a mayúsculas | Obligatorio | Por ejemplo GB_EW, FR. | Ninguno |
| Desde la edad | Número entero, 0 o más | Obligatorio | Inicio del tramo de edad. | 25 en una fila nueva |
| Hasta la edad | Número entero, no inferior a Desde la edad | Obligatorio | Fin del tramo de edad. | 64 en una fila nueva |
| Intervalo (meses) | Número entero mayor que 0 | Obligatorio | El intervalo de cribado del tramo. Se utiliza para la comprobación del cumplimiento del intervalo (EU-QA-01). El período de gracia es de 3 meses. | 36 en una fila nueva |
| Quitar | Botón de fila | No aplicable | | No aplicable |
| Añadir una regla | Botón | No aplicable | Añade una fila. | No aplicable |
| Guardar | Botón | No aplicable | Se rechaza una fila sin país, con una edad negativa, con una edad Hasta inferior a la edad Desde o con un intervalo de 0 o menos («invalidRule»). Auditado como «Screening Intervals Updated». | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:cytology-compliance:manage` (riesgo alto, auditado). Admin y Superadmin la tienen de forma predeterminada. **Lab Director no la tiene**, porque esta capacidad pertenece al grupo Administración y no al grupo Citología.

**Límites conocidos.** La pantalla no tiene bloqueo de solo lectura: una persona sin la capacidad ve controles que el guardado después rechaza. Las reglas de intervalo incluidas de serie cubren GB_EW, FR, DE, NL, BE e IE, y son ejemplos que hay que revisar, no una política nacional.

### Instrumentación asistida {#screen-cytology_instrumentation}
Breadcrumb: Inicio > Configuración > Citología > Instrumentación asistida

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Citología** > barra lateral **Instrumentación asistida**
**2. Elemento de mantenimiento:** Instrumentación asistida

**3. Finalidad y alcance.** Elige cómo revisan las preparaciones los citotécnicos: en imágenes de preparación completa o de la forma tradicional guiada. Con la imagen de preparación completa, el caso muestra la acción **View WSI Slide** y el mosaico Escaneados completados. Con la modalidad tradicional no se muestra ningún control de imagen.

**4. Requisitos previos y dependencias.** Las excepciones utilizan el [Diccionario de centros](#screen-facility-dictionary).

Setup step: Tier 2, step 31
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_instrumentation - Valor predeterminado de la empresa y excepciones de centro]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Valor predeterminado de la empresa | Opción: Imagen de preparación completa (WSI), Tradicional guiada | Obligatorio | | Imagen de preparación completa |
| + Añadir excepción | Botón | No aplicable | | No aplicable |
| Excepción de centro | Lista de selección más las dos opciones | Obligatorio | | Ninguno |
| Quitar | Botón de fila | No aplicable | | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:cytology-instrumentation:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada.

**Límites conocidos.** Ninguno conocido.

### Correlación citohistológica (SNOMED) {#screen-snomed_histology_severity_mapping}
Breadcrumb: Inicio > Configuración > Citología > Correlación citohistológica (SNOMED)

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Citología** > barra lateral **Correlación citohistológica (SNOMED)**
**2. Elemento de mantenimiento:** Correlación citohistológica (SNOMED)

**3. Finalidad y alcance.** Asigna a los códigos SNOMED de la histología cervical un orden de gravedad de 0 a 5, para poder comparar un resultado de citología con la biopsia que le siguió. La lista incluye cinco entradas sintéticas de prueba. Sustitúyalas por sus códigos con licencia.

**4. Requisitos previos y dependencias.** Los órdenes se leen cuando se compara un resultado de citología con la histología cervical posterior. Si se omite esta pantalla, la comparación no tiene órdenes que utilizar. Para sustituir los códigos sintéticos de prueba se necesitan códigos de su propia edición de SNOMED CT con licencia.

Setup step: Tier 2, step 32
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: cytology-snomed_histology_severity_mapping - Tabla de código SNOMED y orden de gravedad]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Código SNOMED | Texto | Obligatorio | No se puede cambiar una vez añadido. Se rechaza un código duplicado. | Ninguno |
| Descripción | Texto | Obligatorio | | Ninguno |
| Orden de gravedad | Número entero, de 0 a 5 | Obligatorio | El cuadro limita el valor a un intervalo de 0 a 5. | Ninguno |
| Añadido | Fecha y usuario | No aplicable | Quién añadió la fila y cuándo. | No aplicable |
| Editar | Botón de fila | No aplicable | Cambia solo la descripción y el orden. | No aplicable |
| Quitar | Botón de fila | No aplicable | Pide confirmación y después quita la fila. | No aplicable |
| Añadir fila | Tres cuadros y un botón | No aplicable | Los mismos tres campos de arriba. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:cytology-severity-mapping:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada.

**Límites conocidos.** El límite de 0 a 5 lo impone solo el cuadro de entrada. Las entradas incluidas de serie son `TEST-SNOMED-100001` a `100005`.
## Parte B: diccionarios maestros de muestras y tipos de tejido {#ch3-specimen-tissue}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio

Esta parte contiene las listas que describen lo que llega al laboratorio y cómo se le hace el seguimiento: los tipos de muestra, los mapas anatómicos, las marcas de caso y de muestra, las ubicaciones físicas con nombre, la cadena de frío y los tipos de deficiencia.

### Diccionario de muestras {#screen-specimens}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Diccionario de muestras

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Diccionario de muestras

**3. Finalidad y alcance.** La lista maestra de los tipos de muestra. Cada uno indica el tipo, el procedimiento y la localización anatómica, y lleva el departamento, la subespecialidad, el protocolo de procesamiento, las tinciones predeterminadas y un código de facturación base. La **Categoría de muestra** determina el encaminamiento a las listas de trabajo y el comportamiento del registro (quirúrgica, citología GIN, citología no GIN, autopsia, molecular, consulta). La entrada de peticiones compara el texto de la muestra de una petición con esta lista. Una coincidencia que no sea exacta genera una deficiencia.

**4. Requisitos previos y dependencias.** El editor elige entre otras tres listas: el departamento, de [Departamentos](#screen-departments); la subespecialidad, de [Subespecialidades](#screen-subspecialties); y el protocolo de procesamiento, entre los protocolos activos del [Diccionario de protocolos](#screen-protocols). Si se omite cualquiera de ellas, esa lista de selección está vacía y el tipo de muestra se guarda sin ese dato. El protocolo también aporta el tipo de casete, y las [Reglas de encaminamiento de casetes](#screen-cassette_routing_rules) comparan por el protocolo, por lo que un tipo de muestra sin protocolo no puede coincidir con una regla que nombra uno. Las tinciones predeterminadas son texto sin formato y no se comprueban frente al [Catálogo diagnóstico](#screen-stains).

Setup step: Tier 2, step 10
Requires: [Departamentos](#screen-departments), [Subespecialidades](#screen-subspecialties), [Diccionario de protocolos](#screen-protocols)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-specimens - Lista del Diccionario de muestras con filtros, Descargar plantilla, Cargar hoja de cálculo y Añadir muestra]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Búsqueda | Texto | Opcional | | En blanco |
| Filtro de tipo | Opción | Opcional | | Todos |
| Filtro de estado | Opción | Opcional | | Todos |
| Columna Muestra | Texto | No aplicable | Nombre y código. | No aplicable |
| Columna Tipo, procedimiento, localización | Texto | No aplicable | | No aplicable |
| Columna Departamento | Texto | No aplicable | | No aplicable |
| Columna CPT base | Texto | No aplicable | | No aplicable |
| Columna Protocolo | Texto | No aplicable | | No aplicable |
| Columna Fijador req. | Texto | No aplicable | Indica si se exige un tiempo de fijación antes de la firma. | No aplicable |
| Columna Estado | Texto | No aplicable | Selecciónela para alternar entre Activo e Inactivo. No hay confirmación. | No aplicable |
| Editar, Duplicar | Botones de fila | No aplicable | Duplicar abre una copia en el editor. | No aplicable |
| Descargar plantilla | Botón | No aplicable | Descarga un CSV con las columnas de importación. | No aplicable |
| Cargar hoja de cálculo | Botón | No aplicable | Abre la ventana Revisar la carga (más abajo). | No aplicable |
| + Añadir muestra | Botón | No aplicable | Abre el editor con un tipo de muestra en blanco. | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | | Ninguno |
| Código de muestra | Texto | Opcional | La clave por la que se comparan las filas en una nueva importación. | En blanco |
| Descripción | Texto libre | Opcional | | En blanco |
| Tipo | Texto u opción | Obligatorio | Por ejemplo Biopsia o Resección. | Ninguno |
| Procedimiento | Texto u opción | Obligatorio | | Ninguno |
| Categoría de muestra | Opción: ninguna, SURGICAL_TISSUE, GYN_CYTOLOGY, NON_GYN_CYTOLOGY, AUTOPSY, MOLECULAR, CONSULT, OTHER | Opcional | Determina el encaminamiento a las listas de trabajo y el comportamiento del registro. | Ninguno |
| Localización anatómica | Texto | Opcional | | En blanco |
| Lateralidad | Opción: Izquierda, Derecha, Bilateral, Línea media, N/A | Opcional | | Ninguno |
| Subespecialidad | Lista de selección de [Subespecialidades](#screen-subspecialties) | Opcional | | Ninguno |
| Departamento | Lista de selección de [Departamentos](#screen-departments) | Opcional | | Ninguno |
| Sinónimos | Texto, separado por comas | Opcional | Otros nombres que puede utilizar la petición. | En blanco |
| Código CPT base predeterminado | Texto | Opcional | Texto libre. | En blanco |
| Tinciones predeterminadas | Texto, separado por comas | Opcional | Texto libre, no vinculado al diccionario de tinciones. | En blanco |
| Notas de procesamiento | Texto libre | Opcional | | En blanco |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |
| Requiere tiempo de fijación antes de la firma | Interruptor Sí/No | Opcional | | Desactivado |
| Protocolo de procesamiento | Lista de selección de protocolos activos | Opcional | | Ninguno |

#### Ventana Revisar la carga

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Columnas del CSV | Name, Description, Subspecialty, SpecimenCode, Type, Procedure, Site, Laterality, Synonyms, Department, RequiresFixativeTime, Active, DefaultStains, ProcessingNotes | No aplicable | Una fila coincide con un tipo de muestra existente primero por SpecimenCode y después por Name. La subespecialidad y el departamento se comparan por el nombre. | No aplicable |
| Aplicar N fila(s) | Botón | No aplicable | Escribe las filas mostradas. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, importar, activar: `config:specimen-dictionary:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** Dos propiedades almacenadas no tienen campo en la pantalla (`defaultComplexity` y `microUpgradeBaseCptCode`). Al guardar, el registro anota como editor «admin», no a la persona que ha iniciado sesión. El código CPT base predeterminado no se comprueba frente al Diccionario de facturación.

### Mapas de órganos {#screen-organ_maps}
Breadcrumb: Inicio > Configuración > Sistema > Consultas clínicas > Mapas de órganos

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas clínicas**
**2. Elemento de mantenimiento:** Mapas de órganos

**3. Finalidad y alcance.** Los mapas anatómicos que se muestran junto a un informe sinóptico (mapas de sectores y de biopsias de próstata, esfera horaria de mama, pólipo colorrectal, resección rectal y renal, cavidad oral, vaciamiento cervical, etapas de Mohs) se dibujan siempre a partir de las respuestas del sinóptico. Un mapa no tiene datos propios. Esta pantalla define el aspecto de los mapas y qué preguntas los alimentan. Tiene dos pestañas: **Colores y patrones** y **Vinculaciones del mapa**.

**4. Requisitos previos y dependencias.** La lista de ámbitos de Colores y patrones enumera las jurisdicciones y los centros del [Diccionario de centros](#screen-facility-dictionary). Si se omite, solo se puede editar el nivel de la empresa. Las vinculaciones del mapa enumeran las plantillas sinópticas de la [Biblioteca sinóptica](#screen-tab-protocols). Los mapas de próstata y de Mohs propios de PathScribe no necesitan vinculación. Una plantilla redactada por su propio laboratorio necesita una vinculación antes de poder dibujar su mapa.

Setup step: Tier 2, step 15
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Biblioteca sinóptica](#screen-tab-protocols)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-organ_maps - Colores y patrones con selector de nivel y vista previa]

**6. Referencia de campos.**

#### Pestaña Colores y patrones

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nivel | Opción: Empresa, Jurisdicción, Centro | Obligatorio | La capa que se edita. Un centro hereda de su jurisdicción, después de la empresa y después del esquema integrado. Si cambia de nivel con ediciones sin guardar, se le pregunta antes. | Empresa |
| Elija una jurisdicción, Elija un centro | Lista de selección | Obligatorio para esos niveles | Las jurisdicciones proceden de la propia jurisdicción de los centros. | Ninguno |
| Muestra (etiqueta de fila) | Texto | No aplicable | Una fila por categoría o contorno: benigno, no muestreado, tumor, grupo de grado 1, grupo de grado 2, grupo de grado 3 o superior, extensión extraprostática, margen positivo, carcinoma invasivo, CDIS, calcificaciones, margen libre, margen próximo, margen positivo, tumor residual, invasión perineural, adenoma, adenoma en el margen, displasia en el margen, ENE menor, ENE mayor. | No aplicable |
| Color | Selector de color (hexadecimal, como `#b91c1c`) | Obligatorio al sustituir | | Color integrado |
| Patrón | Opción: Sólido, Punteado, Con trama, Con trama cruzada, Sin patrón | Obligatorio al sustituir | Cada color va emparejado con un patrón para que el mapa se lea en blanco y negro. «Sin patrón» se permite solo para benigno y no muestreado. | Patrón integrado |
| Texto de la leyenda | Texto, hasta 40 caracteres | Opcional | Su propio texto para la leyenda. | Texto integrado |
| Sustituir aquí / Usar heredado | Botón de fila | No aplicable | Desbloquea o bloquea los valores de la fila en este nivel. | Usar heredado |
| Umbrales de margen y de distancia | Siete filas, cada una con una distancia en mm y (en seis de ellas) un operador de comparación: ≤ igual o inferior a, < inferior a, = exactamente | Opcional | Véase la tabla siguiente. Cada una tiene sus propios botones Sustituir aquí y Usar heredado. | Valores integrados |
| Vista previa | Dibujos | No aplicable | Muestra cada mapa con el esquema en borrador. | No aplicable |
| Quitar las sustituciones de este nivel | Botón | No aplicable | Elimina la capa. | No aplicable |
| Guardar | Botón | No aplicable | Guarda la capa. Se rechaza con un motivo si un color no es hexadecimal, falta un patrón, un texto de leyenda es demasiado largo o un umbral está fuera de intervalo. | No aplicable |

| Umbral | Intervalo permitido (mm) | Valor integrado |
|---|---|---|
| Mama: un margen es próximo por debajo de (sin operador) | 0.1 a 10 | 2 |
| Pólipo maligno: margen afectado en | 0 a 10 | 1, ≤ |
| CRM rectal: afectado en | 0 a 10 | 1, ≤ |
| Cavidad oral: margen afectado en | 0 a 10 | 1, < |
| Cavidad oral: margen próximo en | 0 a 20 | 5, ≤ |
| Riñón, nefrectomía parcial: margen del parénquima afectado en | 0 a 10 | 0, = |
| Riñón, nefrectomía radical: margen de partes blandas afectado en | 0 a 10 | 0, = |

Una capa de cavidad oral cuya distancia de afectación no sea inferior a su distancia de proximidad se enumera como conflicto. Hasta que se corrija, los mapas de esa capa utilizan la regla de proximidad predeterminada.

#### Pestaña Vinculaciones del mapa

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Plantilla sinóptica | Lista de selección de plantillas | Obligatorio | La plantilla que se vincula. Se muestra una etiqueta de estado: Preguntas de mapa de PathScribe, Vinculación de su laboratorio, Preguntas de márgenes por revisar o Sin mapa. | Ninguno |
| Mapa | Opción entre los nueve mapas | Obligatorio | El tipo de mapa de esa plantilla. | El de la plantilla |
| Selectores de preguntas | Una lista de selección por cada entrada del mapa, como la pregunta de la cuadrícula de focos tumorales o la pregunta del lado de la muestra | Obligatorio para las entradas que necesita el mapa | Cada una enumera las preguntas de la plantilla. «— no se usa —» deja una entrada sin vincular. | No se usa |
| Respuesta y significado en el mapa | Tabla, una fila por respuesta | Obligatorio para cada pregunta de opción vinculada | Indica qué significa cada respuesta en el mapa. Al menos una respuesta debe tener un significado. | Ignorar |
| Selectores de columnas de la cuadrícula | Una lista de selección por columna de la cuadrícula | Obligatorio para las entradas de cuadrícula | Corresponden a las columnas de la cuadrícula (localización, % de afectación, grupo de grado, etc.). | No se usa |
| Preguntas genéricas de márgenes | Selectores del estado del margen y de los márgenes afectados, por componente | Obligatorio para los mapas de márgenes | Las preguntas de márgenes del propio formulario siguen a las del mapa y están bloqueadas, de modo que no pueden discrepar. Una pregunta solo puede servir para una función de margen. | No se usa |
| Guardar | Botón | No aplicable | Guarda la vinculación. | No aplicable |
| Quitar la vinculación de su laboratorio | Botón | No aplicable | Quita la vinculación. | No aplicable |
| Empezar de nuevo | Botón | No aplicable | Revierte el borrador. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar colores, patrones y umbrales: `config:organ-map-scheme:manage`. Cambiar vinculaciones: `config:organ-map-bindings:manage`. Ambas son de riesgo alto y auditadas. Admin, Lab Director y Superadmin tienen las dos de forma predeterminada. Los botones están desactivados sin ellas.

**Límites conocidos.** Los ajustes se guardan en el navegador y las cifras del caso, en el registro del caso. El contrato de la API (`docs/architecture/ORGAN_MAPPING_API.md`) es una especificación: los puntos de conexión del servidor aún no están construidos, y por eso el estado es Demostración. Una vinculación guardada antes de que los márgenes se notificaran por componente deja de calcularse y le pide que vuelva a asignar cada pregunta de márgenes.

### Marcas {#screen-flags}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Marcas

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Marcas (título de la página «Marcas de casos y muestras»)

**3. Finalidad y alcance.** Una marca es una etiqueta que se pone a un caso o a una muestra, como STAT, Malignant o Confidential, con una gravedad de 1 a 5 y un icono. Una marca también puede restringir la impresión del informe del caso. Las marcas también se crean mediante importaciones desde un sistema de información del laboratorio (se muestran con la insignia «Importada del SIL»).

**4. Requisitos previos y dependencias.** Ninguno. Restringir la impresión exige el permiso `report:restricted-case:print` para imprimir después, que se define en la pantalla [Roles](#screen-staff-roles). Las marcas creadas automáticamente a partir de una importación del SIL aparecen en un banner con un botón **Revisar** hasta que alguien las comprueba.

Setup step: Tier 2, step 11
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-flags - Lista de marcas de casos y muestras con filtros y Añadir marca]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Búsqueda | Texto | Opcional | | En blanco |
| Filtro de estado | Opción | Opcional | | Todos |
| Filtro de nivel | Opción: Caso, Muestra | Opcional | | Todos |
| Columnas | Nombre (con la insignia «Importada del SIL»), Nivel, Código SIL, Gravedad, Estado, Acciones | No aplicable | | No aplicable |
| Banner de creación automática y Revisar | Banner y botón | No aplicable | Filtra la lista para mostrar las marcas creadas a partir de importaciones. **Borrar filtro** lo quita. | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | | Ninguno |
| Descripción | Texto libre | Opcional | | En blanco |
| Nivel | Opción: Caso, Muestra | Obligatorio | Dónde se puede aplicar la marca. | Caso |
| Gravedad | Opción: 1 Informativa, 2 Baja, 3 Media, 4 Alta, 5 Crítica | Obligatorio | | 1 |
| Código SIL | Texto | Opcional | Hace corresponder la marca con un código del SIL al importar. | En blanco |
| Icono | Opción: ihc, fish, molecular, flow-cytometry, cytogenetics, micro, coag, generic-lab | Obligatorio | | generic-lab |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |
| Restringe la impresión | Casilla de verificación | Opcional | Solo a nivel de caso. Impide que imprima el informe quien no tenga el permiso `report:restricted-case:print`. | Desactivado |

Cada guardado pregunta primero «¿Seguro que desea aplicar estos cambios?».

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, desactivar: `config:case-flags:manage` (riesgo alto). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Los guardados escriben los eventos de auditoría `CONFIG_FLAG_CREATED`, `CONFIG_FLAG_UPDATED` (solo los cambios de nombre, descripción y código SIL) y `CONFIG_FLAG_DEACTIVATED`.

**Límites conocidos.** Una propiedad almacenada (`tagClass`) es un resto de un diseño anterior y no se utiliza. Las marcas incluidas de serie son STAT, Malignant y Confidential - Restricted Printing, entre otras.

### Diccionario de ubicación de activos {#screen-asset_locations}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Diccionario de ubicación de activos

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Diccionario de ubicación de activos

**3. Finalidad y alcance.** La lista regulada de ubicaciones físicas (edificios, salas, unidades de almacenamiento, casillas de almacenamiento, estaciones de trabajo, estanterías de archivo) frente a la cual se comprueba el historial de ubicación de un material. Una ubicación escrita en la mesa de trabajo que no coincida con ninguna de esta lista crea una entrada Sin verificar. La pestaña **Ocupación del almacenamiento del depósito de cadáveres** muestra qué casillas de almacenamiento del depósito contienen ahora una muestra de autopsia.

**4. Requisitos previos y dependencias.** Ninguno. La pestaña de ocupación enumera solo las ubicaciones de tipo Casilla de almacenamiento, así que defina aquí al menos una antes. Si no hay ninguna, la pestaña de ocupación dice «No real storage_slot locations defined yet».

Setup step: Tier 2, step 12
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-asset_locations - Lista del Diccionario de ubicación de activos]

**6. Referencia de campos.**

#### Pestaña Diccionario

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Búsqueda | Texto | Opcional | Coincide con el nombre o la descripción. | En blanco |
| Columnas | Nombre, Tipo, Superior, Estado, Acciones | No aplicable | Una fila Sin verificar muestra una nota de creación automática. | No aplicable |
| + Añadir ubicación | Botón | No aplicable | | No aplicable |
| Verificar | Botón de fila | No aplicable | Se muestra en las filas Sin verificar. | No aplicable |
| Editar | Botón de fila | No aplicable | | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | Por ejemplo Mortuary Cooler 1 - Tray A. | Ninguno |
| Tipo de ubicación | Opción: Edificio, Sala, Unidad de almacenamiento, Casilla de almacenamiento, Estación de trabajo, Estantería de archivo, Otra | Obligatorio | Solo Casilla de almacenamiento aparece en la pestaña de ocupación. | Casilla de almacenamiento |
| Ubicación superior | Lista de selección de otras ubicaciones | Opcional | | Ninguno |
| Descripción | Texto libre | Opcional | | En blanco |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |

#### Pestaña Ocupación del almacenamiento del depósito de cadáveres

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Casilla de almacenamiento | Texto | No aplicable | Cada ubicación de tipo Casilla de almacenamiento. | No aplicable |
| Estado | Texto | No aplicable | Ocupada o Disponible, calculado a partir del historial de ubicación de las muestras de los casos de autopsia que usted puede ver. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, verificar: `config:asset-locations:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** La vista de ocupación lee los casos que permite su propio acceso, por lo que dos personas pueden ver resultados distintos. Las ubicaciones incluidas de serie son, entre otras, Grossing Station 3, Archive Shelf 12B, Histology Bench 2 (Sin verificar) y dos casillas de almacenamiento del depósito de cadáveres.
### Cadena de frío {#screen-cold_chain}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Cadena de frío

**Estado:** Parcial

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Cadena de frío

**3. Finalidad y alcance.** Define los intervalos de temperatura (tipos de condición) y los frigoríficos y congeladores (unidades de almacenamiento) cuyas lecturas se vigilan, y enumera los contenedores inteligentes. Una lectura fuera del intervalo de una unidad es una desviación: el lote de un contenedor inteligente se pone en espera y se genera una deficiencia «Cold-Chain Excursion» para su revisión mediante CAPA.

**4. Requisitos previos y dependencias.** Una unidad de almacenamiento necesita un tipo de condición, así que cree primero los tipos. Existen dos tipos integrados (Frozen Tissue, Fresh Tissue). La deficiencia que genera una desviación utiliza el tipo integrado Cold-Chain Excursion de [Deficiencias de muestras](#screen-deficiencies). Los contenedores inteligentes se registran en otro lugar (el registro de contenedores de hardware) y aparecen aquí en solo lectura.

Setup step: Tier 2, step 13
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-cold_chain - Cadena de frío con las pestañas Unidades de almacenamiento, Tipos de condición y Contenedores inteligentes]

**6. Referencia de campos.**

#### Pestaña Unidades de almacenamiento

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Columnas | Nombre, Tipo de condición, Estado, Acciones | No aplicable | | No aplicable |
| + Añadir unidad de almacenamiento | Botón | No aplicable | | No aplicable |
| Lecturas | Botón de fila | No aplicable | Abre la última lectura, los recuentos de lecturas y de desviaciones, una tabla de lecturas y el control **Enviar lectura simulada**. | No aplicable |
| Editar, Desactivar, Reactivar | Botones de fila | No aplicable | | No aplicable |

#### Ventana de alta y edición de unidad de almacenamiento

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | | Ninguno |
| Tipo de condición | Lista de selección de tipos de condición activos | Obligatorio | El intervalo con el que se comprueban las lecturas de la unidad. | El primer tipo activo |
| Activo | Casilla de verificación | Opcional | | Activado |

#### Pestaña Tipos de condición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Columnas | Nombre, Rango permitido, Estado, Acciones | No aplicable | Los tipos integrados se marcan como «Integrado». | No aplicable |
| Quitar | Botón de fila | No aplicable | Pide confirmación. No se ofrece para los tipos integrados. | No aplicable |

#### Ventana de alta y edición de tipo de condición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | | Ninguno |
| Máximo permitido (°C) | Número | Obligatorio | Una lectura por encima de este valor es una desviación. | Ninguno |
| Mínimo permitido (°C, opcional) | Número inferior al máximo | Opcional | Déjelo vacío cuando solo importa un máximo, como en un congelador. | En blanco |
| Activo | Casilla de verificación | Opcional | | Activado |

#### Pestaña Contenedores inteligentes

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Contenedor, Tipo de condición, Lote actual, Acciones | Columnas de solo lectura | No aplicable | Solo se enumeran los contenedores marcados como contenedores inteligentes. **Lecturas** abre el mismo panel de lecturas. | No aplicable |

#### Control Enviar lectura simulada

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Temperatura (°C) | Número | Obligatorio | Se envía por el mismo procesamiento que una lectura de un sensor, marcada como Simulada, con «Simulated» en la pista de auditoría. | Ninguno |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, desactivar, quitar: `config:cold-chain:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Enviar una lectura simulada se comprueba por separado: una persona sin permiso ve «You don't have permission to send a simulated reading.»

**Límites conocidos.** No hay ningún sensor conectado. Todas las lecturas proceden del control Simulada y se etiquetan como Simulada en todas partes. Por eso el estado es Parcial: los diccionarios de unidades y de tipos están construidos, las lecturas en directo no. Los tipos incluidos de serie son Frozen Tissue (como máximo -20 °C) y Fresh Tissue (como máximo 8 °C).

### Deficiencias de muestras {#screen-deficiencies}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Deficiencias de muestras

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones**
**2. Elemento de mantenimiento:** Deficiencias de muestras (dos pestañas: Tipos de deficiencia y Tipos de resolución)

**3. Finalidad y alcance.** Una deficiencia es un problema registrado de una muestra o de un caso (un recipiente dañado, una discordancia de etiqueta, una petición que falta). Un tipo de resolución indica cómo se resolvió. Esta pantalla contiene las dos listas. El propio sistema genera algunos tipos de deficiencia mediante su id fijo, por ejemplo Cold-Chain Excursion, Tissue Discrepancy y Block Lost.

**4. Requisitos previos y dependencias.** La lista de selección Laboratorio ejecutor utiliza los laboratorios ejecutores del [Diccionario de centros](#screen-facility-dictionary). Si la deja en Global, la opción se aplica a todos los laboratorios y no hace falta la lista de centros.

Setup step: Tier 2, step 14
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-deficiencies - Deficiencias de muestras con las pestañas Tipos de deficiencia y Tipos de resolución]

**6. Referencia de campos.**

#### Ambas pestañas

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtro de laboratorio | Opción: Todos los laboratorios, Solo globales o un laboratorio ejecutor | Opcional | Se muestra cuando existen laboratorios ejecutores. | Todos los laboratorios |
| Columnas | Tipo de deficiencia o Tipo de resolución, Descripción, Nivel (solo en la pestaña de deficiencias), Laboratorio ejecutor, Estado, Acciones | No aplicable | | No aplicable |
| + Añadir tipo de deficiencia, + Añadir tipo de resolución | Botón | No aplicable | | No aplicable |
| Editar, Desactivar, Activar | Botones de fila | No aplicable | No hay eliminación. | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | Único dentro del laboratorio ejecutor, o dentro de Global. Una repetición se rechaza con «already exists». | Ninguno |
| Descripción | Texto libre | Opcional | Se muestra como indicación cuando alguien selecciona la opción. | En blanco |
| Nivel | Opción: Muestra, Caso/Solicitud, Ambos | Obligatorio | Solo en la pestaña Tipos de deficiencia. Muestra es para una muestra concreta (daño del recipiente). Caso/Solicitud abarca todo el caso (documentación que falta). | Ambos |
| Laboratorio ejecutor | Lista de selección: Global o un laboratorio ejecutor | Opcional | Global significa todos los laboratorios ejecutores. | Global |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, desactivar: `config:deficiency-types:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada.

**Límites conocidos.** Se incluyen de serie veintinueve tipos de deficiencia y doce tipos de resolución. Desactivar un tipo que el sistema genera por su id fijo no está bloqueado, y esta guía no ha comprobado qué hace entonces el sistema. Esta pantalla no tiene bloqueo de solo lectura.

## Parte C: configuraciones de tipos de recipiente, de casete y de portaobjetos {#ch3-container-cassette}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio

Esta parte contiene los recipientes en los que llega una muestra, los colores de casete y las reglas que eligen un color, y los colores de tinta que se usan en los márgenes.

**No existe ninguna pantalla de tipos de portaobjetos.** PathScribe no tiene un diccionario de tipos de portaobjetos ni una lista de selección de tipos de portaobjetos en ninguna parte de Configuración. Lo que sí tiene es el recuento de **Portaobjetos** de cada paso de una entrada del [Diccionario de protocolos](#screen-protocols) (cuántos portaobjetos corta un paso), los **Protocolos de corte** y las **Macros de pedido rápido** del [Catálogo diagnóstico](#screen-stains) (niveles y cortes seriados), y el diseño de la etiqueta en [Diseñador de etiquetas](#screen-label_designer). El tipo de casete, que es el formato físico del bloque, procede del **Formato de procesamiento** del protocolo, no de una pantalla de esta parte.

### Tipos de recipiente {#screen-container_types}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Tipos de recipiente

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Tipos de recipiente (título de la página «Diccionario de tipos de contenedor»)

**3. Finalidad y alcance.** La lista de clasificaciones de recipientes que se usan en el registro: un bote de formol de 20 ml prellenado, un bote seco de 60 ml, un cubo de 1 litro, un vial de citología en base líquida, un tubo de medio RPMI. Cada uno tiene una categoría, una capacidad opcional, un fijador predeterminado opcional y un indicador que dice si se suministra prellenado. La lista se elige en la página de registro y en la ventana de edición de la muestra.

**4. Requisitos previos y dependencias.** La lista de selección Fijador predeterminado lee el diccionario de fijadores. Ese diccionario viene incluido de serie (quince fijadores y medios) y no tiene una pantalla de mantenimiento propia, por lo que no hay nada que configurar antes. El laboratorio ejecutor utiliza los laboratorios ejecutores del [Diccionario de centros](#screen-facility-dictionary); déjelo en Todos los laboratorios para evitar esa dependencia.

Setup step: Tier 2, step 9
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-container_types - Lista del Diccionario de tipos de contenedor con filtros]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Búsqueda | Texto | Opcional | Nombre o descripción. | En blanco |
| Filtro de estado | Opción: Todos, Activo, Inactivo | Opcional | | Todos |
| Filtro de laboratorio | Opción: Todos los laboratorios, Solo globales (sin laboratorio definido) o un laboratorio | Opcional | | Todos los laboratorios |
| Columnas | Tipo de recipiente, Categoría, Correspondencia APLIS, Laboratorio ejecutor, Estado, Acciones | No aplicable | | No aplicable |
| + Añadir tipo de contenedor | Botón | No aplicable | | No aplicable |
| Editar, Desactivar, Reactivar | Botones de fila | No aplicable | No hay eliminación. | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | Único dentro del laboratorio ejecutor, o dentro de Todos los laboratorios. | Ninguno |
| Descripción | Texto libre | Opcional | Terminología de la mesa de trabajo, nombres comerciales o convenciones locales. | En blanco |
| Categoría | Opción: Histología (biopsias y resecciones), Citología (líquidos y extensiones), Medios especiales (pruebas complementarias) | Obligatorio | | Histología |
| Correspondencia APLIS | Texto | Opcional | Para qué tipo de muestra se usa normalmente el recipiente. Dos recipientes no pueden tener la misma correspondencia dentro de un laboratorio. | En blanco |
| Capacidad (ml) | Número | Opcional | Déjelo en blanco si la capacidad varía o no es significativa. | En blanco |
| Fijador predeterminado | Lista de selección de fijadores activos | Opcional | «None (dry / bench-filled)» para un recipiente seco. | Ninguno |
| Prellenado | Interruptor Sí/No | Opcional | Sí: se suministra prellenado con el fijador indicado arriba. No: lo llena en la mesa de trabajo o quien recoge la muestra. | No |
| Laboratorio ejecutor | Lista de selección: Todos los laboratorios o un laboratorio ejecutor | Opcional | | Todos los laboratorios |
| Notas de lógica del sistema | Texto libre | Opcional | Documentación del comportamiento previsto. Hoy no hace nada. | En blanco |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, desactivar: `config:container-types:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** Las notas de lógica del sistema son solo documentación: nada inicia un aviso URGENTE (STAT), un temporizador de fijación ni un modificador de facturación a partir de la elección de un recipiente. La lista de fijadores no se puede editar en ninguna pantalla. La lista incluida de serie es más larga que los «9 standard defaults» que menciona el subtítulo de la página.

### Colores de casete {#screen-cassette_colors}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Colores de casete

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Colores de casete

**3. Finalidad y alcance.** El diccionario de los colores de casete. Las [Reglas de encaminamiento de casetes](#screen-cassette_routing_rules) se refieren a un color mediante este diccionario, de modo que cambiar aquí un nombre visible actualiza todas las reglas. Cada color lleva además su propia política de sustitución: qué hacer cuando la tolva de ese color no está disponible, sustituir automáticamente por otro color o preguntar al técnico.

**4. Requisitos previos y dependencias.** Ninguno. La lista de selección Sustituir por enumera los demás colores, por lo que debe existir antes un color por el que sustituir.

Setup step: Tier 2, step 16
Requires: Ninguno, es un punto de partida.
Unlocks: [Reglas de encaminamiento de casetes](#screen-cassette_routing_rules)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-cassette_colors - Lista de Colores de casete]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtro de laboratorio | Opción: Todos los laboratorios, Solo globales (sin laboratorio definido) o un laboratorio | Opcional | | Todos los laboratorios |
| Columnas | Color, Clave, Laboratorio ejecutor, Política de sustitución, Estado, Acciones | No aplicable | La sustitución se muestra como «Auto → nombre» o «Preguntar al técnico». | No aplicable |
| + Añadir color | Botón | No aplicable | | No aplicable |
| Editar, Desactivar, Reactivar | Botones de fila | No aplicable | | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Clave | Texto, convertido a mayúsculas y con los espacios cambiados por guiones bajos | Obligatorio | La clave estable que se envía al motor de grabado. Cambiar más tarde el nombre visible nunca la rompe. Única dentro del laboratorio ejecutor, o dentro de Todos los laboratorios. | Ninguno |
| Nombre visible | Texto | Obligatorio | Único dentro del laboratorio ejecutor, o dentro de Todos los laboratorios. | Ninguno |
| Código hexadecimal | Selector de color y texto, hexadecimal de 6 dígitos como `#3B82F6` | Obligatorio | Se rechaza si no es un código hexadecimal real de 6 dígitos. | Ninguno |
| Si la tolva de este color no está disponible | Opción: Sustitución automática, Preguntar al técnico | Obligatorio | | Preguntar al técnico |
| Sustituir por | Lista de selección de otros colores | Obligatorio con Sustitución automática | El color que se usa en su lugar. | Ninguno |
| Laboratorio ejecutor | Lista de selección: Todos los laboratorios o un laboratorio ejecutor | Opcional | | Todos los laboratorios |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, desactivar: `config:cassette-colors:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** PathScribe decide qué color lógico recibe un casete. No modela números de tolva ni cubetas físicas. Los colores incluidos de serie son White, Blue, Red, Pink, Green / Mesh y Yellow. White se incluye con Preguntar al técnico, como ancla a la que recurren los demás.

### Reglas de encaminamiento de casetes {#screen-cassette_routing_rules}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Reglas de encaminamiento de casetes

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Reglas de encaminamiento de casetes

**3. Finalidad y alcance.** Decide qué color de casete recibe un bloque, a partir del protocolo, la prioridad de la petición, la estación de origen, el centro solicitante y el tipo de caso. Se deben cumplir todas las condiciones que usted defina. Una condición sin definir coincide con cualquier valor, por lo que una regla sin condiciones lo abarca todo. Cuando coincide más de una regla, gana la de mayor peso de prioridad, y en un empate gana la regla creada antes. Una regla se ignora fuera de sus fechas Vigente desde y Vigente hasta. El tipo de casete (formato) nunca se define aquí: procede del formato de procesamiento del protocolo coincidente.

**4. Requisitos previos y dependencias.** La lista de selección de protocolos lee el [Diccionario de protocolos](#screen-protocols), la de colores lee [Colores de casete](#screen-cassette_colors), la de estaciones de origen lee [Estaciones de escaneo](#screen-scan_stations) y la de centros solicitantes lee el [Diccionario de centros](#screen-facility-dictionary). Si se omiten los colores, la lista Color del casete está vacía y no se puede guardar ninguna regla.

Setup step: Tier 2, step 17
Requires: [Diccionario de protocolos](#screen-protocols), [Colores de casete](#screen-cassette_colors), [Estaciones de escaneo](#screen-scan_stations), [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-cassette_routing_rules - Lista de Reglas de encaminamiento de casetes ordenada por peso]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Columnas | Peso, Regla, Condiciones, Color, Estado, Acciones | No aplicable | Ordenadas por peso, de mayor a menor. Las condiciones se leen «Protocolo: nombre», «Prioridad: lista», «Puesto: nombre», «Centro: nombre», «Tipo de caso: tipo» o «Cualquiera (comodín)». | No aplicable |
| + Añadir regla | Botón | No aplicable | | No aplicable |
| Editar, Duplicar, Desactivar, Reactivar | Botones de fila | No aplicable | Duplicar abre una copia llamada «nombre (Copy)». | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre de la regla | Texto | Obligatorio | | Ninguno |
| Descripción | Texto libre | Opcional | | En blanco |
| Protocolo | Lista de selección: «Cualquier protocolo» o un protocolo | Opcional | | Cualquier protocolo |
| Prioridad de la petición | Casillas de verificación: Rutina, Urgente, URGENTE (STAT) | Opcional | Si se marca más de una, significa cualquiera de ellas. | Ninguna marcada |
| Estación de origen | Lista de selección: «Cualquier puesto» o una estación de escaneo | Opcional | | Cualquier puesto |
| Centro solicitante | Lista de selección: «Cualquier centro» o un centro | Opcional | | Cualquier centro |
| Tipo de caso | Texto | Opcional | Texto libre, por ejemplo Consultation o Reference Lab. Debe coincidir exactamente con el tipo de caso del caso. | En blanco |
| Color del casete | Lista de selección de colores | Obligatorio | Un color inactivo se muestra con «(inactivo)». | Ninguno |
| Clave de la plantilla de impresión | Texto | Opcional | Una clave libre para un diseño de impresión. | En blanco |
| Peso de prioridad | Número entero, de 1 a 100 | Obligatorio | Gana el mayor cuando coincide más de una regla. | 10 |
| Vigente desde | Fecha | Opcional | | En blanco |
| Vigente hasta | Fecha | Opcional | | En blanco |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, duplicar, desactivar: `config:cassette-routing:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** Una regla también puede comprobar si una muestra de citología es un bloque celular o líquido residual (una condición de decantación), y la regla Cell Block incluida de serie la utiliza, pero esta ventana no tiene ningún campo para ello, por lo que no se puede definir en una regla nueva. Se incluyen de serie ocho reglas, entre ellas STAT Override, Cell Block, Renal Protocol y cuatro reglas de biopsias pequeñas.
### Colores de tinta {#screen-ink_colors}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Colores de tinta

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Colores de tinta

**3. Finalidad y alcance.** El diccionario de colores con el que se validan en la firma las aplicaciones de tinta de márgenes, y del que eligen los formularios de márgenes y de tinta de la pantalla de tallado.

**4. Requisitos previos y dependencias.** Ninguno. Si se omite, el selector de tinta del tallado está vacío y la comprobación del marcado con tinta en la firma no tiene nada con lo que validar. El rigor de esa comprobación (solo aviso o aplicación estricta, solo aviso de forma predeterminada) se define por centro en otra pantalla, el modo de validación del marcado con tinta.

Setup step: Tier 2, step 18
Requires: Ninguno, es un punto de partida.
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-ink_colors - Lista de Colores de tinta]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Columnas | Color, Código, Estado, Acciones | No aplicable | | No aplicable |
| + Añadir color | Botón | No aplicable | | No aplicable |
| Editar, Desactivar, Reactivar | Botones de fila | No aplicable | | No aplicable |
| Nombre | Texto | Obligatorio | Único en toda la lista. | Ninguno |
| Código | Texto, como `#0000FF` | Obligatorio | El código que se valida en la firma. Único en toda la lista. | Ninguno |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, desactivar: `config:ink-color:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** Los colores incluidos de serie son Black, Blue, Green, Yellow, Orange, Red y Violet. El cuadro del código es de texto libre; la pantalla muestra una muestra de color solo cuando el valor es un código hexadecimal de 6 dígitos.

## Parte D: protocolos de procesamiento y maestros de tinciones, anticuerpos y tinciones especiales {#ch3-stains-protocols}
Breadcrumb: Inicio > Configuración > Sistema

Esta parte contiene las listas maestras de todo lo que se hace a una muestra después del tallado: las tinciones, los anticuerpos y las pruebas moleculares, los lotes de reactivos que se utilizan y los protocolos de procesamiento.

**Dónde están los anticuerpos y las tinciones especiales.** PathScribe no tiene una pantalla independiente de anticuerpos ni otra de tinciones especiales. Ambos son entradas del [Catálogo diagnóstico](#screen-stains) (el diccionario de tinciones), que se distinguen por la **Categoría**: un anticuerpo es una entrada con la categoría **IHQ** (o **Inmunofluorescencia**) que lleva un **Clon del anticuerpo** y un **Proveedor**, y una tinción especial es una entrada con la categoría **Tinción especial**. Los lotes de anticuerpos y de kits de tinciones especiales se registran en [Lotes de reactivos y soluciones](#screen-reagent_lots).

### Catálogo diagnóstico {#screen-stains}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Catálogo diagnóstico

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Catálogo diagnóstico (el diccionario de tinciones). Tiene cuatro pestañas: Ensayos diagnósticos, Protocolos de corte, Macros de pedido rápido y Dianas maestras.

**3. Finalidad y alcance.** Un único catálogo para tinciones (de rutina, especiales, inmunohistoquímica, inmunofluorescencia, citología), pruebas moleculares (FISH, PCR, NGS) y otras pruebas. Un **Ensayo diagnóstico** es lo que se pide. Un **Protocolo de corte** indica cómo se corta el bloque (por ejemplo Level x 3). Ambos están separados a propósito. Una **Macro de pedido rápido** reúne uno de cada en un único atajo de petición. **Dianas maestras** es la lista de sondas, genes y regiones de mutación con las que se construyen las pruebas moleculares.

**4. Requisitos previos y dependencias.** Los campos moleculares eligen los laboratorios ejecutores y los laboratorios de referencia del [Diccionario de centros](#screen-facility-dictionary). Los laboratorios de referencia necesitan el rol Reference Lab. Los códigos de facturación se escriben como el billingCode de una entrada del Diccionario de facturación, nunca como un código CPT directo, y el Diccionario de facturación se configura más adelante (nivel 7), por lo que un código escrito aquí no se comprueba al guardar. Si se omite el catálogo, el [Diccionario de protocolos](#screen-protocols) no tiene tinciones que poner en un paso, y [Lotes de reactivos y soluciones](#screen-reagent_lots) no tiene ninguna a la que asociar un lote.

Setup step: Tier 2, step 7
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Diccionario de protocolos](#screen-protocols), [Lotes de reactivos y soluciones](#screen-reagent_lots)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-stains - Catálogo diagnóstico con la pestaña Ensayos diagnósticos]

**6. Referencia de campos.**

#### Pestaña Ensayos diagnósticos: lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Búsqueda | Texto | Opcional | Coincide con el nombre o la categoría. | En blanco |
| Columnas | Nombre, Categoría, Clon / Proveedor, Código de facturación, Plazo de entrega, Estado, Acciones | No aplicable | | No aplicable |
| Exportar | Botón | No aplicable | Descarga StainDictionary.csv con Name, Category, Description, AntibodyClone, Vendor, DefaultTurnaroundHours y Active. La exportación se escribe en el registro de auditoría. | No aplicable |
| Importar hoja de cálculo | Botón | No aplicable | Lee un CSV con las mismas columnas. Una fila coincide con una entrada existente por el nombre, sin distinguir mayúsculas de minúsculas. La vista previa dice «N new, M to update». **Aplicar importación** las escribe. | No aplicable |
| + Añadir proceso diagnóstico | Botón | No aplicable | | No aplicable |
| Editar, Duplicar | Botones de fila | No aplicable | | No aplicable |

#### Ventana de ensayo diagnóstico

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | Único en todo el catálogo. Una repetición se rechaza. | Ninguno |
| Categoría | Opción: Rutina, Tinción especial, IHQ, Inmunofluorescencia, Molecular, Citología, Otras | Obligatorio | Decide cuáles de los campos siguientes se muestran. | Rutina |
| Descripción | Texto libre | Opcional | | En blanco |
| Código de facturación predeterminado | Texto | Opcional | El billingCode de una entrada del Diccionario de facturación. Déjelo en blanco para usar la regla genérica de IHQ o de tinción especial. | En blanco |
| Unidad de facturación independiente | Interruptor Sí/No | Opcional | Solo IHQ con un código de facturación. Desactivado: la tinción sigue contando en la secuencia de IHQ primera y adicionales de la muestra. Activado: ni ocupa un lugar en la secuencia ni cambia el recuento. | Desactivado |
| Modo de aplicación del control de calidad posterior a la ejecución | Opción: sin sustitución, Obligatorio, Resolución automática, Híbrido | Opcional | Solo IHQ y Tinción especial. Sustituye el valor predeterminado del instrumento del grupo de estaciones de trabajo para un lote que ejecuta esta tinción. | Sin sustitución |
| Exigir portaobjetos de control de la diana | Interruptor Sí/No | Opcional | Solo IHQ y Tinción especial. Aplica la barrera de CC en la firma. | Desactivado |
| Añadir automáticamente portaobjetos de control al crear el lote | Interruptor Sí/No | Opcional | Se muestra solo cuando se exige un portaobjetos de control. | Desactivado |
| Tejido de control predeterminado | Texto | Opcional | Se muestra solo cuando se exige un portaobjetos de control. Rellena la descripción del portaobjetos de control. Nunca se comprueba. | En blanco |
| Clon del anticuerpo | Texto | Opcional | Solo IHQ e Inmunofluorescencia. | En blanco |
| Proveedor | Texto | Opcional | Solo IHQ e Inmunofluorescencia. | En blanco |
| Metodología | Opción: FISH de Anatomía Patológica, FISH citogenética, PCR dirigida / de un solo gen, Panel NGS | Opcional | Solo Molecular. | Ninguno |
| Realizar en el propio laboratorio en | Lista de casillas de laboratorios ejecutores | Opcional | Solo Molecular. Un pedido complementario en un laboratorio marcado ofrece «in-house» y empieza con esa opción, y el pedido va a la cola de pedidos del centro de trabajo molecular. El envío a un laboratorio externo siempre se ofrece. | Ninguno marcado |
| Laboratorios de referencia autorizados para esta prueba | Lista de casillas de laboratorios de referencia activos | Opcional | Solo Molecular. Un pedido complementario ofrece solo estos laboratorios. Si no hay ninguno marcado, se ofrecen todos los laboratorios de referencia activos. | Ninguno marcado |
| Laboratorio predeterminado | Lista de selección de los laboratorios de referencia marcados | Opcional | Solo Molecular. Se rellena en un pedido complementario nuevo. | Sin predeterminado |
| Dianas predeterminadas | Cuadro de búsqueda y lista de dianas maestras | Opcional | Solo Molecular. Se copian en cada pedido nuevo y allí se pueden editar libremente. Cambiarlas nunca cambia un pedido existente. También puede escribir un símbolo nuevo y un detalle opcional y seleccionar **Añadir al diccionario maestro**. | Ninguno |
| Modelo de facturación | Opción: Base + complemento (con umbral de múltiplex), Multiplicador por unidad, Tarifa plana | Obligatorio para Molecular | Decide cuáles de los campos siguientes se muestran. Solo se guardan los campos que utiliza el modelo elegido. | Base + complemento |
| billingCode base (1.ª diana) | Texto | Opcional | Solo Base + complemento. | En blanco |
| billingCode complementario (cada adicional) | Texto | Opcional | Solo Base + complemento. | En blanco |
| billingCode múltiplex | Texto | Opcional | Solo Base + complemento. | En blanco |
| Umbral de múltiplex | Número entero | Opcional | Solo Base + complemento. | 3 |
| billingCode por unidad | Texto | Opcional | Solo Multiplicador por unidad. | En blanco |
| billingCode de tarifa plana | Texto | Opcional | Solo Tarifa plana. | En blanco |
| Plazo de entrega predeterminado (horas) | Número, 0 o más | Opcional | | En blanco |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |

#### Pestaña Protocolos de corte

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Columnas | Nombre, Descripción, Estado, Acciones | No aplicable | | No aplicable |
| + Añadir protocolo | Botón | No aplicable | | No aplicable |
| Nombre | Texto | Obligatorio | Único. Una repetición se rechaza. | Ninguno |
| Descripción | Texto libre | Opcional | Qué significa la instrucción de corte. | En blanco |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |

#### Pestaña Macros de pedido rápido

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Columnas | Etiqueta, Tipo de tinción, Protocolo de corte, Estado, Acciones | No aplicable | | No aplicable |
| + Añadir macro | Botón | No aplicable | | No aplicable |
| Etiqueta | Texto | Obligatorio | Por ejemplo «H&E x 3». Única. | Ninguno |
| Tipo de tinción | Lista de selección de ensayos diagnósticos | Obligatorio | | El primer ensayo |
| Protocolo de corte | Lista de selección de protocolos de corte | Obligatorio | | El primer protocolo |
| Orden | Número entero | Opcional | El lugar que ocupa en la lista de atajos. | 99 |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |

#### Pestaña Dianas maestras

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Columnas | Símbolo, Tipo, Detalle, Estado, Acciones | No aplicable | | No aplicable |
| + Añadir objetivo | Botón | No aplicable | | No aplicable |
| Símbolo | Texto | Obligatorio | Por ejemplo ERBB2. Se rechaza repetir el mismo símbolo y detalle. | Ninguno |
| Tipo | Opción: Sonda (FISH), Gen (NGS), Región de mutación (PCR) | Obligatorio | | Sonda |
| Detalle | Texto | Opcional | Por ejemplo 17q12 (locus) o V600E (mutación). | En blanco |
| Estado | Interruptor Activo / Inactivo | Opcional | Una diana inactiva permanece en las entradas que ya la utilizan, pero no se ofrece al buscar una nueva diana predeterminada. | Activo |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir y editar en las cuatro pestañas: `config:stain-dictionary:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** La importación y la exportación en CSV solo llevan siete columnas. No incluyen campos de facturación, de CC ni moleculares, y una importación no comprueba el valor de Categoría frente a la lista. El catálogo incluido de serie contiene tinciones de rutina y especiales, anticuerpos de IHQ con sus clones, marcadores de inmunofluorescencia, tinciones de citología y pruebas moleculares.

### Diccionario de protocolos {#screen-protocols}
Breadcrumb: Inicio > Configuración > Sistema > Consultas clínicas > Diccionario de protocolos

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas clínicas**
**2. Elemento de mantenimiento:** Diccionario de protocolos

**3. Finalidad y alcance.** Un protocolo es un flujo de procesamiento independiente y reutilizable. No está ligado a un tipo de muestra: se asigna desde el campo **Protocolo de procesamiento** del [Diccionario de muestras](#screen-specimens), y editarlo aquí cambia todos los tipos de muestra que lo utilizan. Un protocolo tiene una o más **vías** (por ejemplo Microscopía óptica, Inmunofluorescencia, Microscopía electrónica). Cada vía tiene un tipo de material (bloque o decantado), un fijador, un formato de procesamiento y pasos ordenados. Un paso puede cortar portaobjetos, aplicar tinciones o ser una retención. Un protocolo puede exigir triaje en la mesa de trabajo, con una lista de verificación.

**4. Requisitos previos y dependencias.** Los pasos eligen las tinciones del [Catálogo diagnóstico](#screen-stains). Las listas de selección de fijador y de formato de procesamiento leen dos diccionarios fijos que no tienen pantalla de mantenimiento (quince fijadores y medios, cuatro formatos: Standard, Megablock, Frozen Block, Resin Grid). Un protocolo nuevo toma el fijador y el formato predeterminados, y empieza como una vía de decantación cuando su departamento es un departamento de líquidos ([Departamentos](#screen-departments)). Si se omite el catálogo, el selector de tinciones del paso está vacío.

Setup step: Tier 2, step 8
Requires: [Departamentos](#screen-departments), [Catálogo diagnóstico](#screen-stains)
Unlocks: [Diccionario de muestras](#screen-specimens), [Reglas de encaminamiento de casetes](#screen-cassette_routing_rules)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-protocols - Lista del Diccionario de protocolos con filtros, Exportar e Importar]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Filtro de laboratorio | Opción: Todos los laboratorios, Solo globales (sin laboratorio definido) o un laboratorio | Opcional | | Todos los laboratorios |
| Columnas | Nombre, Laboratorio ejecutor, Vías, Usado por, Requiere triaje, Estado, Acciones | No aplicable | **Usado por** cuenta los tipos de muestra que se asignan al protocolo. | No aplicable |
| Exportar | Botón | No aplicable | Descarga los protocolos, una fila por paso. | No aplicable |
| Importar hoja de cálculo | Botón | No aplicable | Lee un archivo con el formato de la exportación. La vista previa enumera las tinciones sin coincidencia y los recuentos no válidos. **Aplicar importación** escribe los protocolos. | No aplicable |
| + Añadir protocolo | Botón | No aplicable | | No aplicable |
| Editar, Duplicar | Botones de fila | No aplicable | Duplicar abre «Añadir protocolo: clonado de nombre». | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre | Texto | Obligatorio | Único dentro del laboratorio ejecutor, o dentro de Todos los laboratorios. | Ninguno |
| Laboratorio ejecutor | Lista de selección: Todos los laboratorios o un laboratorio ejecutor | Opcional | | Todos los laboratorios |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |
| Descripción | Texto libre | Opcional | Para qué sirve y qué tipos de muestra se le asignan. | En blanco |
| Requiere triaje en la mesa | Interruptor Sí/No | Opcional | | No obligatorio |
| Lista de verificación de triaje | Lista de pasos de texto | Opcional | Se muestra cuando se exige triaje. Añadir paso y Quitar. | Vacía |
| Banner de uso | Texto | No aplicable | Indica qué tipos de muestra se asignan al protocolo, o «Actualmente no está asignado a ningún tipo de muestra». | No aplicable |
| Historial | Lista de versiones anteriores | No aplicable | Ver y **Restaurar esta versión** devuelven el protocolo a una versión anterior. | No aplicable |

#### Vía (se exige al menos una)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nombre de la vía | Texto | Obligatorio | Por ejemplo Microscopía óptica. | Ninguno |
| Tipo de material | Opción: Bloque (tejido sólido, casete), Decantado (líquido / citología) | Obligatorio | | Bloque |
| Fijador | Lista de selección de fijadores | Obligatorio | Un valor que no está en el diccionario se muestra con «(no está en el diccionario)». | El fijador predeterminado |
| Formato de procesamiento | Lista de selección de formatos | Obligatorio | El tipo de casete. | El formato predeterminado |
| Requiere descalcificación | Interruptor Sí/No | Opcional | | Desactivado |
| Recuento predeterminado de bloques o Recuento predeterminado de decantados | Número entero mayor que 0 | Opcional | Un cuadro en blanco significa 1. | En blanco |
| Recuento predeterminado de fragmentos | Número entero mayor que 0 | Opcional | Solo en las vías de bloque. Se rechaza en una vía de decantado. | En blanco |
| Añadir vía, Quitar vía | Botones | No aplicable | | No aplicable |

#### Paso (dentro de una vía)

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Acción del paso | Texto | Opcional | Por ejemplo Corte nivel 1, Biopsia intraoperatoria. | En blanco |
| Tinciones | Lista de búsqueda y selección de ensayos diagnósticos | Opcional | Busque por nombre o categoría. | Ninguno |
| Portaobjetos | Número entero | Opcional | | En blanco |
| Retener | Interruptor Sí/No | Opcional | Un paso de retención. | Desactivado |
| Añadir paso, Quitar paso | Botones | No aplicable | | No aplicable |

El botón **Guardar cambios** está desactivado hasta que el nombre, el nombre de cada vía y los recuentos de cada vía son válidos.

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, restaurar una versión: `config:processing-protocols:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** Tres propiedades almacenadas por vía y por paso no tienen campo en la pantalla: una duración de descalcificación, un indicador «enviar un pedido saliente» en un paso y una lista de tinciones adicionales permitidas. Las listas de fijadores y de formatos de procesamiento no se pueden editar en ninguna pantalla. No debe confundirse con la pestaña de protocolos de la Biblioteca sinóptica ([capítulo 6](#screen-tab-protocols)), que contiene protocolos de notificación y no flujos de procesamiento.

### Lotes de reactivos y soluciones {#screen-reagent_lots}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Lotes de reactivos y soluciones

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Lotes de reactivos y soluciones (título de la página «Registro de lotes de reactivos y soluciones»)

**3. Finalidad y alcance.** Un registro de lotes de reactivos con número de lote, fecha de caducidad y estado del CC. Un lote es de una tinción del catálogo (un anticuerpo de IHQ o un kit de tinción especial) o de uno de los siete reactivos de la línea de H&E de rutina. Cuando alguien crea un lote de tinción, se ofrecen los lotes activos para asociarlos.

**4. Requisitos previos y dependencias.** El lote de una tinción del catálogo se elige entre las entradas activas y no de rutina del [Catálogo diagnóstico](#screen-stains). Si se omite el catálogo, la lista Tinción está vacía. Los reactivos de la línea de rutina son una lista fija y no necesitan nada.

Setup step: Tier 2, step 19
Requires: [Catálogo diagnóstico](#screen-stains)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-reagent_lots - Lista del Registro de lotes de reactivos y soluciones]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Búsqueda | Texto | Opcional | Número de lote o tinción. | En blanco |
| Filtro de estado | Opción: Todos los estados, Activo, Inactivo | Opcional | | Todos los estados |
| Filtro de estado del CC | Opción: Todos los estados de control de calidad, Pendiente, Superado, No superado | Opcional | | Todos los estados de control de calidad |
| Columnas | Reactivo / tinción, Número de lote, Caducidad, Estado del control de calidad, Laboratorio ejecutor, Estado, Acciones | No aplicable | | No aplicable |
| + Añadir lote de reactivo | Botón | No aplicable | | No aplicable |
| Editar, Desactivar, Reactivar | Botones de fila | No aplicable | | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Este lote es para | Opción: Tinción del catálogo (IHQ / tinción especial), Reactivo de la línea de H&E de rutina | Obligatorio | Decide si la lista de selección siguiente es Tinción o Reactivo de la línea. | Tinción del catálogo |
| Tinción | Lista de selección de entradas activas y no de rutina del catálogo | Obligatorio para una tinción del catálogo | | Ninguno |
| Reactivo de la línea | Opción: Hematoxilina, Eosina, Reactivo de azulado, Diferenciador, Deshidratante (alcohol), Aclarante (xileno), Medio de montaje | Obligatorio para un reactivo de la línea | | Ninguno |
| Número de lote | Texto | Obligatorio | | Ninguno |
| Fecha de caducidad | Fecha | Obligatorio | | Ninguno |
| Fecha de recepción | Fecha | Opcional | | En blanco |
| Proveedor | Texto | Opcional | | En blanco |
| Estado del control de calidad | Opción: Pendiente, Superado, No superado | Obligatorio | | Pendiente |
| Laboratorio ejecutor | Lista de selección: Todos los laboratorios (existencias compartidas) o un laboratorio ejecutor | Opcional | | Todos los laboratorios |
| Activo | Interruptor Sí/No | Opcional | | Activo |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, desactivar: `config:reagent-lots:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** El registro anota el estado del CC. Esta guía no ha encontrado ninguna regla que impida que un lote de tinción utilice un lote caducado o con el control de calidad no superado, y la ventana del lote de tinción solo enumera los lotes activos.
## Parte E: bibliotecas de códigos diagnósticos {#ch3-code-libraries}
Breadcrumb: Inicio > Configuración > Sistema

Esta parte contiene los ajustes de los sistemas de codificación y de los servicios que los consultan. PathScribe no contiene por sí mismo el contenido de SNOMED CT, ICD, ICD-O, LOINC ni CPT. Cada uno lo mantiene su propio organismo de normalización y se consulta mediante un servicio.

**Dónde están los diccionarios relacionados.** La lista de modificadores CPT es el [Diccionario de modificadores CPT](#screen-modifier_dictionary) y la lista de códigos de cargo es el [Diccionario de facturación](#screen-billing_dictionary). Ambos se documentan en el [capítulo 8](#ch8), no aquí. La [Importación de códigos (masiva)](#screen-code_import) que figura más abajo carga códigos de facturación en el Diccionario de facturación. No importa códigos de diagnóstico.

### Sistemas de codificación {#screen-code_systems}
Breadcrumb: Inicio > Configuración > Sistema > Consultas clínicas > Sistemas de codificación

**Estado:** Demostración

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas clínicas**
**2. Elemento de mantenimiento:** Sistemas de codificación

**3. Finalidad y alcance.** Para cada país al que presta servicio, indica qué sistemas de codificación (ICD-10, ICD-11, ICD-O, SNOMED CT, LOINC, CPT, OPCS-4 y otros) están **Desactivado**, son **Opcional** u **Obligatorio**, y desde qué fecha. Pasar una región de ICD-10 a ICD-11 es un ajuste de esta pantalla, no un cambio de software. Una segunda tarjeta, **Terminologías con licencia**, registra las licencias de SNOMED CT e ICD-O-3 que posee su organización. Los códigos reales introducidos en las [Reglas de activación por resultado anómalo](#screen-abnormal_trigger_rules) se utilizan solo mientras la licencia correspondiente esté activada y no haya caducado. Hasta entonces se asocian códigos de prueba claramente marcados.

**4. Requisitos previos y dependencias.** La lista de países es la jurisdicción propia del laboratorio más la jurisdicción de cada centro activo, por lo que primero se configuran los centros ([Diccionario de centros](#screen-facility-dictionary)). Si se omiten, solo figura el país propio del laboratorio.

Setup step: Tier 2, step 2
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Reglas de activación por resultado anómalo](#screen-abnormal_trigger_rules)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-code_systems - Política de sistemas de codificación por país y tarjeta Terminologías con licencia]

**6. Referencia de campos.**

#### Tabla de política

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Dónde | Texto | No aplicable | Una fila por país atendido. | No aplicable |
| En uso hoy | Texto | No aplicable | Cada sistema con su rol actual, por ejemplo «ICD-10: Opcional», y «(then Required from date)» cuando existe una regla posterior. | No aplicable |
| Definido por | Texto | No aplicable | «Predeterminado» o «Set here». | Predeterminado |
| Editar | Botón de fila | No aplicable | Abre el editor de reglas de ese país. | No aplicable |
| Restablecer valores predeterminados | Botón de fila | No aplicable | Se muestra cuando existe un registro. Lo elimina. | No aplicable |

#### Editor de reglas

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Sistema de codificación | Texto con sugerencias: SNOMED CT, ICD-10, ICD-11, LOINC, ICD-O, CPT, OPCS-4 | Obligatorio | Un id de sistema. Un sistema futuro se puede escribir como dato. | Ninguno |
| Rol | Opción: Desactivado, Opcional, Obligatorio | Obligatorio | | Opcional |
| Se aplica desde | Fecha | Opcional | Déjela vacía para una regla que se aplica ahora. Para cambiar un rol más adelante, añada una segunda fila del mismo sistema con una fecha de inicio. Se aplica la última fila que ya ha empezado. | En blanco |
| Quitar | Botón de fila | No aplicable | | No aplicable |
| + Añadir regla | Botón | No aplicable | Como máximo 40 reglas por país. | No aplicable |
| Guardar | Botón | No aplicable | Se rechaza si no hay reglas, si un sistema o un rol está en blanco o no es válido, si una fecha no es real, si dos filas de un mismo sistema comparten fecha de inicio o si hay demasiadas reglas. | No aplicable |
| Cancelar | Botón | No aplicable | | No aplicable |

Un país sin registro empieza con todos los sistemas conocidos en Opcional, excepto ICD-11, que está en Desactivado.

#### Tarjeta Terminologías con licencia

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Nuestra organización posee esta licencia: usar códigos reales | Casilla de verificación, una para SNOMED CT y otra para ICD-O-3 | Opcional | Activa los códigos reales. | Desactivado |
| Titular de la licencia | Texto | Obligatorio cuando la casilla está marcada | | En blanco |
| Edición o versión | Texto | Obligatorio cuando la casilla está marcada | | En blanco |
| Referencia de la licencia o del acuerdo | Texto | Obligatorio cuando la casilla está marcada | | En blanco |
| Último día de validez | Fecha | Opcional | Déjelo en blanco si la licencia no caduca. Después de este día se vuelven a usar los códigos de prueba. | En blanco |
| Línea de estado | Texto | No aplicable | Una de estas: Licencia activada; Licencia caducada en una fecha; No hay ninguna licencia registrada; Licencia registrada pero desactivada. | No aplicable |
| Guardar licencias | Botón | No aplicable | Se rechaza con un motivo si falta un cuadro obligatorio o la fecha no es real. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Guardar, editar y restablecer la política, y guardar las licencias: `config:code-systems:manage` (riesgo alto). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Cada cambio de política se audita como `CODE_SYSTEM_POLICY_CHANGED`, con el antes y el después.

**Límites conocidos.** Los ajustes se guardan, pero todavía nada lee la política: la ventana Añadir código, la firma y los mensajes salientes no la utilizan (Planificado, `docs/architecture/DIAGNOSIS_CODING.md`). La pantalla lo dice a la vista. La política se conserva en el navegador hasta que la guarde el servidor de la API, y por eso el estado es Demostración. PathScribe no incluye el contenido de SNOMED CT ni de ICD-O-3: la licencia es un acuerdo entre su organización y el organismo que la concede.

### Servicios de terminología {#screen-terminology}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Servicios de terminología

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones**
**2. Elemento de mantenimiento:** Servicios de terminología

**3. Finalidad y alcance.** Una comprobación de conectividad. Confirma que PathScribe puede acceder a los sistemas de codificación que se usan para la búsqueda de códigos y las sugerencias de la IA: SNOMED CT, ICD-10, ICD-11, LOINC, ICD-O y CPT. Aquí no hay nada que añadir ni cargar. Cada sistema lo mantiene su propio organismo de normalización y no se versiona dentro de PathScribe. Las comprobaciones se ejecutan al abrir la pantalla y al seleccionar **Probar todos**.

**4. Requisitos previos y dependencias.** La variante correcta de ICD-10 se elige entre sus [Organismos reguladores](#screen-governing_bodies) activos: ICD-10-CM para EE. UU. (CAP), ICD-10 WHO para RCPath e ICCR, e ICD-10-AM para RCPA. Las variantes no estadounidenses y CPT necesitan un proxy de servidor. Cuando se configura una dirección del servidor de la API, las consultas de ICD-10-CM, ICD-11 y LOINC pasan por el servidor, como se describe en `docs/architecture/TERMINOLOGY_PROXY_API.md`. SNOMED CT e ICD-O se comprueban mediante la ruta UMLS del servidor.

Setup step: Tier 2, step 3
Requires: [Organismos reguladores](#screen-governing_bodies)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-terminology - Comprobación de conectividad de Servicios de terminología]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Estado general | Texto | No aplicable | «Todos los sistemas operativos» cuando todos los servicios están Activo o Licencia necesaria. En caso contrario, «Algunos servicios requieren atención». | No aplicable |
| Última comprobación | Hora | No aplicable | | No aplicable |
| Mostrar variables de entorno | Interruptor Sí/No | Opcional | Se muestra solo a un Superadmin. Muestra la variable de entorno y el valor que hay detrás de cada servicio. | Desactivado |
| Probar todos | Botón | No aplicable | Vuelve a ejecutar las comprobaciones. | No aplicable |
| Servicio | Texto | No aplicable | SNOMED CT, ICD-10-CM, ICD-11, LOINC, ICD-O, CPT. | No aplicable |
| Detalles | Texto | No aplicable | Qué ofrece el servicio y su origen (por ejemplo NLM Clinical Tables, gratuito). | No aplicable |
| Estado | Texto | No aplicable | Comprobando, Activo, Degradado, Caído, No configurado o Licencia necesaria. | No aplicable |
| Variantes de ICD-10 según la región | Aviso | No aplicable | Explica la elección de la variante descrita arriba. | No aplicable |
| Se requiere licencia CPT antes de la puesta en marcha | Aviso | No aplicable | CPT tiene licencia de la AMA y no se puede ofrecer mediante una API pública. Necesita una licencia de la AMA y un proxy de servidor. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. La pantalla no cambia ningún dato y no tiene una capacidad propia. El conmutador de variables de entorno es para un Superadmin.

**Límites conocidos.** La pantalla no puede añadir un sistema ni cambiar una dirección. Las direcciones proceden de las variables de entorno de la instalación.

### Importación de códigos (masiva) {#screen-code_import}
Breadcrumb: Inicio > Configuración > Sistema > Consultas financieras y de ingresos > Importación de códigos (masiva)

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas financieras y de ingresos**
**2. Elemento de mantenimiento:** Importación de códigos

**3. Finalidad y alcance.** Importa códigos de facturación desde un archivo CSV (CPT, HCPCS, NHS OPCS-4 o códigos propios del laboratorio) al [Diccionario de facturación](#screen-billing_dictionary). Cada importación se convierte en un trabajo. Una segunda persona debe aprobar o rechazar el trabajo completo en [Aprobaciones pendientes de reglas de facturación](#screen-pending_approvals). Las versiones anteriores de un código siguen en vigor hasta la fecha de vigencia de la versión nueva. La página tiene tres pasos y un historial de importaciones.

**4. Requisitos previos y dependencias.** No hace falta nada del nivel 2 antes. La lista de selección Sede enumera sus sedes, y **Toda la organización** aplica los códigos en todas partes. Nada cambia en el Diccionario de facturación hasta que otra persona aprueba el trabajo, así que cuente con un segundo administrador.

Setup step: Tier 2, step 4
Requires: Ninguno, es un punto de partida.
Unlocks: [Diccionario de facturación](#screen-billing_dictionary), [Aprobaciones pendientes de reglas de facturación](#screen-pending_approvals)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-code_import - Asistente de importación de códigos e historial de importaciones]

**6. Referencia de campos.**

#### Paso 1: archivo y ámbito

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Elegir archivo CSV | Archivo | Obligatorio | Se rechaza si no es un CSV, si no tiene fila de encabezado ni filas de datos, o si no se puede leer. | Ninguno |
| Norma de codificación | Opción: CPT, HCPCS, Códigos propios del laboratorio, NHS OPCS-4 | Obligatorio | | CPT |
| País | Opción agrupada en Países de operación, Unión Europea, Otros, más «Cualquier país» | Obligatorio | Al cambiar la norma se rellena un país: US para CPT y HCPCS, UK para NHS OPCS-4, en blanco para los códigos propios. | US |
| Sede | Lista de selección: Toda la organización o una sede | Opcional | | Toda la organización |
| Nota del lote | Texto | Opcional | Se añade al motivo del cambio de cada código de la importación. | En blanco |

#### Paso 2: asignar columnas

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Código de facturación | Elección de una columna del archivo, o «No figura en el archivo» | Obligatorio | PathScribe sugiere correspondencias a partir de los nombres de las columnas. Una columna puede rellenar más de un campo: una sola columna «Code» suele dar tanto el código de facturación como el código CPT. | Sugerido |
| Código CPT | Elección de una columna del archivo | Obligatorio | | Sugerido |
| Vigente desde | Elección de una columna del archivo | Obligatorio salvo que se indique una fecha para el archivo | | Sugerido |
| Descripción, Nivel, Tipo de facturación (TC / 26 / Global), Código HCPCS, RVU de trabajo, RVU de gastos de práctica, RVU de responsabilidad civil, Notas | Elección de una columna del archivo | Opcional | | Sugerido |
| Fecha de vigencia de todo el archivo | Fecha | Opcional | Se usa para las filas sin fecha propia. Sustituye la columna Vigente desde. | En blanco |
| Nivel si no figura en el archivo | Opción: Deducir a partir de la descripción, o un nivel | Opcional | | Deducir a partir de la descripción |
| Tipo de facturación si no figura en el archivo | Opción: Técnico (TC), Profesional (26), Global | Opcional | | Global |
| Comprobar archivo | Botón | No aplicable | Está desactivado hasta que se asignan los campos obligatorios. | No aplicable |

#### Paso 3: comprobar e importar

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Resumen de la vista previa | Texto | No aplicable | Recuentos de las filas que se pueden importar y de las rechazadas. | No aplicable |
| Filas rechazadas | Tabla: Fila, Código de facturación, Motivo | No aplicable | Se muestran hasta 50. Motivos: sin código de facturación, sin código CPT, una fecha de vigencia errónea o ausente, un valor de RVU erróneo, una repetición del código de facturación en el archivo, un tipo de facturación o un nivel no reconocido, o que el código ya tiene una versión en borrador o pendiente de aprobación. | No aplicable |
| Omitir estas filas e importar el resto | Casilla de verificación | Opcional | Las filas rechazadas bloquean la importación salvo que las omita. | Desactivado |
| Botón de importación | Botón | No aplicable | Guarda un trabajo pendiente de aprobación. | No aplicable |

#### Historial de importaciones

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Columnas | Archivo / trabajo, Norma de codificación, Se aplica a, Códigos, Subido, Estado, Acciones | No aplicable | El estado es Pendiente de aprobación, Aprobada, Rechazada, Revertida o Revertida (algunos códigos retirados). Los trabajos nunca se eliminan. | No aplicable |
| Revertir | Botón de fila | No aplicable | Solo para trabajos aprobados. Abre un cuadro de motivo. | No aplicable |
| Motivo de la reversión | Texto | Obligatorio | | Ninguno |
| Confirmar reversión | Botón | No aplicable | Elimina las versiones que añadió la importación. Una versión que ya han utilizado cargos se conserva y se marca como retirada. Las versiones anteriores que la importación había cerrado se reabren. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Importar y revertir: `config:billing-code-import:run` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Aprobar o rechazar un trabajo lo hace otra persona en [Aprobaciones pendientes de reglas de facturación](#screen-pending_approvals). La persona que subió un trabajo no puede aprobarlo (principio de los cuatro ojos).

**Límites conocidos.** La importación trae solo códigos de facturación, no códigos de diagnóstico. El nivel de una fila que no figura en el archivo se puede deducir a partir de la descripción. Un archivo con el mismo código de facturación dos veces se rechaza para ese código.

## Parte F: médicos solicitantes, cuentas de clientes y preferencias de distribución {#ch3-physicians-clients}
Breadcrumb: Inicio > Configuración > Sistema

Esta parte contiene las personas y organizaciones que envían trabajo, el plazo de respuesta prometido a cada cliente, las reglas que marcan un resultado como anómalo y los organismos de normalización que fijan las cifras de conservación. Las preferencias de entrega de los informes se definen en el médico (contacto preferido) y en la pestaña Informes del centro, no en una pantalla aparte.

### Médicos {#screen-physicians}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Médicos

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones**
**2. Elemento de mantenimiento:** Médicos

**3. Finalidad y alcance.** El directorio de médicos solicitantes y remitentes y de su vinculación con centros. Cada uno tiene un **Código de médico** único y, si lo tiene, un NPI (National Provider Identifier). Aquí se guardan los datos de contacto, un método de contacto preferido y un número de móvil con SMS (que se usa solo para los mensajes automáticos de alerta crítica). Un nombre de médico que llega en una petición y no coincide con ninguno crea una entrada Sin verificar que alguien debería comprobar.

**4. Requisitos previos y dependencias.** La lista Vinculación con centros lee el [Diccionario de centros](#screen-facility-dictionary). Si se omite, la lista está vacía y no se puede vincular un médico a un cliente.

Setup step: Tier 2, step 20
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-physicians - Lista de médicos con búsqueda, filtro de estado, Exportar e Importar]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Búsqueda | Texto | Opcional | Nombre, código, NPI o especialidad. | En blanco |
| Filtro de estado | Opción: Todos, Activo, Inactivo, Sin verificar | Opcional | | Todos |
| Columnas | Médico (con código y NPI), Especialidad, Contacto (con el método preferido «por»), Centros, Estado, Acciones | No aplicable | | No aplicable |
| Exportar | Botón | No aplicable | Descarga un CSV que incluye el código de médico, el NPI, el contacto, el SMS, el estado y los centros. | No aplicable |
| Importar hoja de cálculo | Botón | No aplicable | Una fila coincide con un médico existente primero por el NPI y después por el código de médico. Una fila que no tiene ninguno de los dos recibe un código nuevo. La vista previa dice «N por actualizar, M nuevos» e indica a cuántos se les dio un código nuevo. **Aplicar importación** los escribe. | No aplicable |
| Verificar | Botón de fila | No aplicable | Se muestra para las entradas Sin verificar. | No aplicable |
| Editar | Botón de fila | No aplicable | | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Tratamiento | Opción: Ninguno, Sr., Sra., Srta., Mx., Dr. | Opcional | | Ninguno |
| Sufijo | Opción entre valores preestablecidos, u Otro | Opcional | | En blanco |
| Nombre | Texto | Obligatorio | Todos los nombres de pila. | Ninguno |
| Apellidos | Texto | Obligatorio | | Ninguno |
| Nombre preferido | Texto | Opcional | Cómo debe llamarlo el personal, si es distinto. | En blanco |
| Código de médico | Texto | Obligatorio | Un identificador interno, por ejemplo PHY-0231. Único en todo el directorio. Una repetición se rechaza e indica el médico que lo tiene. | Ninguno |
| Número NPI | Texto | Opcional | No todos los médicos lo tienen. Único cuando se indica. La pantalla no comprueba el formato de 10 dígitos. | En blanco |
| Especialidad | Texto | Opcional | | En blanco |
| Teléfono, Fax | Texto | Opcional | | En blanco |
| Móvil con SMS | Texto | Opcional | Solo para los mensajes automáticos de alerta crítica. | En blanco |
| Operador móvil (EE. UU.) | Opción: Desconocido / fuera de EE. UU., Verizon, AT&T, T-Mobile, US Cellular, Otro | Opcional | Se usa para enviar el mensaje de texto como correo electrónico a la pasarela del operador. | Desconocido / fuera de EE. UU. |
| Dominio de correo a SMS del operador | Texto | Opcional | Se muestra cuando el operador es Otro. | En blanco |
| Correo electrónico | Texto | Opcional | | En blanco |
| Contacto preferido | Opción: Correo electrónico, Fax, Teléfono | Obligatorio | | Correo electrónico |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |
| Vinculación con centros | Búsqueda y lista de casillas de centros | Opcional | Un médico puede estar vinculado a varios centros. | Ninguno marcado |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, importar, verificar, desactivar: `config:physicians:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada.

**Límites conocidos.** La pantalla no tiene bloqueo de solo lectura para una persona sin la capacidad: es el servicio el que rechaza el guardado. Los médicos incluidos de serie son registros de ejemplo (de PHY-0001 en adelante).
### Configuración de centros {#screen-clients}
Breadcrumb: Inicio > Configuración > Sistema > Integraciones > Configuración de centros

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Integraciones** > **Configuración de centros**
**2. Elemento de mantenimiento:** Configuración de centros (cuentas de clientes)

**3. Finalidad y alcance.** Una cuenta de cliente es un centro con el rol de centro solicitante externo (una clínica, un hospital o una consulta que le envía muestras) o el rol de centro solicitante interno. Es la misma pantalla, con el mismo editor, que el [capítulo 2](#ch2) documenta como el [Diccionario de centros](#screen-facility-dictionary). Todo lo relativo a sus campos, pestañas y valores predeterminados está escrito una sola vez, allí. Esta sección solo dice lo que importa cuando se utiliza para configurar clientes.

**4. Requisitos previos y dependencias.** Nada la precede en el nivel 2: es la pantalla del nivel 1. Configure primero sus laboratorios ejecutores y después cada cliente. Los clientes alimentan tres pantallas del nivel 2: [Médicos](#screen-physicians) (vinculaciones), [Niveles de servicio de clientes](#screen-client_sla) (un nivel por cliente, que se asocia por la autoridad asignadora) y las excepciones de centro de las pantallas de citología.

Setup step: Tier 2, step 21
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Niveles de servicio de clientes](#screen-client_sla)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-clients - Lista de Configuración de centros con búsqueda, filtros y Añadir centro]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Página de lista: búsqueda, filtros de estado y de rol, columnas, + Añadir centro, Verificar, Editar, Duplicar, Desactivar | Véase el [Diccionario de centros](#screen-facility-dictionary) | No aplicable | Duplicar copia la configuración del nivel de organización en un centro nuevo y borra los identificadores. Desactivar un centro que aún está en uso abre **El centro sigue en uso** y le pide que confirme. | No aplicable |
| Roles de la pestaña General | Casillas de verificación: Laboratorio ejecutor, Lugar de envío interno, Centro solicitante interno, Centro solicitante externo, Obtención de muestras, Laboratorio de referencia | Obligatorio | Una cuenta de cliente es un rol solicitante. Un laboratorio de referencia al que usted envía trabajo necesita el rol de laboratorio de referencia para aparecer en el [Catálogo diagnóstico](#screen-stains). | Centro solicitante externo |
| Autoridad asignadora de la pestaña General | Texto, hasta 10 caracteres | Obligatorio | Asocia las peticiones entrantes con el cliente. Los [Niveles de servicio de clientes](#screen-client_sla) se asocian por el mismo código. | En blanco |
| Pestañas del editor | General, Integración con el SIL, Formatos de identificadores, Informes, TRT y escalado, IA y rendimiento, Ubicaciones, Mensajería segura, Impresión, Ortografía | No aplicable | Los campos de cada pestaña están en el [Diccionario de centros](#screen-facility-dictionary). Ubicaciones, Mensajería segura, Impresión y Ortografía se muestran después de guardar el centro por primera vez. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, duplicar, activar, desactivar: `config:facilities:manage` (riesgo alto, auditado). Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** La misma pantalla figura dos veces en el esquema, con dos nombres. Está documentada por completo en el capítulo 2 y no se repite aquí.

### Niveles de servicio de clientes {#screen-client_sla}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Niveles de servicio de clientes

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Niveles de servicio de clientes

**3. Finalidad y alcance.** Define el plazo de respuesta prometido a cada cliente: horas hasta la primera revisión y horas hasta el informe firmado, con objetivos URGENTES (STAT) más cortos y opcionales. Los casos se miden desde el momento en que se recibieron. Un caso que sigue abierto después de un objetivo muestra una insignia en la lista de trabajo. Un cuadro URGENTE (STAT) que se deja vacío utiliza el objetivo habitual.

**4. Requisitos previos y dependencias.** La lista **Añadir** ofrece solo los clientes que tienen una autoridad asignadora, que no están Inactivos y que aún no tienen un nivel de servicio. Configure primero los clientes ([Configuración de centros](#screen-clients)). Si se omite, la pantalla dice «Todos los clientes ya tienen un nivel de servicio, o todavía no se ha configurado ningún cliente.»

Setup step: Tier 2, step 22
Requires: [Configuración de centros](#screen-clients)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-client_sla - Tabla de niveles de servicio de clientes y Añadir un nivel de servicio de cliente]

**6. Referencia de campos.**

#### Tabla

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Cliente | Texto | No aplicable | El nombre del cliente. | No aplicable |
| Primera revisión (horas) | Número mayor que 0 | Obligatorio | Se edita en la tabla. Se guarda al salir del cuadro. No puede ser mayor que el informe firmado. | Ninguno |
| Informe firmado (horas) | Número mayor que 0 | Obligatorio | | Ninguno |
| Primera revisión URGENTE (horas) | Número mayor que 0, o vacío | Opcional | Si está vacío, muestra «Igual que el habitual». | Vacío |
| Informe firmado URGENTE (horas) | Número mayor que 0, o vacío | Opcional | Si está vacío, muestra «Igual que el habitual». | Vacío |
| Activo | Casilla de verificación | Opcional | | Activado |
| Eliminar | Botón de fila | No aplicable | | No aplicable |

#### Añadir un nivel de servicio de cliente

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Cliente | Lista de selección: «nombre (autoridad)» | Obligatorio | Solo clientes sin nivel. | Ninguno |
| Primera revisión (horas) | Número mayor que 0 | Obligatorio | | Ninguno |
| Informe firmado (horas) | Número mayor que 0 | Obligatorio | | Ninguno |
| Añadir nivel de servicio | Botón | No aplicable | Se rechaza con un motivo si falta el cliente, si ya tiene un nivel, si un objetivo no es mayor que 0 o si la primera revisión es mayor que el informe firmado. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, eliminar: `config:tat-targets:manage` (riesgo alto, auditado), la misma capacidad que la pestaña Configuración de TDR. Admin, Lab Director y Superadmin la tienen de forma predeterminada. Una persona que no la tenga ve la pantalla en solo lectura.

**Límites conocidos.** La pantalla tiene un servicio de producción y un contrato de API. Una lista de carencias más antigua la describe como solo del navegador. A un cliente sin autoridad asignadora no se le puede dar un nivel.

### Reglas de activación por resultado anómalo {#screen-abnormal_trigger_rules}
Breadcrumb: Inicio > Configuración > Sistema > Consultas clínicas > Reglas de activación por resultado anómalo

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas clínicas**
**2. Elemento de mantenimiento:** Reglas de activación por resultado anómalo (título de la página «Abnormal Detection - High-Risk Trigger Rules»)

**3. Finalidad y alcance.** Decide qué pares de campo y valor del sinóptico marcan un caso como Anómalo, Crítico o Maligno. Una coincidencia es siempre una sugerencia que el patólogo confirma o rechaza en la firma, nunca una determinación automática. Un interruptor en la parte superior desactiva la detección de resultados anómalos en toda la empresa.

**4. Requisitos previos y dependencias.** Una regla puede llevar códigos reales de SNOMED CT e ICD-O-3, que se utilizan solo mientras la licencia correspondiente esté activada y vigente en [Sistemas de codificación](#screen-code_systems). Hasta entonces PathScribe asocia códigos de prueba claramente marcados. El interruptor de la empresa es un interruptor maestro: mientras está desactivado, ningún centro puede activar la detección por su cuenta en su registro del [Diccionario de centros](#screen-facility-dictionary).

Setup step: Tier 2, step 23
Requires: [Sistemas de codificación](#screen-code_systems)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-abnormal_trigger_rules - Lista de reglas de activación con el interruptor de la empresa]

**6. Referencia de campos.**

#### Controles de la página

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Activada en toda la empresa | Casilla de verificación | Opcional | Desactivada, anula la detección de resultados anómalos en todos los centros. Activada, deja a cada centro ejecutor en libertad de restringirla por su cuenta. | Según la configuración de la empresa |
| Filtro de laboratorio | Opción: Todos los laboratorios, Solo globales o un laboratorio | Opcional | | Todos los laboratorios |
| Columnas | Etiqueta del campo, Valor(es) de activación, Gravedad, Descripción, Laboratorio ejecutor, Estado, Acciones | No aplicable | | No aplicable |
| + Añadir regla de activación | Botón | No aplicable | | No aplicable |
| Editar, Duplicar, Desactivar, Activar | Botones de fila | No aplicable | | No aplicable |

#### Ventana de alta y edición

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Etiqueta del campo sinóptico | Texto | Obligatorio | Por ejemplo Margin Status. Debe coincidir con la etiqueta de la pregunta del sinóptico. Una regla por etiqueta dentro del laboratorio ejecutor, o dentro de Global. | Ninguno |
| Valor(es) de activación | Texto, separado por comas | Obligatorio | Por ejemplo Positive. Al menos uno. | Ninguno |
| Gravedad | Opción: Anómalo, Crítico, Maligno | Obligatorio | | Anómalo |
| Descripción | Texto libre | Opcional | Se muestra al patólogo como el motivo de la sugerencia. | En blanco |
| Código SNOMED CT | Texto, de 6 a 18 dígitos | Opcional | De su edición con licencia. | En blanco |
| Término SNOMED CT | Texto | Obligatorio cuando se indica un código | El término tal como aparece en su edición. | En blanco |
| Código CIE-O-3 | Texto con la forma 8500/3 | Opcional | | En blanco |
| Término CIE-O-3 | Texto | Obligatorio cuando se indica un código | | En blanco |
| Laboratorio ejecutor | Lista de selección: Global o un laboratorio ejecutor | Opcional | | Global |
| Estado | Interruptor Activo / Inactivo | Opcional | | Activo |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Añadir, editar, desactivar: `config:abnormal-triggers:manage` (riesgo alto, auditado). La capacidad pertenece al grupo Calidad. Admin, Lab Director y Superadmin la tienen de forma predeterminada.

**Límites conocidos.** La etiqueta del campo de la regla se compara como texto, por lo que una pregunta del sinóptico a la que se cambie el nombre deja de coincidir. El interruptor de la empresa guarda la configuración de la empresa. Se incluyen de serie cuatro reglas: Margin Status Positive, Perineural Invasion Present, Lymph Node Status Positive y Lymphovascular Invasion Present.

### [FORMEDRIXAI INTERNAL ONLY] Organismos reguladores {#screen-governing_bodies}
Breadcrumb: Inicio > Configuración > Sistema > Consultas clínicas > Organismos reguladores

> 🔒 **Ajuste restringido de uso interno de ForMedrixAI**
> **Ámbito:** Solo personal interno de servicio y de implantación.
> **Explicación:** Esta lista decide qué organismos de normalización están en vigor y durante cuánto tiempo indica cada organismo que se debe conservar el material. Las cifras de conservación que contiene son el mínimo con el que se comprueba la excepción de conservación de cada departamento, y alimentan el reloj de conservación de los bloques, las preparaciones y el tejido húmedo almacenados. Un cambio de un usuario final podría acortar un período legal de conservación o activar un organismo que no se aplica al país del laboratorio, por lo que editar exige la capacidad de plataforma `platform:governing-bodies:manage`, que solo tiene Superadmin. Todos los demás ven la lista en solo lectura con el aviso «Se requiere acceso de superadministrador».

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Consultas clínicas**
**2. Elemento de mantenimiento:** Organismos reguladores

**3. Finalidad y alcance.** Un organismo regulador es un organismo normativo o regulador, como CAP, RCPath, ICCR, RCPA, CAP-ACP, la UE (ISO 15189) o la MSA coreana. Cada organismo está activado o desactivado, abarca algunas jurisdicciones y contiene un historial de solo adición de cifras de conservación (días para bloques, preparaciones y tejido húmedo). Una cifra de conservación se utiliza solo si procede de un organismo activado con al menos una versión que cubra la jurisdicción. Se pueden añadir organismos personalizados.

**4. Requisitos previos y dependencias.** Es un punto de partida. Si un organismo activado no tiene una versión de conservación para la jurisdicción del laboratorio, no hay un mínimo de conservación, por lo que no se comprueba la excepción de conservación de un departamento. Los departamentos la leen ([Departamentos](#screen-departments)). La variante de ICD-10 de [Servicios de terminología](#screen-terminology) sigue a los organismos activos.

Setup step: Tier 2, step 1
Requires: Ninguno, es un punto de partida.
Unlocks: [Departamentos](#screen-departments), [Servicios de terminología](#screen-terminology)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-governing_bodies - Lista de Organismos reguladores con los interruptores Activo y Sincronización automática]

**6. Referencia de campos.**

#### Página de lista

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Organismo regulador | Texto | No aplicable | Abreviatura y nombre. | No aplicable |
| Región | Texto | No aplicable | Las jurisdicciones que abarca el organismo. | No aplicable |
| Activo | Interruptor Sí/No | Opcional | Un organismo inactivo no aporta ninguna cifra de conservación y el resumen de jurisdicciones lo ignora. | Véanse las cifras iniciales más abajo |
| Sincronización automática | Interruptor Sí/No | Opcional | Está desactivado mientras el organismo no esté Activo. Se guarda, pero todavía nada lo lee. | Véanse las cifras iniciales más abajo |
| Conservación, Editar, quitar (✕) | Botones de fila | No aplicable | Conservación abre la ventana de conservación. Solo se pueden editar o quitar los organismos personalizados. | No aplicable |
| Añadir organismo personalizado | Botón | No aplicable | Se muestra solo después de un cambio. | No aplicable |
| Guardar cambios | Botón | No aplicable | Se muestra solo después de un cambio, junto a una marca «Cambios sin guardar». | No aplicable |
| Terminology Monitoring - Coming Soon | Aviso | No aplicable | Una sincronización nocturna del contenido de SNOMED CT e ICD está Planificada. | No aplicable |

#### Ventana de organismo personalizado

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Abreviatura | Texto | Obligatorio | Se convierte en el id del organismo en mayúsculas. No se puede cambiar después. Un conflicto con un id existente se rechaza. | Ninguno |
| Nombre completo | Texto | Obligatorio | | Ninguno |
| Región | Texto | Opcional | | En blanco |
| Sitio web | Texto | Opcional | | En blanco |

Un organismo personalizado empieza activado con la sincronización automática desactivada.

#### Ventana de conservación

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Se aplica a las jurisdicciones | Etiquetas: US, CA, GB_EW, GB_SCT, GB_NIR, IE, AU, NZ, KR, BE, NL, DE, FR, ES | Opcional | Las jurisdicciones que abarca el organismo. **Guardar jurisdicciones** conserva el cambio. | Según el organismo |
| Historial de versiones | Lista v1, v2 y así sucesivamente | No aplicable | Solo de adición e inmutable. | No aplicable |
| Nueva versión: fecha de vigencia | Fecha | Obligatorio | | Hoy |
| Nueva versión: días de bloque, preparación y tejido húmedo | Números enteros mayores que 0 | Obligatorios los tres | | Ninguno |
| Nueva versión: fuente / cita | Texto | Obligatorio | | Ninguno |
| Aplicar con carácter retroactivo a todo el material almacenado actualmente y no eliminado | Casilla de verificación | Opcional | Solo para cambios que alargan el plazo. | Desactivado |
| Publicar nueva versión | Botón | No aplicable | Añade la versión. | No aplicable |
| Borrar todo el historial de versiones | Botón | No aplicable | Elimina el historial. | No aplicable |

Organismos incluidos de serie: CAP (US, activado, sincronización activada), RCPath (GB_EW, GB_SCT, GB_NIR, activado, sincronización activada), ICCR (activado, sincronización activada, sin cifras de conservación), RCPA (AU, NZ, desactivado), CAP-ACP (CA, activado, sincronización desactivada), EU (ISO 15189; BE, NL, DE, FR, desactivado) y KR (MSA, desactivado).

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Editar y guardar: `platform:governing-bodies:manage` (solo plataforma, riesgo alto). Superadmin la tiene de forma predeterminada y ningún otro rol integrado la tiene.

**Límites conocidos.** La sincronización automática se guarda, pero nada más la lee, y la sincronización nocturna de protocolos que menciona el subtítulo de la página está Planificada. Cada versión de conservación anota como autor «super-admin» sea quien sea quien la publique.
