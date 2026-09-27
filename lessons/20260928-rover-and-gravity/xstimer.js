// Inject timer CSS
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .timer-container {
            position: fixed;
            bottom: 4px;
            left: 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0;
            z-index: 1000;
        }

        .timer-controls {
            display: flex;
            gap: 0;
            background: #2d60ca;
            border: 3px solid #2d60ca;
            border-bottom: none;
            border-radius: 4px 4px 0 0;
            overflow: hidden;
            width: 100%;
            box-sizing: border-box;
        }

        .timer-button {
            background: #2d60ca;
            border: none;
            color: #ffffff;
            cursor: pointer;
            font-size: 14px;
            padding: 6px 10px;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            position: relative;
            user-select: none;
        }

        .timer-button:last-child {
            border-right: none;
        }

        .timer-button[disabled] {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .timer-button-icon {
            display: inline-block;
            width: 14px;
            height: 14px;
            position: relative;
        }

        /* Play icon */
        .timer-button-icon.play::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-left: 10px solid currentColor;
            border-top: 6px solid transparent;
            border-bottom: 6px solid transparent;
        }

        /* Pause icon */
        .timer-button-icon.pause::before,
        .timer-button-icon.pause::after {
            content: '';
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 10px;
            background: currentColor;
        }

        .timer-button-icon.pause::before {
            left: 3px;
        }

        .timer-button-icon.pause::after {
            right: 3px;
        }

        /* Stop icon */
        .timer-button-icon.stop {
            background: currentColor;
            width: 10px;
            height: 10px;
            border-radius: 1px;
        }

        /* Settings icon - three dots */
        .timer-button-icon.settings {
            width: 3px;
            height: 3px;
            position: relative;
            background: currentColor;
            border-radius: 50%;
        }

        .timer-button-icon.settings::before {
            content: '';
            position: absolute;
            width: 3px;
            height: 3px;
            background: currentColor;
            border-radius: 50%;
            top: 0;
            left: -5px;
        }

        .timer-button-icon.settings::after {
            content: '';
            position: absolute;
            width: 3px;
            height: 3px;
            background: currentColor;
            border-radius: 50%;
            top: 0;
            right: -5px;
        }

        .timer-button-icon.settings::before,
        .timer-button-icon.settings::after {
            content: '';
            position: absolute;
            width: 3px;
            height: 3px;
            background: currentColor;
            border-radius: 50%;
            top: 50%;
            transform: translateY(-50%);
        }

        .timer-button-icon.settings::before {
            left: -5px;
        }

        .timer-button-icon.settings::after {
            right: -5px;
        }

        .timer-display {
            background: var(--color-surface);
            padding: 2px 12px;
            font-size: 24px;
            font-weight: 400;
            color: var(--color-text-tertiary);
            border: 3px solid #2d60ca;
            border-top: none;
            border-radius: 0 0 4px 4px;
            font-variant-numeric: tabular-nums;
            min-width: 90px;
            text-align: center;
            position: relative;
            width: 100%;
            box-sizing: border-box;
        }

        .timer-display.running {
            color: #000000;
        }

        .timer-display.running::before {
            content: '';
            position: absolute;
            top: 4px;
            right: 4px;
            width: 8px;
            height: 8px;
            background: #4caf50;
            border-radius: 50%;
            animation: pulse-dot 1.5s ease-in-out infinite;
        }

        .timer-display.paused {
            color: var(--color-text-tertiary);
        }

        .timer-display.paused::before {
            content: '⏸';
            position: absolute;
            top: 4px;
            right: 4px;
            font-size: 10px;
            opacity: 0.6;
        }

        @keyframes pulse-dot {
            0%, 100% {
                opacity: 1;
                transform: scale(1);
            }
            50% {
                opacity: 0.5;
                transform: scale(0.8);
            }
        }


        .timer-settings-popup {
            position: fixed;
            bottom: 60px;
            left: 4px;
            background: #ffffff;
            border: 1px solid rgba(45, 96, 202, 0.15);
            border-radius: 8px;
            padding: 12px 14px;
            z-index: 1001;
            width: 200px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
            display: none;
            animation: slideUp 0.2s ease-out;
            backdrop-filter: blur(10px);
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(8px) scale(0.98);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .timer-settings-popup.visible {
            display: block;
        }

        .timer-settings-group {
            margin-bottom: 14px;
        }

        .timer-settings-group:last-of-type {
            margin-bottom: 0;
        }

        .timer-settings-group label {
            display: block;
            font-size: 10px;
            color: #666;
            margin-bottom: 6px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .timer-settings-group .slider-container {
            display: flex;
            align-items: center;
        }

        .timer-settings-group input[type="range"] {
            flex: 1;
            height: 3px;
            background: linear-gradient(to right, #e0e0e0 0%, #e0e0e0 100%);
            border-radius: 3px;
            outline: none;
            cursor: pointer;
            -webkit-appearance: none;
        }

        .timer-settings-group input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            background: #2d60ca;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(45, 96, 202, 0.3);
        }

        .timer-settings-group input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: #2d60ca;
            border-radius: 50%;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 6px rgba(45, 96, 202, 0.3);
        }

        .timer-settings-group input[type="range"]::-moz-range-track {
            height: 3px;
            background: #e0e0e0;
            border-radius: 3px;
        }


    `;
    document.head.appendChild(style);
})();

// Timer functionality
let timerInterval = null;
let timerSeconds = 0;
let timerState = 'stopped'; // 'stopped', 'running', 'paused'
let beepInterval = 1; // minutes
let beepVolume = 0.5; // 0 to 1
let lastBeepMinute = -1;

function startTimer() {
    if (timerState === 'running') return;
    
    const timerDisplay = document.getElementById('timerDisplay');
    const wasStopped = timerState === 'stopped';
    timerState = 'running';
    timerDisplay.classList.remove('paused');
    timerDisplay.classList.add('running');
    lastBeepMinute = -1;
    
    if (wasStopped) {
        playBeep(); // Play beep when starting timer from stopped state
    }
    
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
        checkBeepInterval();
    }, 1000);
    
    updateButtonStates();
}

function pauseTimer() {
    if (timerState !== 'running') return;
    
    const timerDisplay = document.getElementById('timerDisplay');
    timerState = 'paused';
    timerDisplay.classList.remove('running');
    timerDisplay.classList.add('paused');
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    updateButtonStates();
}

function toggleTimerState() {
    if (timerState === 'stopped' || timerState === 'paused') {
        startTimer();
    } else if (timerState === 'running') {
        pauseTimer();
    }
}

function resetTimer(event) {
    if (event) {
        event.stopPropagation();
    }
    const timerDisplay = document.getElementById('timerDisplay');
    timerState = 'stopped';
    timerSeconds = 0;
    lastBeepMinute = -1;
    timerDisplay.classList.remove('running', 'paused');
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    updateTimerDisplay();
    updateButtonStates();
}

function checkBeepInterval() {
    if (timerState !== 'running' || beepInterval <= 0) return;
    
    const currentMinutes = Math.floor(timerSeconds / 60);
    
    // Auto-reset at 100:00 (6000 seconds)
    if (timerSeconds >= 6000) {
        resetTimer();
        return;
    }
    
    // Only beep at exact minute intervals
    if (currentMinutes > 0 && currentMinutes % beepInterval === 0 && currentMinutes !== lastBeepMinute) {
        playBeep();
        lastBeepMinute = currentMinutes;
    }
}

function playBeep() {
    const beepDuration = 0.06; // Faster beep duration
    const beepGap = 0.08; // Faster gap between beeps
    
    // Create a single AudioContext for all beeps
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const currentTime = audioContext.currentTime;
    
    // Play four beeps with clear gaps
    for (let i = 0; i < 4; i++) {
        const beepStartTime = currentTime + i * (beepDuration + beepGap);
        const beepEndTime = beepStartTime + beepDuration;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 2400; // Higher pitch (2 octaves above original 800)
        oscillator.type = 'sine';
        
        // Fade in and out for smoother beeps
        gainNode.gain.setValueAtTime(0, beepStartTime);
        gainNode.gain.linearRampToValueAtTime(beepVolume, beepStartTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(beepVolume, beepEndTime - 0.01);
        gainNode.gain.linearRampToValueAtTime(0, beepEndTime);
        
        oscillator.start(beepStartTime);
        oscillator.stop(beepEndTime);
    }
}

function toggleSettingsPopup(event) {
    if (event) {
        event.stopPropagation();
    }
    const popup = document.getElementById('timerSettingsPopup');
    if (popup) {
        popup.classList.toggle('visible');
    }
}

function closeSettingsPopup(event) {
    if (event) {
        event.stopPropagation();
    }
    const popup = document.getElementById('timerSettingsPopup');
    if (popup) {
        popup.classList.remove('visible');
    }
}

function updateBeepInterval(value) {
    beepInterval = Math.max(1, parseInt(value)); // Ensure minimum is 1
    const label = document.getElementById('beepIntervalLabel');
    if (label) {
        label.textContent = beepInterval === 1 ? 'Beep every 1 minute' : `Beep every ${beepInterval} minutes`;
    }
    lastBeepMinute = -1; // Reset to allow immediate beep if needed
}

function updateBeepVolume(value) {
    beepVolume = parseFloat(value);
    const label = document.getElementById('beepVolumeLabel');
    if (label) {
        label.textContent = `Volume ${Math.round(beepVolume * 100)}%`;
    }
}

function playTestBeep() {
    // Play four beeps (same as interval beeps) with current volume setting
    playBeep();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const timerTimeEl = document.getElementById('timerTime');
    if (timerTimeEl) {
        timerTimeEl.textContent = timeString;
    }
}

function updateButtonStates() {
    const playButton = document.getElementById('timerPlayButton');
    const pauseButton = document.getElementById('timerPauseButton');
    const stopButton = document.getElementById('timerStopButton');
    
    if (playButton) {
        playButton.disabled = timerState === 'running';
        playButton.style.display = (timerState === 'running') ? 'none' : 'flex';
    }
    
    if (pauseButton) {
        pauseButton.disabled = timerState !== 'running';
        pauseButton.style.display = (timerState === 'running') ? 'flex' : 'none';
    }
    
    if (stopButton) {
        stopButton.disabled = timerState === 'stopped' && timerSeconds === 0;
    }
}

// Initialize timer UI when DOM is ready
(function initTimerUI() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTimerUI);
        return;
    }

    const timerContainer = document.querySelector('.timer-container');
    if (!timerContainer) return;

    // Create settings popup HTML
    const popup = document.createElement('div');
    popup.id = 'timerSettingsPopup';
    popup.className = 'timer-settings-popup';
    popup.innerHTML = `
        <div class="timer-settings-group">
            <label id="beepIntervalLabel">${beepInterval === 1 ? 'Beep every 1 minute' : `Beep every ${beepInterval} minutes`}</label>
            <div class="slider-container">
                <input type="range" id="beepIntervalSlider" min="1" max="30" value="${beepInterval}" 
                       oninput="updateBeepInterval(this.value)" step="1">
            </div>
        </div>
        <div class="timer-settings-group">
            <label id="beepVolumeLabel">Volume ${Math.round(beepVolume * 100)}%</label>
            <div class="slider-container">
                <input type="range" id="beepVolumeSlider" min="0" max="1" value="${beepVolume}" 
                       oninput="updateBeepVolume(this.value)" 
                       onmouseup="playTestBeep()" 
                       ontouchend="playTestBeep()" 
                       step="0.1">
            </div>
        </div>
    `;
    timerContainer.appendChild(popup);

    // Remove old reset button if it exists
    const oldResetButton = document.getElementById('timerReset');
    if (oldResetButton) {
        oldResetButton.remove();
    }

    // Create control buttons container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'timer-controls';
    
    // Play button
    const playButton = document.createElement('button');
    playButton.id = 'timerPlayButton';
    playButton.className = 'timer-button';
    playButton.title = 'Play (Space)';
    playButton.innerHTML = '<span class="timer-button-icon play"></span>';
    playButton.addEventListener('click', (e) => {
        e.stopPropagation();
        startTimer();
    });
    controlsContainer.appendChild(playButton);
    
    // Pause button
    const pauseButton = document.createElement('button');
    pauseButton.id = 'timerPauseButton';
    pauseButton.className = 'timer-button';
    pauseButton.title = 'Pause (Space)';
    pauseButton.style.display = 'none';
    pauseButton.innerHTML = '<span class="timer-button-icon pause"></span>';
    pauseButton.addEventListener('click', (e) => {
        e.stopPropagation();
        pauseTimer();
    });
    controlsContainer.appendChild(pauseButton);
    
    // Stop button
    const stopButton = document.createElement('button');
    stopButton.id = 'timerStopButton';
    stopButton.className = 'timer-button';
    stopButton.title = 'Stop & Reset (R)';
    stopButton.disabled = true;
    stopButton.innerHTML = '<span class="timer-button-icon stop"></span>';
    stopButton.addEventListener('click', (e) => {
        e.stopPropagation();
        resetTimer(e);
    });
    controlsContainer.appendChild(stopButton);
    
    // Settings button
    const settingsButton = document.createElement('button');
    settingsButton.id = 'timerSettingsButton';
    settingsButton.className = 'timer-button';
    settingsButton.title = 'Settings';
    settingsButton.innerHTML = '<span class="timer-button-icon settings"></span>';
    settingsButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSettingsPopup(e);
    });
    controlsContainer.appendChild(settingsButton);
    
    // Insert controls before timer display
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerContainer.insertBefore(controlsContainer, timerDisplay);
    } else {
        timerContainer.appendChild(controlsContainer);
    }

    // Remove click handler from timer display (no longer needed)
    if (timerDisplay) {
        timerDisplay.style.cursor = 'default';
        timerDisplay.removeAttribute('onclick');
    }

    // Initialize button states
    updateButtonStates();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }
        
        // Spacebar: Play/Pause
        if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            toggleTimerState();
        }
        
        // R: Reset
        if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            resetTimer();
        }
    });

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
        const popup = document.getElementById('timerSettingsPopup');
        const settingsBtn = document.getElementById('timerSettingsButton');
        if (popup && popup.classList.contains('visible')) {
            if (!popup.contains(e.target) && e.target !== settingsBtn && !settingsBtn?.contains(e.target)) {
                popup.classList.remove('visible');
            }
        }
    });

    // Close popup on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const popup = document.getElementById('timerSettingsPopup');
            if (popup && popup.classList.contains('visible')) {
                closeSettingsPopup();
            }
        }
    });
})();
