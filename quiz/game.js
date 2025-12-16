document.addEventListener('DOMContentLoaded', () => {

    const board = document.getElementById('jeopardy-board');
    const modal = document.getElementById('question-modal');
    
    const questionText = document.getElementById('question-text');
    const questionImage = document.getElementById('question-image'); // NEU: Bild-Element
    const answerText = document.getElementById('answer-text'); 
    
    // answer reveal
    const toggleHintBtn = document.getElementById('toggle-hint-btn');
    const moderatorAnswerText = document.getElementById('moderator-answer-text');

    // buttons
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const awardPointsBtn = document.getElementById('award-points-btn');
    const closeNoPointsBtn = document.getElementById('close-no-points-btn');
    const doubleChanceBtn = document.getElementById('double-chance-btn');
    const cancelModalX = document.getElementById('cancel-modal-x');

    // timer
    const timerText = document.getElementById('timer-text');
    const progressRing = document.getElementById('timer-progress-ring');
    const startTimerBtn = document.getElementById('start-timer-btn');
    const stopTimerBtn = document.getElementById('stop-timer-btn');

    // msg and score
    const messageModal = document.getElementById('message-modal');
    const messageTitle = document.getElementById('message-title');
    const messageText = document.getElementById('message-text');
    const messageOkBtn = document.getElementById('message-ok-btn');
    const scoresContainer = document.getElementById('team-scores');
    
    // sfx
    const timerSound = new Audio('sound.mp3');

    // game data/status
    let gameData = [];
    let currentCell = null;
    let currentQuestionPoints = 0;
    let isDoubleChanceActive = false; 
    let teams = [];
    let activeTeamIndex = 0;
    let attemptsCount = 0; 

    // timer status
    let timerInterval = null;
    const TOTAL_TIME = 30; 
    let timeLeft = TOTAL_TIME;

    // functions

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function showCustomMessage(title, text, callback) {
        messageTitle.textContent = title;
        messageText.textContent = text;
        messageModal.style.display = 'block';
        messageOkBtn.onclick = () => {
            messageModal.style.display = 'none';
            if (callback) callback();
        };
    }

    function setupTeams() {
        const numTeamsInput = prompt("Wie viele Teams spielen?", "2");
        let numTeams = parseInt(numTeamsInput);
        if (isNaN(numTeams) || numTeams < 1) numTeams = 2;

        for (let i = 0; i < numTeams; i++) {
            const teamName = prompt(`Name für Team ${i + 1}`, `Team ${i + 1}`);
            teams.push({ name: teamName || `Team ${i+1}`, score: 0 });
        }
        
        shuffleArray(teams);

        let orderString = "Die Reihenfolge wurde ausgelost:\n\n";
        teams.forEach((t, i) => {
            orderString += `${i + 1}. ${t.name}\n`;
        });
        alert(orderString); 

        renderScores();
    }

    function renderScores() {
        scoresContainer.innerHTML = '';
        teams.forEach((team, index) => {
            const teamBox = document.createElement('div');
            teamBox.classList.add('team-score-box');
            teamBox.innerHTML = `<span class="team-name">${team.name}</span><span class="team-score">${team.score}</span>`;
            if (index === activeTeamIndex) teamBox.classList.add('active');
            teamBox.addEventListener('click', () => {
                activeTeamIndex = index;
                renderScores();
                resetTimer(); 
            });
            scoresContainer.appendChild(teamBox);
        });
    }

    function buildBoard(data) {
        if (!data || data.length === 0) return;
        const numCategories = data.length;
        const numPoints = data[0].fragen.length; 
        board.style.gridTemplateColumns = `repeat(${numCategories}, 1fr)`;

        data.forEach((category, index) => {
            const headerCell = document.createElement('div');
            headerCell.classList.add('category-header');
            headerCell.textContent = category.kategorie;
            headerCell.style.animationDelay = `${index * 0.1}s`; 
            board.appendChild(headerCell);
        });

        for (let i = 0; i < numPoints; i++) {
            for (let j = 0; j < numCategories; j++) {
                const frage = data[j].fragen[i];
                const cell = document.createElement('div');
                cell.classList.add('question-cell');
                cell.textContent = frage.punkte;
                cell.dataset.frage = frage.frage;
                cell.dataset.antwort = frage.antwort;
                cell.dataset.punkte = frage.punkte;
                
                // save image path
                if (frage.bild) {
                    cell.dataset.bild = frage.bild;
                }

                const delay = (i * 0.05) + (j * 0.1);
                cell.style.animationDelay = `${delay}s`;
                cell.addEventListener('click', () => showQuestion(cell));
                board.appendChild(cell);
            }
        }
    }

    // timer
    function updateTimerUI() {
        timerText.textContent = timeLeft;
        const timePassed = TOTAL_TIME - timeLeft;
        const offset = timePassed / TOTAL_TIME;
        progressRing.style.strokeDashoffset = offset;

        progressRing.classList.remove('warning', 'expired');
        if (timeLeft === 0) {
            progressRing.classList.add('expired');
        } else if (timeLeft <= 10) {
            progressRing.classList.add('warning');
        }
    }

    function resetTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        timeLeft = TOTAL_TIME;
        timerSound.pause();
        timerSound.currentTime = 0;
        updateTimerUI(); 
        startTimerBtn.disabled = false;
        startTimerBtn.style.display = 'inline-block';
        document.querySelector('.timer-container').style.opacity = '1'; 
    }

    function showQuestion(cell) {
        if (cell.classList.contains('answered')) return;

        currentCell = cell;
        currentQuestionPoints = parseInt(cell.dataset.punkte); 
        
        isDoubleChanceActive = false; 
        attemptsCount = 0; 
        
        resetTimer();

        
        questionText.textContent = cell.dataset.frage;
        
        // check image existence
        if (cell.dataset.bild) {
            questionImage.src = cell.dataset.bild; // insert image path
            questionImage.style.display = 'block'; // display image
        } else {
            questionImage.style.display = 'none'; // hide image
            questionImage.src = "";
        }

        // answer
        moderatorAnswerText.textContent = cell.dataset.antwort; 
        moderatorAnswerText.style.display = 'none'; 

        answerText.textContent = cell.dataset.antwort; 
        answerText.style.display = 'none';
        
        showAnswerBtn.style.display = 'inline-block'; 
        doubleChanceBtn.style.display = 'inline-block';
        doubleChanceBtn.disabled = false;
        stopTimerBtn.style.display = 'inline-block'; 
        
        modal.style.display = 'block';
    }

    function nextTeam() {
        activeTeamIndex = (activeTeamIndex + 1) % teams.length;
        renderScores();
        resetTimer();
    }

    function finishAndCloseModal() {
        modal.style.display = 'none';
        clearInterval(timerInterval);
        if (currentCell) {
            currentCell.classList.add('answered');
            currentCell.textContent = ""; 
        }
    }

    // --- BUTTONS ---
    toggleHintBtn.addEventListener('click', () => {
        if (moderatorAnswerText.style.display === 'none') {
            moderatorAnswerText.style.display = 'inline-block';
        } else {
            moderatorAnswerText.style.display = 'none';
        }
    });

    startTimerBtn.addEventListener('click', () => {
        if (timerInterval) return;
        startTimerBtn.disabled = true; 
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerUI();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerSound.play().catch(e => console.log("Audio Error:", e));
            }
        }, 1000);
    });

    stopTimerBtn.addEventListener('click', () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            startTimerBtn.disabled = false; 
            timerSound.pause(); 
        }
    });

    cancelModalX.addEventListener('click', () => {
        modal.style.display = 'none';
        clearInterval(timerInterval);
        timerSound.pause();
        timerSound.currentTime = 0;
    });

    doubleChanceBtn.addEventListener('click', () => {
        isDoubleChanceActive = true;
        doubleChanceBtn.disabled = true; 
    });

    showAnswerBtn.addEventListener('click', () => {
        answerText.style.display = 'block';
        showAnswerBtn.style.display = 'none';
        doubleChanceBtn.style.display = 'none'; 
        startTimerBtn.style.display = 'none';
        stopTimerBtn.style.display = 'none';
        document.querySelector('.timer-container').style.opacity = '0.3'; 
        clearInterval(timerInterval);
        timerSound.pause();
    });

    awardPointsBtn.addEventListener('click', () => {
        if (isDoubleChanceActive) {
            teams[activeTeamIndex].score += currentQuestionPoints * 2;
        } else {
            teams[activeTeamIndex].score += currentQuestionPoints;
        }
        renderScores();
        answerText.style.display = 'block';
        showAnswerBtn.style.display = 'none';
        doubleChanceBtn.style.display = 'none';
        clearInterval(timerInterval);
        timerSound.pause();

        showCustomMessage("Richtig!", `Team ${teams[activeTeamIndex].name} bekommt die Punkte.`, () => {
             nextTeam(); 
             finishAndCloseModal(); 
        });
    });

    closeNoPointsBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        timerSound.pause();

        if (isDoubleChanceActive) {
            teams[activeTeamIndex].score -= currentQuestionPoints;
            isDoubleChanceActive = false; 
        }
        renderScores();
        attemptsCount++;

        if (attemptsCount >= teams.length) {
            showCustomMessage("Schade!", "Keiner wusste es. Die Antwort wird aufgedeckt.", () => {
                answerText.style.display = 'block'; 
                setTimeout(() => {
                    nextTeam();
                    finishAndCloseModal(); 
                }, 3000); 
            });
        } else {
            nextTeam(); 
            showCustomMessage("Falsch!", `Das war leider nicht richtig. \n\n JETZT IST DRAN: \n ${teams[activeTeamIndex].name}`, () => {
                doubleChanceBtn.style.display = 'none';
            });
        }
    });

    setupTeams();
    fetch('fragen.txt')
        .then(r => r.ok ? r.json() : Promise.reject(r))
        .then(d => { gameData = d; buildBoard(d); })
        .catch(e => console.error(e));
});