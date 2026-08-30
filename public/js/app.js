// ===================================================================
// Plataforma Nexus IA - Aplicación Principal (Frontend Controller)
// ===================================================================

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

// Estado global de la aplicación
let pdfText = '';
let pdfDocument = null;
let currentMode = 'capacitaciones';
let chatHistory = [];
let currentZoom = 1.0;

// Configuración de los Agentes
const AGENTS_CONFIG = {
  capacitaciones: {
    icon: '🎓',
    title: 'Agente Capacitaciones (Actividad sincrónica 3)',
    desc: 'Asesor oficial del Programa Anual de Capacitación de la Municipalidad de Puerto Norte.',
    badge: 'Actividad Sincrónica 3 • Reglamento v2026',
    placeholder: 'Pregunta sobre convocatorias, requisitos de antigüedad, cupos o certificados...',
    chips: [
      '¿Cuáles son los requisitos de antigüedad y situación de revista para inscribirme?',
      '¿Qué cupo tienen las actividades y cómo se asignan las vacantes si se supera el máximo?',
      '¿Qué porcentaje de asistencia necesito para poder certificar?',
      '¿Cómo y con cuánta antelación debo solicitar una baja a un curso?'
    ]
  },
  curzas: {
    icon: '🏛️',
    title: 'IA Curzas (Actividad asincrónica 3)',
    desc: 'Orientación académica sobre materias, correlativas y régimen de cursada del CURZA.',
    badge: 'Actividad Asincrónica 3 • Plan Oficial',
    placeholder: 'Pregunta sobre materias, correlativas para cursar o finales...',
    chips: [
      '¿Cuáles son las materias del plan de estudios de la Licenciatura?',
      '¿Qué correlativas necesito para cursar Desarrollo Gerencial?',
      '¿Qué requisitos exige Métodos y Técnicas de Intervención Organizacional?',
      '¿Cuáles son los requisitos de asistencia y parciales para regularizar?'
    ]
  },
  practica3: {
    icon: '📑',
    title: 'Práctica 3 (Subir PDF)',
    desc: 'Sube un documento PDF para validar automáticamente requisitos y normas del organismo.',
    badge: 'Práctica 3 • Análisis de Documento',
    placeholder: 'Haz tu pregunta sobre el PDF cargado (ej. ¿Cumple la antigüedad?)...',
    chips: [
      '¿El postulante cumple los requisitos de antigüedad del art. 4?',
      'Resumir los datos principales y situación de revista del documento',
      '¿La solicitud fue presentada dentro del plazo de 10 días hábiles?'
    ]
  }
};

// Elementos del DOM
const chatMessages = document.getElementById('chat-messages');
const questionInput = document.getElementById('question-input');
const sendButton = document.getElementById('send-button');
const pdfContent = document.getElementById('pdf-content');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const pdfFileInput = document.getElementById('pdf-upload');
const dropZone = document.getElementById('drop-zone');
const pdfFilenameEl = document.getElementById('pdf-filename');
const zoomLevelEl = document.getElementById('zoom-level');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const exportChatBtn = document.getElementById('export-chat-btn');
const mainContent = document.querySelector('.main-content');
const tabButtons = document.querySelectorAll('.agent-tab');

// Sub-barra del Agente
const agentAvatarIcon = document.getElementById('agent-avatar-icon');
const agentActiveTitle = document.getElementById('agent-active-title');
const agentActiveDesc = document.getElementById('agent-active-desc');
const agentModeBadge = document.getElementById('agent-mode-badge');

// ===================================================================
// Módulo de Voz y Micrófono
// ===================================================================
const voiceManager = new VoiceManager();
const voiceToggleBtn = document.getElementById('voice-toggle-btn');
const micToggleBtn = document.getElementById('mic-toggle-btn');
const plusBtn = document.getElementById('plus-btn');

let currentSpeakingBtn = null;

