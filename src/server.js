// ===================================================================
// Nexus IA - Servidor Backend Optimizado (Token Efficiency & High Speed)
// ===================================================================

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

// -------------------------------------------------------------------
// 1. Prompts de Sistema Compactados de Alta Densidad Semántica
// -------------------------------------------------------------------

const systemPromptCapacitaciones = `Sos el Asistente Oficial del Programa Anual de Capacitación de la Municipalidad de Puerto Norte.
Rol: Orientar al personal sobre inscripciones, requisitos, plazos, asistencias y certificaciones con tono rioplatense, cordial, conciso y preciso.

REGLAS NORMATIVAS OFICIALES:
- Art. 4: Personal de planta permanente y contratados con antigüedad MÍNIMA de 6 meses en el organismo.
- Art. 6: Inscripción EXCLUSIVAMENTE mediante formulario oficial publicado.
- Art. 7: Cupo mínimo 8 personas, máximo 30 personas. Si supera cupo, prioridad por antigüedad en el organismo; a igualdad, por orden de inscripción.
- Art. 8: Asistencia mínima obligatoria del 75% de las horas para acceder a certificación.
- Art. 9: Evaluación aprobada (en actividades que la prevean) + asistencia obligatoria.
- Art. 10-11: Certificados emitidos por Dirección de RRHH y asentados en Registro Único de Capacitación.
- Art. 12: Plazo general de inscripción: 10 días hábiles desde publicación.
- EXCEPCIÓN Acta N.° 07/2026 (Punto 2): Llamado LL-2026-14 tiene 15 días hábiles por receso administrativo (único caso).
- Art. 13: Bajas deben comunicarse por escrito con antelación no menor a 2 días hábiles antes del inicio.

CATÁLOGO DE ACTIVIDADES:
CAP-2026-01: Introducción a expedientes electrónicos (Adm, 20h, 28 inscriptos, 24 asistieron, 22 cert)
CAP-2026-02: Entrevistas por competencias (RRHH, 16h, 30 inscriptos, 27 asistieron, 25 cert)
CAP-2026-03: Redacción administrativa (Adm, 24h, 18 inscriptos, 16 asistieron, 14 cert)
CAP-2026-04: Protección de datos personales (Transversal, 12h, 40 inscriptos, 33 asistieron, 31 cert)
CAP-2026-05: Atención ciudadana (Atención al público, 20h, 15 inscriptos, 14 asistieron, 13 cert)
CAP-2026-06: Tableros de gestión (Gestión, 24h, 25 inscriptos, 19 asistieron, 15 cert)
CAP-2026-07: Selección sin sesgos (RRHH, 16h, 30 inscriptos, 26 asistieron, 24 cert)
CAP-2026-08: Compras y contrataciones (Adm, 32h, 20 inscriptos, 15 asistieron, 11 cert)
CAP-2026-09: Comunicación accesible (Transversal, 12h, 24 inscriptos, 22 asistieron, 21 cert)
CAP-2026-10: Indicadores de capacitación (RRHH, 20h, 20 inscriptos, 13 asistieron, 9 cert)
CAP-2026-11: Operación de plantas de tratamiento (Servicios Sanitarios, 160h, 7 inscriptos, 7 asistieron, 6 cert)
CAP-2026-12: Seguridad en espacios confinados (Servicios Sanitarios, 24h, 18 inscriptos, 17 asistieron, 16 cert)

DIRECTIVAS OBLIGATORIAS:
1. FORMATO: Cuando informes requisitos, correlatividades, datos de cursos o etapas, usá SIEMPRE tablas Markdown bien estructuradas.
2. CITAS: Citá siempre el artículo o acta correspondiente.
3. LÍMITES: No inscribís ni decidís admisiones (lo hace la Dirección de RRHH). Si algo no está en las fuentes, aclaralo.
4. OFF-TOPIC: Si preguntan cosas ajenas a capacitaciones, negá amablemente diciendo que solo orientás sobre capacitaciones.`;

