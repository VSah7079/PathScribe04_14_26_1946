---
chapter: 5
id: ch5
title: Nivel 4: El marco de IA integrado de PathScribe
---

# Nivel 4: El marco de IA integrado de PathScribe {#ch5}

El Nivel 4 abarca todos los ajustes que deciden si PathScribe utiliza inteligencia artificial (IA), dónde y cómo la utiliza, y las comprobaciones que mantienen al patólogo al mando del resultado. Lea este capítulo teniendo presente un hecho: el marco es más reducido que su esquema. PathScribe llama a un modelo de lenguaje externo para ayudar con los informes y con el dictado, e incorpora resultados de productos de análisis de imagen de proveedores. No contiene un motor de visión artificial, un detector de tumores, un contador de células, un evaluador de biomarcadores, un motor independiente de procesamiento del lenguaje natural (PLN) ni una herramienta de calibración de los pesos de los modelos. Cada uno de ellos se rotula **No construido** más abajo, con lo más parecido que sí existe.

La producción se ejecuta en Microsoft SQL Server detrás de una API ASP.NET Core. La mayoría de las pantallas de este capítulo funcionan hoy con los datos de demostración del navegador, y la línea de estado de cada pantalla indica hasta dónde llega su contrato de servidor.

## Cómo se configura el Nivel 4 {#ch5-setup-order}
Breadcrumb: Inicio > Configuración > Comportamiento de la IA

Complete primero los Niveles 1 a 3. El Nivel 4 lee de ellos los centros, los médicos, los tipos de muestra y los sistemas de códigos. Después trabaje las pantallas en este orden. La parte 4 de cada pantalla repite sus propios requisitos previos.