function updateVoiceButtonState() {
  if (voiceManager.isSpeaking) {
    voiceToggleBtn.classList.add('speaking');
    voiceToggleBtn.title = "Reproduciendo respuesta... Clic para detener sonido (⏹)";
  } else {
    voiceToggleBtn.classList.remove('speaking');
    if (voiceManager.isVoiceEnabled) {
      voiceToggleBtn.classList.add('active');
      voiceToggleBtn.title = "Lectura por voz activada (Clic para silenciar)";
    } else {
      voiceToggleBtn.classList.remove('active');
      voiceToggleBtn.title = "Lectura por voz desactivada (Clic para activar)";
    }
  }
}

function resetAllSpeakButtons() {
  document.querySelectorAll('.speak-btn').forEach(btn => {
    btn.classList.remove('speaking');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
      <span>Escuchar</span>
    `;
    btn.title = "Escuchar respuesta";
  });
  currentSpeakingBtn = null;
}

voiceManager.onMicResult = (finalTranscript, interimTranscript) => {
  questionInput.value = finalTranscript || interimTranscript;
};

voiceManager.onMicEnd = () => {
  micToggleBtn.classList.remove('active');
};

voiceManager.onSpeakStart = () => {
  updateVoiceButtonState();
};

voiceManager.onSpeakEnd = () => {
  updateVoiceButtonState();
  resetAllSpeakButtons();
};

voiceToggleBtn.addEventListener('click', () => {
  if (voiceManager.isSpeaking) {
    voiceManager.stopSpeaking();
    resetAllSpeakButtons();
  } else {
    const isEnabled = voiceManager.toggleVoice();
    updateVoiceButtonState();
  }
});

micToggleBtn.addEventListener('click', () => {
  const isActive = voiceManager.toggleMic();
  if (isActive) {
    micToggleBtn.classList.add('active');
  } else {
    micToggleBtn.classList.remove('active');
  }
});

if (plusBtn) {
  plusBtn.addEventListener('click', () => {
    questionInput.focus();
  });
}

// ===================================================================
// Renderizado de la Pantalla de Bienvenida (Hero Card)
// ===================================================================
function renderHeroWelcome() {
  chatMessages.innerHTML = '';
  const agent = AGENTS_CONFIG[currentMode];

  const hero = document.createElement('div');
  hero.className = 'hero-welcome-card';
  hero.innerHTML = `
    <div class="hero-avatar-ring">${agent.icon}</div>
    <div>
      <h3 class="hero-title">${agent.title}</h3>
      <p class="hero-desc">${agent.desc}</p>
    </div>
    <div class="hero-chips-container">
      <span class="hero-chips-label">Consultas frecuentes sugeridas</span>
      <div class="hero-chips-grid">
        ${agent.chips.map(chip => `
          <button class="prompt-chip" data-prompt="${chip}">
            <span class="chip-icon">⚡</span>
            <span>${chip}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // Asignar eventos click a cada prompt chip
  hero.querySelectorAll('.prompt-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      questionInput.value = prompt;
      submitUserQuestion(prompt);
    });
  });

  chatMessages.appendChild(hero);
  chatMessages.scrollTop = 0;
}

// ===================================================================
// Mensajería y Renderizado de Chat
// ===================================================================
function removeHeroWelcome() {
  const hero = chatMessages.querySelector('.hero-welcome-card');
  if (hero) {
    hero.remove();
  }
}

function appendUserMessage(text) {
  removeHeroWelcome();

  const msgWrapper = document.createElement('div');
  msgWrapper.className = 'message-wrapper user-msg';
  msgWrapper.innerHTML = `
    <div class="message-avatar">TÚ</div>
    <div class="message-bubble">${escapeHTML(text)}</div>
  `;
  chatMessages.appendChild(msgWrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendAiThinking() {
  removeHeroWelcome();

  const msgWrapper = document.createElement('div');
  msgWrapper.className = 'message-wrapper ai-msg thinking-wrapper';
  msgWrapper.innerHTML = `
    <div class="message-avatar">${AGENTS_CONFIG[currentMode].icon}</div>
    <div class="message-bubble">
      <div class="thinking-bubble">
        <span>Nexus IA está procesando tu respuesta...</span>
        <div class="thinking-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  chatMessages.appendChild(msgWrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msgWrapper;
}

function updateAiMessage(thinkingWrapper, markdownResponse) {
  const bubble = thinkingWrapper.querySelector('.message-bubble');
  const renderedHTML = marked.parse(markdownResponse);

  bubble.innerHTML = `
    <div class="ai-text-content">${renderedHTML}</div>
    <div class="message-actions">
      <button class="msg-act-btn copy-btn" title="Copiar al portapapeles">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span class="copy-text">Copiar</span>
      </button>
      <button class="msg-act-btn speak-btn" title="Escuchar respuesta">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        <span>Escuchar</span>
      </button>
    </div>
  `;

  // Copiar al portapapeles
  const copyBtn = bubble.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(markdownResponse).then(() => {
      const copyText = copyBtn.querySelector('.copy-text');
      copyText.textContent = '¡Copiado!';
      setTimeout(() => { copyText.textContent = 'Copiar'; }, 2000);
    });
  });

  // Escuchar / Detener audio del mensaje
  const speakBtn = bubble.querySelector('.speak-btn');
  speakBtn.addEventListener('click', () => {
    if (voiceManager.isSpeaking && currentSpeakingBtn === speakBtn) {
      voiceManager.stopSpeaking();
      resetAllSpeakButtons();
    } else {
      resetAllSpeakButtons();
      currentSpeakingBtn = speakBtn;
      speakBtn.classList.add('speaking');
      speakBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"></rect>
        </svg>
        <span>Detener audio</span>
      `;
      speakBtn.title = "Detener reproducción de audio";
      voiceManager.speak(markdownResponse);
    }
  });

  thinkingWrapper.classList.remove('thinking-wrapper');
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// ===================================================================
// Caché en Memoria (Zero-Token Cache)
// ===================================================================
const responseCache = new Map();

function getCacheKey(mode, question, context) {
  // Limpiar espacios para clave consistente
  const qClean = question.trim().toLowerCase();
  const cClean = (context || '').substring(0, 100).trim();
  return `${mode}::${qClean}::${cClean}`;
}

// ===================================================================
// Llamada al Backend / API
// ===================================================================
async function callGroqAPI(question, context) {
  const cacheKey = getCacheKey(currentMode, question, context);

  // Si ya tenemos la respuesta en caché y el historial es corto, devolver de inmediato sin consumir tokens
  if (responseCache.has(cacheKey) && chatHistory.length <= 2) {
    console.log('[Zero-Token Cache] Respuesta servida desde caché local');
    return responseCache.get(cacheKey);
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question, 
        context, 
        mode: currentMode, 
        history: chatHistory.slice(-3) 
      })
    });

    if (!response.ok) {
      let errorMessage = `Error del servidor: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || response.statusText;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content.trim();

    // Guardar en caché local
    responseCache.set(cacheKey, answer);

    return answer;
  } catch (error) {
    console.error('Error al llamar al backend:', error);
    throw error;
  }
}

async function submitUserQuestion(question) {
  const trimmed = question.trim();
  if (!trimmed) return;

  if (currentMode === 'practica3' && !pdfText) {
    appendUserMessage(trimmed);
    const thinking = appendAiThinking();
    updateAiMessage(thinking, '⚠️ **Atención:** Por favor, carga el documento PDF en el panel izquierdo primero para que pueda analizarlo y responder a tus consultas.');
    return;
  }

  appendUserMessage(trimmed);
  questionInput.value = '';
  voiceManager.stopSpeaking();

  const thinkingWrapper = appendAiThinking();

  try {
    const context = currentMode === 'practica3' ? pdfText : '';
    const response = await callGroqAPI(trimmed, context);
    
    // Guardar en historial
    chatHistory.push({ role: 'user', content: trimmed });
    chatHistory.push({ role: 'assistant', content: response });

    updateAiMessage(thinkingWrapper, response);
    voiceManager.speak(response);

  } catch (error) {
    updateAiMessage(thinkingWrapper, `❌ **Ocurrió un error al procesar tu consulta:**\n\n\`${error.message}\`\n\nPor favor, verifica tu conexión o las claves configuradas en el servidor.`);
  }
}

// ===================================================================
// Lógica de PDF (Carga, Renderizado, Zoom y Búsqueda)
// ===================================================================
async function loadPDF(file) {
  try {
    pdfFilenameEl.textContent = file.name;
    document.querySelector('.left-section').classList.add('pdf-loaded');
    pdfContent.innerHTML = '<div style="color: var(--text-muted); padding: 2rem;">Cargando y procesando páginas...</div>';

    const arrayBuffer = await file.arrayBuffer();
    pdfDocument = await pdfjsLib.getDocument(arrayBuffer).promise;
    pdfText = '';
    pdfContent.innerHTML = '';

    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items.map(item => item.str).join(' ');
      pdfText += `[Página ${i}] ${pageText}\n\n`;

      const pageDiv = document.createElement('div');
      pageDiv.className = 'page-container';
      pageDiv.id = `page-${i}`;

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: 1.5 });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'text-layer';
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      pageDiv.appendChild(canvas);
      pageDiv.appendChild(textLayerDiv);
      pdfContent.appendChild(pageDiv);

      await page.render({ canvasContext: context, viewport }).promise;
      
      pdfjsLib.renderTextLayer({
        textContent,
        container: textLayerDiv,
        viewport,
        textDivs: []
      });
    }

    if (chatHistory.length === 0) {
      renderHeroWelcome();
    }
  } catch (error) {
    console.error('Error al cargar PDF:', error);
    pdfContent.innerHTML = '<div style="color: #ef4444; padding: 2rem;">Error al procesar el archivo PDF. Intenta con otro documento.</div>';
  }
}

// Drag and Drop en Dropzone
['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
  });
});

