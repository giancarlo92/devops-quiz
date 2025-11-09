// Lista de archivos JSON con las preguntas
const jsonFiles = [
    'data/git_preguntas.json',
    'data/github_preguntas.json',
    'data/github_actions_preguntas.json',
    'data/azure_preguntas.json',
    'data/azure_devops_preguntas.json',
    'data/docker_preguntas.json',
    'data/docker_swarm_preguntas.json',
    'data/terraform_preguntas.json',
    'data/python_preguntas.json',
    'data/kubernetes_preguntas.json',
    'data/linux_preguntas.json',
    'data/powershell_preguntas.json',
    'data/openshift_preguntas.json',
    'data/grafana_preguntas.json',
    'data/prometheus_preguntas.json',
    'data/argocd_preguntas.json',
    'data/jenkins_preguntas.json',
    'data/ansible_preguntas.json'
];

let allQuestions = [];
let selectedQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let quizStarted = false;
let examMode = null; // 'guided' or 'evaluation'
let selectedQuestionCount = 30; // Número de preguntas seleccionado (por defecto 30)
let isInSummaryMode = false; // Para controlar si estamos en modo resumen
 let selectedTechnologies = []; // Tecnologías seleccionadas por el usuario (opcional)
  let availablePrompts = []; // Lista de cursos, cargada desde js/cursos.json
  let availableDocs = []; // Lista de PDFs descubiertos en /documentation
 let selectedLevels = ['basico', 'intermedio', 'avanzado']; // Niveles seleccionados por el usuario

 // ===== TTS (Texto a Voz) =====
 let speechSupported = 'speechSynthesis' in window;
 let currentUtterance = null;
 let availableVoices = [];
  let preferredVoice = null;
  // Índice de la pregunta que se está narrando actualmente (si aplica)
  let speakingQuestionIndex = null;

// ===== Persistencia en Sesión =====
const SESSION_KEY = 'devops_quiz_state';

function saveSessionState() {
    try {
        // Guardar solo cuando el examen está iniciado
        if (!quizStarted) return;
        const state = {
            selectedQuestions,
            currentQuestionIndex,
            userAnswers,
            quizStarted,
            examMode,
            selectedQuestionCount,
            isInSummaryMode,
            selectedTechnologies,
            selectedLevels
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('No se pudo guardar el estado en sesión:', e);
    }
}

function clearSessionState() {
    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
        console.warn('No se pudo limpiar el estado de sesión:', e);
    }
}

function applyRestoredAnswers() {
    try {
        if (!Array.isArray(userAnswers)) return;
        userAnswers.forEach((answers, qIndex) => {
            if (!Array.isArray(answers)) return;
            answers.forEach(optIndex => {
                const cb = document.getElementById(`q${qIndex}_o${optIndex}`);
                if (cb) cb.checked = true;
            });
            updateOptionStyles(qIndex);
        });
    } catch (e) {
        console.warn('No se pudieron aplicar respuestas restauradas:', e);
    }
}

function restoreSessionState() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return false;
        const state = JSON.parse(raw);
        // Restaurar variables
        selectedQuestions = Array.isArray(state.selectedQuestions) ? state.selectedQuestions : [];
        currentQuestionIndex = Number.isInteger(state.currentQuestionIndex) ? state.currentQuestionIndex : 0;
        userAnswers = Array.isArray(state.userAnswers) ? state.userAnswers : [];
        quizStarted = !!state.quizStarted;
        examMode = state.examMode || null;
        selectedQuestionCount = state.selectedQuestionCount || selectedQuestionCount;
        isInSummaryMode = !!state.isInSummaryMode;
        selectedTechnologies = Array.isArray(state.selectedTechnologies) ? state.selectedTechnologies : [];
        selectedLevels = Array.isArray(state.selectedLevels) && state.selectedLevels.length > 0
            ? state.selectedLevels
            : selectedLevels;

        // Reflejar niveles restaurados en la UI
        setLevelCheckboxesFromState();

        // Sincronizar la UI de cantidad de preguntas con el estado restaurado
        try {
            updateQuestionCount(selectedQuestionCount);
            const radio = document.querySelector(`input[name="questionCount"][value="${selectedQuestionCount}"]`);
            if (radio) radio.checked = true;
        } catch (_) {
            // Si la UI aún no está montada, ignoramos
        }

        if (!quizStarted || selectedQuestions.length === 0) return false;

        // Ocultar inicio, mostrar contenedor del quiz
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('quizContainer').style.display = 'block';

        // Render de preguntas y aplicación de respuestas
        generateQuizHTML();
        applyRestoredAnswers();

        // Activar la pregunta correcta si no estamos en resumen
        if (!isInSummaryMode) {
            document.querySelectorAll('.question-container').forEach(el => el.classList.remove('active'));
            const activeEl = document.getElementById(`question-${currentQuestionIndex}`);
            if (activeEl) activeEl.classList.add('active');
            updateProgress();
            updateNavigation();
        } else {
            // Mostrar resumen si estábamos en modo resumen
            showSummary();
        }

        return true;
    } catch (e) {
        console.warn('No se pudo restaurar el estado de sesión:', e);
        return false;
    }
}

// Función para cargar todas las preguntas de los archivos JSON
async function loadAllQuestions() {
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block';

    try {
        for (const file of jsonFiles) {
            try {
                const response = await fetch(file);
                if (response.ok) {
                    const data = await response.json();
                    if (data.preguntas && Array.isArray(data.preguntas)) {
                        // Agregar información de tecnología a cada pregunta
                        data.preguntas.forEach(pregunta => {
                            pregunta.tecnologia = data.tecnologia;
                            // Nivel por defecto si no está definido
                            if (!pregunta.nivel) {
                                pregunta.nivel = 'intermedio';
                            }
                        });
                        allQuestions.push(...data.preguntas);
                    }
                }
            } catch (error) {
                console.warn(`No se pudo cargar ${file}:`, error);
            }
        }

        if (allQuestions.length === 0) {
            throw new Error('No se pudieron cargar las preguntas');
        }

        console.log(`Cargadas ${allQuestions.length} preguntas de ${jsonFiles.length} tecnologías`);
        
    } catch (error) {
        console.error('Error cargando preguntas:', error);
        alert('Error al cargar las preguntas. Por favor, verifica que los archivos JSON estén disponibles.');
    } finally {
        loadingElement.style.display = 'none';
    }
}

