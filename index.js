const functions = require('@google-cloud/functions-framework');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { Storage } = require('@google-cloud/storage');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const axios = require('axios');
const crypto = require('crypto');

// --- CONFIGURACIÓN PRINCIPAL ---
const BUCKET_NAME = 'gallinga-images-gallinga-project';
// Orígenes principales permitidos
const PRIMARY_ALLOWED_ORIGIN_PURAKASAKA = 'https://purakasaka.com'; // Dominio de la marca
const PRIMARY_ALLOWED_ORIGIN_GALLINGa_STORY_VERCEL = 'https://gallinga-story.vercel.app'; // Dominio de producción en Vercel
const PRIMARY_ALLOWED_ORIGIN_GALLINGA_APP = 'https://gallinga.purakasaka.com'; // Tu nuevo subdominio para la app
const LOCALHOST_DEV_FRONTEND = 'http://localhost:3000'; // Para desarrollo local del frontend

// Lee REQUEST_LIMIT desde una variable de entorno, con un valor por defecto de 2.
const REQUEST_LIMIT = parseInt(process.env.GALLINGA_REQUEST_LIMIT, 10) || 2;

// --- INTERRUPTOR DE PROVEEDOR DE IA ---
const ACTIVE_PROVIDER = 'LEONARDO'; 

// --- Clientes ---
const firestore = new Firestore();
const storage = new Storage();
const secretClient = new SecretManagerServiceClient();

/**
 * Middleware reutilizable para configurar las cabeceras CORS.
 * Permite que tu frontend en Vercel y localhost puedan llamar a esta API.
 * @param {import('express').Request} req El objeto de solicitud.
 * @param {import('express').Response} res El objeto de respuesta.
 */
const enableCors = (req, res) => {
  // Lista de orígenes primarios y fijos que siempre se permitirán.
  const allowedPrimaryOrigins = [
    PRIMARY_ALLOWED_ORIGIN_GALLINGA_APP,
    PRIMARY_ALLOWED_ORIGIN_GALLINGa_STORY_VERCEL,
    LOCALHOST_DEV_FRONTEND,
    PRIMARY_ALLOWED_ORIGIN_PURAKASAKA,
  ];

  // Expresión regular para permitir CUALQUIER URL de preview de Vercel para este proyecto.
  const vercelPreviewRegex = /^https:\/\/gallinga-story-.*-zavalas-projects\.vercel\.app$/;

  const origin = req.headers.origin;

  // Permitir si el origen está en la lista primaria O si coincide con el patrón de preview de Vercel.
  if (allowedPrimaryOrigins.includes(origin) || (origin && vercelPreviewRegex.test(origin))) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
};

// --- GESTIÓN DE CLAVES ---
let cachedApiKeys = null;
async function getApiKeys() {
    if (cachedApiKeys) return cachedApiKeys;
    const secretPath = 'projects/branderproject/secrets/GLOBAL_API_KEYS/versions/latest';
    const [version] = await secretClient.accessSecretVersion({ name: secretPath });
    cachedApiKeys = JSON.parse(version.payload.data.toString('utf8'));
    if (!cachedApiKeys.LEONARDO_API_KEY) {
        throw new Error("Falta LEONARDO_API_KEY en los secretos.");
    }
    if (!cachedApiKeys.ADMIN_TOKEN) {
        throw new Error("Falta ADMIN_TOKEN en los secretos.");
    }
    if (!cachedApiKeys.GEMINI_API_KEY) { // Nueva clave para Gemini
        throw new Error("Falta GEMINI_API_KEY en los secretos.");
    }
    if (!cachedApiKeys.LEONARDO_WEBHOOK_SHARED_KEY) { // Nueva clave para validar callbacks de Leonardo
        throw new Error("Falta LEONARDO_WEBHOOK_SHARED_KEY en los secretos.");
    }
    return cachedApiKeys;
}