1. [Comportamiento de la IA (pestaña)](#screen-tab-ai): elija el servicio y el modelo de IA, y establezca la política de proveedores, el umbral de confianza y el valor predeterminado del orquestador.
2. [Estudios de validación (pestaña)](#screen-tab-validation): el punto de entrada de las pruebas de que un modelo funciona con sus datos.
3. [Estudios de validación: Estudios](#screen-validation-studies): cree, apruebe y active un estudio.
4. [Estudios de validación: Informes](#screen-validation-reports): cierre un estudio e imprima el informe que lo califica.
5. [Instrucciones de IA](#screen-ai_instructions): apruebe el texto que la comprobación de discordancia clínica envía al modelo.
6. [Reglas de discordancia clínica](#screen-clinical_mismatch_rules): establezca cuándo una discordancia avisa, se registra o bloquea la firma.
7. [Extracción de antecedentes con IA](#screen-history_extraction): active la lectura orientativa de casos históricos.
8. [Captura inteligente](#screen-smart_capture): el interruptor del prototipo de sugerencias de facturación y su lista de comprobación para producción.

[Estudios de validación: Panel](#screen-validation-dashboard) es una página de uso diario y no forma parte de la configuración. La excepción de un modelo para un centro necesita una plantilla de informe publicada y un estudio superado, así que termine el [Capítulo 6](#ch6) para las plantillas antes de basarse en una excepción de centro.

**Estado de las seis áreas del esquema**

| Área | Estado | Dónde se configura |
|---|---|---|
| Infraestructura de IA y arquitectura de modelos | Construido para las pantallas y los ajustes; Parcial para el lado del servidor (véase cada pantalla) | Configuración, pestaña **Comportamiento de la IA**; Diccionario de centros, pestaña **IA y rendimiento** ([Capítulo 2](#screen-facility-dictionary)) |
| Seguimiento de muestras y asistencia de visión artificial en el tallado | No construido. Existen un diccionario de proveedores y un prototipo de facturación basado en reglas | Integraciones con proveedores, categoría de imágenes macroscópicas ([Capítulo 4](#screen-vendor_integrations)); [Captura inteligente](#screen-smart_capture) |
| Motor de PLN y de estructuración automática | Parcial. Existen funciones sueltas; no hay un motor independiente | [Extracción de antecedentes con IA](#screen-history_extraction); pestañas Voz y Macros ([Capítulo 4](#screen-tab-voice)); herramientas de la página de informe |
| Análisis de imagen con IA en patología digital | Parcial. Existe la incorporación de resultados de proveedores. La detección de tumores, el recuento de células y la evaluación de biomarcadores son No construido | Integraciones con proveedores, categorías de IA de patología digital y visores de preparaciones ([Capítulo 4](#screen-vendor_integrations)); pestaña Discordancia de la IA de Garantía de calidad ([Capítulo 4](#screen-quality-assurance)) |
| Reglas de control de calidad inteligente y de detección de anomalías | Construido para las pantallas; Demostración para el lado del servidor de las Instrucciones de IA | [Reglas de discordancia clínica](#screen-clinical_mismatch_rules); [Instrucciones de IA](#screen-ai_instructions); Reglas de activación por resultado anómalo ([Capítulo 3](#screen-abnormal_trigger_rules)) |
| Gobernanza de la IA, umbrales con intervención humana, calibración | Construido para la gobernanza y los umbrales. Calibración de pesos: no existe | [Instrucciones de IA](#screen-ai_instructions); [Estudios de validación](#screen-tab-validation); panel Versiones del modelo en la pestaña Comportamiento de la IA |

## Infraestructura de IA y arquitectura de modelos {#ch5-ai-infrastructure}
Breadcrumb: Inicio > Configuración > Comportamiento de la IA

**Estado:** Construido para las pantallas de ajustes. Parcial para el servidor: las llamadas de producción están documentadas y algunas todavía no están conectadas (se enumeran en cada pantalla).

Esta sección explica cómo se realiza una llamada de IA y quién decide qué utiliza. A continuación sigue la pantalla que establece todo ello, [Comportamiento de la IA (pestaña)](#screen-tab-ai).

**El proxy de IA.** El navegador nunca guarda una clave de IA. Llama a las rutas `/api/ai/...` propias de PathScribe y el servidor añade la clave desde un almacén de secretos como Azure Key Vault. Existen rutas para Anthropic, Google Gemini (generar, transmitir y lista de modelos), OpenAI, Azure OpenAI (`/api/ai/azure/chat/completions`), un punto de conexión personalizado, AWS Bedrock (invocar e invocar con transmisión) y las consultas de terminología de UMLS y de la National Library of Medicine. El servidor debe escribir una entrada de auditoría por cada llamada (sin el texto de la consulta) y limitar la frecuencia de los llamantes. El proxy que utiliza la compilación de desarrollo no existe en producción. La rotación de una clave de API la realiza el soporte de ForMedrixAI en el almacén de secretos del servidor. Ninguna pantalla establece ni muestra una clave.

**Proveedores.** La pantalla muestra nombres de proveedores. Internamente, cada uno se guarda con un id que lleva el nombre del protocolo que habla.

| Se muestra como | Id guardado | Modelos ofrecidos (el primero es el predeterminado al elegir el proveedor) |
|---|---|---|
| Anthropic (Claude) | `structured_messages` | `claude-sonnet-4-6` (recomendado), `claude-opus-4-8` (máxima precisión), `claude-haiku-4-5` (el más rápido) |
| OpenAI (GPT-4) | `chat_completions` | `gpt-4o` (recomendado), `gpt-4-turbo`, `gpt-4` |
| Azure OpenAI | `chat_completions_managed` | `gpt-4o` (Azure), `gpt-4-turbo` (Azure) |
| AWS Bedrock | `model_gateway` | `anthropic.claude-sonnet-4-6-v1:0`, `anthropic.claude-opus-4-8-v1:0`, `amazon.nova-pro-v1:0` |
| Google (Gemini) | `structured_content` | `gemini-1.5-flash` (recomendado), `gemini-1.5-pro` |
| Autoalojado / punto de conexión personalizado | `custom` | `custom` |
| Simulado, modo de demostración | `mock` | `mock-v1` |

Si el id de proveedor guardado no es ninguno de estos, PathScribe utiliza `structured_messages`. Un ajuste de proveedor `mock` o un valor desconocido sigue enviando la llamada a la ruta de Anthropic a través del proxy (un comportamiento declarado del proxy, no un atajo de demostración). Bedrock necesita una ruta de servidor que firme las solicitudes y devuelva un flujo normalizado; esa ruta forma parte del contrato del proxy.

**Qué ajuste prevalece.** PathScribe resuelve la configuración de IA en este orden: una sustitución personal (solo en una vista de desarrollo; ninguna pantalla la establece para un administrador), después el ajuste del laboratorio de la organización y, por último, los valores predeterminados de la compilación `VITE_AI_PROVIDER`, `VITE_AI_MODEL`, `VITE_AI_PROXY_URL`, `VITE_AI_GATEWAY_REGION` (predeterminado `us-east-1`), `VITE_AI_HOSTING_REGION` y `VITE_AI_MAX_TOKENS` (predeterminado 1000). El ajuste de la organización se guarda con la clave `pathscribe_ai_org_config`.

**Qué modelo utiliza cada tarea.**

| Tarea | Modelo utilizado | Notas |
|---|---|---|
| Ayuda con el informe y la narrativa (Generar narración, Sugerir campos sinópticos, sugerencias de macros, análisis de hallazgos críticos, asignación de plantilla) | El modelo predeterminado de la organización, o el modelo propio del centro ejecutor si se ha establecido uno en el Diccionario de centros, pestaña **IA y rendimiento** | Un centro solo puede elegir un modelo que tenga un estudio comunicado y calificado como APTO para ese centro ([Estudios de validación: Informes](#screen-validation-reports)). El límite de tokens del centro y el formato de la solicitud acompañan al modelo. |
| Refinamiento del dictado | El modelo predeterminado de toda la organización de tipo Dictado por voz | Sin capa de centro. Un modelo de voz solo pasa a ser el predeterminado con un estudio calificado como APTO. Se establece en la pestaña Voz ([Capítulo 4](#screen-tab-voice)). |
| Asignación de plantilla sinóptica y de tallado con IA | Igual que la ayuda con el informe | El umbral de confianza de estas dos está fijado en 60 en el código; no hay ningún ajuste. La asignación de tallado recurre a la plantilla estándar de tejido. |

**Política de proveedores.** Una regla por jurisdicción y, opcionalmente, una regla más restrictiva por centro indican qué servicios de IA y qué regiones de alojamiento pueden utilizarse para el trabajo en ese lugar. Una llamada debe cumplir la regla de la jurisdicción y la del centro. Sin regla, se permiten todos los servicios. Dentro de una regla, los servicios permitidos pueden ser todos o una lista, y cada servicio permitido puede llevar una lista de regiones permitidas; sin lista, se admite cualquier región. Una llamada cuya región no está registrada se rechaza donde las regiones están limitadas. Un rechazo nunca pasa a otro servicio: la función continúa sin IA y muestra "La IA no está disponible para esta jurisdicción". El proveedor simulado siempre está permitido. El servidor debe responder a una llamada rechazada con 403 y el código `AI_VENDOR_NOT_ALLOWED`, y auditarla como `AI_CALL_REFUSED`.

**Registro de auditoría de la IA.** Cada llamada de IA escribe un registro con: caso, sección, proveedor, modelo, estado (completada, error, cancelada o rechazada), número de tokens, tiempo empleado, región de alojamiento, jurisdicción, centro y función. El registro conserva las últimas 2000 entradas y se mantiene en el navegador hasta que el servidor lo registre. Ninguna pantalla lo muestra.

**Modo orquestador.** El modo orquestador redacta la narrativa de un informe en cuatro pasos fijos en lugar de una sola solicitud. El motor de `src/orchestrator/` es el código en uso. [Comportamiento de la IA (pestaña)](#screen-tab-ai) establece el valor predeterminado de la organización, y un centro puede sustituirlo. La redacción y el orden de los pasos no se pueden editar.

### Comportamiento de la IA (pestaña) {#screen-tab-ai}
Breadcrumb: Inicio > Configuración > Comportamiento de la IA

**Estado:** Construido

**1. Navegación:** pestaña de Configuración **Comportamiento de la IA**
**2. Elemento de mantenimiento:** Comportamiento de la IA (la pestaña completa)

**3. Finalidad y alcance.** Esta pestaña contiene los ajustes de IA de la organización: qué motor de IA se utiliza, si la IA actúa en el trabajo macroscópico y microscópico, con qué confianza debe contar una sugerencia para mostrarse o insertarse, qué servicio y modelo hay detrás de las llamadas, adónde permite la política de proveedores que vayan las llamadas, si el modo orquestador está activado y qué versiones de modelo están disponibles. Todo es válido para toda la organización. Un centro solo puede sustituir el modelo y el interruptor del borrador automático de la narrativa, en su propio registro del [Diccionario de centros](#screen-facility-dictionary).

**4. Requisitos previos y dependencias.** Los ámbitos de la política de proveedores son las jurisdicciones y los centros que ya definió, así que configúrelos primero. Si omite los centros, la sección de la política solo puede ofrecer la jurisdicción del propio laboratorio, de modo que no se puede escribir ninguna regla de centro.

Setup step: Tier 4, step 1
Requires: [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Estudios de validación (pestaña)](#screen-tab-validation), [Instrucciones de IA](#screen-ai_instructions), [Reglas de discordancia clínica](#screen-clinical_mismatch_rules), [Extracción de antecedentes con IA](#screen-history_extraction)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: tab-ai - Pestaña Comportamiento de la IA: distintivo Motor de IA, interruptores de comportamiento, ajustes del proveedor, política de proveedores, Configuración del orquestador y Versiones del modelo]

**6. Referencia de campos.** Las secciones aparecen de arriba abajo en este orden. Los cambios del primer grupo se guardan al hacerlos.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Distintivo **Motor de IA** | Distintivo de solo lectura | No aplicable | Muestra el id del modelo en uso, o "Simulado - modo de demostración" con una etiqueta **DEMO** cuando se selecciona el proveedor simulado. | No aplicable |
| **IA guiada por la descripción macroscópica**, **Activado** | Casilla Sí/No (`grossEnabled`) | Opcional | Si está desactivada, la finalización del tallado y el sondeo de asistencia omiten la evaluación por IA de la descripción macroscópica. | Activado |
| **IA guiada por la descripción microscópica**, **Activado** | Casilla Sí/No (`microscopicEnabled`) | Opcional | Si está desactivada, el flujo de enmiendas, el panel lateral sinóptico y el sondeo de asistencia omiten el trabajo de IA sobre el texto microscópico. | Activado |
| **Umbral de confianza** | Control deslizante, número entero de 0 a 100 (`confidenceThreshold`) | Opcional | El porcentaje de confianza que necesita una sugerencia. El panel lateral sinóptico y el distintivo de revisión del informe sinóptico lo utilizan para marcar las sugerencias. Un modelo puede llevar su propio valor en su ventana de **Ajustes** (más abajo). Se guarda al cambiarlo. | 75 |
| **Avanzado**: Insertar automáticamente las sugerencias con confianza igual o superior al umbral | Casilla Sí/No (`autoInsertSuggestions`) | Opcional | Si está activada, el panel lateral sinóptico rellena el campo con una sugerencia sin esperar a que el patólogo la acepte, siempre que su confianza alcance el umbral. | Desactivado |
| **Avanzado**: Mostrar las puntuaciones de confianza en la interfaz del editor | Casilla Sí/No (`showConfidenceScores`) | Opcional | Solo se guarda. Ninguna otra pantalla lo lee hoy, de modo que cambiarlo no tiene efecto. | Activado |
| **Avanzado**: Sugerir macros según el contexto del diagnóstico | Casilla Sí/No (`macroSuggestions`) | Opcional | Solo se guarda. Ninguna otra pantalla lo lee hoy, de modo que cambiarlo no tiene efecto. | Desactivado |
| **Avanzado**: Filtrar las sugerencias de la IA por subespecialidad | Casilla Sí/No (`subspecialtyRouting`) | Opcional | Solo se guarda. Ninguna otra pantalla lo lee hoy, de modo que cambiarlo no tiene efecto. | Activado |
| **Restablecer valores predeterminados** | Botón | No aplicable | Devuelve todos los ajustes de comportamiento anteriores a sus valores predeterminados. No cambia el proveedor, la política de proveedores ni el interruptor del orquestador. | No aplicable |

#### Ajustes del proveedor de IA
Breadcrumb: Inicio > Configuración > Comportamiento de la IA

Se muestra con el título **Proveedor de IA - Ajustes de la organización** solo a una persona cuyo rol sea administrador, patólogo administrador o superadministrador. Cualquier otra persona ve una nota que indica que el administrador gestiona el proveedor. Un cuadro de advertencia recuerda que el texto del caso sale del sistema hacia el servicio elegido. Los campos que no corresponden al proveedor elegido están ocultos.

[SCREENSHOT PLACEHOLDER: tab-ai-provider - Ajustes del proveedor de IA con proveedor, modelo y región de alojamiento]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| **Proveedor de IA** | Lista de opciones, agrupadas en **Proveedores de producción** y **Desarrollo y demostración** | Obligatorio | Selecciona el servicio. Al elegir un proveedor, **Modelo** pasa al primer modelo de ese proveedor. Una breve indicación bajo el campo describe el proveedor. | Anthropic (Claude) cuando no hay nada guardado |
| **Modelo** | Lista de opciones con los modelos del proveedor (tabla anterior) | Obligatorio | El id del modelo que se envía en cada llamada. | Primer modelo del proveedor |
| **Punto de conexión del recurso de Azure** | Enlace https; texto de ejemplo `https://my-org.openai.azure.com` | Obligatorio para Azure OpenAI | La dirección de su recurso de Azure. Solo se muestra para Azure OpenAI. | Ninguno |
| **Nombre de la implementación** | Texto | Opcional | La implementación de Azure a la que se llama. Solo se conserva si también se ha establecido un punto de conexión. Solo se muestra para Azure OpenAI. | Ninguno |
| **Región de AWS** | Texto | Opcional | La región de Bedrock. Solo se muestra para AWS Bedrock. | `us-east-1` |
| **Región de alojamiento** | Texto; texto de ejemplo `eu-west-1` | Opcional | La región donde el proveedor procesa la llamada, con el nombre que le da el proveedor. Se registra en cada llamada para que la política de proveedores pueda comprobarla. Se muestra para todos los proveedores salvo AWS Bedrock y Simulado. | En blanco (región sin registrar) |
| **URL base del punto de conexión** | Enlace https | Obligatorio para Personalizado | La dirección base de un servicio compatible con OpenAI. PathScribe envía las solicitudes a `/chat/completions` bajo ella. Solo se muestra para Autoalojado / punto de conexión personalizado. | Ninguno |
| Advertencia de política | Mensaje de solo lectura | No aplicable | Aparece antes de guardar un servicio o una región que una regla de jurisdicción o de centro de la política siguiente no permite. | No aplicable |
| **Guardar configuración de la organización** | Botón | No aplicable | Guarda el ajuste de la organización. Requiere `config:ai-provider:manage`. Si sale de la pestaña con cambios sin guardar, se le avisa. | No aplicable |
| **Probar conexión** | Botón | No aplicable | Envía una solicitud de prueba (función `connection-test`, 20 tokens, pidiendo la respuesta exacta "PathScribe AI connection OK"). El resultado indica Probando, Conexión correcta o Error con el motivo. | No aplicable |
| **Borrar sustitución** | Botón | No aplicable | Aparece solo en la vista de desarrollo, donde se puede establecer una sustitución personal. No se muestra a un administrador. | No aplicable |

#### Dónde guarda PathScribe los datos
Breadcrumb: Inicio > Configuración > Comportamiento de la IA

Una tarjeta de solo lectura.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| **Base de datos** | Texto de solo lectura | No aplicable | La región de la base de datos, tomada del `/api/config` del servidor. Muestra **No comunicada** cuando el servidor no la proporciona (la demostración no tiene servidor). | No comunicada |
| **Almacenamiento de archivos (informes, exportaciones)** | Texto de solo lectura | No aplicable | La región del almacenamiento de archivos, de la misma fuente. | No comunicada |
| **Servicio de IA** | Texto de solo lectura | No aplicable | La región de alojamiento establecida en los Ajustes del proveedor de IA. | Sin registrar |

#### Política de proveedores de IA
Breadcrumb: Inicio > Configuración > Comportamiento de la IA

Una tabla de reglas, con una fila para la jurisdicción del propio laboratorio y una para cada centro al que presta servicio, además de un control **Añadir una regla de centro**. La regla de un centro restringe la regla de su jurisdicción. El evento de auditoría de un cambio es `AI_VENDOR_POLICY_CHANGED` (antes y después).

[SCREENSHOT PLACEHOLDER: tab-ai-vendor-policy - Tabla de reglas de la política de proveedores de IA y editor de reglas]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| **Jurisdicción o centro** | Texto de solo lectura (el centro se muestra como centro y jurisdicción) | No aplicable | El ámbito de la regla. | La jurisdicción del laboratorio, más cada centro atendido |
| **Permitido** | Texto de solo lectura: **Sin regla: todos los servicios**, **Todos los servicios** o la lista de servicios | No aplicable | Lo que permite la regla. | Sin regla: todos los servicios |
| **Servicio en uso** | Texto de solo lectura | No aplicable | Muestra el servicio, el modelo y la región en uso y si este ámbito lo permite: **Permitido**, **No permitido: servicio**, **No permitido: región** o **No permitido: región sin registrar**. | No aplicable |
| **Acciones**: **Editar**, **Eliminar regla** | Botones | No aplicable | **Editar** abre el editor de reglas siguiente. **Eliminar regla** borra la regla, de modo que el ámbito vuelve a permitir todos los servicios. | No aplicable |
| **Añadir una regla de centro**, **Elija un centro…** | Lista de opciones de los centros atendidos | Opcional | Inicia una regla para un centro. | Ninguno |
| **Permitir todos los servicios** | Casilla Sí/No | Opcional | Permite todos los servicios. Si está desactivada, marque los servicios que desea permitir. | Activada en una regla nueva |
| Servicios permitidos | Una casilla por cada servicio de IA | Obligatorio cuando **Permitir todos los servicios** está desactivada | Debe permitirse al menos un servicio o el guardado se rechaza (**Permita al menos un servicio o elimine la regla.**). | Ninguno |
| **Regiones permitidas para** (servicio) | Texto, regiones separadas por comas, por ejemplo `eu-west-1, uksouth` | Opcional | Déjelo vacío para permitir cualquier región. Las regiones se recortan, se pasan a minúsculas y se eliminan los duplicados. Se rechaza una entrada en blanco, o regiones en un servicio que no está permitido. | Vacío (cualquier región) |
| **Guardar regla** | Botón | No aplicable | Guarda la regla. El resultado indica **Guardado** o el motivo del rechazo. | No aplicable |

#### Configuración del orquestador
Breadcrumb: Inicio > Configuración > Comportamiento de la IA

Una sección plegable. El distintivo **ON - click to toggle** u **OFF - click to toggle** es el valor predeterminado de toda la organización para el modo orquestador.

[SCREENSHOT PLACEHOLDER: tab-ai-orchestrator - Configuración del orquestador con los cuatro pasos de generación]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Interruptor ON/OFF | Interruptor Sí/No | Opcional | El valor predeterminado de la organización. Un centro puede sustituirlo con **Borrador automático del texto narrativo** (Heredar el valor de la organización, Activado para el laboratorio, Desactivado para el laboratorio) en el Diccionario de centros, pestaña **IA y rendimiento**. Guardar requiere `config:ai-provider:manage`. | ON |
| Resumen de pasos | Texto de solo lectura, "N de 4 pasos de generación activos" | No aplicable | Cuenta los pasos activos. | 4 de 4 |
| Tarjetas de pasos | Solo lectura: nombre del paso, **ACTIVO** o **DESACTIVADO**, **Instrucción para la IA**, **Campos de contexto** | No aplicable | Cuatro pasos fijos se ejecutan en orden: Encabezado administrativo y clínico, Muestra y descripción macroscópica, Resumen de datos sinópticos, Pruebas complementarias y diagnóstico final. Los pasos anteriores aportan contexto a los posteriores. | Fijo en el código |

#### Versiones del modelo
Breadcrumb: Inicio > Configuración > Comportamiento de la IA

Una sección plegable marcada como **Solo administradores** que contiene el panel de modelos.

[SCREENSHOT PLACEHOLDER: tab-ai-models - Tabla Versiones del modelo]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| **Modelo** | Texto de solo lectura | No aplicable | El nombre del modelo. | No aplicable |
| **Proveedor** | Texto de solo lectura | No aplicable | El fabricante del modelo. | No aplicable |
| **Tipo** | Solo lectura: Solo macroscópico, Solo microscópico, Macroscópico + microscópico, Solo diagnóstico, Dictado por voz | No aplicable | Para qué sirve el modelo. | No aplicable |
| **Precisión** | Porcentaje de solo lectura | No aplicable | La cifra de referencia registrada para el modelo. | No aplicable |
| **Casos procesados** | Número entero de solo lectura | No aplicable | Los casos que el modelo ha tratado para su organización. | 0 para un modelo recién adoptado |
| **Estado** | Solo lectura: Activo, Beta, Retirado | No aplicable | Un modelo adoptado de la tienda de ForMedrixAI empieza en Beta. | No aplicable |
| **Centros aprobados** | Lista de solo lectura | No aplicable | Los centros cuyo modelo fijado es este. | No aplicable |
| **Predeterminado** | Marca de solo lectura | No aplicable | El modelo predeterminado de la organización. | No aplicable |
| **Establecer como predeterminado** | Botón | No aplicable | Convierte el modelo en el predeterminado. Un modelo de voz no puede pasar a ser el predeterminado sin un estudio comunicado y calificado como APTO. | No aplicable |
| **Retirar** | Botón y después una confirmación | No aplicable | Retira el modelo. La confirmación nombra los centros que lo tienen fijado. El modelo predeterminado no se puede retirar. | No aplicable |
| **Ajustes** | Botón | No aplicable | Abre la ventana Ajustes del modelo siguiente. | No aplicable |

##### Ventana Ajustes del modelo
Breadcrumb: Inicio > Configuración > Comportamiento de la IA

[SCREENSHOT PLACEHOLDER: tab-ai-model-settings - Ventana Ajustes del modelo]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| **Respuesta más larga (tokens)** | Número entero de 50 a 8000 | Opcional | Lo máximo que el modelo puede escribir en una respuesta. En blanco utiliza el ajuste de la organización. | En blanco |
| **Umbral de confianza (%)** | Número entero de 0 a 100 | Opcional | El umbral propio de este modelo. En blanco utiliza el **Umbral de confianza** de la organización. | En blanco |

Cualquier otro valor se rechaza con "Introduzca números enteros dentro de los intervalos indicados o deje el campo en blanco". Estas son las únicas dos sustituciones por modelo que existen.

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. La pestaña es de solo lectura para quien no tenga ninguna de estas cuatro: `config:ai-behavior:manage` (ajustes de comportamiento y **Restablecer valores predeterminados**), `config:ai-provider:manage` (ajustes del proveedor e interruptor del orquestador), `config:ai-model:manage` (establecer como predeterminado, actualizar, retirar y adoptar un modelo) y `config:ai-vendor-policy:manage` (la política de proveedores). El panel Proveedor de IA exige además el rol de administrador, patólogo administrador o superadministrador, que es una comprobación de rol y no de capacidad. Administrador y Director del laboratorio tienen las cuatro capacidades de forma predeterminada a través de los grupos de configuración, y Superadministrador tiene todas (salvo `config:ai-prompt:approve`, retirada por la separación de funciones). El cambio de la política de proveedores se audita como `AI_VENDOR_POLICY_CHANGED`. Un cambio en los ajustes de comportamiento registra solo la comprobación de permiso, no lo que cambió.

**Límites conocidos.**
- `showConfidenceScores`, `macroSuggestions` y `subspecialtyRouting` se guardan y ninguna otra parte los lee.
- Los ajustes de comportamiento y la política de proveedores tienen contratos de servidor (`CONFIG_SERVICES_API.md`, `AI_VENDOR_POLICY_API.md`; modelos en `MODELS_API.md`). Hasta que se conecte el servidor, funcionan con los datos de demostración del navegador.
- La redacción, el orden y la correspondencia de campos de los pasos de la Configuración del orquestador son Planificado: la pantalla indica "configurable en una versión futura".
- El corrector ortográfico con IA se retiró y no tiene ningún ajuste.
- Ningún ajuste desactiva por sí solo el análisis de hallazgos críticos con IA. Sigue al proveedor, a la política de proveedores y a las [Reglas de activación por resultado anómalo](#screen-abnormal_trigger_rules).
- El umbral de confianza para un hallazgo «Anómalo» es 50 (lote 655). Es una constante del código, todavía no un ajuste, por lo que el laboratorio no puede cambiarlo aquí.
- **La ventana Códigos (lote 656).** Cada código médico sugerido se confirma de dos maneras: consultando el propio código y, en paralelo, mediante la redacción de la propia IA; basta con una de las dos. Un código cuya consulta falla queda fuera de la lista y se cuenta en una nota, como antes. Las comprobaciones de SNOMED CT pasan por la ruta del servidor que contiene `UMLS_API_KEY`; reinicie el servidor de desarrollo después de editar `.env`.
## Seguimiento de muestras y asistencia de visión artificial en el tallado {#ch5-specimen-vision}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Captura inteligente

**Estado:** No construido para la visión artificial. Existen dos elementos próximos que se describen aquí para que nadie los confunda con ella.

PathScribe no tiene ningún motor de visión artificial para muestras. Nada del producto lee una fotografía de una muestra, de un casete o de una preparación para identificarla, contar bloques, medir una lesión o hacerle seguimiento. Lo más parecido que existe es lo siguiente.

- **El diccionario de proveedores de imágenes de tallado.** Una lista de proveedores de imágenes (por ejemplo PAX-it!/PAXcam, PathoZoom y MacroPATH, citados en el comentario de la interfaz) y la forma de acceder a cada uno: nombre, cómo se autentica el enlace (ninguna, enlace firmado, token de portador OAuth 2 o TLS mutuo), la dirección base https y si el proveedor admite telepatología. Es una categoría (`gross_imaging`) de [Integraciones con proveedores](#screen-vendor_integrations) en el [Capítulo 4](#ch4), que documenta sus campos. Contiene solo direcciones y no realiza ningún análisis de imagen. El control de la cámara de tallado en el caso es una simple captura de fotografías; guarda la imagen dentro del propio caso, lo cual está señalado como no conforme, y trasladarlo a esta categoría de proveedores queda aplazado.
- **Equipos de tallado** ([Capítulo 2](#screen-grossing_hardware)) para balanzas, cámaras y dispositivos de códigos de barras.
- **[Captura inteligente](#screen-smart_capture)**, más abajo. A pesar del nombre, no llama a ningún modelo de IA y no examina ninguna imagen. Es un conjunto fijo de reglas que sugiere líneas de facturación.

### Captura inteligente {#screen-smart_capture}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Captura inteligente

**Estado:** Construido (prototipo). Funciona con los datos de demostración y tiene un contrato de servidor (`SIGNATURES_SMART_CAPTURE_API.md`), y el panel del caso lleva la etiqueta "Prototipo, sin revisión de cumplimiento normativo".

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Materiales y flujos de trabajo del laboratorio**
**2. Elemento de mantenimiento:** Captura inteligente

**3. Finalidad y alcance.** Smart Capture sugiere líneas de cargo de Current Procedural Terminology (CPT) para un caso a partir de las palabras de la descripción de la muestra, el número de bloques y el número de tinciones. Las reglas son fijas y llevan versión (`sim-rules-1.0`): SC-LEVEL (88302 a 88309 según el nivel de la muestra), SC-SPECIAL (88312), SC-IHC-FIRST y SC-IHC-ADDL (88342 y 88341) y SC-DECAL (88311). No es IA ni visión artificial. El flujo es sugerir, revisar (aceptar o rechazar cada línea), aprobar (un patólogo lo confirma) y exportar. En la demostración, la exportación va a un motor simulado. Esta pantalla activa o desactiva el prototipo y registra la lista de comprobación para producción que debe estar completa antes de permitir una exportación a un motor de interfaz real.

**4. Requisitos previos y dependencias.** Las reglas necesitan que CPT esté activado para la jurisdicción en Sistemas de códigos. Si lo omite, el panel no sugiere nada e informa `CPT_OFF`.

Setup step: Tier 4, step 8
Requires: [Sistemas de códigos](#screen-code_systems)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-smart_capture - Interruptor del prototipo Smart Capture, lista de comprobación para producción y puerta de exportación]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| **Ofrecer el panel de Smart Capture en la revisión de facturación** | Interruptor Sí/No | Opcional | Si está desactivado, el panel de Smart Capture no se ofrece en el panel de Facturación del caso. Se audita como "Smart Capture Prototype Switched". | Activado |
| **Validación clínica realizada** | Marca Sí/No; registra quién la marcó y cuándo | Opcional | Elemento de la lista de comprobación para producción. Desmarcar cualquiera de las seis cierra la puerta de exportación. Se audita como "Smart Capture Checklist Changed". | Sin marcar |
| **Revisión de seguridad realizada** | Marca Sí/No; registra quién y cuándo | Opcional | Elemento de la lista de comprobación para producción. | Sin marcar |
| **Revisión de privacidad realizada** | Marca Sí/No; registra quién y cuándo | Opcional | Elemento de la lista de comprobación para producción. | Sin marcar |
| **Revisión jurídica realizada** | Marca Sí/No; registra quién y cuándo | Opcional | Elemento de la lista de comprobación para producción. | Sin marcar |
| **Revisión de reclamaciones y política de codificación realizada** | Marca Sí/No; registra quién y cuándo | Opcional | Elemento de la lista de comprobación para producción. | Sin marcar |
| **Sistema receptor real probado** | Marca Sí/No; registra quién y cuándo | Opcional | Elemento de la lista de comprobación para producción. | Sin marcar |
| **Permitir la exportación a un motor de interfaz real** | Interruptor Sí/No | Opcional | Desactivado hasta que se marquen las seis casillas. Si está desactivado, la exportación va solo al motor simulado. Se audita como "Smart Capture Production Gate Changed". | Desactivado |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar cualquier ajuste: `config:smart-capture:manage` (Administrador y Director del laboratorio de forma predeterminada). En el caso, `billing:smart-capture:review`, `billing:smart-capture:approve` y `billing:smart-capture:send` corresponden al rol Patólogo. Todos los cambios anteriores se auditan.

**Límites conocidos.** Las reglas son un prototipo y no han pasado una revisión de cumplimiento normativo; las marcas registran que alguien afirma que la revisión se hizo y no llevan a cabo ninguna revisión. Nada utiliza IA ni imágenes. La exportación a un motor de interfaz real es solo una puerta: no hay ningún sistema receptor real conectado.

## Motor de PLN y de estructuración automática {#ch5-nlp}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Extracción de antecedentes con IA

**Estado:** Parcial. Existen funciones de lenguaje sueltas. No existe un motor independiente de PLN ni de estructuración automática, y no hay ninguna pantalla para uno.

Lo que existe hoy, y que envía texto al modelo elegido en [Comportamiento de la IA (pestaña)](#screen-tab-ai) y está sujeto a la política de proveedores:

- **Extracción de antecedentes** ([Extracción de antecedentes con IA](#screen-history_extraction)): lee casos históricos y rellena campos estructurados como información orientativa.
- **Sugerir sinóptica a partir de la narración**: en la página de informe, rellena los campos sinópticos a partir de la narrativa. Cada sugerencia lleva una confianza de 0 a 100 y una cita del texto de origen. Funciona en los modos orquestador y asistencia.
- **Generar narración a partir de la sinóptica**: en la página de informe, redacta la narrativa a partir de los datos sinópticos. Solo en modo orquestador.
- **Asignación de plantilla sinóptica**: el modelo propone qué plantilla sinóptica necesita un caso, con un umbral de confianza fijo de 60.
- **Análisis de hallazgos críticos** en la firma: un análisis que tiene en cuenta las negaciones, solo del texto narrativo.
- **Refinamiento del dictado** (pestaña Voz, [Capítulo 4](#screen-tab-voice)) y **sugerencia de macros** (pestaña Macros, [Capítulo 4](#screen-tab-macros)).

No construido: una canalización general de texto libre a datos estructurados más allá de las funciones anteriores, una pantalla para configurarla y cualquier modelo de PLN clínico entrenado propio de PathScribe. El antiguo Computational Sidecar se retiró el 18 de octubre de 2026.

### Extracción de antecedentes con IA {#screen-history_extraction}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Extracción de antecedentes con IA

**Estado:** Parcial. La pantalla y las reglas funcionan con los datos de demostración y el contrato de servidor está redactado (`HISTORY_AI_EXTRACTION_API.md`), pero no se ha probado nada con un servidor real. El enlace de resumen para el modo de asistencia no está construido.

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Extracción de antecedentes con IA

**3. Finalidad y alcance.** Cuando un patólogo abre un caso histórico, el modelo puede leer su Diagnóstico final y su texto Microscópico y proponer valores para los campos de una plantilla estructurada. Los resultados llevan la etiqueta "Extraído por IA, no verificado" y son solo orientativos: los informes, la impresión, el registro, la facturación, las reglas y las exportaciones nunca los utilizan (una prueba del código lo vigila). Realiza dos llamadas al modelo por caso (elegir la plantilla y después rellenar los campos) y descarta cualquier campo con una confianza inferior a 30 (fijado en el código). Los resultados se guardan en caché según un hash del texto de origen, y una ejecución fallida se reintenta la próxima vez que se abre el caso. El evento de auditoría `HISTORY_EXTRACTION_RUN` no contiene texto del paciente.

**4. Requisitos previos y dependencias.** La función necesita un servicio de IA operativo y la lista de centros. Sin servicio de IA, o con uno que la política de proveedores rechaza, no se extrae nada y el caso no muestra datos orientativos.

Setup step: Tier 4, step 7
Requires: [Comportamiento de la IA (pestaña)](#screen-tab-ai), [Diccionario de centros](#screen-facility-dictionary)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-history_extraction - Ámbito de la extracción de antecedentes con IA, estado y tarjeta de precisión]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| **Se aplica a** | Lista de opciones: **Empresa (todos los centros)** o un centro activo | Obligatorio | El ámbito que está viendo y cambiando. | Empresa |
| Tarjeta de estado | **Activado** o **Desactivado** de solo lectura | No aplicable | El ajuste en vigor para el ámbito elegido. Se resuelve como el ajuste propio del centro, después el ajuste de la empresa y, por último, desactivado. | Desactivado |
| Etiqueta de origen | Solo lectura: **Valor predeterminado integrado**, **Ajuste de la empresa** o **Ajuste propio de este centro** | No aplicable | De dónde procede el estado. | Valor predeterminado integrado |
| **Activar** / **Desactivar** | Botón | No aplicable | Establece el estado para el ámbito elegido. | No aplicable |
| **Usar el ajuste de la empresa** | Botón | No aplicable | Aparece solo cuando el centro elegido tiene una entrada propia. La elimina para que el centro siga a la empresa. | No aplicable |
| **Precisión hasta ahora** | Tarjeta de solo lectura: informes leídos, campos extraídos, marcados como erróneos | No aplicable | Cuenta, para el ámbito elegido, cuántos informes se leyeron, cuántos campos se extrajeron y cuántos marcó un patólogo como erróneos. | 0 |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Cambiar: `config:history-extraction:manage` (Administrador y Director del laboratorio). En el caso, `ai:history-extraction:run` y `ai:history-extraction:flag` corresponden a Patólogo, Fellow y Residente, y `case:clinical-history:record` a esos tres y a Ayudante de patólogo. Se aplica la política de proveedores, que rechaza un servicio no permitido con `vendorNotAllowed`. La ejecución de una extracción se audita como `HISTORY_EXTRACTION_RUN`.

**Límites conocidos.** Solo orientativo por diseño. El enlace de resumen del modo de asistencia es No construido. El corte de confianza de 30 puntos no tiene ningún ajuste.

## Análisis de imagen con IA en patología digital {#ch5-dp-ai}
Breadcrumb: Inicio > Configuración > Sistema > Materiales y flujos de trabajo del laboratorio > Integraciones con proveedores

**Estado:** Parcial. Existe la recepción y la presentación de resultados de productos de proveedores. La detección de tumores, el recuento de células y la evaluación de biomarcadores realizados por el propio PathScribe son **No construido**.

PathScribe no analiza imágenes. Registra lo que informa el producto de un proveedor. Lo más parecido a un módulo de análisis con IA es esta cadena, que se configura en otros capítulos:

- **Diccionario de proveedores** (categoría de IA de patología digital en [Integraciones con proveedores](#screen-vendor_integrations), [Capítulo 4](#ch4)): nombre del proveedor, nombre del producto, modalidad (texto libre), una casilla **Aprobado por la FDA** (un registro puntual del administrador, no una comprobación) y un interruptor de activo. Se suministra con Paige Prostate, Ibex Prostate Detect, PathAI AISight Dx, Proscia Concentriq AP-Dx, Hologic Genius Digital Diagnostics (citología cervical) y BD FocalPoint GS (marcado como no aprobado, ya que es una aprobación previa a la comercialización y no una autorización 510(k)). Junto a él están los proveedores de visores de preparaciones (plantillas de dirección de lanzamiento) y los lotes de escaneado de imágenes de preparación completa.
- **Registro de resultado**: un estado (solicitado, completado, fallido o con tiempo agotado), hallazgos (una etiqueta de texto libre, una confianza de 0 a 1 y una región opcional), lecturas de biomarcadores como texto libre (nombre y valor) y una clasificación de triaje de preparaciones con una recomendación de revisión al estilo de los quintiles de BD.
- **Incorporación**: un resultado del proveedor llega como un evento entrante del motor de interfaces. En la demostración, completar un lote de Imagen de citología genera automáticamente una solicitud de cribado con IA al primer proveedor activo de citología cervical.
- **Distintivo de la lista de trabajo de citología y aviso de concordancia**: se registra la respuesta del patólogo. Un desacuerdo genera una deficiencia abierta y nunca inicia por sí solo una acción correctiva.
- **Pestaña Discordancia de la IA de Garantía de calidad** ([Capítulo 4](#screen-quality-assurance)): un informe de discordancia por proveedor y un informe de resultados estancados. El tiempo de espera de los resultados estancados se establece allí (horas enteras de 1 a 720, predeterminado 24).

No construido: un detector de tumores, un contador de células o un evaluador de biomarcadores propiedad de PathScribe, y cualquier control que ajuste el análisis de un proveedor. Las integraciones reales con proveedores no están cerradas. El contrato es `DIGITAL_PATHOLOGY_API.md`. Configuración relacionada: Instrumentación de citología ([Capítulo 3](#screen-cytology_instrumentation)).

## Control de calidad inteligente y reglas de detección de anomalías diagnósticas {#ch5-smart-qc}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Reglas de discrepancia clínica

**Estado:** Construido para las pantallas de reglas. Demostración para el lado del servidor de las Instrucciones de IA. No existe un único módulo de "detección de anomalías"; las comprobaciones siguientes son independientes y cada una está documentada donde se configura.

- **Comprobación de discordancia clínica** ([Reglas de discordancia clínica](#screen-clinical_mismatch_rules) e [Instrucciones de IA](#screen-ai_instructions), en este capítulo): el modelo compara la indicación y los antecedentes clínicos con el diagnóstico, y las reglas deciden qué hace un resultado.
- **Reglas de activación por resultado anómalo** ([Capítulo 3](#screen-abnormal_trigger_rules)): reglas discretas con las gravedades Anómalo, Crítico y Maligno. Las reglas suministradas son Estado de los márgenes, Invasión perineural, Estado de los ganglios linfáticos e Invasión linfovascular.
- **Análisis de la narrativa en busca de hallazgos críticos**: el modelo analiza la narrativa en la firma, teniendo en cuenta las negaciones, y envía solo el texto narrativo. No tiene ningún ajuste propio.
- **Política de tendencia de discordancias de Calidad** ([Capítulo 4](#screen-qa_trend_policy)), la pestaña **Discordancia de la IA** ([Capítulo 4](#screen-quality-assurance)) y las **Reglas de control de calidad de citología** ([Capítulo 4](#screen-cytology_qc_rules)).

No construido: un detector de anomalías estadístico o de aprendizaje automático que vigile los tiempos de respuesta, los volúmenes o los resultados entre casos.

### Reglas de discordancia clínica {#screen-clinical_mismatch_rules}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Reglas de discrepancia clínica

**Estado:** Construido. Funciona con los datos de demostración y tiene un contrato de servidor (`CONFIG_SERVICES_API.md`, `/api/clinical/clinical-mismatch-rule/*`).

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Reglas de discrepancia clínica

**3. Finalidad y alcance.** En la firma, el modelo compara lo que el clínico comunicó al laboratorio con lo que el patólogo diagnosticó, y devuelve un tipo de discordancia y una confianza de 0 a 100. Estas reglas convierten esa confianza en un resultado. Por debajo del umbral de visualización, el resultado se descarta. Desde el umbral de visualización hasta el umbral de acción es de riesgo bajo: el patólogo ve una alerta y el registro de Calidad lo anota. Con el umbral de acción o por encima se aplica la acción de la regla: **Bloquear** lo convierte en riesgo alto y retiene la firma hasta que se registre una decisión, **Avisar** emite una alerta y **Registrar** lo anota. Las decisiones se registran como RESOLVED, UNRESOLVED o DEFERRED. El flujo completo está en `docs/product/CLINICAL_MISMATCH_CHECK.md`. Una regla por tipo de discordancia abarca todos los tipos de muestra, y puede añadir una regla para un solo tipo de muestra.

**4. Requisitos previos y dependencias.** La comprobación llama al servicio de IA configurado en la pestaña Comportamiento de la IA, y las reglas por tipo de muestra se eligen entre los tipos de muestra activos. Sin servicio de IA, o con uno que la política de proveedores rechaza, la comprobación no se ejecuta. Si omite el Diccionario de muestras, la lista **Una regla para un tipo de muestra** queda vacía.

Setup step: Tier 4, step 6
Requires: [Comportamiento de la IA (pestaña)](#screen-tab-ai), [Diccionario de muestras](#screen-specimens)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-clinical_mismatch_rules - Tabla de Reglas de discordancia clínica y control para añadir una regla]

**6. Referencia de campos.** Los umbrales se guardan al salir del cuadro o al pulsar Intro. La acción se guarda al elegirla.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| **Tipo de discordancia** | Solo lectura: neoplasia maligna inesperada, causa de muerte, localización u órgano, neoplasia maligna esperada ausente, otro | No aplicable | Una fila por tipo para todos los tipos de muestra, más las filas de cada tipo de muestra. | No aplicable |
| **Tipo de muestra** | Solo lectura: todos los tipos de muestra, o un tipo del Diccionario de muestras | No aplicable | El ámbito de la fila. | Todos los tipos de muestra |
| **Alerta desde** | Número entero de 0 a 100 (umbral de visualización, %) | Obligatorio | Los resultados por debajo de este valor se suprimen. | 60 para todos los tipos |
| **Acción a partir de** | Número entero de 0 a 100 (umbral de acción, %) | Opcional | Debe ser como mínimo el valor de **Alerta desde**. En blanco significa que la acción empieza en el valor de **Alerta desde**. | neoplasia maligna inesperada 70, causa de muerte 70, localización u órgano 65, neoplasia maligna esperada ausente en blanco, otro 65 |
| **Acción** | Lista de opciones: **Bloquear**, **Avisar**, **Registrar** | Obligatorio | Lo que ocurre con el valor de **Acción a partir de** o por encima. | neoplasia maligna inesperada Bloquear, causa de muerte Bloquear, localización u órgano Bloquear, neoplasia maligna esperada ausente Registrar, otro Registrar |
| **Eliminar** | Botón | No aplicable | Elimina una regla de tipo de muestra. La regla para todas las muestras de un tipo no se puede eliminar. | No aplicable |
| **Una regla para un tipo de muestra** | Lista de opciones de tipo de discordancia y lista de opciones de tipo de muestra activo | Opcional | Crea una regla que parte como copia de la regla para todos los tipos de ese tipo de discordancia. Se rechaza una segunda regla para el mismo tipo de discordancia y de muestra. | Ninguno |
| **Enmiendas, correcciones y adendas** | Casilla Sí/No | Opcional | Si está activada, "Una discordancia de alto riesgo retiene la liberación hasta que se registre una decisión" se aplica también a las enmiendas, las correcciones y las adendas. | Activada |

Una entrada rechazada muestra uno de estos problemas: umbral fuera de intervalo, acción por debajo de la visualización, duplicado, no se puede eliminar la regla predeterminada, acción desconocida o categoría desconocida.

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`. Verla: `config:clinical-mismatch-rules:view` (Patólogo, Revisor de calidad y Director del laboratorio de forma predeterminada). Modificarla: `config:clinical-mismatch-rules:manage`, que requiere `view` y no tiene ningún rol predeterminado, así que concédala de forma deliberada. Sin `manage`, la pantalla es de solo lectura. Los cambios se auditan como `CLINICAL_MISMATCH_RULE_CHANGED`. `case:clinical-mismatch:record` (registrar una decisión en la firma) corresponde a Patólogo y Fellow. Separación de funciones: nadie puede tener `config:clinical-mismatch-rules:manage` junto con `config:ai-prompt:approve`, y Superadministrador no está exento.

**Límites conocidos.** El modelo puede equivocarse; los umbrales son el control del laboratorio sobre cuánto se interrumpe a un patólogo. Una discordancia en la firma es orientativa salvo que la acción de una regla sea **Bloquear**.

## Gobernanza de la IA, umbrales con intervención humana y calibración {#ch5-governance}
Breadcrumb: Inicio > Configuración > Estudios de validación

**Estado:** Construido para la gobernanza y los umbrales. Calibración de pesos: no existe.

Los controles de PathScribe mantienen a una persona entre el modelo y el registro.

- **Instrucciones aprobadas.** El texto que la comprobación de discordancia clínica envía al modelo lleva versión, y una segunda persona debe aprobarlo ([Instrucciones de IA](#screen-ai_instructions)).
- **Pruebas.** Un estudio de validación mide con qué frecuencia los patólogos aceptan sin cambios las sugerencias del modelo, y una calificación APTO es lo que permite a un centro fijar un modelo o a un modelo de voz pasar a ser el predeterminado ([Estudios de validación](#screen-tab-validation)).
- **Umbrales.** Aquí se enumeran todos los umbrales del producto.

| Umbral | Valor | Dónde se establece |
|---|---|---|
| Umbral de confianza (sugerencias) | 0 a 100, predeterminado 75 | Pestaña **Comportamiento de la IA**; sustitución por modelo en **Ajustes del modelo** |
| Inserción automática con el umbral o por encima | Desactivada de forma predeterminada | Pestaña **Comportamiento de la IA**, **Avanzado** |
| Umbrales de visualización y de acción de la discordancia clínica | 0 a 100, visualización predeterminada 60 | [Reglas de discordancia clínica](#screen-clinical_mismatch_rules) |
| Asignación de plantilla sinóptica y de tallado | Fijo 60 | Código; sin ajuste |
| Corte de campos de la extracción de antecedentes | Fijo 30 | Código; sin ajuste |
| Tasa de aceptación objetivo del estudio y ratio medio máximo de edición | 70 % y 30 % de forma predeterminada | [Estudios de validación: Estudios](#screen-validation-studies) |
| Resultado de cribado con IA estancado | Horas enteras de 1 a 720, predeterminado 24 | Pestaña **Discordancia de la IA** de Calidad ([Capítulo 4](#screen-quality-assurance)) |

**Calibración de pesos y ajustes solo internos.** En PathScribe no hay ningún ajuste de calibración de pesos de modelos, de ajuste fino ni de recalibración, y ningún ajuste de IA está limitado al personal de ForMedrixAI. Una búsqueda en el código solo encuentra calibración de equipos y de citología, que no guardan relación. Ninguna capacidad del catálogo está marcada como exclusiva de la plataforma para la IA. Conviene conocer dos hechos relacionados. La clave de API la rota el soporte de ForMedrixAI en el almacén de secretos del servidor, y no hay ninguna pantalla para ello. El catálogo de modelos que ofrece la tienda de ForMedrixAI pertenece a la plataforma, y tampoco hay una pantalla de personal para él. Como no existe ningún ajuste de ese tipo, este capítulo no tiene ninguna sección marcada como solo interna de ForMedrixAI.
### Instrucciones de IA {#screen-ai_instructions}
Breadcrumb: Inicio > Configuración > Sistema > Administración y cumplimiento > Instrucciones de IA

**Estado:** Demostración. Las reglas se ejecutan en el navegador sobre un almacenamiento inyectado y el servicio no tiene una ruta de servidor propia (`HTTP_SERVICES_REMAINING.md`).

**1. Navegación:** pestaña de Configuración **Sistema** > grupo **Administración y cumplimiento**
**2. Elemento de mantenimiento:** Instrucciones de IA

**3. Finalidad y alcance.** La comprobación de discordancia clínica envía al modelo un texto de instrucciones. Esta pantalla controla ese texto para cada una de tres disciplinas: Quirúrgica, Citología y Autopsia (se muestran como pestañas). Un cambio pasa por la edición y después por la aprobación de otra persona, de modo que nadie puede cambiar por sí solo lo que se le dice al modelo. El bloque de datos del caso y el formato JSON de la respuesta están fijados en el código y no se pueden editar aquí. Solo se utiliza la versión aprobada. La versión 0 es el texto integrado de PathScribe.

**4. Requisitos previos y dependencias.** El texto lo utiliza la comprobación con el servicio de la pestaña Comportamiento de la IA, así que el servicio de IA se configura primero. Si lo omite, un texto aprobado no tiene sobre qué ejecutarse y **Probar este texto** informa de que la IA no está disponible.

Setup step: Tier 4, step 5
Requires: [Comportamiento de la IA (pestaña)](#screen-tab-ai)
Unlocks: [Reglas de discordancia clínica](#screen-clinical_mismatch_rules)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: system-ai_instructions - Pestañas de disciplina de Instrucciones de IA con las tarjetas En uso, A la espera de aprobación, Editar, Prueba e Historial]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Pestañas de disciplina | Lista de opciones: Quirúrgica, Citología, Autopsia | Obligatorio | Cada disciplina tiene su propio texto y su propio historial. | Quirúrgica |
| **En uso: versión N** | Texto de solo lectura | No aplicable | La versión aprobada que la comprobación utiliza ahora. | Versión 0 (texto integrado) |
| **A la espera de aprobación** | Texto de solo lectura | No aplicable | La versión pendiente, si la hay. Una nueva edición retira la pendiente anterior. | Ninguna |
| **Aprobar** | Botón | No aplicable | Convierte la versión pendiente en la que se utiliza. Se rechaza para quien haya editado el texto desde la última aprobación (SELF_APPROVAL). Requiere `config:ai-prompt:approve`. | No aplicable |
| Motivo del rechazo | Texto | Obligatorio para rechazar | El motivo se conserva en el historial. | Ninguno |
| **Rechazar** | Botón | No aplicable | Desactivado hasta que se introduce un motivo. La versión aprobada sigue en uso. | No aplicable |
| Texto de edición | Área de texto, hasta 6000 caracteres, con contador | Obligatorio | No debe estar vacío, no superar los 6000 caracteres y ser distinto del texto actual (en caso contrario: vacío, demasiado largo o sin cambios). | El texto en uso |
| **Guardar para aprobación** | Botón | No aplicable | Crea una nueva versión pendiente. | No aplicable |
| **Indicación clínica** | Texto | Opcional | Entrada de ejemplo para la prueba. Se rellena con un ejemplo integrado. | Texto de ejemplo |
| **Historia clínica** | Texto | Opcional | Entrada de ejemplo para la prueba. | Texto de ejemplo |
| **Hallazgos** | Texto | Opcional | Entrada de ejemplo para la prueba. | Texto de ejemplo |
| **Diagnóstico** | Texto | Opcional | Entrada de ejemplo para la prueba. | Texto de ejemplo |
| **Hallazgo maligno confirmado por el patólogo** | Casilla Sí/No | Opcional | Entrada de ejemplo para la prueba. | Desactivada |
| **Probar este texto** | Botón | No aplicable | Ejecuta una vez el texto pendiente o editado sobre el ejemplo. El resultado es discordancia, ninguna, no permitido (por la política de proveedores) o no disponible. | No aplicable |
| Historial | Lista de solo lectura | No aplicable | Cada versión con su estado: pendiente, aprobada, rechazada, sustituida o retirada. | No aplicable |

**7. Permisos.** Abrir la pantalla: `screen:configuration:open`, más `config:ai-prompt:edit` o `config:ai-prompt:approve`. Para listar las versiones se necesita `config:ai-prompt:view` (Revisor de calidad y Director del laboratorio). `config:ai-prompt:edit` no tiene ningún rol integrado y requiere `view`. `config:ai-prompt:approve` corresponde solo a Director del laboratorio y se le niega a Superadministrador; requiere `view`. Superadministrador tiene `view` y `edit`. Separación de funciones: `config:ai-prompt:approve` no puede tenerse junto con `config:clinical-mismatch-rules:manage`. Se audita como `AI_PROMPT_EDITED`, `AI_PROMPT_APPROVED` y `AI_PROMPT_REJECTED`.

**Límites conocidos.** El lado del servidor es No construido. Una persona que tenga solo `view`, como un Revisor de calidad, no puede abrir la pantalla aunque la lista se cargaría para ella.

### Estudios de validación (pestaña) {#screen-tab-validation}
Breadcrumb: Inicio > Configuración > Estudios de validación

**Estado:** Construido. Funciona con los datos de demostración y tiene un contrato de servidor (`QUALITY_API.md`, `/api/validation-studies/...`).

**1. Navegación:** pestaña de Configuración **Estudios de validación**
**2. Elemento de mantenimiento:** Estudios de validación (la pestaña completa)

**3. Finalidad y alcance.** Un estudio de validación reúne pruebas de que un modelo de IA funciona con sus propios casos. Los patólogos trabajan con normalidad; en la firma, PathScribe registra, por cada sugerencia de la IA, si se aceptó sin cambios y cuánto se editó. Las señales están desidentificadas. Cuando se cierra el estudio, el informe califica el modelo, y solo una calificación APTO permite a un centro fijar ese modelo. La pestaña tiene tres subpestañas, **Estudios**, **Panel** e **Informes**, que se eligen con `?section=studies`, `dashboard` o `reports`. Los estudios son orientativos: `validationMode` es siempre orientativo. Un aviso lo indica, y un interruptor **Cómo funciona, con un ejemplo** explica el proceso.

**4. Requisitos previos y dependencias.** Un estudio valida un modelo elegido en la pestaña Comportamiento de la IA e inscribe centros del Diccionario de centros. Si omite los modelos y los centros, el formulario del estudio no tiene nada que elegir.

Setup step: Tier 4, step 2
Requires: [Comportamiento de la IA (pestaña)](#screen-tab-ai), [Diccionario de centros](#screen-facility-dictionary)
Unlocks: [Estudios de validación: Estudios](#screen-validation-studies)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: tab-validation - Pestaña Estudios de validación con el aviso de carácter orientativo y las tres subpestañas]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Aviso de carácter orientativo | Texto de solo lectura | No aplicable | Indica que un estudio es orientativo. | No aplicable |
| **Cómo funciona, con un ejemplo** | Interruptor | Opcional | Muestra u oculta la explicación con un ejemplo práctico. | Oculto |
| Subpestañas **Estudios**, **Panel**, **Informes** | Lista de opciones | Obligatorio | Abre la pantalla correspondiente siguiente. | Estudios |

**7. Permisos.** La pestaña aparece solo para una persona cuyo rol sea administrador, patólogo administrador o superadministrador. Es una comprobación de rol, no de capacidad. Dentro, la pestaña es de solo lectura sin `config:validation-studies:manage` y `validation:approval:record`. Ambas las tienen Administrador y Director del laboratorio a través del grupo de configuración de calidad. El rol Director del laboratorio no figura en la comprobación de rol, de modo que tiene las capacidades pero no puede abrir la pestaña.

**Límites conocidos.** Véase [Estudios de validación: Estudios](#screen-validation-studies).

### Estudios de validación: Estudios {#screen-validation-studies}
Breadcrumb: Inicio > Configuración > Estudios de validación > Estudios

**Estado:** Construido.

**1. Navegación:** pestaña de Configuración **Estudios de validación** > subpestaña **Estudios**
**2. Elemento de mantenimiento:** Estudios

**3. Finalidad y alcance.** La lista de estudios y el formulario para crear uno. Un estudio pasa por los estados borrador, pendiente de aprobación, aprobado, activo, cerrado e informado. Los botones dependen del estado: un borrador tiene **Editar**, **Enviar a revisión** y **Eliminar**; un estudio pendiente tiene **Registrar aprobación**; un estudio aprobado tiene **Activar** (se rechaza sin una referencia del IRB); un estudio activo tiene **Cerrar estudio**.

**4. Requisitos previos y dependencias.** El formulario del estudio elige un modelo de la pestaña Comportamiento de la IA, los centros activos y los patólogos inscritos (filtrados por los centros elegidos) y, opcionalmente, plantillas de informe publicadas. Si omite los médicos, la lista **Patólogos inscritos** queda vacía y no se puede guardar un estudio. Las plantillas publicadas se configuran en el [Capítulo 6](#ch6); si no hay ninguna, deje **Plantillas de informe** en blanco para incluir todas las plantillas.

Setup step: Tier 4, step 3
Requires: [Estudios de validación (pestaña)](#screen-tab-validation), [Comportamiento de la IA (pestaña)](#screen-tab-ai), [Diccionario de centros](#screen-facility-dictionary), [Médicos](#screen-physicians)
Unlocks: [Estudios de validación: Informes](#screen-validation-reports), [Estudios de validación: Panel](#screen-validation-dashboard)

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: validation-studies - Lista de Estudios de validación con Nuevo estudio]

**6. Referencia de campos.**

#### Formulario Nuevo estudio / Editar estudio
Breadcrumb: Inicio > Configuración > Estudios de validación > Estudios

[SCREENSHOT PLACEHOLDER: validation-studies-new - Formulario Nuevo estudio]

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| **Nombre del estudio** | Texto | Obligatorio | El nombre que se muestra en la lista y en el informe. | Ninguno |
| **Descripción** | Texto | Opcional | Finalidad del estudio. | Ninguna |
| **Modelo de IA que se valida** | Lista de opciones de modelos | Obligatorio | Bloqueado al editar. Un enlace **Explore la tienda de ForMedrixAI** (solo en estudios nuevos) abre la ventana de la tienda siguiente. | Ninguno |
| **Tasa de aceptación objetivo** | Control deslizante del 50 % al 100 %, paso de 5 | Obligatorio | El porcentaje de sugerencias aceptadas sin cambios que da derecho a APTO. | 70 % |
| **Ratio medio máximo de edición** | Control deslizante del 10 % al 90 %, paso de 5 | Obligatorio | Lo máximo que los patólogos pueden editar las sugerencias, de media, para obtener APTO. | 30 % |
| **Fecha de inicio** | Fecha | Obligatorio | Cuándo empieza el estudio. | Hoy |
| **Referencia del comité ético / IRB** | Texto | Opcional | Se muestra en el formulario pero no se guarda. La referencia se registra en el paso de aprobación. | Ninguna |
| **Centros participantes** | Lista de opciones de centros activos, varios | Obligatorio | Las señales solo cuentan para estos. | Ninguno |
| **Patólogos inscritos** | Lista de opciones de patólogos, varios, filtrados por los centros elegidos | Obligatorio | Solo sus firmas generan señales. El primero que se elige pasa a ser el investigador principal; no hay ningún campo para ello. | Ninguno |
| **Plantillas de informe** | Lista de opciones de plantillas publicadas, varias | Opcional | En blanco significa todas las plantillas. | Todas las plantillas |

#### Ventana Enviar a revisión ética / IRB
Breadcrumb: Inicio > Configuración > Estudios de validación > Estudios

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| **Nombre del comité ético / IRB** | Texto | Obligatorio | El comité al que va el estudio. | Ninguno |
| **Enviado por** | Texto | Obligatorio | Quién lo envió. | Ninguno |
| **Fecha prevista de revisión** | Fecha | Opcional | Cuándo se espera una decisión. | Ninguna |
| **Notas para el comité** | Texto | Opcional | Notas libres. | Ninguna |

#### Ventana Registrar la aprobación del comité
Breadcrumb: Inicio > Configuración > Estudios de validación > Estudios

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| **Número de referencia del comité ético / IRB** | Texto | Obligatorio | Sin él, el estudio no se puede activar. | Ninguno |
| **Aprobado por** | Texto | Obligatorio | La persona o el órgano que aprueba. | Ninguno |
| **Fecha de aprobación** | Fecha | Obligatorio | La fecha de la aprobación. | Hoy |
| **Referencia del acta del comité** | Texto | Opcional | Dónde se archiva el acta. | Ninguna |
| **Condiciones asociadas a la aprobación** | Texto | Opcional | Cualquier condición. | Ninguna |

#### Ventana Tienda de ForMedrixAI
Breadcrumb: Inicio > Configuración > Estudios de validación > Estudios

Enumera los modelos que ForMedrixAI ha publicado tras sus propias pruebas de regresión y que su organización no ha adoptado. Cada fila muestra el modelo, su fecha de publicación y la cifra de referencia de ForMedrixAI, y un botón **Adoptar**.

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| **Adoptar** | Botón | No aplicable | Añade el modelo a su organización como Beta, nunca como predeterminado y con cero casos, hasta que su propio estudio lo confirme. Rechazos: tienda sin licencia, sin organización, no está en el catálogo, ya adoptado. | No aplicable |

**7. Permisos.** `config:validation-studies:manage` cubre crear, actualizar, enviar a revisión, activar, cerrar y eliminar. `validation:approval:record` cubre registrar la aprobación del comité. Adoptar un modelo requiere `config:ai-model:manage`. Administrador y Director del laboratorio tienen de forma predeterminada las dos primeras. Los eventos del estudio se auditan como `validation_study_created`, `_submitted`, `_approval_recorded`, `_activated`, `_closed` y `_deleted`. Guardar una edición registra `validation_study_created`, y la activación registra el nombre literal `admin` como la persona.

**Límites conocidos.** La comprobación de licencia de la tienda es una simulación que siempre se supera, y la autorización de la suscripción es trabajo pendiente (PS-59). La referencia del IRB del formulario del estudio no se guarda. El formulario no registra un segundo revisor, solo el nombre de un comité.

### Estudios de validación: Panel {#screen-validation-dashboard}
Breadcrumb: Inicio > Configuración > Estudios de validación > Panel

**Estado:** Construido.

**1. Navegación:** pestaña de Configuración **Estudios de validación** > subpestaña **Panel**
**2. Elemento de mantenimiento:** Panel

**3. Finalidad y alcance.** Una vista de solo lectura de cómo va un estudio en curso o cerrado. Utilícela para vigilar la tasa de aceptación antes de que se cierre el estudio.

**4. Requisitos previos y dependencias.** Muestra datos una vez que un estudio está activo y los patólogos han firmado casos. Sin un estudio activo, la lista de estudios está vacía.

Setup step: Reference, not part of setup
Requires: [Estudios de validación: Estudios](#screen-validation-studies)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: validation-dashboard - Panel de validación con el selector de estudio y la tabla de rendimiento]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Selector de estudio | Lista de opciones de estudios activos o cerrados | Obligatorio | Elige el estudio que se muestra. | El primer estudio |
| Casos recogidos | Número entero de solo lectura | No aplicable | Casos con al menos una señal. | 0 |
| Señales por sección | Número entero de solo lectura | No aplicable | Sugerencias registradas en la firma. | 0 |
| Tasa de aceptación frente al objetivo | Porcentaje de solo lectura | No aplicable | Comparada con la **Tasa de aceptación objetivo** del estudio. | No aplicable |
| Aceptado sin cambios | Porcentaje de solo lectura | No aplicable | Sugerencias conservadas tal como estaban escritas. | No aplicable |
| **Sección**, **Señales**, **Aceptación**, **Ratio medio de edición**, **Edición más frecuente** | Columnas de la tabla | No aplicable | Rendimiento por sección del informe. | No aplicable |
| Aviso de carácter orientativo | Texto de solo lectura | No aplicable | Indica que las cifras son orientativas. | No aplicable |

**7. Permisos.** Abrir la pantalla: las mismas reglas de pestaña que [Estudios de validación (pestaña)](#screen-tab-validation). Nada de la página modifica datos.

**Límites conocidos.** Ninguno conocido.

### Estudios de validación: Informes {#screen-validation-reports}
Breadcrumb: Inicio > Configuración > Estudios de validación > Informes

**Estado:** Construido.

**1. Navegación:** pestaña de Configuración **Estudios de validación** > subpestaña **Informes**
**2. Elemento de mantenimiento:** Informes

**3. Finalidad y alcance.** Genera el informe impreso que califica un estudio cerrado. La calificación es APTO cuando la tasa de aceptación es como mínimo el objetivo y el ratio medio de edición es como máximo el máximo; APTO CONDICIONAL cuando la tasa de aceptación es al menos el 85 % del objetivo; en caso contrario, REVISIÓN ADICIONAL. **Generar e imprimir informe** abre una ventana de impresión, registra la salida en el rastro de auditoría, pasa el estudio a informado y guarda la calificación final una sola vez. La calificación no se vuelve a calcular después. Solo un estudio informado y calificado como APTO, con el centro entre sus participantes, permite a ese centro fijar el modelo como su sustitución de IA.

**4. Requisitos previos y dependencias.** Un informe necesita un estudio cerrado. Si omite cerrarlo, el estudio no aparece en la lista.

Setup step: Tier 4, step 4
Requires: [Estudios de validación: Estudios](#screen-validation-studies)
Unlocks: Ninguno.

**5. Pantalla.**

[SCREENSHOT PLACEHOLDER: validation-reports - Vista previa del Informe de validación y Generar e imprimir informe]

**6. Referencia de campos.**

| Nombre del campo | Tipo de dato / formato | Obligatorio/Opcional | Descripción y lógica de negocio | Valor predeterminado del sistema |
|---|---|---|---|---|
| Selector de estudio | Lista de opciones de estudios cerrados o informados | Obligatorio | Elige el estudio cuya vista previa se muestra. | El primer estudio |
| Vista previa del informe | Solo lectura | No aplicable | Las cifras y la calificación tal como se imprimirán. | No aplicable |
| **Generar e imprimir informe** | Botón | No aplicable | Imprime, audita como `validation_report_generated`, establece informado y guarda la calificación final. | No aplicable |

**7. Permisos.** Las mismas reglas de pestaña que [Estudios de validación (pestaña)](#screen-tab-validation). Generar el informe utiliza `config:validation-studies:manage`.

**Límites conocidos.** La calificación es definitiva una vez guardada; una calificación errónea no se puede volver a calcular desde la pantalla.