// Utilidad: normaliza texto (quita tildes/diacríticos y pasa a minúsculas)
function normalizeString(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

// Función para seleccionar preguntas aleatorias
function selectRandomQuestions() {
    // Determinar el conjunto de preguntas según tecnologías seleccionadas
    const poolByTech = (selectedTechnologies && selectedTechnologies.length > 0)
        ? allQuestions.filter(q => selectedTechnologies.includes(q.tecnologia))
        : allQuestions;

    // Filtrar por niveles seleccionados
    const selectedLevelsNorm = (selectedLevels && selectedLevels.length > 0)
        ? selectedLevels.map(l => normalizeString(l))
        : [];
    const pool = (selectedLevelsNorm && selectedLevelsNorm.length > 0)
        ? poolByTech.filter(q => {
            const nivel = normalizeString(q.nivel);
            return selectedLevelsNorm.includes(nivel) || selectedLevelsNorm.includes('todos');
        })
        : poolByTech;

    // Si el filtro no devuelve resultados, usar todas las preguntas como fallback
    const base = pool.length > 0 ? pool : allQuestions;

    // Helper para construir clave única de pregunta
    const buildKey = (q) => {
        const tech = (q.tecnologia || '').toString();
        if (q.id !== undefined && q.id !== null) {
            // Incluir tecnología para evitar colisiones de IDs entre archivos
            return `tech:${tech}::id:${q.id}`;
        }
        return `tech:${tech}::text:${(q.pregunta || '').trim()}`;
    };

    // Deduplicación del conjunto base
    const seenBase = new Set();
    const uniqueBase = [];
    for (const q of base) {
        const key = buildKey(q);
        if (!seenBase.has(key)) {
            seenBase.add(key);
            uniqueBase.push(q);
        }
    }

    // Mezclar con Fisher–Yates para mejor aleatoriedad
    const shuffledBase = [...uniqueBase];
    for (let i = shuffledBase.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledBase[i], shuffledBase[j]] = [shuffledBase[j], shuffledBase[i]];
    }

    // Selección inicial desde el conjunto filtrado
    const selected = shuffledBase.slice(0, selectedQuestionCount);

    // Si falta para llegar al total elegido, completar con el resto del banco global
    if (selected.length < selectedQuestionCount) {
        const need = selectedQuestionCount - selected.length;
        const alreadyKeys = new Set(selected.map(buildKey));

        // Deduplicar y mezclar todas las preguntas
        const seenAll = new Set();
        const uniqueAll = [];
        for (const q of allQuestions) {
            const key = buildKey(q);
            if (!seenAll.has(key)) {
                seenAll.add(key);
                uniqueAll.push(q);
            }
        }
        const shuffledAll = [...uniqueAll];
        for (let i = shuffledAll.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledAll[i], shuffledAll[j]] = [shuffledAll[j], shuffledAll[i]];
        }

        for (const q of shuffledAll) {
            const key = buildKey(q);
            if (!alreadyKeys.has(key)) {
                selected.push(q);
                alreadyKeys.add(key);
                if (selected.length >= selectedQuestionCount) break;
            }
        }
    }

    // En caso extremo de no tener suficientes preguntas únicas en el banco
    selectedQuestions = selected;

    // Inicializar array de respuestas del usuario (mantener sincronía con las preguntas)
    userAnswers = new Array(selectedQuestions.length).fill(null);

    generateQuizHTML();
    // Guardar estado inicial del examen tras generar
    quizStarted = true;
    saveSessionState();
}

// Función para generar el HTML del cuestionario
function generateQuizHTML() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    const questionTemplate = document.getElementById('question-template');
    const optionTemplate = document.getElementById('option-template');

    selectedQuestions.forEach((question, index) => {
        const fragment = questionTemplate.content.cloneNode(true);
        const questionDiv = fragment.querySelector('.question-container');
        questionDiv.id = `question-${index}`;
        if (index === currentQuestionIndex) questionDiv.classList.add('active');

        // Header
        fragment.querySelector('.question-number').textContent = `Pregunta ${index + 1}`;
        fragment.querySelector('.question-tech').textContent = question.tecnologia;
        const levelEl = fragment.querySelector('.question-level');
        levelEl.textContent = (question.nivel || '').toString().toUpperCase();
        const nivelClass = (question.nivel || '').toString().toLowerCase();
        levelEl.className = `question-level level-${nivelClass}`;

        // Enunciado
        fragment.querySelector('.question-text').textContent = question.pregunta;

        // Opciones
        const inputType = 'checkbox';
        const inputName = `question-${index}`;
        const optionsContainer = fragment.querySelector('.options-container');
        optionsContainer.innerHTML = '';

        question.opciones.forEach((opcion, optionIndex) => {
            const optFrag = optionTemplate.content.cloneNode(true);
            const optionDiv = optFrag.querySelector('.option');
            const inputEl = optFrag.querySelector('input');
            const labelEl = optFrag.querySelector('label');

            optionDiv.onclick = (e) => {
                // Si el click fue en el checkbox, no hacer nada (el evento change se encargará)
                if (e.target.type === 'checkbox') return;
                selectOption(index, optionIndex, true);
            };
            inputEl.type = inputType;
            inputEl.name = inputName;
            inputEl.value = optionIndex;
            inputEl.id = `q${index}_o${optionIndex}`;
            inputEl.addEventListener('change', () => selectOption(index, optionIndex, true));
            labelEl.setAttribute('for', inputEl.id);
            labelEl.textContent = opcion;

            optionsContainer.appendChild(optFrag);
        });

        // Validación (modo guiado)
        const validateSection = fragment.querySelector('.validate-section');
        const validateBtn = validateSection.querySelector('.validate-btn');
        validateSection.id = `validate-section-${index}`;
        validateBtn.id = `validate-btn-${index}`;
        validateBtn.onclick = () => validateAndShowExplanation(index);
        if (examMode !== 'guided') {
            validateSection.style.display = 'none';
        }

        // Explicación
        const explanationSection = fragment.querySelector('.explanation-section');
        explanationSection.id = `explanation-${index}`;
        const explanationText = fragment.querySelector('.explanation-text');
        explanationText.id = `explanation-text-${index}`;
        // Toggle TTS (único botón de icono)
        const ttsToggle = fragment.querySelector('.tts-toggle');
        if (ttsToggle) {
            ttsToggle.id = `tts-toggle-${index}`;
            ttsToggle.disabled = !speechSupported;
            if (speechSupported) {
                ttsToggle.addEventListener('click', () => toggleSpeakExplanation(index));
            }
        }
        

 
        container.appendChild(fragment);
    });

    updateProgress();
    updateNavigation();
}

// Función para seleccionar una opción
function selectOption(questionIndex, optionIndex, toggle = false) {
    const question = selectedQuestions[questionIndex];
    // Inicializar array de respuestas si no existe
    if (!userAnswers[questionIndex]) {
        userAnswers[questionIndex] = [];
    }

    const checkbox = document.getElementById(`q${questionIndex}_o${optionIndex}`);

    // Permitir SIEMPRE seleccionar múltiples opciones (sin límite)
    if (toggle) {
        checkbox.checked = !checkbox.checked;
    }
    if (checkbox.checked) {
        if (!userAnswers[questionIndex].includes(optionIndex)) {
            userAnswers[questionIndex].push(optionIndex);
        }
    } else {
        userAnswers[questionIndex] = userAnswers[questionIndex].filter(ans => ans !== optionIndex);
    }

    // Actualizar estilos visuales
    updateOptionStyles(questionIndex);
    // Guardar sesión tras cambiar respuesta
    saveSessionState();
}

// Función para actualizar estilos de las opciones
function updateOptionStyles(questionIndex) {
    const questionDiv = document.getElementById(`question-${questionIndex}`);
    const options = questionDiv.querySelectorAll('.option');
    
    options.forEach((option, index) => {
        // Remover clases de selección y feedback visual
        option.classList.remove('selected', 'correct', 'incorrect');
        const input = option.querySelector('input');
        if (input.checked) {
            option.classList.add('selected');
        }
    });
}

