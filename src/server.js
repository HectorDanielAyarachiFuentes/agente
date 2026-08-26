// Importamos las librerías que instalamos
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Carga la clave desde el archivo .env

const app = express();
const port = 3000;

// Agente Capacitaciones
const instruccionesCapacitaciones = fs.readFileSync(path.join(__dirname, '../Asistente_Inscripciones/instrucciones_asistente.txt'), 'utf-8');
const conocimientoCapacitaciones = fs.readFileSync(path.join(__dirname, '../Asistente_Inscripciones/conocimiento.txt'), 'utf-8');
const systemPromptCapacitaciones = `
${instruccionesCapacitaciones}

--- BASE DE CONOCIMIENTO (FUENTES) ---
Utiliza la siguiente información para responder a las consultas:

${conocimientoCapacitaciones}
`;

// Agente Curzas
const instruccionesCurzas = fs.readFileSync(path.join(__dirname, '../Asistente_Curzas/instrucciones_curzas.txt'), 'utf-8');
const conocimientoCurzas = fs.readFileSync(path.join(__dirname, '../Asistente_Curzas/conocimiento.txt'), 'utf-8');
const systemPromptCurzas = `
${instruccionesCurzas}

--- BASE DE CONOCIMIENTO (FUENTES) ---
Utiliza la siguiente información para responder a las consultas:

${conocimientoCurzas}
`;

// Middleware para que el servidor entienda JSON y sirva tu index.html
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Esta es la "puerta trasera" segura que llamará nuestro HTML
app.post('/api/chat', async (req, res) => {
    try {
        const { question, context, mode, history = [] } = req.body;
        // El servidor lee las claves secretas aquí
        const groqApiKeys = [
            process.env.GROQ_API_KEY,
            process.env.GROQ_API_KEY_2
        ].filter(key => key); // Filtramos por si alguna está vacía

        if (groqApiKeys.length === 0) {
            return res.status(500).json({ error: 'No hay claves de API configuradas en el servidor.' });
        }
        
        let messages = [];

        if (mode === 'capacitaciones') {
            const systemPrompt = systemPromptCapacitaciones;
            messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: question }
            ];
        } else if (mode === 'curzas') {
            const systemPrompt = systemPromptCurzas;
            messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: question }
            ];
        } else if (mode === 'practica3') {
            const systemPrompt = systemPromptCapacitaciones;
            const contextText = context ? `\n\n--- DOCUMENTO ADJUNTO POR EL USUARIO ---\n${context}\n---------------------------------------\n` : "";
            messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: question + contextText }
            ];
        } else {
            // Fallback (IA genérica o antiguo modo)
            const systemPrompt = "Eres un asistente experto.";
            messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: question }
            ];
        }

        // Lista de modelos de contingencia ordenados por preferencia
        const modelosGroq = [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-safeguard-20b",
            "qwen/qwen3.6-27b",
            "openai/gpt-oss-20b"
        ];

        let data = null;
        let ultimoError = null;

        // Bucle anidado: Intentar con cada clave de API, y para cada clave, probar los modelos
        for (const apiKey of groqApiKeys) {
            const keyOculta = apiKey.slice(-4); // Para loggear solo los últimos 4 dígitos por seguridad
            
            for (const modeloActual of modelosGroq) {
                try {
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: modeloActual,
                            messages: messages
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        ultimoError = errorData.error?.message || 'Error desconocido';
                        console.warn(`[API] Falló clave ...${keyOculta} con modelo ${modeloActual}. Pasando al siguiente...`);
                        continue; 
                    }

                    data = await response.json();
                    console.log(`[API] Éxito total usando modelo: ${modeloActual} (Clave ...${keyOculta})`);
                    break; // Éxito con este modelo, rompemos el bucle interno

                } catch (err) {
                    ultimoError = err.message;
                    console.warn(`[API] Fallo de red con modelo ${modeloActual}. Pasando al siguiente...`);
                    continue;
                }
            }
            // Si después de probar los modelos con esta clave 'data' tiene contenido, rompemos el bucle de claves
            if (data) break; 
        }

        // Si se recorrió absolutamente toda la matriz (claves x modelos) y falló todo
        if (!data) {
            throw new Error(`Se agotaron todos los tokens en TODAS las claves y modelos. Último error: ${ultimoError}`);
        }

        // El servidor devuelve solo la respuesta al navegador
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// El servidor se pone a escuchar peticiones
app.listen(port, () => {
    console.log(`Servidor de prueba iniciado en http://localhost:${port}`);
});