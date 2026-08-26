  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
  
  let pdfText = '';
  let pdfDocument = null;
  let currentMode = 'capacitaciones';
  let chatHistory = [];
  
  const chatMessages = document.getElementById('chat-messages');
  const questionInput = document.getElementById('question-input');
  const sendButton = document.getElementById('send-button');
  const pdfContent = document.getElementById('pdf-content');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  
  // ===================================================================
  // Voice & Mic Integration
  // ===================================================================
  const voiceManager = new VoiceManager();
  const voiceToggleBtn = document.getElementById('voice-toggle-btn');
  const micToggleBtn = document.getElementById('mic-toggle-btn');

  voiceManager.onMicResult = (finalTranscript, interimTranscript) => {
    questionInput.value = finalTranscript || interimTranscript;
  };

  voiceManager.onMicEnd = () => {
    micToggleBtn.classList.remove('active');
  };

  voiceToggleBtn.addEventListener('click', () => {
    const isEnabled = voiceManager.toggleVoice();
    if (isEnabled) {
      voiceToggleBtn.classList.add('active');
    } else {
      voiceToggleBtn.classList.remove('active');
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
  
  async function loadPDF(file) {
    try {
      addMessage('Sistema: Analizando PDF, por favor espera...', 'ai-message');
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
      
      document.querySelector('.left-section').classList.add('pdf-loaded');
      addMessage('Sistema: PDF cargado correctamente. Ya puedes hacer preguntas.', 'ai-message');
    } catch (error) {
      console.error('Error al cargar el PDF:', error);
      addMessage('Sistema: Error al cargar el PDF. Por favor, intenta con otro archivo.', 'ai-message');
    }
  }
  
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

    if (foundCount > 0) {
        addMessage(`Término "${searchTerm}" encontrado ${foundCount} veces.`, 'ai-message');
        document.getElementById(`page-${firstFoundPage}`).scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
            document.querySelectorAll('.highlight.flash').forEach(el => el.classList.remove('flash'));
        }, 2000);
    } else {
        addMessage(`Término "${searchTerm}" no encontrado en el documento.`, 'ai-message');
    }
  }

  function clearAllHighlights() {
      const marks = document.querySelectorAll('mark.highlight');
      marks.forEach(mark => {
          const parent = mark.parentNode;
          parent.replaceWith(parent.textContent);
      });
  }
  
  function addMessage(text, className, isThinking = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    messageDiv.appendChild(contentDiv);

    if(isThinking) {
      messageDiv.classList.add('thinking-message');
      contentDiv.textContent = text;
    } else {
      if (className === 'ai-message') {
        contentDiv.innerHTML = marked.parse(text);
      } else {
        contentDiv.textContent = text;
      }
    }
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return contentDiv;
  }
  
  // ===================================================================
  // ¡AQUÍ ESTÁ EL CAMBIO!
  // Esta función ahora llama a nuestro servidor intermediario seguro
  // y ya no contiene ninguna clave de API.
  // ===================================================================
  async function callGroqAPI(question, context) {
      try {
          const response = await fetch('/api/chat', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              // Enviamos los últimos 6 mensajes como historial para no saturar el contexto
              body: JSON.stringify({ question, context, mode: currentMode, history: chatHistory.slice(-6) })
          });

          if (!response.ok) {
              let errorMessage = `Error del servidor: ${response.status} ${response.statusText}`;
              try {
                  const errorData = await response.json();
                  errorMessage = `Error del servidor: ${errorData.error || response.statusText}`;
              } catch (e) {
                  if (response.status === 405 || response.status === 404) {
                      errorMessage = `Error ${response.status}: El servidor backend no está respondiendo en /api/chat. Asegúrate de estar ejecutando "node src/server.js" y de acceder a http://localhost:3000 en lugar de usar Live Server.`;
                  }
              }
              throw new Error(errorMessage);
          }

          const data = await response.json();
          return data.choices[0].message.content.trim();

      } catch (error) {
          console.error('Error al llamar al servidor intermediario:', error);
          throw error;
      }
  }
  
  async function processQuestion(question) {
    if (currentMode === 'practica3' && !pdfText) {
      addMessage('Sistema: Por favor, carga el PDF de la solicitud en el panel izquierdo primero.', 'ai-message');
      return;
    }
  
    if (question.trim().length < 4) {
      addMessage('Sistema: Por favor, formula una pregunta más específica.', 'ai-message');
      return;
    }

    const thinkingMessage = addMessage('IA está pensando...', 'ai-message', true);
  
    try {
      const context = currentMode === 'practica3' ? pdfText : '';
      const response = await callGroqAPI(question, context);
      
      // Guardar en el historial
      chatHistory.push({ role: 'user', content: question });
      chatHistory.push({ role: 'assistant', content: response });

      thinkingMessage.innerHTML = marked.parse(response);
      thinkingMessage.parentElement.classList.remove('thinking-message');
      
      // Reproducir voz si está habilitada
      voiceManager.speak(response);

    } catch (error) {
      console.error('Error al procesar la pregunta:', error);
      thinkingMessage.textContent = `Error: ${error.message}. Revisa la consola para más detalles.`;
      thinkingMessage.parentElement.classList.remove('thinking-message');
    }
  }
  
  document.getElementById('pdf-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      loadPDF(file);
    } else {
      addMessage('Sistema: Por favor, selecciona un archivo PDF válido.', 'ai-message');
    }
  });
  
  sendButton.addEventListener('click', () => {
    const question = questionInput.value.trim();
    if (question) {
      voiceManager.stopSpeaking(); // Parar de hablar al enviar una nueva pregunta
      addMessage(`Tú: ${question}`, 'user-message');
      processQuestion(question);
      questionInput.value = '';
    }
  });
  
  searchButton.addEventListener('click', searchInPDF);
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchInPDF();
    }
  });
  
  questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendButton.click();
    }
  });

  const tabButtons = document.querySelectorAll('.tab-btn');
  const mainContent = document.querySelector('.main-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentMode === btn.dataset.mode) return;

      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentMode = btn.dataset.mode;
      chatMessages.innerHTML = ''; // Limpiar el chat
      chatHistory = []; // Limpiar historial al cambiar de modo
      
      if (currentMode === 'curzas') {
        mainContent.classList.add('mode-ia');
        addMessage('Sistema: Hola. Soy el Agente de CURZA. Te ayudaré con información sobre la Licenciatura en Gestión de Recursos Humanos.', 'ai-message');
      } else if (currentMode === 'practica3') {
        mainContent.classList.remove('mode-ia');
        addMessage('Sistema: Modo Práctica 3. Puedes subir un documento (ej. solicitud-morales.pdf) a la izquierda y consultarle al Agente de Capacitaciones si aprueba los requisitos.', 'ai-message');
      } else {
        mainContent.classList.add('mode-ia');
        addMessage('Sistema: Hola. Soy el Agente de Capacitaciones. ¿En qué te puedo ayudar con el trámite?', 'ai-message');
      }
    });
  });

  mainContent.classList.add('mode-ia');
  addMessage('Sistema: Hola. Soy el Agente de Capacitaciones. ¿En qué te puedo ayudar con el trámite?', 'ai-message');

  // ===================================================================
  // Lógica del Divisor (Resizer)
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
    
    // Convertir a porcentaje, limitando entre 20% y 80%
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