// Función para validar respuesta y mostrar explicación (solo en modo guiado)
function validateAndShowExplanation(questionIndex) {
    const question = selectedQuestions[questionIndex];
    const explanationSection = document.getElementById(`explanation-${questionIndex}`);
    const explanationText = document.getElementById(`explanation-text-${questionIndex}`);
    const validateBtn = document.getElementById(`validate-btn-${questionIndex}`);

    const userAnswer = userAnswers[questionIndex];
    const correctAnswers = question.respuestas_correctas;
    
    // Agregar feedback visual en modo guiado
    const questionDiv = document.getElementById(`question-${questionIndex}`);
    const options = questionDiv.querySelectorAll('.option');
    
    options.forEach((option, index) => {
        // Remover clases previas de feedback
        option.classList.remove('correct', 'incorrect');
        
        const isCorrectAnswer = correctAnswers.includes(index);
        const isUserSelected = (userAnswer || []).includes(index);
        
        if (isCorrectAnswer) {
            // Marcar respuestas correctas en verde
            option.classList.add('correct');
        } else if (isUserSelected) {
            // Marcar respuestas incorrectas seleccionadas por el usuario en rojo
            option.classList.add('incorrect');
        }
    });
    
    // Mostrar la explicación (Markdown soportado)
    if (question.explicacion) {
        try {
            explanationText.innerHTML = renderMarkdownHTML(question.explicacion);
        } catch (e) {
            explanationText.textContent = String(question.explicacion);
        }
    } else {
        // Si no hay explicación, mostrar las respuestas correctas
        const correctAnswers = question.respuestas_correctas.map(index => question.opciones[index]);
        explanationText.innerHTML = `Las respuestas correctas son: <strong>${correctAnswers.join(', ')}</strong>`;
    }
    
    explanationSection.style.display = 'block';
    explanationSection.classList.add('slideDown');

    // Mantener el botón activo para permitir revalidaciones
    validateBtn.disabled = false;
    validateBtn.innerHTML = '🔁 Revalidar';
    validateBtn.style.opacity = '1';

    // Habilitar el toggle de voz si hay soporte
    enableTTSToggle(questionIndex);
}

function showExplanation(questionIndex) {
    const question = selectedQuestions[questionIndex];
    const explanationSection = document.getElementById(`explanation-${questionIndex}`);
    const explanationText = document.getElementById(`explanation-text-${questionIndex}`);
    
    if (question.explicacion) {
        try {
            explanationText.innerHTML = renderMarkdownHTML(question.explicacion);
        } catch (e) {
            explanationText.textContent = String(question.explicacion);
        }
        explanationSection.style.display = 'block';
        explanationSection.classList.add('slideDown');
    } else {
        // Si no hay explicación, mostrar las respuestas correctas
        const correctAnswers = question.respuestas_correctas.map(index => question.opciones[index]);
        explanationText.innerHTML = `Las respuestas correctas son: <strong>${correctAnswers.join(', ')}</strong>`;
        explanationSection.style.display = 'block';
        explanationSection.classList.add('slideDown');
    }
    // Habilitar el toggle de voz si hay soporte
    enableTTSToggle(questionIndex);
}

