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
let availableGuides = []; // Lista de cursos, cargada desde guides/cursos.json

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

// Función para seleccionar preguntas aleatorias
function selectRandomQuestions() {
    // Determinar el conjunto de preguntas según tecnologías seleccionadas
    const pool = (selectedTechnologies && selectedTechnologies.length > 0)
        ? allQuestions.filter(q => selectedTechnologies.includes(q.tecnologia))
        : allQuestions;

    // Si el filtro no devuelve resultados, usar todas las preguntas como fallback
    const base = pool.length > 0 ? pool : allQuestions;

    // Mezclar aleatoriamente
    const shuffled = [...base].sort(() => Math.random() - 0.5);

    // Seleccionar el número especificado de preguntas
    selectedQuestions = shuffled.slice(0, selectedQuestionCount);

    // Inicializar array de respuestas del usuario
    userAnswers = new Array(selectedQuestionCount).fill(null);

    console.log('Preguntas seleccionadas:', selectedQuestions);
    generateQuizHTML();
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
        if (index === 0) questionDiv.classList.add('active');

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
        

 
        container.appendChild(fragment);
    });

    updateProgress();
    updateNavigation();
}

// Función para seleccionar una opción
function selectOption(questionIndex, optionIndex, toggle = false) {
    const question = selectedQuestions[questionIndex];
    const isMultipleChoice = question.respuestas_correctas.length > 1;

    // Inicializar array de respuestas si no existe
    if (!userAnswers[questionIndex]) {
        userAnswers[questionIndex] = [];
    }

    const checkbox = document.getElementById(`q${questionIndex}_o${optionIndex}`);

    if (!isMultipleChoice) {
        // Para preguntas de una sola respuesta: marcar solo la elegida
        const allCheckboxes = document.querySelectorAll(`input[name="question-${questionIndex}"]`);
        allCheckboxes.forEach(cb => { cb.checked = false; });
        checkbox.checked = true;
        userAnswers[questionIndex] = [optionIndex];
    } else {
        // Para opción múltiple: permitir seleccionar cualquier cantidad de opciones
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
    }

    // Actualizar estilos visuales
    updateOptionStyles(questionIndex);
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
    
    // Verificar si el usuario ha seleccionado al menos una opción
    if (!userAnswers[questionIndex] || userAnswers[questionIndex].length === 0) {
        alert('Por favor, selecciona al menos una opción antes de validar.');
        return;
    }
    
    const userAnswer = userAnswers[questionIndex];
    const correctAnswers = question.respuestas_correctas;
    
    // Agregar feedback visual en modo guiado
    const questionDiv = document.getElementById(`question-${questionIndex}`);
    const options = questionDiv.querySelectorAll('.option');
    
    options.forEach((option, index) => {
        // Remover clases previas de feedback
        option.classList.remove('correct', 'incorrect');
        
        const isCorrectAnswer = correctAnswers.includes(index);
        const isUserSelected = userAnswer.includes(index);
        
        if (isCorrectAnswer) {
            // Marcar respuestas correctas en verde
            option.classList.add('correct');
        } else if (isUserSelected) {
            // Marcar respuestas incorrectas seleccionadas por el usuario en rojo
            option.classList.add('incorrect');
        }
    });
    
    // Mostrar la explicación
    if (question.explicacion) {
        explanationText.innerHTML = question.explicacion;
    } else {
        // Si no hay explicación, mostrar las respuestas correctas
        const correctAnswers = question.respuestas_correctas.map(index => question.opciones[index]);
        explanationText.innerHTML = `Las respuestas correctas son: <strong>${correctAnswers.join(', ')}</strong>`;
    }
    
    explanationSection.style.display = 'block';
    explanationSection.classList.add('slideDown');
    
    // Deshabilitar el botón después de validar
    validateBtn.disabled = true;
    validateBtn.innerHTML = '✅ Validado';
    validateBtn.style.opacity = '0.6';
}

function showExplanation(questionIndex) {
    const question = selectedQuestions[questionIndex];
    const explanationSection = document.getElementById(`explanation-${questionIndex}`);
    const explanationText = document.getElementById(`explanation-text-${questionIndex}`);
    
    if (question.explicacion) {
        explanationText.innerHTML = question.explicacion;
        explanationSection.style.display = 'block';
        explanationSection.classList.add('slideDown');
    } else {
        // Si no hay explicación, mostrar las respuestas correctas
        const correctAnswers = question.respuestas_correctas.map(index => question.opciones[index]);
        explanationText.innerHTML = `Las respuestas correctas son: <strong>${correctAnswers.join(', ')}</strong>`;
        explanationSection.style.display = 'block';
        explanationSection.classList.add('slideDown');
    }
}