// --- FUNCIÓN DE LÍMITE DE USO ---
async function checkRequestLimit(ipHash) {
    const now = Date.now();
    //const windowMs = 60 * 60 * 1000; // 1 hora
    const windowMs = 24 * 60 * 60 * 1000; // 24 horas
    const limitRef = firestore.collection('requestLimitsGallinga').doc(ipHash);
    const doc = await limitRef.get();

    if (!doc.exists) {
        await limitRef.set({ count: 1, windowStart: now });
        return { allowed: true, remaining: REQUEST_LIMIT - 1 };
    }

    const data = doc.data();
    if (now - data.windowStart > windowMs) {
        await limitRef.set({ count: 1, windowStart: now });
        return { allowed: true, remaining: REQUEST_LIMIT - 1 };
    }

    if (data.count >= REQUEST_LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    await limitRef.update({ count: FieldValue.increment(1) });
    return { allowed: true, remaining: REQUEST_LIMIT - (data.count + 1) };
}

// --- NUEVA FUNCIÓN: INTÉRPRETE DE PROMPTS CON GEMINI ---
/**
 * Usa Gemini para interpretar el prompt del usuario y convertirlo en un prompt efectivo para Leonardo.
 * @param {string} userPrompt El prompt original del usuario.
 * @param {string} geminiApiKey La clave de API para Gemini.
 * @returns {Promise<{status: 'success' | 'error', refined_prompt_for_leonardo?: string, feedback_for_user?: string}>} Un objeto con el resultado.
 */
async function refinePromptWithGemini(userPrompt, geminiApiKey) {
    console.log(`[INFO] [GEMINI] Iniciando refinamiento de prompt para: "${userPrompt}"`);

    const geminiPrompt = `
### Rol y Personalidad ###
Eres "Director Creativo IA", un experto en interpretar texto de usuarios para generar prompts visuales para un modelo de IA de imágenes como Leonardo. Eres bilingüe (español-inglés) y un maestro en descifrar jergas, metáforas y dialectos para extraer la intención visual. Tu tono es amigable, creativo y servicial.

### Contexto del Proyecto ###
Estás trabajando en una aplicación llamada "Historias de la Gallinga". El personaje principal, que DEBE aparecer y ser el protagonista en CADA imagen, es "Brujilda, una gallina blanca con sombrero de bruja" (in English: "a white hen wearing a witch hat"). Los usuarios escriben una continuación para una historia, y tu trabajo es convertir ese texto en un prompt de imagen espectacular.

### Tarea Principal ###
Recibirás un texto de un usuario en español. Tu misión es analizarlo y generar un prompt optimizado en INGLÉS para el modelo de IA de imágenes.

### Proceso de Pensamiento (Chain of Thought) ###
1.  **Analiza el Input del Usuario:** Lee cuidadosamente el siguiente texto: "${userPrompt}".
2.  **Identifica la Esencia Visual:** ¿Cuál es la acción principal? ¿El escenario? ¿Los objetos clave? ¿El estado de ánimo?
3.  **Decodifica el Lenguaje:** Si el usuario usa jerga (ej. "está bacán"), metáforas (ej. "llueven sapos y culebras"), o expresiones idiomáticas (ej. "la gallina está que trina"), tradúcelo a su significado visual literal. "Está que trina" no es cantar, es estar furiosa. "Llueven sapos y culebras" es una tormenta muy fuerte.
4.  **Construye la Escena:** Redacta una descripción clara y visual de la escena en INGLÉS.
5.  **Integra al Personaje Principal:** Asegúrate de que "a white hen wearing a witch hat" sea el sujeto principal de la acción que describiste. El prompt debe centrarse en ella.
6.  **Valida el Contenido:** ¿El prompt describe una escena visualmente coherente y es seguro y apropiado? Si pide algo fuera de tema (un coche, un perro), es un error.

### Formato de Salida Obligatorio (JSON) ###
Tu respuesta DEBE ser un objeto JSON válido, sin texto adicional antes o después.

*   **Si el análisis es exitoso:**
    \`\`\`json
    {
      "status": "success",
      "refined_prompt_for_leonardo": "A clear, descriptive, and visually rich prompt in English featuring 'a white hen wearing a witch hat' as the main character."
    }
    \`\`\`

*   **Si el input del usuario es imposible de interpretar, demasiado abstracto, o fuera de tema:**
    \`\`\`json
    {
      "status": "error",
      "feedback_for_user": "Una explicación amigable en ESPAÑOL de por qué no se pudo procesar el texto, con 1 o 2 ejemplos de buenos prompts. Por ejemplo: 'No logré entender la escena que quieres crear. Intenta describir algo más visual, como por ejemplo: \\'la gallina explora una cueva oscura con una antorcha\\' o \\'la gallina vuela sobre un pueblo en su escoba mágica\\''."
    }
    \`\`\`
`;

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${geminiApiKey}`,
            { contents: [{ parts: [{ text: geminiPrompt }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const rawResponse = response.data.candidates[0].content.parts[0].text;
        // Limpiar la respuesta para extraer solo el JSON
        const jsonResponse = rawResponse.replace(/```json\n/g, '').replace(/```/g, '').trim();
        console.log(`[INFO] [GEMINI] Respuesta JSON recibida y parseada.`);
        const parsedJson = JSON.parse(jsonResponse);

        // Validar que la estructura del JSON sea la esperada
        if (!parsedJson.status || (parsedJson.status === 'success' && !parsedJson.refined_prompt_for_leonardo) || (parsedJson.status === 'error' && !parsedJson.feedback_for_user)) {
            console.error('[ERROR] [GEMINI] La respuesta JSON de Gemini tiene un formato inesperado:', parsedJson);
            throw new Error("El intérprete creativo (IA) devolvió una respuesta con formato incorrecto.");
        }
        return parsedJson;

    } catch (geminiError) {
        console.error(`[ERROR] [GEMINI] Fallo al contactar o parsear la respuesta de Gemini.`, geminiError.response ? geminiError.response.data : geminiError.message);
        throw new Error("El intérprete creativo (IA) no está disponible en este momento.");
    }
}

// --- PROVEEDOR DE IA: LEONARDO (CON PROMPT SECRETO) ---
const leonardoProvider = {
    generateImage: async (prompt, apiKey) => {
        // Esta función ahora solo inicia la generación y devuelve el ID.
        // El sondeo se elimina. Leonardo notificará vía webhook.
        console.log(`[INFO] [LEONARDO] Iniciando generación (modo webhook) con modelo Flux Dev (Creative Style)`);
        
        const apiPrompt = `photorealistic, cinematic, dynamic action scene, high detail. The scene is based on this short story: ${prompt}`;
        
        const negativePrompt = "text, watermark, deformed, blurry, ugly, duplicate, morbid, mutilated, out of frame, cartoon, 3d, painting, illustration";

        const payload = {
            // Leonardo usará la URL y clave de webhook configuradas globalmente para la API Key de producción.
            // No es necesario enviarlas en cada request si ya están seteadas en Leonardo.
            prompt: apiPrompt,
            negative_prompt: negativePrompt,
            modelId: "b2614463-296c-462a-9586-aafdb8f00e36", // Flux Dev
            num_images: 1,
            width: 512,
            height: 512,
            styleUUID: "6fedbf1f-4a17-45ec-84fb-92fe524a29ef", // Preset Style: Creative
            contrast: 3.5,
            enhancePrompt: false,
        };



        const startGenerationResponse = await axios.post('https://cloud.leonardo.ai/api/rest/v1/generations', payload, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        const generationId = startGenerationResponse.data.sdGenerationJob.generationId;
        if (!generationId) throw new Error("Leonardo API no devolvió un ID de generación.");
        
        console.log(`[INFO] [LEONARDO] Tarea de generación enviada a Leonardo. ID: ${generationId}. Se esperará notificación vía webhook.`);
        // Devuelve solo el ID de generación. La URL de la imagen llegará por el webhook.
        return { leonardoGenerationId: generationId };
    }
};

// --- FUNCIÓN PRINCIPAL DE GALLINGA ---
functions.http('generarImagenGallinga', async (req, res) => {
    enableCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    
    try {
        const ip = req.ip;
        const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
        const limitCheck = await checkRequestLimit(ipHash);
        if (!limitCheck.allowed) {
            return res.status(429).json({ error: 'Límite de solicitudes excedido. Intenta más tarde.', remainingAttempts: 0 });
        }

        const { prompt: userPrompt } = req.body;
        
        if (!userPrompt || userPrompt.trim().length < 5 || userPrompt.trim().length > 250) {
            return res.status(400).json({ error: 'El prompt debe tener entre 5 y 250 caracteres.', remainingAttempts: limitCheck.remaining });
        }
        const apiKeys = await getApiKeys();

        // --- INTERPRETACIÓN Y REFINAMIENTO DE PROMPT CON GEMINI ---
        const geminiResult = await refinePromptWithGemini(userPrompt, apiKeys.GEMINI_API_KEY);

        if (geminiResult.status === 'error') {
            console.warn(`[WARN] [GEMINI] Prompt rechazado. Feedback: ${geminiResult.feedback_for_user}`);
            // No descontamos un intento si el prompt es inválido.
            await firestore.collection('requestLimitsGallinga').doc(ipHash).update({ count: FieldValue.increment(-1) });
            return res.status(400).json({ error: geminiResult.feedback_for_user, remainingAttempts: limitCheck.remaining + 1 });
        }

        const promptForLeonardo = geminiResult.refined_prompt_for_leonardo;
        console.log(`[INFO] [GEMINI] Prompt refinado para Leonardo: "${promptForLeonardo}"`);

        // Llama al proveedor de Leonardo, que ahora solo inicia y devuelve el ID
        const { leonardoGenerationId } = await leonardoProvider.generateImage(promptForLeonardo, apiKeys.LEONARDO_API_KEY);

        // Guardar el trabajo pendiente en Firestore, incluyendo ambos prompts
        const jobRef = firestore.collection('gallingaImageJobs').doc(leonardoGenerationId);
        await jobRef.set({
            leonardoGenerationId: leonardoGenerationId,
            status: 'PENDING', // Estados podrían ser: PENDING, COMPLETE, FAILED
            originalUserPrompt: userPrompt,
            translatedPrompt: promptForLeonardo,
            ipHash: ipHash, // Reutilizar el hash ya calculado para el rate limit
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });
        console.log(`[INFO] [generarImagenGallinga] Trabajo ${leonardoGenerationId} registrado en Firestore como PENDING.`);

        // Responder al cliente que el trabajo ha comenzado
        return res.status(202).json({ // 202 Accepted
            jobId: leonardoGenerationId, // El frontend usará esto para sondear
            status: 'PENDING',
            remainingAttempts: limitCheck.remaining 
        });

    } catch (error) {
        let errorMessage = 'Ocurrió un error mágico inesperado.';
        let errorDetails = error.message;
        if (error.response && error.response.data) {
            errorDetails = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        }
        const ipHashForError = req.ip ? crypto.createHash('sha256').update(req.ip).digest('hex') : 'N/A';
        console.error(`[ERROR] Fallo catastrófico en generarImagenGallinga. IP Hash: ${ipHashForError}. Details: ${errorDetails}. Stack: ${error.stack}`);
        
        // Trata de obtener remainingAttempts si limitCheck se ejecutó y falló después
        const remaining = (typeof limitCheck !== 'undefined' && limitCheck && typeof limitCheck.remaining === 'number') 
                            ? limitCheck.remaining 
                            : undefined;
        // Loguea el error detallado internamente, pero envía un mensaje genérico al cliente
        res.status(500).json({ error: errorMessage, remainingAttempts: remaining });
    }
});

// --- NUEVAS FUNCIONES PARA MANEJO DE WEBHOOKS Y ESTADO DE TRABAJOS ---

functions.http('leonardoCallbackHandler', async (req, res) => {
    console.log('[INFO] [leonardoCallbackHandler] Webhook recibido de Leonardo AI.');

    if (req.method !== 'POST') {
        console.warn(`[WARN] [leonardoCallbackHandler] Método no permitido: ${req.method}.`);
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const apiKeys = await getApiKeys();
        const expectedAuthHeader = `Bearer ${apiKeys.LEONARDO_WEBHOOK_SHARED_KEY}`;
        const receivedAuthHeader = req.headers.authorization;

        if (receivedAuthHeader !== expectedAuthHeader) {
            console.warn(`[WARN] [leonardoCallbackHandler] Autorización de webhook inválida. Recibido: ${receivedAuthHeader ? receivedAuthHeader.substring(0, 15) + '...' : 'N/A'}`);
            return res.status(403).json({ error: 'Unauthorized' });
        }

        console.log('[INFO] [leonardoCallbackHandler] Autorización de webhook exitosa.');
        const payload = req.body;
        // console.log('[DEBUG] [leonardoCallbackHandler] Payload completo:', JSON.stringify(payload, null, 2));


        if (payload.type !== 'image_generation.complete' || !payload.data || !payload.data.object) {
            console.warn('[WARN] [leonardoCallbackHandler] Payload inesperado o tipo de evento no manejado:', payload.type);
            return res.status(400).json({ error: 'Payload o tipo de evento no esperado.' });
        }
        
        const generationData = payload.data.object;
        const leonardoGenerationId = generationData.id;
        const status = generationData.status ? generationData.status.toUpperCase() : 'UNKNOWN';

        if (!leonardoGenerationId) {
            console.error('[ERROR] [leonardoCallbackHandler] No se encontró ID de generación en el payload del webhook.');
            return res.status(400).json({ error: 'Falta ID de generación en el payload.' });
        }
        
        console.log(`[INFO] [leonardoCallbackHandler] Procesando callback para ID: ${leonardoGenerationId}, Estado: ${status}`);

        const jobRef = firestore.collection('gallingaImageJobs').doc(leonardoGenerationId);
        const jobDoc = await jobRef.get();

        if (!jobDoc.exists) {
            console.warn(`[WARN] [leonardoCallbackHandler] No se encontró el trabajo ${leonardoGenerationId} en Firestore. Puede que ya haya sido procesado o sea un ID inesperado.`);
            return res.status(200).json({ message: 'Trabajo no encontrado, pero webhook recibido.' }); // 200 para evitar reintentos de Leonardo
        }

        const updateData = {
            status: status, 
            updatedAt: FieldValue.serverTimestamp(),
            leonardoWebhookPayload: generationData // Opcional: guardar todo el payload para debugging
        };

        if (status === 'COMPLETE') {
            if (generationData.images && generationData.images.length > 0 && generationData.images[0].url) {
                updateData.imageUrlFromLeonardo = generationData.images[0].url;
                console.log(`[INFO] [leonardoCallbackHandler] Imagen generada para ${leonardoGenerationId}: ${updateData.imageUrlFromLeonardo}`);
            } else {
                console.error(`[ERROR] [leonardoCallbackHandler] Generación ${leonardoGenerationId} COMPLETA pero sin URL de imagen en el payload.`, generationData);
                updateData.status = 'FAILED'; 
                updateData.failureReason = 'Callback COMPLETE pero sin URL de imagen.';
            }
        } else if (status === 'FAILED') {
            // Intenta obtener un mensaje de error más específico si Leonardo lo proporciona
            const errorMessageFromLeonardo = generationData.error || (generationData.failureReason ? generationData.failureReason : 'Leonardo reportó un fallo sin detalles específicos.');
            updateData.failureReason = errorMessageFromLeonardo;
            console.error(`[ERROR] [leonardoCallbackHandler] Generación ${leonardoGenerationId} FALLIDA. Razón: ${updateData.failureReason}`);
        }

        await jobRef.update(updateData);
        console.log(`[INFO] [leonardoCallbackHandler] Trabajo ${leonardoGenerationId} actualizado en Firestore a estado ${updateData.status}.`);
        
        res.status(200).json({ message: 'Webhook procesado exitosamente.' });

    } catch (error) {
        console.error(`[ERROR] [leonardoCallbackHandler] Error procesando webhook: ${error.message}`, error.stack);
        res.status(500).json({ error: 'Error interno procesando el webhook.' });
    }
});

functions.http('getGallingaJobStatus', async (req, res) => {
    enableCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const jobId = req.query.jobId;
        if (!jobId) {
            return res.status(400).json({ error: 'Falta el parámetro jobId.' });
        }

        const jobRef = firestore.collection('gallingaImageJobs').doc(jobId);
        const jobDoc = await jobRef.get();

        if (!jobDoc.exists) {
            return res.status(404).json({ error: 'Trabajo no encontrado.' });
        }

        const jobData = jobDoc.data();
        
        const responsePayload = {
            jobId: jobData.leonardoGenerationId,
            status: jobData.status,
            originalUserPrompt: jobData.originalUserPrompt,
            translatedPrompt: jobData.translatedPrompt,
            createdAt: jobData.createdAt ? jobData.createdAt.toDate().toISOString() : null,
            updatedAt: jobData.updatedAt ? jobData.updatedAt.toDate().toISOString() : null,
        };

        if (jobData.status === 'COMPLETE' && jobData.imageUrlFromLeonardo) {
            responsePayload.imageUrlFromLeonardo = jobData.imageUrlFromLeonardo;
        } else if (jobData.status === 'FAILED') {
            responsePayload.failureReason = jobData.failureReason || 'La generación falló sin detalles específicos.';
        }
        
        res.status(200).json(responsePayload);

    } catch (error) {
        console.error(`[ERROR] [getGallingaJobStatus] Error: ${error.message}`, error.stack);
        res.status(500).json({ error: 'Error interno al consultar el estado del trabajo.' });
    }
});

// --- FIN DE NUEVAS FUNCIONES ---

functions.http('obtenerGaleria', async (req, res) => {
    enableCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    try {
        const { limit = 8, startAfter, id } = req.query;

        // --- INICIO: Lógica para obtener una sola imagen por ID ---
        if (id) {
            console.log(`[INFO] [obtenerGaleria] Buscando imagen individual con ID: ${id}`);
            const docRef = firestore.collection('gallinga_gallery').doc(id);
            const doc = await docRef.get();

            if (!doc.exists) {
                console.warn(`[WARN] [obtenerGaleria] Imagen con ID ${id} no encontrada.`);
                return res.status(404).json({ error: 'Imagen no encontrada.' });
            }

            const imageData = { id: doc.id, ...doc.data() };
            console.log(`[INFO] [obtenerGaleria] Imagen ${id} encontrada y devuelta.`);
            return res.status(200).json(imageData);
        }
        // --- FIN: Lógica para obtener una sola imagen por ID ---


        const parsedLimit = parseInt(limit, 10) || 12; // Asegurar que parsedLimit tenga un valor válido
        console.log(`[INFO] [obtenerGaleria] Request received. Query params: limit=${limit}, startAfter=${startAfter}. Parsed limit: ${parsedLimit}`);

        let query = firestore.collection('gallinga_gallery')
            .where('isPublic', '==', true)
            // .orderBy('createdAt', 'desc') // Ya tienes esto, asegúrate que el campo existe y está indexado
            .orderBy('createdAt', 'desc')
            .limit(parsedLimit);

        if (startAfter) {
            const lastDoc = await firestore.collection('gallinga_gallery').doc(startAfter).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            } else {
                console.warn(`[WARN] [obtenerGaleria] Documento para startAfter (ID: ${startAfter}) no encontrado.`);
                // Podrías devolver un error o simplemente ignorar el startAfter
            }
        }

        const snapshot = await query.get();
        
        const gallery = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                averageRating: data.averageRating || 0, // Asegurar que estos campos existan
                ratingCount: data.ratingCount || 0
            };
        });

        const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
        const nextCursor = lastVisibleDoc ? lastVisibleDoc.id : null;

        const responsePayload = {
            images: gallery,
            nextCursor: gallery.length === parsedLimit ? nextCursor : null // Si se devolvieron menos del límite, no hay más
        }; 
        console.log(`[INFO] [obtenerGaleria] Sending response. Image count: ${gallery.length}, Has nextCursor: ${!!responsePayload.nextCursor}`);
        res.status(200).json(responsePayload);

    } catch (error) {
        // Loguear los parámetros recibidos también en caso de error
        console.error(`[ERROR] [obtenerGaleria] Error procesando la solicitud. Query params: ${JSON.stringify(req.query)}. Error:`, error);
        res.status(500).json({ error: "Error al cargar la galería.", details: error.message });
    }
});

functions.http('finalizarCreacionGallinga', async (req, res) => {
    console.log('[INFO] [finalizarCreacionGallinga] Función invocada. Verificando CORS y método...');
    enableCors(req, res);

    if (req.method === 'OPTIONS') {
        console.log('[INFO] [finalizarCreacionGallinga] Respondiendo a solicitud OPTIONS (pre-flight).');
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        console.warn(`[WARN] [finalizarCreacionGallinga] Método no permitido: ${req.method}. IP: ${req.ip}`);
        return res.status(405).send('Method Not Allowed');
    }

    try {
        console.log(`[INFO] [finalizarCreacionGallinga] Solicitud POST recibida. IP: ${req.ip}. Body:`, JSON.stringify(req.body || {}));
        const { imageUrlFromLeonardo, prompt, creatorName, creatorInstagram, leonardoGenerationId } = req.body;

        // leonardoGenerationId es opcional aquí por si se aprueban imágenes de otros proveedores en el futuro
        if (!imageUrlFromLeonardo || !prompt) { 
            console.warn('[WARN] [finalizarCreacionGallinga] Faltan datos en el body (imageUrlFromLeonardo o prompt). Body recibido:', req.body);
            return res.status(400).json({ error: 'Faltan datos para finalizar la creación.' });
        }

        console.log(`[INFO] [finalizarCreacionGallinga] Descargando imagen desde Leonardo: ${imageUrlFromLeonardo}`);
        const imageResponse = await axios.get(imageUrlFromLeonardo, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);
        console.log(`[INFO] [finalizarCreacionGallinga] Imagen descargada. Tamaño: ${imageBuffer.length} bytes.`);

        const fileName = `gallinga-${Date.now()}.png`;
        console.log(`[INFO] [finalizarCreacionGallinga] Subiendo imagen a GCS como: ${fileName}`);
        const file = storage.bucket(BUCKET_NAME).file(fileName);
        await file.save(imageBuffer, { metadata: { contentType: 'image/png' } });
        const finalImageUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
        console.log(`[INFO] [finalizarCreacionGallinga] Imagen subida a GCS: ${finalImageUrl}`);

        const galleryData = {
            prompt: prompt,
            imageUrl: finalImageUrl,
            creatorName: (creatorName || 'Anónimo').replace(/[^a-zA-Z0-9\sÁÉÍÓÚáéíóúñÑüÜ]/gi, '').slice(0, 30), // Permitir caracteres españoles
            creatorInstagram: (creatorInstagram || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30),
            createdAt: FieldValue.serverTimestamp(),
            isPublic: true,
            provider: ACTIVE_PROVIDER,
            leonardoGenerationId: leonardoGenerationId || null, // Guardar el ID de Leonardo si se proporciona
            totalRatingSum: 0, // Inicializar campos de rating
            ratingCount: 0,
            averageRating: 0
        };
        console.log('[INFO] [finalizarCreacionGallinga] Guardando en Firestore:', galleryData);
        const docRef = await firestore.collection('gallinga_gallery').add({
            ...galleryData
        });

        console.log(`[INFO] [finalizarCreacionGallinga] Imagen guardada en Firestore con ID: ${docRef.id}`);
        res.status(200).json({ finalImageUrl, firestoreId: docRef.id });

    } catch (error) {
        let errorDetails = error.message;
        if (error.response && error.response.data) {
            errorDetails = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        }
        if (error.isAxiosError) {
            console.error(`[ERROR] [AXIOS] Error en finalizarCreacionGallinga al interactuar con URL externa. Details: ${errorDetails}. Stack: ${error.stack}`);
        } else {
            console.error(`[ERROR] Error inesperado en finalizarCreacionGallinga. Details: ${errorDetails}. Stack: ${error.stack}`);
        }
        res.status(500).json({ error: 'Error al guardar la imagen aprobada.', details: errorDetails });
    }
});

functions.http('eliminarCreacionGallinga', async (req, res) => {
    console.log('[INFO] [eliminarCreacionGallinga] Función invocada. Verificando CORS y método...');
    enableCors(req, res);

    if (req.method === 'OPTIONS') {
        console.log('[INFO] [eliminarCreacionGallinga] Respondiendo a solicitud OPTIONS (pre-flight).');
        return res.status(204).send('');
    }

    // Asumiendo que la eliminación se hará vía POST por simplicidad del cliente,
    // o podrías cambiar a req.method === 'DELETE' si tu cliente lo soporta y prefieres semántica REST.
    if (req.method !== 'POST' && req.method !== 'DELETE') { 
        console.warn(`[WARN] [eliminarCreacionGallinga] Método no permitido: ${req.method}. IP: ${req.ip}`);
        return res.status(405).send('Method Not Allowed');
    }

    try {
        console.log(`[INFO] [eliminarCreacionGallinga] Solicitud recibida. Método: ${req.method}. IP: ${req.ip}. Body:`, JSON.stringify(req.body || {}));

        const { leonardoGenerationId } = req.body;
        if (!leonardoGenerationId) {
            console.warn('[WARN] [eliminarCreacionGallinga] Falta leonardoGenerationId en el body.');
            return res.status(400).json({ error: 'Falta ID de generación de Leonardo.' });
        }
        console.log(`[INFO] [eliminarCreacionGallinga] Intentando eliminar ID de Leonardo: ${leonardoGenerationId}`);
        const apiKeys = await getApiKeys();
        const deleteResponse = await axios.delete(`https://cloud.leonardo.ai/api/rest/v1/generations/${leonardoGenerationId}`, {
            headers: { 'Authorization': `Bearer ${apiKeys.LEONARDO_API_KEY}` }
        });
        
        // Log de la respuesta de Leonardo para una eliminación exitosa
        console.log(`[INFO] [LEONARDO] Respuesta de eliminación para ID ${leonardoGenerationId}: Status ${deleteResponse.status}`, deleteResponse.data);

        res.status(200).json({ message: 'Imagen eliminada de Leonardo AI correctamente.' });

    } catch (error) {
        let errorDetails = error.message;
        const genIdForError = req.body && req.body.leonardoGenerationId ? req.body.leonardoGenerationId : 'N/A';

        if (error.isAxiosError && error.response) {
            // Error específico de la API de Leonardo
            errorDetails = `Error de Leonardo API (${error.response.status}): ${JSON.stringify(error.response.data || error.message)}`;
            console.error(`[ERROR] [LEONARDO] Fallo al eliminar imagen ID ${genIdForError}. Status: ${error.response.status}. Respuesta:`, JSON.stringify(error.response.data || error.message), "Stack:", error.stack);
        } else {
            // Otros tipos de errores (red, programación, etc.)
            console.error(`[ERROR] Error inesperado en eliminarCreacionGallinga para ID ${genIdForError}. Details: ${errorDetails}. Stack: ${error.stack}`);
        }
        
        res.status(500).json({ error: 'Error al intentar eliminar la imagen de Leonardo AI.', details: errorDetails });
    }
});