// Renderizado Markdown seguro con fallback local
function renderMarkdownHTML(md) {
    const src = String(md || '');
    // Intentar con marked si está disponible
    try {
        if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
            const rendered = marked.parse(src);
            return (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(rendered) : rendered;
        }
        if (typeof marked !== 'undefined' && typeof marked === 'function') {
            const rendered = marked(src);
            return (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(rendered) : rendered;
        }
    } catch (_) { /* continuar al fallback */ }

    // Fallback básico: **negrita**, *itálica*, `código`, bloques ```
    let html = src;
    html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${escapeHtml(code)}</code></pre>`);
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Saltos de línea
    html = html.replace(/\n{2,}/g, '<br/><br/>').replace(/\n/g, '<br/>');
    return (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(html) : html;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Función para ir a la siguiente pregunta
function nextQuestion() {
    if (currentQuestionIndex < selectedQuestions.length - 1) {
        stopSpeaking();
        document.getElementById(`question-${currentQuestionIndex}`).classList.remove('active');
        currentQuestionIndex++;
        document.getElementById(`question-${currentQuestionIndex}`).classList.add('active');
        updateProgress();
        updateNavigation();
        saveSessionState();
    } else {
        finishQuiz();
    }
}

// Función para ir a la pregunta anterior
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        stopSpeaking();
        document.getElementById(`question-${currentQuestionIndex}`).classList.remove('active');
        currentQuestionIndex--;
        document.getElementById(`question-${currentQuestionIndex}`).classList.add('active');
        updateProgress();
        updateNavigation();
        saveSessionState();
    }
}

// Función para actualizar la barra de progreso
function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / selectedQuestions.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('questionCounter').textContent = `Pregunta ${currentQuestionIndex + 1} de ${selectedQuestions.length}`;
}

// Función para actualizar la navegación
function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const summaryBtn = document.getElementById('summaryBtn');

    prevBtn.disabled = currentQuestionIndex === 0;

    if (summaryBtn) {
        summaryBtn.style.display = isInSummaryMode ? 'inline-block' : 'none';
        summaryBtn.onclick = showSummary;
    }

    if (currentQuestionIndex === selectedQuestions.length - 1) {
        nextBtn.textContent = 'Finalizar';
        nextBtn.onclick = finishQuiz;
        nextBtn.className = 'btn btn-primary';
    } else {
        nextBtn.textContent = 'Siguiente';
        nextBtn.onclick = nextQuestion;
        nextBtn.className = 'btn btn-primary';
    }
}

// Función para actualizar el número de preguntas
function updateQuestionCount(count) {
    selectedQuestionCount = count;
    
    // Actualizar estilos de las opciones
    document.querySelectorAll('.question-count-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Marcar la opción seleccionada
    const selectedOption = document.querySelector(`input[value="${count}"]`).parentElement;
    selectedOption.classList.add('selected');
}

// Función para seleccionar el tipo de examen
function selectExamType(type) {
    examMode = type;
    
    // Actualizar estilos de las tarjetas
    document.getElementById('guidedCard').classList.remove('selected');
    document.getElementById('evaluationCard').classList.remove('selected');
    
    if (type === 'guided') {
        document.getElementById('guidedCard').classList.add('selected');
        document.getElementById('guidedInstruction').style.display = 'list-item';
        document.getElementById('evaluationInstruction').style.display = 'none';
    } else {
        document.getElementById('evaluationCard').classList.add('selected');
        document.getElementById('evaluationInstruction').style.display = 'list-item';
        document.getElementById('guidedInstruction').style.display = 'none';
    }
    
    // Habilitar el botón de inicio
    const startBtn = document.getElementById('startQuizBtn');
    startBtn.disabled = false;
    startBtn.textContent = 'Comenzar Cuestionario';
}

// Función para iniciar el cuestionario
async function startQuiz() {
    if (!examMode) {
        alert('Por favor selecciona un tipo de examen antes de continuar.');
        return;
    }
    
    // Asegurar que usamos la cantidad actualmente seleccionada en la UI
    const selectedRadio = document.querySelector('input[name="questionCount"]:checked');
    if (selectedRadio) {
        const val = parseInt(selectedRadio.value, 10);
        if (!isNaN(val)) selectedQuestionCount = val;
    }

    document.getElementById('startScreen').style.display = 'none';
    await loadAllQuestions();
    selectRandomQuestions();
    document.getElementById('quizContainer').style.display = 'block';
    quizStarted = true;
}

// Función para finalizar el cuestionario
function finishQuiz() {
    showSummary();
}

// Función para mostrar el resumen de respuestas
function showSummary() {
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('summaryScreen').style.display = 'block';
    isInSummaryMode = true;
    generateSummary();
    saveSessionState();
}

// Función para generar el resumen de respuestas
function generateSummary() {
    const summaryContainer = document.getElementById('summaryContainer');
    summaryContainer.innerHTML = '';

    selectedQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index] || [];
        const summaryItem = document.createElement('div');
        summaryItem.className = 'summary-item';

        let answerText = '';
        if (userAnswer.length === 0) {
            answerText = '<div class="summary-answer no-answer">Sin respuesta</div>';
        } else {
            const selectedOptions = userAnswer.map(answerIndex => question.opciones[answerIndex]);
            answerText = `<div class="summary-answer">${selectedOptions.join(', ')}</div>`;
        }

        summaryItem.innerHTML = `
            <div class="summary-question">Pregunta ${index + 1}: ${question.pregunta}</div>
            ${answerText}
            <button class="modify-btn" onclick="modifyAnswer(${index})">Modificar</button>
        `;

        summaryContainer.appendChild(summaryItem);
    });
}

// Función para modificar una respuesta específica
function modifyAnswer(questionIndex) {
    isInSummaryMode = true;
    document.getElementById('summaryScreen').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';
    document.getElementById(`question-${currentQuestionIndex}`).classList.remove('active');
    currentQuestionIndex = questionIndex;
    document.getElementById(`question-${currentQuestionIndex}`).classList.add('active');
    updateProgress();
    updateNavigation();
    saveSessionState();
}

// Función para volver al cuestionario desde el resumen
function backToQuiz() {
    isInSummaryMode = false;
    document.getElementById('summaryScreen').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';
    saveSessionState();
}

// Función para enviar respuestas finales
function submitFinalAnswers() {
    console.log('submitFinalAnswers called');
    calculateResults();
    isInSummaryMode = false;
    
    console.log('Hiding summaryScreen');
    document.getElementById('summaryScreen').style.display = 'none';
    
    console.log('Hiding quizContainer');
    document.getElementById('quizContainer').style.display = 'none';
    
    console.log('Hiding startScreen');
    document.getElementById('startScreen').style.display = 'none';
    
    console.log('Showing results');
    const resultsElement = document.getElementById('results');
    console.log('Results element:', resultsElement);
    resultsElement.style.display = 'block';
    resultsElement.classList.add('show');
    console.log('Results element classes:', resultsElement.className);
    // Al finalizar, limpiar estado de sesión para evitar restauraciones no deseadas
    clearSessionState();
}

// Función para calcular los resultados
function calculateResults() {
    console.log('calculateResults called');
    console.log('selectedQuestions:', selectedQuestions.length);
    console.log('userAnswers:', userAnswers);
    
    let correctCount = 0;
    let incorrectCount = 0;

    selectedQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index] || [];
        const correctAnswers = question.respuestas_correctas;
        
        // Verificar si la respuesta es correcta
        const isCorrect = arraysEqual(userAnswer.sort(), correctAnswers.sort());
        
        if (isCorrect) {
            correctCount++;
        } else {
            incorrectCount++;
        }
    });

    // Actualizar la interfaz con los resultados
    const totalQuestions = selectedQuestions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    
    document.getElementById('correctAnswers').textContent = correctCount;
    document.getElementById('incorrectAnswers').textContent = incorrectCount;
    document.getElementById('percentage').textContent = `${percentage}%`;
    document.getElementById('scoreText').textContent = `${correctCount}/${totalQuestions}`;

    // Determinar calificación y mensaje
    let grade, message, scoreClass;
    if (percentage >= 90) {
        grade = 'A+';
        message = '¡Excelente! Dominas muy bien las tecnologías DevOps';
        scoreClass = 'score-excellent';
    } else if (percentage >= 80) {
        grade = 'A';
        message = '¡Muy bien! Tienes un buen conocimiento de DevOps';
        scoreClass = 'score-good';
    } else if (percentage >= 70) {
        grade = 'B';
        message = 'Bien. Hay áreas que puedes mejorar';
        scoreClass = 'score-average';
    } else if (percentage >= 60) {
        grade = 'C';
        message = 'Regular. Te recomendamos estudiar más';
        scoreClass = 'score-average';
    } else {
        grade = 'F';
        message = 'Necesitas estudiar más las tecnologías DevOps';
        scoreClass = 'score-poor';
    }

    document.getElementById('grade').textContent = grade;
    document.getElementById('scoreMessage').textContent = message;
    document.getElementById('scoreCircle').className = `score-circle ${scoreClass}`;
}

// Función auxiliar para comparar arrays
function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// Función para reiniciar el cuestionario
function restartQuiz() {
    currentQuestionIndex = 0;
    userAnswers = [];
    selectedQuestions = [];
    quizStarted = false;
    examMode = null;
    isInSummaryMode = false;
    selectedTechnologies = [];
    selectedLevels = ['basico', 'intermedio', 'avanzado'];
    stopSpeaking();
    clearSessionState();
    
    // Ocultar resultados
    const resultsElement = document.getElementById('results');
    resultsElement.classList.remove('show');
    resultsElement.style.display = 'none';
    
    // Mostrar pantalla de inicio
    document.getElementById('startScreen').style.display = 'block';
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('summaryScreen').style.display = 'none';

    // Resetear selección de número de preguntas (por defecto 30)
    selectedQuestionCount = 30;
    document.querySelectorAll('.question-count-option').forEach(opt => opt.classList.remove('selected'));
    const defaultRadio = document.querySelector('input[name="questionCount"][value="30"]');
    if (defaultRadio) {
        defaultRadio.checked = true;
        const label = defaultRadio.parentElement;
        if (label) label.classList.add('selected');
    }

    // Resetear tipo de examen y textos
    const guidedCard = document.getElementById('guidedCard');
    const evaluationCard = document.getElementById('evaluationCard');
    if (guidedCard) guidedCard.classList.remove('selected');
    if (evaluationCard) evaluationCard.classList.remove('selected');
    const guidedInstruction = document.getElementById('guidedInstruction');
    const evaluationInstruction = document.getElementById('evaluationInstruction');
    if (guidedInstruction) guidedInstruction.style.display = 'none';
    if (evaluationInstruction) evaluationInstruction.style.display = 'none';
    const startBtn = document.getElementById('startQuizBtn');
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = 'Selecciona un tipo de examen para continuar';
    }

    // Resetear multi-select de tecnologías
    const dropdown = document.getElementById('techDropdown');
    const control = document.getElementById('techControl');
    const chipContainer = document.getElementById('chipContainer');
    if (dropdown) {
        dropdown.querySelectorAll('input.multi-check').forEach(cb => cb.checked = false);
        dropdown.classList.remove('open');
    }
    if (control) control.setAttribute('aria-expanded', 'false');
    if (chipContainer) {
        // Mostrar placeholder
        chipContainer.innerHTML = '';
        const placeholder = document.createElement('span');
        placeholder.className = 'placeholder-text';
        placeholder.textContent = 'Selecciona tecnologías...';
        chipContainer.appendChild(placeholder);
    }
    const clearBtn = document.getElementById('clearTechBtn');
    if (clearBtn) clearBtn.disabled = true;

    console.log('Cuestionario reiniciado');
}

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Cuestionario DevOps cargado');
    // Cargar lista de cursos para el multi-select y la galería de prompts
    loadCoursesList();
    initTechnologySelectHandler();
    initLevelSelectHandler();
    initSpeech();
    // Intentar restaurar el estado del examen si existe en sesión
    restoreSessionState();
});

// ===== SELECCIÓN DE TECNOLOGÍAS =====
// Cargar cursos desde JSON y poblar el selector
async function loadCoursesList() {
    try {
        const response = await fetch('js/cursos.json');
        if (!response.ok) throw new Error('No se pudo cargar js/cursos.json');
        const data = await response.json();
        availablePrompts = Array.isArray(data.cursos) ? data.cursos : [];
        populateTechnologySelect();
    } catch (error) {
        console.warn('No se pudo cargar la lista de cursos:', error);
    }
}

function populateTechnologySelect() {
    const dropdown = document.getElementById('techDropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';

    const sorted = [...availablePrompts].sort((a, b) => a.title.localeCompare(b.title));
    sorted.forEach(item => {
        const el = document.createElement('div');
        el.className = 'multi-select-item';
        el.setAttribute('role', 'option');
        el.dataset.value = item.title;
        el.innerHTML = `<label><input type="checkbox" class="multi-check" value="${item.title}"><span>${item.title}</span></label>`;
        el.addEventListener('click', (e) => {
            // Evita el toggle automático del label para no hacer doble cambio
            e.preventDefault();
            e.stopPropagation();
            const cb = el.querySelector('input.multi-check');
            cb.checked = !cb.checked; // togglear siempre una sola vez
            handleTechSelectionChange();
        });
        dropdown.appendChild(el);
    });

    renderTechChips();
}

function initTechnologySelectHandler() {
    const control = document.getElementById('techControl');
    const dropdown = document.getElementById('techDropdown');
    const clearBtn = document.getElementById('clearTechBtn');
    if (!control || !dropdown) return;

    const toggle = () => toggleTechDropdown();
    control.addEventListener('click', (e) => {
        toggle();
    });
    control.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
        }
    });
    document.addEventListener('click', (e) => {
        if (!control.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
            control.setAttribute('aria-expanded', 'false');
        }
    });
    dropdown.addEventListener('change', (e) => {
        if (e.target.matches('input.multi-check')) {
            handleTechSelectionChange();
        }
    });

    // Limpiar selección con el botón X sin abrir/cerrar el dropdown
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearTechnologySelection();
        });
    }
}

function toggleTechDropdown() {
    const control = document.getElementById('techControl');
    const dropdown = document.getElementById('techDropdown');
    if (!control || !dropdown) return;
    const open = !dropdown.classList.contains('open');
    dropdown.classList.toggle('open', open);
    control.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function handleTechSelectionChange() {
    const dropdown = document.getElementById('techDropdown');
    const checks = dropdown.querySelectorAll('input.multi-check:checked');
    selectedTechnologies = Array.from(checks).map(cb => cb.value);
    renderTechChips();
    console.log('Tecnologías seleccionadas:', selectedTechnologies);
}

function renderTechChips() {
    const chipContainer = document.getElementById('chipContainer');
    const dropdown = document.getElementById('techDropdown');
    const clearBtn = document.getElementById('clearTechBtn');
    if (!chipContainer) return;
    chipContainer.innerHTML = '';

    if (!selectedTechnologies || selectedTechnologies.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.className = 'placeholder-text';
        placeholder.textContent = 'Selecciona tecnologías...';
        chipContainer.appendChild(placeholder);
        if (clearBtn) clearBtn.disabled = true;
        return;
    }

    if (clearBtn) clearBtn.disabled = false;
    selectedTechnologies.forEach(value => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = value;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-remove';
        btn.setAttribute('aria-label', `Quitar ${value}`);
        btn.textContent = '×';
        btn.addEventListener('click', () => {
            const checks = dropdown.querySelectorAll('input.multi-check');
            checks.forEach(cb => {
                if (cb.value === value) cb.checked = false;
            });
            selectedTechnologies = selectedTechnologies.filter(v => v !== value);
            renderTechChips();
        });
        chip.appendChild(btn);
        chipContainer.appendChild(chip);
    });
}

// Limpiar todas las tecnologías seleccionadas
function clearTechnologySelection() {
    const dropdown = document.getElementById('techDropdown');
    if (!dropdown) return;
    dropdown.querySelectorAll('input.multi-check').forEach(cb => cb.checked = false);
    selectedTechnologies = [];
    renderTechChips();
}

// ===== FUNCIONALIDAD DE PROMPTS =====

// Función para mostrar la página de prompts
function showPromptsPage() {
    // Mostrar como superposición sin salir del examen
    const promptsPage = document.getElementById('promptsPage');
    promptsPage.style.display = 'block';
    promptsPage.classList.add('overlay');
    document.body.classList.add('overlay-open');
    // Cerrar modales abiertos
    hideAllModals();
    
    // Cargar los prompts en la galería
    loadPromptsGallery();
}

// Función para volver al cuestionario
function backToQuiz() {
    // Cerrar overlays si están visibles y volver a la vista adecuada
    const promptsPage = document.getElementById('promptsPage');
    const guidesPage = document.getElementById('guidesPage');
    const docsPage = document.getElementById('docsPage');
    const learningPage = document.getElementById('learningPage');
    if (promptsPage) {
        promptsPage.style.display = 'none';
        promptsPage.classList.remove('overlay');
    }
    if (guidesPage) {
        guidesPage.style.display = 'none';
        guidesPage.classList.remove('overlay');
    }
    if (docsPage) {
        docsPage.style.display = 'none';
        docsPage.classList.remove('overlay');
    }
    if (learningPage) {
        learningPage.style.display = 'none';
        learningPage.classList.remove('overlay');
    }
    document.body.classList.remove('overlay-open');
    hideAllModals();

    if (quizStarted) {
        // Restaurar la vista activa sin perder estado
        if (isInSummaryMode) {
            document.getElementById('summaryScreen').style.display = 'block';
            document.getElementById('quizContainer').style.display = 'none';
        } else {
            document.getElementById('quizContainer').style.display = 'block';
        }
    } else {
        document.getElementById('startScreen').style.display = 'block';
    }
    saveSessionState();
}

// ===== Salir del Examen =====
function exitExam() {
    clearSessionState();
    restartQuiz();
}

// Función para cargar la galería de prompts
function loadPromptsGallery() {
    const gallery = document.getElementById('promptsGallery');
    gallery.innerHTML = '';
    
    availablePrompts.forEach(prompt => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.innerHTML = `
            <div class="prompt-card-header">
                <h3>${prompt.title}</h3>
            </div>
            <div class="prompt-card-body">
                <p>${prompt.description}</p>
                <button class="btn btn-primary" onclick="openPrompt('${prompt.file}', '${prompt.title}')">
                    🧠 Ver Prompt
                </button>
            </div>
        `;
        gallery.appendChild(card);
    });
}

// Función para abrir un prompt específico
async function openPrompt(filename, title) {
    try {
        console.log('[openPrompt] Cargando:', `prompts/${filename}`);
        const response = await fetch(`prompts/${filename}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Error al cargar el prompt: ${response.status}`);
        }
        
        const markdownContent = await response.text();
        
        // Mostrar el modal
        const modal = document.getElementById('promptModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('markdownContent');
        // Asegurar que el modal de guías esté cerrado
        const guideModal = document.getElementById('guideModal');
        if (guideModal) guideModal.style.display = 'none';
        
        modalTitle.textContent = title;
        
        // Convertir Markdown a HTML usando marked.js
        if (typeof marked !== 'undefined') {
            modalContent.innerHTML = marked.parse(markdownContent);
        } else {
            // Fallback si marked.js no está disponible
            modalContent.innerHTML = `<pre>${markdownContent}</pre>`;
        }
        
        // Guardar el contenido original para copiar
        modal.dataset.originalContent = markdownContent;
        // Guardar índice actual para navegación
        const currentIndex = availablePrompts.findIndex(p => p.file === filename);
        modal.dataset.currentIndex = String(currentIndex);
        
        modal.style.display = 'block';
        modal.dataset.source = 'prompt';
        
    } catch (error) {
        console.error('Error al cargar el prompt:', error);
        alert('Error al cargar el prompt. Por favor, intenta de nuevo.');
    }
}

// Función para cerrar el modal
function closeModal() {
    document.getElementById('promptModal').style.display = 'none';
}

// Función para copiar el contenido Markdown al portapapeles
async function copyMarkdownContent() {
    const modal = document.getElementById('promptModal');
    const originalContent = modal.dataset.originalContent;
    
    if (!originalContent) {
        alert('No hay contenido para copiar.');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(originalContent);
        
        // Mostrar feedback visual
        const copyBtn = document.getElementById('copyMarkdownBtn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '¡Copiado!';
        copyBtn.style.backgroundColor = '#28a745';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.backgroundColor = '';
        }, 2000);
        
    } catch (error) {
        console.error('Error al copiar:', error);
        
        // Fallback para navegadores que no soportan clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = originalContent;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            alert('Contenido copiado al portapapeles');
        } catch (fallbackError) {
            console.error('Error en fallback de copia:', fallbackError);
            alert('No se pudo copiar el contenido. Por favor, selecciona y copia manualmente.');
        }
        
        document.body.removeChild(textArea);
    }
}

// Navegación entre prompts
function navigatePrompt(offset) {
    const modal = document.getElementById('promptModal');
    if (!modal || modal.style.display === 'none') return;
    const idx = parseInt(modal.dataset.currentIndex || '-1', 10);
    if (isNaN(idx) || idx < 0) return;
    if (!Array.isArray(availablePrompts) || availablePrompts.length === 0) return;
    let newIdx = idx + offset;
    if (newIdx < 0) newIdx = availablePrompts.length - 1;
    if (newIdx >= availablePrompts.length) newIdx = 0;
    const item = availablePrompts[newIdx];
    openPrompt(item.file, item.title);
}

// Cerrar modal al hacer clic fuera de él
window.onclick = function(event) {
    const promptModal = document.getElementById('promptModal');
    const guideModal = document.getElementById('guideModal');
    const docModal = document.getElementById('docModal');
    const learningModal = document.getElementById('learningModal');
    if (event.target === promptModal) {
        closeModal();
    }
    if (event.target === guideModal) {
        closeGuideModal();
    }
    if (event.target === docModal) {
        closeDocModal();
    }
    if (event.target === learningModal) {
        closeLearningModal();
    }
}

// Utilidad para cerrar cualquier modal abierto
function hideAllModals() {
    const promptModal = document.getElementById('promptModal');
    const guideModal = document.getElementById('guideModal');
    const docModal = document.getElementById('docModal');
    const learningModal = document.getElementById('learningModal');
    if (promptModal) promptModal.style.display = 'none';
    if (guideModal) guideModal.style.display = 'none';
    if (docModal) docModal.style.display = 'none';
    if (learningModal) learningModal.style.display = 'none';
}

// ===== FUNCIONALIDAD DE GUÍAS =====

// Mostrar la página de guías
function showGuidesPage() {
    // Mostrar como superposición sin salir del examen
    const guidesPage = document.getElementById('guidesPage');
    guidesPage.style.display = 'block';
    guidesPage.classList.add('overlay');
    document.body.classList.add('overlay-open');
    hideAllModals();

    // Cargar las guías en la galería
    loadGuidesGallery();
}

// Mostrar la página de aprendizaje
function showLearningPage() {
    const learningPage = document.getElementById('learningPage');
    learningPage.style.display = 'block';
    learningPage.classList.add('overlay');
    document.body.classList.add('overlay-open');
    hideAllModals();

    // Cargar los cursos de aprendizaje en la galería
    loadLearningGallery();
}

// ===== FUNCIONALIDAD DE DOCUMENTACIÓN =====
// Mostrar la página de documentación
function showDocsPage() {
    const docsPage = document.getElementById('docsPage');
    docsPage.style.display = 'block';
    docsPage.classList.add('overlay');
    document.body.classList.add('overlay-open');
    hideAllModals();

    // Cargar documentos en la galería
    loadDocsGallery();
}

// Exponer funciones de Documentación al ámbito global por compatibilidad con atributos onclick
window.showDocsPage = showDocsPage;
window.loadDocsGallery = loadDocsGallery;
window.openDocument = openDocument;
window.closeDocModal = closeDocModal;
window.navigateDocument = navigateDocument;

// Descubrir y mostrar la galería de PDFs
async function loadDocsGallery() {
    const gallery = document.getElementById('docsGallery');
    if (!gallery) return;
    gallery.innerHTML = '';

    try {
        // Obtenemos el listado del directorio (http.server genera index por defecto)
        const res = await fetch('documentation/', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Error al leer documentación: ${res.status}`);
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));
        const pdfs = links
            .map(a => a.getAttribute('href') || '')
            .filter(href => href && href.toLowerCase().endsWith('.pdf'))
            .map(href => href.replace(/^\/?documentation\//i, '').replace(/^\//, ''));

        // Helper para obtener un título legible y consistente
        function getDocTitleFromFileName(file) {
            const base = (file || '').replace(/\.pdf$/i, '');
            // 1) Intentar obtener título desde availablePrompts (cursos.json)
            try {
                if (Array.isArray(availablePrompts) && availablePrompts.length > 0) {
                    const match = availablePrompts.find(p => {
                        const pf = (p.file || '').replace(/\.(md|markdown)$/i, '');
                        return pf === base;
                    });
                    if (match && match.title) return match.title;
                }
            } catch (_) { /* noop */ }

            // 2) Formateo legible a partir del nombre del archivo
            const slug = base.replace(/_aprendizaje$/i, '');
            const parts = slug.split(/[_-]+/).filter(Boolean);
            const specialMap = {
                'github': 'GitHub',
                'actions': 'Actions',
                'docker': 'Docker',
                'swarm': 'Swarm',
                'kubernetes': 'Kubernetes',
                'terraform': 'Terraform',
                'linux': 'Linux',
                'azure': 'Azure',
                'devops': 'DevOps',
                'prometheus': 'Prometheus',
                'grafana': 'Grafana',
                'ansible': 'Ansible',
                'jenkins': 'Jenkins',
                'argocd': 'Argo CD',
            };
            const title = parts.map(w => specialMap[w.toLowerCase()] || (w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
            return title || base;
        }

        availableDocs = pdfs.map(file => ({
            file,
            title: getDocTitleFromFileName(file),
            description: 'Documento PDF'
        }));

        if (availableDocs.length === 0) {
            gallery.innerHTML = '<p>No se encontraron archivos PDF en la carpeta documentación.</p>';
            return;
        }

        availableDocs.forEach(item => {
            const card = document.createElement('div');
            card.className = 'prompt-card';
            card.innerHTML = `
                <div class="prompt-card-header">
                    <h3>${item.title}</h3>
                </div>
                <div class="prompt-card-body">
                    <p>${item.description}</p>
                    <button class="btn btn-primary" onclick="openDocument('${item.file}', '${item.title}')">
                        📄 Ver
                    </button>
                </div>
            `;
            gallery.appendChild(card);
        });
    } catch (err) {
        console.error('Error al cargar la galería de documentación:', err);
        gallery.innerHTML = '<p>Error al cargar la documentación.</p>';
    }
}

// Abrir documento PDF en modal
function openDocument(filename, title) {
    const modal = document.getElementById('docModal');
    const modalTitle = document.getElementById('docModalTitle');
    const frame = document.getElementById('pdfFrame');
    const openNewTabBtn = document.getElementById('openDocNewTabBtn');

    // Cerrar otros modales
    const promptModal = document.getElementById('promptModal');
    const guideModal = document.getElementById('guideModal');
    if (promptModal) promptModal.style.display = 'none';
    if (guideModal) guideModal.style.display = 'none';

    modalTitle.textContent = title;
    const src = `documentation/${filename}`;
    frame.src = src;
    if (openNewTabBtn) {
        openNewTabBtn.onclick = () => window.open(src, '_blank');
    }

    const currentIndex = availableDocs.findIndex(d => d.file === filename);
    modal.dataset.currentIndex = String(currentIndex);
    modal.dataset.source = 'document';
    modal.style.display = 'block';
}

// Cerrar modal de documentación
function closeDocModal() {
    const modal = document.getElementById('docModal');
    if (modal) modal.style.display = 'none';
}

// Navegación entre documentos
function navigateDocument(offset) {
    const modal = document.getElementById('docModal');
    if (!modal || modal.style.display === 'none') return;
    const idx = parseInt(modal.dataset.currentIndex || '-1', 10);
    if (isNaN(idx) || idx < 0) return;
    if (!Array.isArray(availableDocs) || availableDocs.length === 0) return;
    let newIdx = idx + offset;
    if (newIdx < 0) newIdx = availableDocs.length - 1;
    if (newIdx >= availableDocs.length) newIdx = 0;
    const item = availableDocs[newIdx];
    openDocument(item.file, item.title);
}

// ====== Selección de Niveles ======
function getSelectedLevelsFromUI() {
    const checkboxes = document.querySelectorAll('.level-checkbox');
    const levels = [];
    checkboxes.forEach(cb => { if (cb.checked) levels.push(normalizeString(cb.value)); });
    return levels;
}

function setLevelCheckboxesFromState() {
    const checkboxes = document.querySelectorAll('.level-checkbox');
    checkboxes.forEach(cb => {
        const isSelected = selectedLevels.includes(cb.value.toLowerCase());
        cb.checked = isSelected;
        const label = cb.closest('.level-option');
        if (label) {
            label.classList.toggle('selected', isSelected);
            label.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        }
    });
}

function initLevelSelectHandler() {
    const options = document.querySelectorAll('.level-option');
    if (!options || options.length === 0) return;
    // Si no hay niveles seleccionados aún, por defecto todos marcados
    if (!selectedLevels || selectedLevels.length === 0) {
        selectedLevels = ['basico', 'intermedio', 'avanzado'];
    }
    setLevelCheckboxesFromState();
    options.forEach(option => {
        const cb = option.querySelector('input.level-checkbox');
        if (!cb) return;
        // Click en el chip
        option.addEventListener('click', (e) => {
            if (e.target !== cb) {
                // Evitar el toggle por defecto del label para que no ocurra doble cambio
                e.preventDefault();
                e.stopPropagation();
                cb.checked = !cb.checked;

                let newLevels = getSelectedLevelsFromUI();
                // Enforce: mínimo 1 nivel seleccionado
                if (newLevels.length === 0) {
                    cb.checked = true; // revertimos el toggle
                    newLevels = getSelectedLevelsFromUI();
                }
                option.classList.toggle('selected', cb.checked);
                option.setAttribute('aria-pressed', cb.checked ? 'true' : 'false');
                selectedLevels = newLevels;
                saveSessionState();
            }
        });
        // Cambio directo del checkbox (por accesibilidad/teclado)
        cb.addEventListener('change', () => {
            let newLevels = getSelectedLevelsFromUI();
            if (newLevels.length === 0) {
                cb.checked = true; // revertimos
                newLevels = getSelectedLevelsFromUI();
            }
            option.classList.toggle('selected', cb.checked);
            option.setAttribute('aria-pressed', cb.checked ? 'true' : 'false');
            selectedLevels = newLevels;
            saveSessionState();
        });
    });
}

// ====== TTS Helpers ======
function initSpeech() {
    if (!speechSupported) return;
    const setVoices = () => {
        availableVoices = window.speechSynthesis.getVoices();
        // Buscar una voz en español si existe
        preferredVoice = availableVoices.find(v => /es-|es_ES|Spanish/i.test(v.lang)) || null;
    };
    setVoices();
    if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = setVoices;
    }
}

function speakExplanation(questionIndex) {
    if (!speechSupported) return;
    const textEl = document.getElementById(`explanation-text-${questionIndex}`);
    if (!textEl) return;
    const text = textEl.innerText || textEl.textContent || '';
    if (!text) return;
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(text);
    if (preferredVoice) utter.voice = preferredVoice;
    utter.rate = 1;
    utter.pitch = 1;
    currentUtterance = utter;
    speakingQuestionIndex = questionIndex;
    // Cuando termina o hay error, restablecer UI
    utter.onend = () => {
        updateTTSToggleUI(questionIndex, false);
        speakingQuestionIndex = null;
    };
    utter.onerror = () => {
        updateTTSToggleUI(questionIndex, false);
        speakingQuestionIndex = null;
    };
    window.speechSynthesis.speak(utter);
    updateTTSToggleUI(questionIndex, true);
}

function stopSpeaking() {
    if (!speechSupported) return;
    if (window.speechSynthesis.speaking || window.speechSynthesis.paused) {
        window.speechSynthesis.cancel();
    }
    currentUtterance = null;
    if (speakingQuestionIndex !== null) {
        updateTTSToggleUI(speakingQuestionIndex, false);
        speakingQuestionIndex = null;
    }
}

function enableTTSToggle(questionIndex) {
    if (!speechSupported) return;
    const btn = document.getElementById(`tts-toggle-${questionIndex}`);
    if (btn) btn.disabled = false;
}

// Alterna reproducción/pausa del TTS para la explicación de una pregunta
function toggleSpeakExplanation(questionIndex) {
    if (!speechSupported) return;
    const synth = window.speechSynthesis;
    // Si no está hablando o es otra pregunta, comenzar a narrar esta
    if (!synth.speaking || speakingQuestionIndex !== questionIndex) {
        speakExplanation(questionIndex);
        return;
    }
    // Si está hablando esta misma pregunta: alternar pausa/reanudación
    if (synth.paused) {
        synth.resume();
        updateTTSToggleUI(questionIndex, true);
    } else {
        synth.pause();
        updateTTSToggleUI(questionIndex, false);
    }
}

// Actualiza el estado visual del botón toggle
function updateTTSToggleUI(questionIndex, isPlaying) {
    const btn = document.getElementById(`tts-toggle-${questionIndex}`);
    if (!btn) return;
    btn.classList.toggle('playing', !!isPlaying);
    btn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
}

// Cargar la galería de guías
function loadGuidesGallery() {
    const gallery = document.getElementById('guidesGallery');
    if (!gallery) return;
    gallery.innerHTML = '';

    availablePrompts.forEach(item => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.innerHTML = `
            <div class="prompt-card-header">
                <h3>${item.title}</h3>
            </div>
            <div class="prompt-card-body">
                <p>${item.description}</p>
                <button class="btn btn-primary" onclick="openGuide('${item.file}', '${item.title}')">
                    📘 Ver Guía
                </button>
            </div>
        `;
        gallery.appendChild(card);
    });
}

