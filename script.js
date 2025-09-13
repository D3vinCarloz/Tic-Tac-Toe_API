document.addEventListener('DOMContentLoaded', () => {
    // --- API Keys & Global State ---
    const WEATHER_API_KEY = '090b3e73ac9c2715424ac7569f0d8efb';
    let localTimeInterval;
    let weatherIsSet = false;

    // --- DOM Elements ---
    const weatherInfoPanel = document.getElementById('weather-info');
    const effectsContainer = document.getElementById('weather-effects-container') || document.body;
    const statusText = document.getElementById('status-text');
    const cells = document.querySelectorAll('.cell');
    const mainWrapper = document.getElementById('main-wrapper');
    const strikeLine = document.getElementById('strike-line');
    const liveQaHistory = document.getElementById('live-qa-history');
    const customAlertModal = document.getElementById('custom-alert-modal');
    const alertOkBtn = document.getElementById('alert-ok-btn');
    const rulesModal = document.getElementById('rules-modal');
    const setupModal = document.getElementById('setup-modal');
    const topicModal = document.getElementById('topic-modal');
    const questionModal = document.getElementById('question-modal');
    const winnerModal = document.getElementById('winner-modal');
    const rulesOkBtn = document.getElementById('rules-ok-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const nameError = document.getElementById('name-error');
    const topicBtns = document.querySelectorAll('.topic-btn');
    const useLocationBtn = document.getElementById('use-location-btn');
    const citySelect = document.getElementById('city-select');
    const restartBtn = document.getElementById('restart-btn');
    const playAgainBtn = document.getElementById('play-again-btn');

    // --- [NEW] FALLBACK QUESTIONS ---
    const fallbackQuestions = {
        '21': [ // Sports
            { question: "Which country won the first-ever FIFA World Cup in 1930?", answers: ["Uruguay", "Brazil", "Argentina", "Italy"], correctAnswer: "Uruguay" },
            { question: "In which sport would you perform a slam dunk?", answers: ["Basketball", "Volleyball", "Tennis", "American Football"], correctAnswer: "Basketball" },
            { question: "How many rings are there on the Olympic flag?", answers: ["5", "7", "4", "6"], correctAnswer: "5" },
        ],
        '11': [ // Movies
            { question: "Who directed the movie 'Jurassic Park'?", answers: ["Steven Spielberg", "George Lucas", "James Cameron", "Christopher Nolan"], correctAnswer: "Steven Spielberg" },
            { question: "What is the name of the hobbit played by Elijah Wood in the Lord of the Rings movies?", answers: ["Frodo Baggins", "Samwise Gamgee", "Bilbo Baggins", "Pippin Took"], correctAnswer: "Frodo Baggins" },
            { question: "Which movie features the quote, 'May the Force be with you'?", answers: ["Star Wars", "Star Trek", "Blade Runner", "The Matrix"], correctAnswer: "Star Wars" },
        ],
        '12': [ // Music
            { question: "Who is known as the 'King of Pop'?", answers: ["Michael Jackson", "Elvis Presley", "Freddie Mercury", "Stevie Wonder"], correctAnswer: "Michael Jackson" },
            { question: "Which band released the hit song 'Bohemian Rhapsody'?", answers: ["Queen", "The Beatles", "Led Zeppelin", "Pink Floyd"], correctAnswer: "Queen" },
            { question: "How many strings does a standard guitar have?", answers: ["6", "4", "7", "12"], correctAnswer: "6" },
        ],
        '9': [ // General Knowledge
            { question: "What is the capital of Japan?", answers: ["Tokyo", "Kyoto", "Osaka", "Hiroshima"], correctAnswer: "Tokyo" },
            { question: "Which is the largest planet in our solar system?", answers: ["Jupiter", "Saturn", "Neptune", "Earth"], correctAnswer: "Jupiter" },
            { question: "Who wrote the play 'Romeo and Juliet'?", answers: ["William Shakespeare", "Charles Dickens", "George Orwell", "Jane Austen"], correctAnswer: "William Shakespeare" },
        ]
    };

    const loadFallbackQuestions = (category) => {
        console.warn("API fetch failed. Loading local fallback questions.");
        const questions = fallbackQuestions[category] || fallbackQuestions['9']; // Default to GK if category not found
        // Shuffle the array to make it less repetitive
        localQuestions = [...questions].sort(() => Math.random() - 0.5);
    };

    // --- Dynamic Weather Effect Generators ---
    const createEffect = (type, count) => {
        effectsContainer.innerHTML = '';
        const effectConfig = {
            rain: { className: 'drop', creator: () => { const el = document.createElement("div"); el.style.height = `${20 + Math.random() * 30}px`; el.style.animationDuration = `${0.5 + Math.random() * 0.8}s`; return el; } },
            snow: { className: 'snowflake', creator: () => { const el = document.createElement("div"); const size = 3 + Math.random() * 6; el.style.width = el.style.height = `${size}px`; el.style.animationDuration = `${5 + Math.random() * 5}s`; return el; } },
            fog: { className: 'fog-element', creator: () => { const el = document.createElement("div"); el.style.top = `${Math.random() * 80}vh`; el.style.transform = `scale(${1 + Math.random() * 1.5})`; return el; } }
        };
        if (!effectConfig[type]) return;
        for (let i = 0; i < count; i++) {
            const el = effectConfig[type].creator();
            el.className = effectConfig[type].className;
            el.style.left = `${Math.random() * 100}vw`;
            el.style.animationDelay = `${-Math.random() * 5}s`;
            effectsContainer.appendChild(el);
        }
    };

    // --- Weather & Background Setup ---
    const fetchWeatherAndSetBackground = async (locationQuery) => {
        if (!locationQuery) { showAlert("Please select a location option."); return; }
        weatherInfoPanel.classList.add('placeholder');
        document.getElementById('weather-location').textContent = 'Fetching weather...';
        document.getElementById('weather-details').innerHTML = '';
        document.getElementById('weather-time').textContent = '';
        document.getElementById('weather-icon').src = '';
        try {
            let endpoint;
            if (locationQuery === 'auto:ip') {
                const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
                endpoint = `https://api.openweathermap.org/data/2.5/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}&appid=${WEATHER_API_KEY}&units=metric`;
            } else {
                endpoint = `https://api.openweathermap.org/data/2.5/weather?q=${locationQuery}&appid=${WEATHER_API_KEY}&units=metric`;
            }
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Weather data not available for this location.');
            const data = await response.json();
            setBackgroundAndDetails(data);
        } catch (error) {
            console.error("Weather fetch error:", error);
            document.getElementById('weather-location').textContent = 'Failed to load weather';
            weatherInfoPanel.classList.remove('placeholder');
            showAlert(locationQuery === 'auto:ip' ? 'Could not get local weather. This requires HTTPS and location permission.' : `Could not find weather for "${locationQuery}".`);
        }
    };

    const setBackgroundAndDetails = (data) => {
        const allWeatherClasses = document.body.className.split(' ').filter(c => c.startsWith('weather-') || c === 'is-night');
        document.body.classList.remove(...allWeatherClasses);
        effectsContainer.innerHTML = '';
        const currentTimeUTC = data.dt;
        const isNight = (currentTimeUTC < data.sys.sunrise || currentTimeUTC > data.sys.sunset);
        if (isNight) document.body.classList.add('is-night');
        const condition = data.weather[0].main.toLowerCase();
        let weatherClass = 'default';
        switch (condition) {
            case 'thunderstorm': case 'drizzle': case 'rain': weatherClass = 'rainy'; createEffect('rain', 150); break;
            case 'snow': weatherClass = 'snowy'; createEffect('snow', 80); break;
            case 'clear': weatherClass = 'clear'; break;
            case 'clouds': weatherClass = 'clouds'; break;
            case 'mist': case 'smoke': case 'haze': case 'dust': case 'fog': case 'sand': case 'ash': case 'squall': case 'tornado': weatherClass = 'fog'; createEffect('fog', 10); break;
        }
        const bgColors = {
            rainy: { day: '#3e4a56', night: '#1f252a' }, snowy: { day: '#a2b2c2', night: '#3f4c5a' },
            clear: { day: '#87CEEB', night: '#0d1115' }, clouds: { day: '#7d97ad', night: '#414a52' },
            fog: { day: '#999', night: '#555' }, default: { day: '#1b2735', night: '#1b2735' }
        };
        document.body.style.backgroundColor = bgColors[weatherClass][isNight ? 'night' : 'day'];
        if (weatherClass !== 'default') document.body.classList.add(`weather-${weatherClass}`);
        weatherInfoPanel.classList.remove('placeholder');
        document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        document.getElementById('weather-icon').alt = data.weather[0].description;
        document.getElementById('weather-location').textContent = `${data.name}, ${data.sys.country}`;
        const formatTime = (timestamp) => new Date((timestamp + data.timezone) * 1000).toUTCString().slice(-12, -7);
        document.getElementById('weather-details').innerHTML = `<strong>${Math.round(data.main.temp)}°C</strong> | ${data.weather[0].description}<br>Humidity: ${data.main.humidity}% | Wind: ${data.wind.speed} m/s<br>Sunrise: ${formatTime(data.sys.sunrise)} | Sunset: ${formatTime(data.sys.sunset)}`;
        clearInterval(localTimeInterval);
        localTimeInterval = setInterval(() => {
            const localTime = new Date(new Date().getTime() + data.timezone * 1000).toUTCString().slice(-12, -4);
            document.getElementById('weather-time').textContent = `${localTime}`;
        }, 1000);
        weatherIsSet = true;
    };

    // --- Game State & Logic ---
    let options = ["", "", "", "", "", "", "", "", ""];
    let currentPlayer = "X";
    let gameActive = false;
    let localQuestions = [];
    let currentCategory = '';
    let selectedCellIndex = null;
    let playerNames = { X: "Player 1", O: "Player 2" };
    let roundHistory = [];
    const winConditions = [ [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6] ];

    const initializeGame = async () => {
        cells.forEach(cell => { cell.textContent = ""; cell.className = 'cell'; });
        strikeLine.className = '';
        strikeLine.style.width = '0';
        options.fill("");
        currentPlayer = "X";
        roundHistory = [];
        liveQaHistory.innerHTML = '';
        gameActive = false;
        statusText.textContent = "Loading questions...";
        const questionsReady = await fetchQuestions();
        if (questionsReady) {
            gameActive = true;
            updateStatusText();
        } else {
            // This case should be rare now with the fallback
            gameActive = false;
            statusText.textContent = "Error loading game.";
            showAlert("Could not load any questions. Please check your connection and restart.");
        }
    };

    // **MODIFIED FETCH LOGIC WITH FALLBACK**
    const fetchQuestions = async () => {
        try {
            const response = await fetch(`https://opentdb.com/api.php?amount=10&category=${currentCategory}&type=multiple`);
            if (!response.ok) throw new Error('Network response was not ok.');
            const data = await response.json();
            if (data.response_code !== 0) throw new Error('API returned an error code.');
            localQuestions = data.results.map(q => ({
                question: q.question,
                answers: [...q.incorrect_answers, q.correct_answer],
                correctAnswer: q.correct_answer
            }));
            return true;
        } catch (error) {
            // If the API fails, load the local questions instead!
            loadFallbackQuestions(currentCategory);
            return true; // Return true because the fallback questions were loaded successfully
        }
    };
    
    // --- Event Listeners & Setup ---
    const populateCities = () => { ['New York', 'London', 'Tokyo', 'Paris', 'Sydney', 'Dubai', 'Moscow', 'Beijing', 'Los Angeles', 'Cairo'].forEach(city => { const option = document.createElement('option'); option.value = city; option.textContent = city; citySelect.appendChild(option); }); };
    populateCities();
    useLocationBtn.addEventListener('click', () => fetchWeatherAndSetBackground('auto:ip'));
    citySelect.addEventListener('change', (e) => fetchWeatherAndSetBackground(e.target.value));
    alertOkBtn.addEventListener('click', () => customAlertModal.classList.remove('show'));
    rulesOkBtn.addEventListener('click', () => { rulesModal.classList.remove('show'); setupModal.classList.add('show'); });
    startGameBtn.addEventListener('click', handleStartGame);
    topicBtns.forEach(button => button.addEventListener('click', handleTopicSelection));
    cells.forEach(cell => cell.addEventListener('click', cellClicked));
    restartBtn.addEventListener('click', () => location.reload());
    playAgainBtn.addEventListener('click', () => location.reload());

    function handleStartGame() {
        if (!weatherIsSet) { nameError.textContent = "Please select a weather location first."; return; }
        const p1Name = document.getElementById('player1-name').value.trim();
        const p2Name = document.getElementById('player2-name').value.trim();
        if (!p1Name || !p2Name) { nameError.textContent = "Please enter a name for both players."; return; }
        nameError.textContent = "";
        playerNames.X = p1Name; playerNames.O = p2Name;
        setupModal.classList.remove('show');
        topicModal.classList.add('show');
    }

    function handleTopicSelection() {
        currentCategory = this.getAttribute('data-category');
        topicModal.classList.remove('show');
        mainWrapper.classList.remove('hidden');
        initializeGame();
    }

    async function cellClicked() {
        const cellIndex = this.getAttribute('data-cell-index');
        if (options[cellIndex] !== "" || !gameActive) return;
        selectedCellIndex = cellIndex;
        const question = await getQuestion();
        if (question) {
            displayQuestion(question);
        } else {
            showAlert("Error fetching a new question. Please check your connection or restart the game.");
        }
    }

    const getQuestion = async () => {
        if (localQuestions.length === 0) {
            statusText.textContent = "Fetching new questions...";
            const success = await fetchQuestions();
            updateStatusText();
            if (!success) return undefined;
        }
        return localQuestions.pop();
    };
    
    const handleAnswer = (selectedAnswer, questionData) => {
        questionModal.classList.remove('show');
        roundHistory.push({ question: questionData.question, chosenAnswer: selectedAnswer, correctAnswer: questionData.correctAnswer, player: playerNames[currentPlayer] });
        updateLiveHistory();
        if (selectedAnswer === questionData.correctAnswer) {
            updateCell(cells[selectedCellIndex], selectedCellIndex);
            checkResult();
        } else {
            showAlert("Wrong answer! Your turn is skipped.");
            changePlayer();
        }
    };
    
    const checkResult = () => {
        let roundWon = false; let winIndex = -1;
        for (let i = 0; i < winConditions.length; i++) {
            const [a, b, c] = winConditions[i];
            if (options[a] && options[a] === options[b] && options[a] === options[c]) { roundWon = true; winIndex = i; break; }
        }
        if (roundWon) {
            statusText.textContent = `${playerNames[currentPlayer]} wins!`;
            gameActive = false; drawStrikeLine(winIndex);
            setTimeout(showWinnerScreen, 1200);
        } else if (!options.includes("")) {
            statusText.textContent = `It's a Draw!`;
            gameActive = false; setTimeout(() => showWinnerScreen(true), 500);
        } else {
            changePlayer();
        }
    };
    
    const showAlert = (message) => { document.getElementById('alert-message').textContent = message; customAlertModal.classList.add('show'); };
    const updateStatusText = () => { statusText.innerHTML = `${playerNames[currentPlayer]}'s turn <span class="player-symbol ${currentPlayer.toLowerCase()}">${currentPlayer}</span>`; };
    
    const displayQuestion = (questionData) => {
        const questionText = document.getElementById('question-text');
        const answerButtons = document.getElementById('answer-buttons');
        questionText.innerHTML = questionData.question;
        answerButtons.innerHTML = "";
        questionData.answers.sort(() => Math.random() - 0.5).forEach(answer => {
            const button = document.createElement('button');
            button.innerHTML = answer;
            button.addEventListener('click', () => handleAnswer(answer, questionData));
            answerButtons.appendChild(button);
        });
        questionModal.classList.add('show');
    };
    
    const updateLiveHistory = () => {
        const lastItem = roundHistory.slice(-1)[0];
        if (!lastItem) return;
        const result = lastItem.chosenAnswer === lastItem.correctAnswer ? 'Correct' : 'Incorrect';
        const qaItem = document.createElement('div');
        qaItem.className = 'qa-item';
        qaItem.innerHTML = `<p><strong>Player:</strong> ${lastItem.player}</p><p><strong>Q:</strong> ${lastItem.question}</p><p><strong>A:</strong> ${lastItem.chosenAnswer} <span class="qa-result ${result.toLowerCase()}">(${result})</span></p>`;
        liveQaHistory.appendChild(qaItem);
        liveQaHistory.scrollTop = liveQaHistory.scrollHeight;
    };
    
    const updateCell = (cell, index) => { options[index] = currentPlayer; cell.textContent = currentPlayer; cell.classList.add(currentPlayer.toLowerCase()); };
    const changePlayer = () => { currentPlayer = (currentPlayer === "X") ? "O" : "X"; updateStatusText(); };
    
    const showWinnerScreen = (isDraw = false) => {
        document.getElementById('winner-text').textContent = isDraw ? "It's a Draw!" : `${playerNames[currentPlayer]} is the Champion!`;
        document.getElementById('qa-history').innerHTML = liveQaHistory.innerHTML;
        winnerModal.classList.add('show');
    };

    const drawStrikeLine = (winIndex) => {
        const strikeClasses = ['strike-row-1', 'strike-row-2', 'strike-row-3', 'strike-col-1', 'strike-col-2', 'strike-col-3', 'strike-diag-1', 'strike-diag-2'];
        strikeLine.className = strikeClasses[winIndex];
        const isDiagonal = strikeLine.className.includes('diag');
        setTimeout(() => { strikeLine.style.width = isDiagonal ? '390px' : '300px'; }, 50);
    };
});