functions.http('borrarTodoRastroImagen', async (req, res) => {
    console.log('[INFO] [borrarTodoRastroImagen] Función invocada. Verificando CORS y método...');
    enableCors(req, res); // Usamos el helper general, pero la seguridad real viene del token.

    if (req.method === 'OPTIONS') {
        console.log('[INFO] [borrarTodoRastroImagen] Respondiendo a solicitud OPTIONS.');
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        console.warn(`[WARN] [borrarTodoRastroImagen] Método no permitido: ${req.method}.`);
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { firestoreDocumentId, token, deleteTargets } = req.body; // Nuevo: deleteTargets
        console.log(`[INFO] [borrarTodoRastroImagen] Solicitud POST recibida. Documento ID: ${firestoreDocumentId}. DeleteTargets:`, deleteTargets ? JSON.stringify(deleteTargets) : 'No especificado (borrar todo)');

        const apiKeys = await getApiKeys();
        // Validar token
        if (token !== apiKeys.ADMIN_TOKEN) {
            console.warn('[WARN] [borrarTodoRastroImagen] Token de administrador inválido.');
            return res.status(403).json({ error: 'Token inválido.' });
        }

        if (!firestoreDocumentId) {
            console.warn('[WARN] [borrarTodoRastroImagen] Falta firestoreDocumentId en el body.');
            return res.status(400).json({ error: 'Falta ID del documento de Firestore.' });
        }

        const docRef = firestore.collection('gallinga_gallery').doc(firestoreDocumentId);
        const docSnapshot = await docRef.get();

        if (!docSnapshot.exists) {
            console.warn(`[WARN] [borrarTodoRastroImagen] Documento ${firestoreDocumentId} no encontrado en Firestore.`);
            return res.status(404).json({ error: 'Documento no encontrado en Firestore.' });
        }

        const data = docSnapshot.data();
        const results = { firestore: 'no intentado', gcs: 'no intentado', leonardo: 'no intentado' };

        // Determinar qué borrar.
        // Si deleteTargets no se proporciona o una clave específica dentro de deleteTargets no se proporciona (o es undefined),
        // se asume true (eliminar) para esa clave, manteniendo la compatibilidad hacia atrás.
        // Si una clave en deleteTargets se establece explícitamente en false, no se eliminará de ese servicio.
        const shouldDeleteFirestore = (!deleteTargets || typeof deleteTargets.firestore === 'undefined') ? true : deleteTargets.firestore === true;
        const shouldDeleteGCS = (!deleteTargets || typeof deleteTargets.gcs === 'undefined') ? true : deleteTargets.gcs === true;
        const shouldDeleteLeonardo = (!deleteTargets || typeof deleteTargets.leonardo === 'undefined') ? true : deleteTargets.leonardo === true;
        
        console.log(`[DEBUG] [borrarTodoRastroImagen] Decisiones de borrado - Firestore: ${shouldDeleteFirestore}, GCS: ${shouldDeleteGCS}, Leonardo: ${shouldDeleteLeonardo}`);

        // 1. Eliminar de Google Cloud Storage
        if (shouldDeleteGCS) {
            if (data.imageUrl && data.imageUrl.startsWith(`https://storage.googleapis.com/${BUCKET_NAME}/`)) {
                const fileName = data.imageUrl.substring(`https://storage.googleapis.com/${BUCKET_NAME}/`.length);
                try {
                    await storage.bucket(BUCKET_NAME).file(fileName).delete();
                    results.gcs = `Archivo ${fileName} eliminado de GCS.`;
                    console.log(`[INFO] [borrarTodoRastroImagen] ${results.gcs}`);
                } catch (gcsError) {
                    results.gcs = `Error al eliminar ${fileName} de GCS: ${gcsError.message}`;
                    console.error(`[ERROR] [borrarTodoRastroImagen] ${results.gcs}`, gcsError);
                }
            } else {
                results.gcs = "No se encontró URL de GCS válida o no aplicable para borrado.";
                console.log(`[INFO] [borrarTodoRastroImagen] ${results.gcs}`);
            }
        } else {
            results.gcs = "Borrado de GCS no solicitado.";
            console.log(`[INFO] [borrarTodoRastroImagen] ${results.gcs}`);
        }

        // 2. Eliminar de Leonardo AI (si hay ID)
        if (shouldDeleteLeonardo) {
            if (data.leonardoGenerationId) {
                try {
                    await axios.delete(`https://cloud.leonardo.ai/api/rest/v1/generations/${data.leonardoGenerationId}`, {
                        headers: { 'Authorization': `Bearer ${apiKeys.LEONARDO_API_KEY}` }
                    });
                    results.leonardo = `Imagen ${data.leonardoGenerationId} eliminada de Leonardo AI.`;
                    console.log(`[INFO] [borrarTodoRastroImagen] ${results.leonardo}`);
                } catch (leoError) {
                    results.leonardo = `Error al eliminar ${data.leonardoGenerationId} de Leonardo: ${leoError.response ? JSON.stringify(leoError.response.data) : leoError.message}`;
                    console.error(`[ERROR] [borrarTodoRastroImagen] ${results.leonardo}`, leoError);
                }
            } else {
                results.leonardo = "No se encontró ID de Leonardo Generation o no aplicable para borrado.";
                console.log(`[INFO] [borrarTodoRastroImagen] ${results.leonardo}`);
            }
        } else {
            results.leonardo = "Borrado de Leonardo AI no solicitado.";
            console.log(`[INFO] [borrarTodoRastroImagen] ${results.leonardo}`);
        }

        // 3. Eliminar de Firestore
        if (shouldDeleteFirestore) {
            await docRef.delete();
            results.firestore = `Documento ${firestoreDocumentId} eliminado de Firestore.`;
            console.log(`[INFO] [borrarTodoRastroImagen] ${results.firestore}`);
        } else {
            results.firestore = "Borrado de Firestore no solicitado.";
            console.log(`[INFO] [borrarTodoRastroImagen] ${results.firestore}`);
        }

        res.status(200).json({ message: 'Proceso de borrado completado.', results });

    } catch (error) {
        const docIdForError = req.body && req.body.firestoreDocumentId ? req.body.firestoreDocumentId : 'N/A';
        console.error(`[ERROR] Error general en borrarTodoRastroImagen para Doc ID ${docIdForError}. Details: ${error.message}. Stack: ${error.stack}`);
        res.status(500).json({ error: 'Error interno al procesar la solicitud de borrado.', details: error.message });
    }
});