// Abrir una guía específica
async function openGuide(filename, title) {
    try {
        console.log('[openGuide] Cargando:', `guides/${filename}`);
        const response = await fetch(`guides/${filename}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Error al cargar la guía: ${response.status}`);
        }

        const markdownContent = await response.text();

        // Mostrar el modal de guías
        const modal = document.getElementById('guideModal');
        const modalTitle = document.getElementById('guideModalTitle');
        const modalContent = document.getElementById('guideMarkdownContent');
        // Asegurar que el modal de prompts esté cerrado
        const promptModal = document.getElementById('promptModal');
        if (promptModal) promptModal.style.display = 'none';

        modalTitle.textContent = title;

        if (typeof marked !== 'undefined') {
            modalContent.innerHTML = marked.parse(markdownContent);
        } else {
            modalContent.innerHTML = `<pre>${markdownContent}</pre>`;
        }

        // Guardar el contenido original para copiar
        modal.dataset.originalContent = markdownContent;
        // Guardar índice actual para navegación
        const currentIndex = availablePrompts.findIndex(p => p.file === filename);
        modal.dataset.currentIndex = String(currentIndex);

        modal.style.display = 'block';
        modal.dataset.source = 'guide';

    } catch (error) {
        console.error('Error al cargar la guía:', error);
        alert('Error al cargar la guía. Por favor, intenta de nuevo.');
    }
}