dropZone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type === 'application/pdf') {
    loadPDF(files[0]);
  }
});

pdfFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type === 'application/pdf') {
    loadPDF(file);
  }
});

// Controles de Zoom
zoomInBtn.addEventListener('click', () => {
  if (currentZoom < 2.0) {
    currentZoom += 0.15;
    applyZoom();
  }
});

zoomOutBtn.addEventListener('click', () => {
  if (currentZoom > 0.6) {
    currentZoom -= 0.15;
    applyZoom();
  }
});

function applyZoom() {
  zoomLevelEl.textContent = `${Math.round(currentZoom * 100)}%`;
  pdfContent.style.transform = `scale(${currentZoom})`;
}

// Búsqueda en PDF
function searchInPDF() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  if (!searchTerm || !pdfDocument) return;

  clearAllHighlights();

  const textLayers = document.querySelectorAll('.text-layer');
  let foundCount = 0;
  let firstFoundPage = -1;

  textLayers.forEach((layer, index) => {
    const pageNum = index + 1;
    const textSpans = layer.querySelectorAll('span');
    textSpans.forEach(span => {
      if (span.textContent.toLowerCase().includes(searchTerm)) {
        if (firstFoundPage === -1) firstFoundPage = pageNum;
        foundCount++;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        span.innerHTML = span.textContent.replace(regex, `<mark class="highlight flash">$1</mark>`);
      }
    });
  });

  if (foundCount > 0 && firstFoundPage !== -1) {
    document.getElementById(`page-${firstFoundPage}`).scrollIntoView({ behavior: 'smooth' });
  }
}

