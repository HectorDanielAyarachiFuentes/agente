// Importamos las librerías que instalamos
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Carga la clave desde el archivo .env

const app = express();
const port = 3000;

// Cargamos las instrucciones y el conocimiento una sola vez al iniciar
const instruccionesText = fs.readFileSync(path.join(__dirname, '../Asistente_Inscripciones/instrucciones_asistente.txt'), 'utf-8');
const conocimientoText = fs.readFileSync(path.join(__dirname, '../Asistente_Inscripciones/conocimiento.txt'), 'utf-8');
const fullSystemPrompt = `
${instruccionesText}

--- BASE DE CONOCIMIENTO (FUENTES) ---
Utiliza la siguiente información para responder a las consultas:

${conocimientoText}
`;

// Middleware para que el servidor entienda JSON y sirva tu index.html
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Esta es la "puerta trasera" segura que llamará nuestro HTML
app.post('/api/chat', async (req, res) => {
    try {
        const { question, context, mode, history = [] } = req.body;
        // El servidor lee la clave secreta aquí, de forma segura
        const groqApiKey = process.env.GROQ_API_KEY;

        if (!groqApiKey) {
            return res.status(500).json({ error: 'Clave de API no configurada en el servidor.' });
        }
        
        let messages = [];

        if (mode === 'ia') {
            const systemPrompt = fullSystemPrompt;
            messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: question }
            ];
        } else {
            const systemPrompt = "Eres un asistente experto en análisis de documentos PDF. Responde en español basándote solo en el contexto proporcionado. Mantén en cuenta el historial de la conversación si es relevante.";
            messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: `Contexto del PDF:\n\n${context}\n\nPregunta: ${question}` }
            ];
        }

        // El servidor hace la llamada a Groq
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqApiKey}`
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-20b", // Restauramos el modelo original que funcionaba
                messages: messages
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error de la API de Groq: ${errorData.error.message}`);
        }

        const data = await response.json();
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