// Cerrar modal de guías
function closeGuideModal() {
    const modal = document.getElementById('guideModal');
    if (modal) modal.style.display = 'none';
}

// Copiar contenido Markdown de la guía
async function copyGuideMarkdownContent() {
    const modal = document.getElementById('guideModal');
    if (!modal) return;
    const originalContent = modal.dataset.originalContent;

    if (!originalContent) {
        alert('No hay contenido para copiar.');
        return;
    }

    try {
        await navigator.clipboard.writeText(originalContent);
        const copyBtn = document.getElementById('copyGuideMarkdownBtn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '¡Copiado!';
        copyBtn.style.backgroundColor = '#28a745';
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.backgroundColor = '';
        }, 2000);
    } catch (error) {
        console.error('Error al copiar:', error);
        const textArea = document.createElement('textarea');
        textArea.value = originalContent;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Contenido copiado al portapapeles');
        } catch (fallbackError) {
            console.error('Error en fallback de copia:', fallbackError);
            alert('No se pudo copiar el contenido. Por favor, selecciona y copia manualmente.');
        }
        document.body.removeChild(textArea);
    }
}

// Navegación entre guías
function navigateGuide(offset) {
    const modal = document.getElementById('guideModal');
    if (!modal || modal.style.display === 'none') return;
    const idx = parseInt(modal.dataset.currentIndex || '-1', 10);
    if (isNaN(idx) || idx < 0) return;
    if (!Array.isArray(availablePrompts) || availablePrompts.length === 0) return;
    let newIdx = idx + offset;
    if (newIdx < 0) newIdx = availablePrompts.length - 1;
    if (newIdx >= availablePrompts.length) newIdx = 0;
    const item = availablePrompts[newIdx];
    openGuide(item.file, item.title);
}