function clearAllHighlights() {
  const marks = document.querySelectorAll('mark.highlight');
  marks.forEach(mark => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceWith(parent.textContent);
    }
  });
}

searchButton.addEventListener('click', searchInPDF);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchInPDF();
});

// ===================================================================
// Cambio de Agentes / Modos
// ===================================================================
function switchAgent(mode) {
  if (currentMode === mode && chatHistory.length > 0) return;

  currentMode = mode;
  document.body.setAttribute('data-agent', mode);

  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  const config = AGENTS_CONFIG[mode];
  agentAvatarIcon.textContent = config.icon;
  agentActiveTitle.textContent = config.title;
  agentActiveDesc.textContent = config.desc;
  agentModeBadge.textContent = config.badge;
  questionInput.placeholder = config.placeholder;

  chatHistory = [];
  voiceManager.stopSpeaking();

  if (mode === 'practica3') {
    mainContent.classList.remove('mode-ia');
  } else {
    mainContent.classList.add('mode-ia');
  }

  renderHeroWelcome();
}

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => switchAgent(btn.dataset.mode));
});

// ===================================================================
// Utilidades: Limpiar y Exportar Chat
// ===================================================================
clearChatBtn.addEventListener('click', () => {
  if (chatHistory.length === 0) return;
  if (confirm('¿Deseas vaciar la conversación actual?')) {
    chatHistory = [];
    voiceManager.stopSpeaking();
    renderHeroWelcome();
  }
});

