// public/js/modules/voice.js
class VoiceManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.recognition = null;
        this.isVoiceEnabled = true; // Por defecto la voz está activada
        this.isMicActive = false;
        
        this.onMicResult = null; // Callback para cuando se recibe texto
        this.onMicEnd = null; // Callback para cuando termina de escuchar
        this.onMicError = null; // Callback para errores

        this.initRecognition();
        
        // Cargar voces, a veces tarda un poco de forma asíncrona en algunos navegadores
        if (speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = () => this.getVoices();
        }
    }
    
    getVoices() {
      return this.synth.getVoices();
    }

    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'es-ES'; // Idioma por defecto
            this.recognition.continuous = false; // Parar cuando detecta una pausa
            this.recognition.interimResults = true; // Mostrar resultados mientras se habla

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                if (this.onMicResult) {
                    this.onMicResult(finalTranscript, interimTranscript);
                }
            };

            this.recognition.onend = () => {
                this.isMicActive = false;
                if (this.onMicEnd) this.onMicEnd();
            };

            this.recognition.onerror = (event) => {
                console.error("Error de reconocimiento de voz: ", event.error);
                this.isMicActive = false;
                if (this.onMicError) this.onMicError(event.error);
            };
        } else {
            console.warn("Speech Recognition API no soportada en este navegador.");
        }
    }

    toggleVoice() {
        this.isVoiceEnabled = !this.isVoiceEnabled;
        if (!this.isVoiceEnabled) {
            this.stopSpeaking(); // Detener si estaba hablando
        }
        return this.isVoiceEnabled;
    }

    stopSpeaking() {
        if (this.synth) {
            this.synth.cancel();
        }
    }

    speak(text) {
        if (!this.isVoiceEnabled || !this.synth) return;
        
        // Detener cualquier audio previo antes de empezar uno nuevo
        this.stopSpeaking();

        // Limpiar el texto de markdown para que se escuche fluido
        const cleanText = text.replace(/[\*#\_`\[\]\(\)]/g, '');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';
        
        // Intentar usar una voz nativa en español
        const voices = this.getVoices();
        const spanishVoice = voices.find(v => v.lang.startsWith('es') && v.localService === true) || voices.find(v => v.lang.startsWith('es'));
        if (spanishVoice) {
            utterance.voice = spanishVoice;
        }

        this.synth.speak(utterance);
    }

    toggleMic() {
        if (!this.recognition) {
            alert("El reconocimiento de voz no está soportado en tu navegador. Intenta usar Chrome o Edge.");
            return false;
        }

        if (this.isMicActive) {
            this.recognition.stop();
            this.isMicActive = false;
        } else {
            try {
                this.recognition.start();
                this.isMicActive = true;
            } catch (e) {
                console.error("Error al iniciar micrófono:", e);
                this.isMicActive = false;
            }
        }
        return this.isMicActive;
    }
    
    stopMic() {
        if (this.recognition && this.isMicActive) {
            this.recognition.stop();
            this.isMicActive = false;
        }
    }
}

window.VoiceManager = VoiceManager;