// ===== FUNCIONALIDAD DE APRENDIZAJE =====

// Cargar la galería de aprendizaje
function loadLearningGallery() {
    const gallery = document.getElementById('learningGallery');
    if (!gallery) return;
    gallery.innerHTML = '';

    availablePrompts.forEach(item => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.innerHTML = `
            <div class="prompt-card-header">
                <h3>${item.title}</h3>
            </div>
            <div class="prompt-card-body">
                <p>${item.description}</p>
                <button class="btn btn-primary" onclick="openLearning('${item.file}', '${item.title}')">
                    🎓 Ver Aprendizaje
                </button>
            </div>
        `;
        gallery.appendChild(card);
    });
}

// Abrir un archivo de aprendizaje específico
async function openLearning(filename, title) {
    try {
        console.log('[openLearning] Cargando:', `learning/${filename}`);
        const response = await fetch(`learning/${filename}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Error al cargar aprendizaje: ${response.status}`);
        }

        const markdownContent = await response.text();

        // Mostrar el modal de aprendizaje
        const modal = document.getElementById('learningModal');
        const modalTitle = document.getElementById('learningModalTitle');
        const modalContent = document.getElementById('learningMarkdownContent');
        // Asegurar que otros modales estén cerrados
        const promptModal = document.getElementById('promptModal');
        const guideModal = document.getElementById('guideModal');
        const docModal = document.getElementById('docModal');
        if (promptModal) promptModal.style.display = 'none';
        if (guideModal) guideModal.style.display = 'none';
        if (docModal) docModal.style.display = 'none';

        modalTitle.textContent = title;

        if (typeof marked !== 'undefined') {
            modalContent.innerHTML = marked.parse(markdownContent);
        } else {
            modalContent.innerHTML = `<pre>${markdownContent}</pre>`;
        }

        // Guardar el contenido original para copiar
        modal.dataset.originalContent = markdownContent;
        // Guardar índice actual para navegación
        const currentIndex = availablePrompts.findIndex(p => p.file === filename);
        modal.dataset.currentIndex = String(currentIndex);

        modal.style.display = 'block';
        modal.dataset.source = 'learning';

    } catch (error) {
        console.error('Error al cargar aprendizaje:', error);
        alert('Error al cargar el contenido de aprendizaje. Intenta de nuevo.');
    }
}