// Función para ir a la siguiente pregunta
function nextQuestion() {
    if (currentQuestionIndex < selectedQuestions.length - 1) {
        document.getElementById(`question-${currentQuestionIndex}`).classList.remove('active');
        currentQuestionIndex++;
        document.getElementById(`question-${currentQuestionIndex}`).classList.add('active');
        updateProgress();
        updateNavigation();
    } else {
        finishQuiz();
    }
}

// Función para ir a la pregunta anterior
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        document.getElementById(`question-${currentQuestionIndex}`).classList.remove('active');
        currentQuestionIndex--;
        document.getElementById(`question-${currentQuestionIndex}`).classList.add('active');
        updateProgress();
        updateNavigation();
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
        if (isInSummaryMode) {
            nextBtn.textContent = 'Volver al Resumen';
            nextBtn.onclick = showSummary;
        } else {
            nextBtn.textContent = 'Finalizar';
            nextBtn.onclick = finishQuiz;
        }
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
}

// Función para volver al cuestionario desde el resumen
function backToQuiz() {
    isInSummaryMode = false;
    document.getElementById('summaryScreen').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';
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
    // Cargar lista de cursos para el multi-select y la galería de guías
    loadCoursesList();
    initTechnologySelectHandler();
});

// ===== SELECCIÓN DE TECNOLOGÍAS =====
// Cargar cursos desde JSON y poblar el selector
async function loadCoursesList() {
    try {
        const response = await fetch('guides/cursos.json');
        if (!response.ok) throw new Error('No se pudo cargar guides/cursos.json');
        const data = await response.json();
        availableGuides = Array.isArray(data.cursos) ? data.cursos : [];
        populateTechnologySelect();
    } catch (error) {
        console.warn('No se pudo cargar la lista de cursos:', error);
    }
}

function populateTechnologySelect() {
    const dropdown = document.getElementById('techDropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';

    const sorted = [...availableGuides].sort((a, b) => a.title.localeCompare(b.title));
    sorted.forEach(item => {
        const el = document.createElement('div');
        el.className = 'multi-select-item';
        el.setAttribute('role', 'option');
        el.dataset.value = item.title;
        el.innerHTML = `<label><input type="checkbox" class="multi-check" value="${item.title}"><span>${item.title}</span></label>`;
        el.addEventListener('click', (e) => {
            const cb = el.querySelector('input.multi-check');
            if (e.target !== cb) cb.checked = !cb.checked;
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

// ===== FUNCIONALIDAD DE GUÍAS =====

// Función para mostrar la página de guías
function showGuidesPage() {
    // Ocultar todas las pantallas
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('summaryScreen').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    
    // Mostrar página de guías
    document.getElementById('guidesPage').style.display = 'block';
    
    // Cargar las guías en la galería
    loadGuidesGallery();
}

// Función para volver al cuestionario
function backToQuiz() {
    document.getElementById('guidesPage').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
}

// Función para cargar la galería de guías
function loadGuidesGallery() {
    const gallery = document.getElementById('guidesGallery');
    gallery.innerHTML = '';
    
    availableGuides.forEach(guide => {
        const card = document.createElement('div');
        card.className = 'guide-card';
        card.innerHTML = `
            <div class="guide-card-header">
                <h3>${guide.title}</h3>
            </div>
            <div class="guide-card-body">
                <p>${guide.description}</p>
                <button class="btn btn-primary" onclick="openGuide('${guide.file}', '${guide.title}')">
                    📖 Ver Guía
                </button>
            </div>
        `;
        gallery.appendChild(card);
    });
}

// Función para abrir una guía específica
async function openGuide(filename, title) {
    try {
        const response = await fetch(`guides/${filename}`);
        if (!response.ok) {
            throw new Error(`Error al cargar la guía: ${response.status}`);
        }
        
        const markdownContent = await response.text();
        
        // Mostrar el modal
        const modal = document.getElementById('guideModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('markdownContent');
        
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
        
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('Error al cargar la guía:', error);
        alert('Error al cargar la guía. Por favor, intenta de nuevo.');
    }
}

// Función para cerrar el modal
function closeModal() {
    document.getElementById('guideModal').style.display = 'none';
}

// Función para copiar el contenido Markdown al portapapeles
async function copyMarkdownContent() {
    const modal = document.getElementById('guideModal');
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

// Cerrar modal al hacer clic fuera de él
window.onclick = function(event) {
    const modal = document.getElementById('guideModal');
    if (event.target === modal) {
        closeModal();
    }
}