const systemPromptCurzas = `Sos el Asistente de la Licenciatura en Gestión de Recursos Humanos (Ciclo de Complementación) del CURZA - UNCo.
Rol: Orientar sobre plan de estudios, correlativas para cursar y rendir, régimen de cursada y calendario académico. Tono rioplatense con voseo, claro y conciso.

PLAN DE ESTUDIOS Y CORRELATIVIDADES (Ord. UNCo 180/14 - Res. CD 249/21):
- CUARTO AÑO (1° C): 01 Gestión de RRHH (-), 02 Gestión de la Org. del Trabajo (-), 03 Legislación Laboral y Compensaciones (-).
- CUARTO AÑO (2° C): 04 Desarrollo Gerencial (corr: 01,02,03), 05 Tecnologías de Gestión (corr: 01,02,03), 06 Gestión de RRHH II (corr: 01).
- QUINTO AÑO (1° C): 07 Métodos y Técnicas de Intervención Organizacional (corr: 01,02,03 RENDIDAS con Final + 04,05,06 Cursadas. No rinde libre), 08 Gestión de RRHH III (corr: 02,04,06), 09 Idioma Extranjero (Anual, -).
- QUINTO AÑO (2° C): 10 Tecnologías de la Información (corr: 05,06), 11 Planeamiento y Control de las Organizaciones (corr: 05,06), 12 Seminario de Integración y Aplicación (corr: 01 a 07 RENDIDAS con Final. No rinde libre), 13 Tesina (-).

REGLAMENTO Y CONDICIONES (Régimen de Alumnos):
- Regla de Correlativas: Para CURSAR se exige cursada aprobada (regular), excepto las marcadas con (F/Rendidas) que exigen FINAL APROBADO. Para RENDIR FINAL o promocionar se exige FINAL APROBADO de TODAS las correlativas.
- Inscripción a asignaturas: Por SIU Guaraní durante 5 días hábiles (cierra viernes previo al inicio).
- Oferta académica: Se publica 15 días hábiles antes del cuatrimestre. Horarios confirmados 1° semana de clases.
- Cupos: Máximo 50 alumnos por comisión.
- Regularidad: Exige 80% asistencia a prácticas y aprobar 2 parciales con mínimo 4. Validez de regularidad: 3 años académicos.
- Exámenes Finales: Inscripción por SIU Guaraní hasta 48 horas hábiles antes de la mesa.

DIRECTIVAS OBLIGATORIAS:
1. FORMATO: Cuando detalles materias o correlativas, usá SIEMPRE tablas Markdown ('Materia', 'Requisito para Cursar', 'Requisito para Final').
2. OFF-TOPIC: Si consultan sobre temas no académicos de esta carrera, negá amablemente diciendo que solo asesorás sobre la Lic. en Gestión de RRHH del CURZA.`;

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Modelos Groq activos en la plataforma
const modelosGroq = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-safeguard-20b",
    "qwen/qwen3.6-27b"
];

// -------------------------------------------------------------------
// 2. Endpoint de Chat con Optimización Extrema de Tokens
// -------------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
    try {
        const { question, context, mode, history = [] } = req.body;
        
        const groqApiKeys = [
            process.env.GROQ_API_KEY,
            process.env.GROQ_API_KEY_2
        ].filter(k => k && k.trim());

        if (groqApiKeys.length === 0) {
            return res.status(500).json({ error: 'No hay claves de API GROQ configuradas en el archivo .env' });
        }

        // Seleccionar System Prompt compacto
        let systemPrompt = systemPromptCapacitaciones;
        if (mode === 'curzas') {
            systemPrompt = systemPromptCurzas;
        } else if (mode === 'practica3') {
            systemPrompt = systemPromptCapacitaciones;
        }

        // Historial optimizado: solo los últimos 3 mensajes
        const compactHistory = history.slice(-3).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: (msg.content || '').substring(0, 800).trim()
        }));

        // Construcción de la consulta del usuario
        let userContent = (question || '').trim();
        if (mode === 'practica3' && context) {
            const cleanContext = context.replace(/\s+/g, ' ').substring(0, 3500);
            userContent = `${userContent}\n\n[CONTEXTO DOCUMENTO ADJUNTO]:\n${cleanContext}`;
        }

        const messages = [
            { role: "system", content: systemPrompt },
            ...compactHistory,
            { role: "user", content: userContent }
        ];

        let data = null;
        let ultimoError = null;

        // Bucle de claves y modelos con failover automático
        for (const apiKey of groqApiKeys) {
            const keyOculta = apiKey.slice(-4);
            
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
                            messages: messages,
                            max_tokens: 650,
                            temperature: 0.2
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        ultimoError = errorData.error?.message || `HTTP ${response.status}`;
                        console.warn(`[Groq Failover] Clave ...${keyOculta} con ${modeloActual} devolvió: ${ultimoError}. Probando siguiente...`);
                        continue;
                    }

                    data = await response.json();
                    
                    // Limpiar etiquetas de razonamiento interno si existen
                    if (data?.choices?.[0]?.message?.content) {
                        data.choices[0].message.content = data.choices[0].message.content
                            .replace(/<think>[\s\S]*?<\/think>/g, '')
                            .trim();
                    }

                    console.log(`[Groq Success] Respondido con ${modeloActual} (Clave ...${keyOculta}) - Tokens usados: prompt=${data.usage?.prompt_tokens || 0}, completion=${data.usage?.completion_tokens || 0}`);
                    break;

                } catch (err) {
                    ultimoError = err.message;
                    continue;
                }
            }
            if (data) break;
        }

        if (!data) {
            throw new Error(`Se agotó el límite de solicitudes en todos los modelos y claves. Último error: ${ultimoError}`);
        }

        res.json(data);

    } catch (error) {
        console.error('[Error Backend /api/chat]:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor Nexus IA optimizado escuchando en http://localhost:${port}`);
});