// Cerrar modal de aprendizaje
function closeLearningModal() {
    const modal = document.getElementById('learningModal');
    if (modal) modal.style.display = 'none';
}

// Copiar contenido Markdown del aprendizaje
async function copyLearningMarkdownContent() {
    const modal = document.getElementById('learningModal');
    if (!modal) return;
    const originalContent = modal.dataset.originalContent;

    if (!originalContent) {
        alert('No hay contenido para copiar.');
        return;
    }

    try {
        await navigator.clipboard.writeText(originalContent);
        const copyBtn = document.getElementById('copyLearningMarkdownBtn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '¡Copiado!';
        copyBtn.style.backgroundColor = '#28a745';
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.backgroundColor = '';
        }, 2000);
    } catch (error) {
        console.error('Error al copiar:', error);
        const textArea = document.createElement('textarea');
        textArea.value = originalContent;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Contenido copiado al portapapeles');
        } catch (fallbackError) {
            console.error('Error en fallback de copia:', fallbackError);
            alert('No se pudo copiar el contenido. Por favor, selecciona y copia manualmente.');
        }
        document.body.removeChild(textArea);
    }
}

// Navegación entre archivos de aprendizaje
function navigateLearning(offset) {
    const modal = document.getElementById('learningModal');
    if (!modal || modal.style.display === 'none') return;
    const idx = parseInt(modal.dataset.currentIndex || '-1', 10);
    if (isNaN(idx) || idx < 0) return;
    if (!Array.isArray(availablePrompts) || availablePrompts.length === 0) return;
    let newIdx = idx + offset;
    if (newIdx < 0) newIdx = availablePrompts.length - 1;
    if (newIdx >= availablePrompts.length) newIdx = 0;
    const item = availablePrompts[newIdx];
    openLearning(item.file, item.title);
}