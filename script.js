document.addEventListener('DOMContentLoaded', () => {
    // --- API Keys & Global State ---
    const WEATHER_API_KEY = '090b3e73ac9c2715424ac7569f0d8efb';
    let localTimeInterval;
    let weatherIsSet = false;

    // --- DOM Elements ---
    const weatherInfoPanel = document.getElementById('weather-info');
    const effectsContainer = document.getElementById('weather-effects-container');
    const statusText = document.getElementById('status-text');
    const cells = document.querySelectorAll('.cell');
    const mainWrapper = document.getElementById('main-wrapper');
    const strikeLine = document.getElementById('strike-line');
    // ... (rest of DOM elements are the same) ...
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


    // --- Dynamic Weather Effect Generators ---
    const createEffect = (type, count) => {
        effectsContainer.innerHTML = ''; // Clear previous effects
        let createFunction, resetFunction;

        const effectConfig = {
            rain: {
                className: 'drop',
                creator: () => {
                    const drop = document.createElement("div");
                    const height = 20 + Math.random() * 30;
                    const duration = 0.5 + Math.random() * 0.8;
                    drop.style.height = `${height}px`;
                    drop.style.animationDuration = `${duration}s`;
                    return drop;
                }
            },
            snow: {
                className: 'snowflake',
                creator: () => {
                    const flake = document.createElement("div");
                    const size = 3 + Math.random() * 6;
                    const duration = 5 + Math.random() * 5;
                    flake.style.width = flake.style.height = `${size}px`;
                    flake.style.animationDuration = `${duration}s`;
                    return flake;
                }
            },
            fog: {
                className: 'fog-element',
                creator: () => {
                    const fog = document.createElement("div");
                    const scale = 1 + Math.random() * 1.5;
                    fog.style.top = `${Math.random() * 80}vh`;
                    fog.style.transform = `scale(${scale})`;
                    return fog;
                }
            }
        };
        
        if (!effectConfig[type]) return;

        for (let i = 0; i < count; i++) {
            const el = effectConfig[type].creator();
            el.className = effectConfig[type].className;
            el.style.left = `${Math.random() * 100}vw`;
            el.style.animationDelay = `${-Math.random() * 5}s`; // Stagger all effects
            effectsContainer.appendChild(el);
        }
    };

    // --- Weather & Background Setup ---
    const fetchWeatherAndSetBackground = async (locationQuery) => {
        if (!locationQuery) {
            showAlert("Please select a location option.");
            return;
        }
        weatherInfoPanel.classList.add('placeholder');
        document.getElementById('weather-location').textContent = 'Fetching weather...';

        try {
            const endpoint = locationQuery === 'auto:ip'
                ? `https://api.openweathermap.org/data/2.5/weather?lat=${(await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej))).coords.latitude}&lon=${(await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej))).coords.longitude}&appid=${WEATHER_API_KEY}&units=metric`
                : `https://api.openweathermap.org/data/2.5/weather?q=${locationQuery}&appid=${WEATHER_API_KEY}&units=metric`;

            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Weather data not available');
            const data = await response.json();
            
            setBackgroundAndDetails(data);

        } catch (error) {
            console.error("Weather fetch error:", error);
            document.getElementById('weather-location').textContent = 'Failed to load weather';
            showAlert(locationQuery === 'auto:ip' ? 'Could not get local weather. Please allow location access or select a city.' : `Could not find weather for "${locationQuery}".`);
        }
    };

    const setBackgroundAndDetails = (data) => {
        const allWeatherClasses = document.body.className.split(' ').filter(c => c.startsWith('weather-') || c === 'is-night');
        document.body.classList.remove(...allWeatherClasses);
        effectsContainer.innerHTML = '';

        // [MODIFIED] More accurate day/night check using sunrise/sunset timestamps from the API
        const currentTime = data.dt; // Current time (UTC timestamp) from API
        const sunriseTime = data.sys.sunrise; // Sunrise time (UTC timestamp)
        const sunsetTime = data.sys.sunset; // Sunset time (UTC timestamp)
        const isNight = (currentTime < sunriseTime || currentTime > sunsetTime);

        const condition = data.weather[0].main.toLowerCase();
        let weatherClass = 'default';

        if (isNight) document.body.classList.add('is-night');

        switch (condition) {
            case 'thunderstorm':
            case 'drizzle':
            case 'rain':
                weatherClass = 'rainy';
                createEffect('rain', 150); // Your desired JS+CSS rain
                break;
            case 'snow':
                weatherClass = 'snowy';
                createEffect('snow', 80);
                break;
            case 'clear':
                weatherClass = 'clear';
                break;
            case 'clouds':
                weatherClass = 'clouds';
                break;
            case 'mist': case 'smoke': case 'haze': case 'dust': case 'fog':
            case 'sand': case 'ash': case 'squall': case 'tornado':
                weatherClass = 'fog';
                createEffect('fog', 10);
                break;
        }
        
        const bgColors = {
            rainy: { day: '#3e4a56', night: '#1f252a' },
            snowy: { day: '#a2b2c2', night: '#3f4c5a' },
            clear: { day: '#87CEEB', night: '#0d1115' },
            clouds: { day: '#7d97ad', night: '#414a52' },
            fog: { day: '#999', night: '#555' },
            default: { day: '#1b2735', night: '#1b2735' }
        };
        document.body.style.backgroundColor = bgColors[weatherClass][isNight ? 'night' : 'day'];

        if (weatherClass !== 'default') {
             document.body.classList.add(`weather-${weatherClass}`);
        }
        
        weatherInfoPanel.classList.remove('placeholder');
        document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        document.getElementById('weather-icon').alt = data.weather[0].description;
        document.getElementById('weather-location').textContent = `${data.name}, ${data.sys.country}`;
        
        // Format sunrise/sunset times for display
        const formatTime = (timestamp) => new Date((timestamp + data.timezone) * 1000).toUTCString().slice(-12, -7);
        const sunrise = formatTime(sunriseTime);
        const sunset = formatTime(sunsetTime);
        document.getElementById('weather-details').innerHTML = `<strong>${Math.round(data.main.temp)}°C</strong> | ${data.weather[0].description}<br>Humidity: ${data.main.humidity}% | Wind: ${data.wind.speed} m/s<br>Sunrise: ${sunrise} | Sunset: ${sunset}`;

        clearInterval(localTimeInterval);
        localTimeInterval = setInterval(() => {
            const localTime = new Date(new Date().getTime() + data.timezone * 1000).toUTCString().slice(-12, -4);
            document.getElementById('weather-time').textContent = `${localTime}`;
        }, 1000);
        weatherIsSet = true;
    };
    
    // --- Game State & Logic (UNCHANGED) ---
    let options = ["", "", "", "", "", "", "", "", ""];
    let currentPlayer = "X";
    let gameActive = false;
    let localQuestions = [];
    let currentCategory = '';
    let selectedCellIndex = null;
    let playerNames = { X: "Player 1", O: "Player 2" };
    let roundHistory = [];
    let keySequence = '';
    const winConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    const initializeGame = async () => {
        cells.forEach(cell => { cell.textContent = ""; cell.className = 'cell'; });
        strikeLine.className = '';
        strikeLine.style.width = '0';
        options.fill("");
        currentPlayer = "X";
        updateStatusText();
        gameActive = true;
        localQuestions = [];
        roundHistory = [];
        liveQaHistory.innerHTML = '';
        await fetchQuestions();
    };

    const fetchQuestions = async () => {
        try {
            const response = await fetch(`https://opentdb.com/api.php?amount=10&category=${currentCategory}&type=multiple`);
            const data = await response.json();
            if (data.response_code !== 0 || !data.results || data.results.length === 0) {
                throw new Error('No questions found for this category.');
            }
            localQuestions = data.results.map(q => ({
                question: q.question,
                answers: [...q.incorrect_answers, q.correct_answer],
                correctAnswer: q.correct_answer
            }));
        } catch (error) {
            console.error("Failed to fetch questions:", error);
            showAlert("Error fetching questions. The category may be unavailable. Please restart and choose another topic.");
            gameActive = false;
        }
    };
    
    // --- Event Listeners & Setup (UNCHANGED) ---
    const populateCities = () => {
        ['New York', 'London', 'Tokyo', 'Paris', 'Sydney', 'Dubai', 'Moscow', 'Beijing', 'Los Angeles', 'Cairo'].forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    };
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
        if (!weatherIsSet) {
            nameError.textContent = "Please select a weather location first.";
            return;
        }
        const p1Name = document.getElementById('player1-name').value.trim();
        const p2Name = document.getElementById('player2-name').value.trim();
        if (!p1Name || !p2Name) {
            nameError.textContent = "Please enter a name for both players.";
            return;
        }
        nameError.textContent = "";
        playerNames.X = p1Name;
        playerNames.O = p2Name;
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
        if (question) displayQuestion(question);
    }

    const getQuestion = async () => {
        if (localQuestions.length === 0) {
            statusText.textContent = "Fetching new questions...";
            await fetchQuestions();
            updateStatusText();
        }
        return localQuestions.pop();
    };
    
    const handleAnswer = (selectedAnswer, questionData) => {
        questionModal.classList.remove('show');
        roundHistory.push({
            question: questionData.question, chosenAnswer: selectedAnswer,
            correctAnswer: questionData.correctAnswer, player: playerNames[currentPlayer]
        });
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
        let roundWon = false;
        let winIndex = -1;
        for (let i = 0; i < winConditions.length; i++) {
            const [a, b, c] = winConditions[i];
            if (options[a] && options[a] === options[b] && options[a] === options[c]) {
                roundWon = true;
                winIndex = i;
                break;
            }
        }

        if (roundWon) {
            statusText.textContent = `${playerNames[currentPlayer]} wins!`;
            gameActive = false;
            drawStrikeLine(winIndex);
            setTimeout(showWinnerScreen, 1200);
        } else if (!options.includes("")) {
            statusText.textContent = `It's a Draw!`;
            gameActive = false;
            setTimeout(() => { showWinnerScreen(true); }, 500);
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
        setTimeout(() => {
            strikeLine.style.width = isDiagonal ? '390px' : '300px';
        }, 50);
    };

    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'SELECT'].includes(document.activeElement.tagName)) return;
        keySequence = (keySequence + e.key.toLowerCase()).slice(-12);
        if (keySequence.endsWith('restart game')) {
            keySequence = '';
            location.reload();
        }
    });
});