exportChatBtn.addEventListener('click', () => {
  if (chatHistory.length === 0) {
    alert('No hay mensajes en la conversación para exportar.');
    return;
  }

  const agent = AGENTS_CONFIG[currentMode];
  let mdContent = `# Registro de Conversación - ${agent.title}\n`;
  mdContent += `*Fecha:* ${new Date().toLocaleString()}  \n`;
  mdContent += `*Modo:* ${agent.badge}\n\n---\n\n`;

  chatHistory.forEach(msg => {
    const roleName = msg.role === 'user' ? '🧑‍💻 Usuario' : `🤖 ${agent.title}`;
    mdContent += `### ${roleName}\n\n${msg.content}\n\n---\n\n`;
  });

  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `NexusIA_${currentMode}_${Date.now()}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// ===================================================================
// Eventos de Envío de Input
// ===================================================================
sendButton.addEventListener('click', () => {
  submitUserQuestion(questionInput.value);
});

questionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitUserQuestion(questionInput.value);
  }
});

// ===================================================================
// Divisor Redimensionable (Resizer)
// ===================================================================
const resizer = document.getElementById('dragMe');
const leftSide = document.querySelector('.left-section');
const rightSide = document.querySelector('.chat-section');
let isHandlerDragging = false;

resizer.addEventListener('mousedown', function(e) {
  isHandlerDragging = true;
  resizer.classList.add('resizing');
  document.body.style.cursor = 'col-resize';
  leftSide.style.userSelect = 'none';
  leftSide.style.pointerEvents = 'none';
  rightSide.style.userSelect = 'none';
  rightSide.style.pointerEvents = 'none';
});

document.addEventListener('mousemove', function(e) {
  if (!isHandlerDragging) return;
  const containerOffsetLeft = mainContent.offsetLeft;
  const pointerRelativeXpos = e.clientX - containerOffsetLeft;
  const boxWidth = mainContent.offsetWidth;
  const flexBasis = Math.max(20, Math.min((pointerRelativeXpos / boxWidth) * 100, 80));
  leftSide.style.flex = `0 0 ${flexBasis}%`;
});

document.addEventListener('mouseup', function(e) {
  if (isHandlerDragging) {
    isHandlerDragging = false;
    resizer.classList.remove('resizing');
    document.body.style.cursor = '';
    leftSide.style.removeProperty('user-select');
    leftSide.style.removeProperty('pointer-events');
    rightSide.style.removeProperty('user-select');
    rightSide.style.removeProperty('pointer-events');
  }
});

// Inicialización
switchAgent('capacitaciones');