functions.http('rateImageGallinga', async (req, res) => {
    console.log('[INFO] [rateImageGallinga] Función invocada. Verificando CORS y método...');
    enableCors(req, res);

    if (req.method === 'OPTIONS') {
        console.log('[INFO] [rateImageGallinga] Respondiendo a solicitud OPTIONS.');
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        console.warn(`[WARN] [rateImageGallinga] Método no permitido: ${req.method}.`);
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { imageId, rating } = req.body;
        console.log(`[INFO] [rateImageGallinga] Solicitud POST recibida. Image ID: ${imageId}, Rating: ${rating}`);

        if (!imageId || typeof rating !== 'number' || rating < 1 || rating > 5) {
            console.warn('[WARN] [rateImageGallinga] Datos inválidos en el body.');
            return res.status(400).json({ error: 'Datos inválidos. Se requiere imageId y rating (1-5).' });
        }

        const docRef = firestore.collection('gallinga_gallery').doc(imageId);
        
        await firestore.runTransaction(async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            if (!docSnapshot.exists) {
                throw new Error('Documento no encontrado.'); // Será capturado y enviado como 404
            }

            const imageData = docSnapshot.data();
            const currentTotalRatingSum = imageData.totalRatingSum || 0;
            const currentRatingCount = imageData.ratingCount || 0;

            const newTotalRatingSum = currentTotalRatingSum + rating;
            const newRatingCount = currentRatingCount + 1;
            const newAverageRating = parseFloat((newTotalRatingSum / newRatingCount).toFixed(2));

            transaction.update(docRef, {
                totalRatingSum: newTotalRatingSum,
                ratingCount: newRatingCount,
                averageRating: newAverageRating
            });
            console.log(`[INFO] [rateImageGallinga] Calificación actualizada para ${imageId}: Nuevo promedio ${newAverageRating}, Total votos ${newRatingCount}`);
            res.status(200).json({ message: 'Calificación guardada.', newAverageRating, newRatingCount });
        });
    } catch (error) {
        console.error(`[ERROR] Error en rateImageGallinga. Details: ${error.message}. Stack: ${error.stack}`);
        res.status(error.message === 'Documento no encontrado.' ? 404 : 500).json({ error: 'Error al guardar la calificación.', details: error.message });
    }
});
