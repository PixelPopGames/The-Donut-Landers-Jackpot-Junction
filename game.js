/**
 * The Donut Landers: Sugar Rush
 * Main Game Logic & Audio Synthesizer
 */

let gameConfig = {
    credits: 58735,
    bet: 1200,
    win: 0,
    level: 1,
    maxLevel: 12,
    muted: false,
    symbols: [
        { id: 'coffee', name: 'Super Coffee', payout: 5, img: 'assets/symbols/coffee.svg' },
        { id: 'donut_glazed', name: 'Glazed Donut', payout: 10, img: 'assets/symbols/donut_glazed.svg' },
        { id: 'donut_choco', name: 'Choco Sprinkles', payout: 15, img: 'assets/symbols/donut_choco.svg' },
        { id: 'donut_berry', name: 'Berry Blast', payout: 20, img: 'assets/symbols/donut_berry.svg' },
        { id: 'lander_alpha', name: 'Lander Alpha', payout: 35, img: 'assets/symbols/lander_alpha.svg' },
        { id: 'lander_beta', name: 'Lander Beta', payout: 50, img: 'assets/symbols/lander_beta.svg' },
        { id: 'sugar_wild', name: 'Sugar Rush Wild', payout: 100, img: 'assets/symbols/sugar_wild.svg' },
        { id: 'jackpot_star', name: 'Donut Star', payout: 250, img: 'assets/symbols/jackpot_star.svg' }
    ]
};

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.musicInterval = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            this.ctx = new AudioContext();
            this.initialized = true;
        }
    }

    playTone(freq, type, duration, gainVal = 0.1) {
        if (gameConfig.muted || !this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn("Audio play error:", e);
        }
    }

    click() { this.playTone(600, 'sine', 0.08, 0.05); }
    spin() { this.playTone(200, 'sawtooth', 0.4, 0.08); }
    stop() { this.playTone(400, 'triangle', 0.15, 0.1); }
    match() { 
        this.playTone(523.25, 'sine', 0.1, 0.15);
        setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.15), 100);
        setTimeout(() => this.playTone(783.99, 'sine', 0.2, 0.15), 200);
    }
    jackpot() {
        [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'square', 0.2, 0.2), i * 120);
        });
    }
    levelUp() {
        [440, 554.37, 659.25, 880].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sine', 0.15, 0.15), i * 100);
        });
    }

    startBGM() {
        if (this.musicInterval) return;
        const chords = [
            [261.63, 329.63, 392.00],
            [220.00, 261.63, 329.63],
            [349.23, 440.00, 523.25],
            [392.00, 493.88, 587.33]
        ];
        let step = 0;
        this.musicInterval = setInterval(() => {
            if (gameConfig.muted) return;
            const chord = chords[step % chords.length];
            chord.forEach(f => this.playTone(f, 'sine', 0.4, 0.02));
            step++;
        }, 2000);
    }

    stopBGM() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }
}

const sounds = new SoundSystem();
let isSpinning = false;
let currentScreen = 'splash-screen';

const screens = {
    splash: document.getElementById('splash-screen'),
    menu: document.getElementById('main-menu-screen'),
    game: document.getElementById('game-screen')
};

function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
        currentScreen = screenName;
    }
}

function initSplash() {
    let progress = 0;
    const bar = document.getElementById('loading-bar');
    const status = document.getElementById('splash-status');
    const statuses = [
        "Initializing Sugar Core...",
        "Calibrating Donut Landers...",
        "Loading 8 Music Slots...",
        "Charging Slot Reels...",
        "Ready for Sugar Rush!"
    ];

    const interval = setInterval(() => {
        progress += 2;
        bar.style.width = progress + '%';
        let idx = Math.floor((progress / 100) * statuses.length);
        if (idx >= statuses.length) idx = statuses.length - 1;
        status.textContent = statuses[idx];

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                switchScreen('menu');
                buildLevelGrid();
                buildPaytable();
                sounds.startBGM();
            }, 500);
        }
    }, 50);
}

function buildLevelGrid() {
    const grid = document.getElementById('level-select-grid');
    grid.innerHTML = '';
    for (let i = 1; i <= gameConfig.maxLevel; i++) {
        const btn = document.createElement('button');
        btn.className = `level-btn ${i === gameConfig.level ? 'selected' : ''}`;
        btn.textContent = `Lvl ${i}`;
        btn.onclick = () => {
            sounds.click();
            gameConfig.level = i;
            document.getElementById('ui-level').textContent = i;
            document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        };
        grid.appendChild(btn);
    }
}

function buildPaytable() {
    const grid = document.getElementById('paytable-grid');
    grid.innerHTML = '';
    gameConfig.symbols.forEach(sym => {
        const item = document.createElement('div');
        item.className = 'paytable-item';
        item.innerHTML = `
            <img src="${sym.img}" alt="${sym.name}">
            <div>
                <div><strong>${sym.name}</strong></div>
                <div style="color: #00ffff;">Payout: ${sym.payout}x</div>
            </div>
        `;
        grid.appendChild(item);
    });
}

function initReels() {
    const reels = document.querySelectorAll('.reel');
    reels.forEach(reel => {
        const strip = reel.querySelector('.reel-strip');
        strip.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const sym = getRandomSymbol();
            const div = document.createElement('div');
            div.className = 'slot-symbol';
            div.innerHTML = `<img src="${sym.img}" alt="${sym.name}"><span>${sym.name}</span>`;
            strip.appendChild(div);
        }
    });
}

function getRandomSymbol() {
    const idx = Math.floor(Math.random() * gameConfig.symbols.length);
    return gameConfig.symbols[idx];
}

function spinReels() {
    if (isSpinning) return;
    if (gameConfig.credits < gameConfig.bet) {
        alert("Not enough credits! Lower your bet or restart.");
        return;
    }

    sounds.init();
    sounds.click();
    sounds.spin();

    gameConfig.credits -= gameConfig.bet;
    updateUI();

    isSpinning = true;
    document.getElementById('btn-spin').disabled = true;
    document.getElementById('jackpot-banner').classList.add('hidden');

    const reels = document.querySelectorAll('.reel');
    let results = [];

    reels.forEach((reel, index) => {
        const strip = reel.querySelector('.reel-strip');
        const targetSymbol = getRandomSymbol();
        results.push(targetSymbol);

        const div = document.createElement('div');
        div.className = 'slot-symbol';
        div.innerHTML = `<img src="${targetSymbol.img}" alt="${targetSymbol.name}"><span>${targetSymbol.name}</span>`;
        strip.insertBefore(div, strip.firstChild);

        strip.style.transition = 'none';
        strip.style.transform = 'translateY(-120px)';

        setTimeout(() => {
            strip.style.transition = `transform ${0.5 + index * 0.2}s cubic-bezier(0.1, 0.9, 0.2, 1)`;
            strip.style.transform = 'translateY(0px)';
            if (index === reels.length - 1) {
                setTimeout(() => {
                    sounds.stop();
                    evaluateResults(results);
                    isSpinning = false;
                    document.getElementById('btn-spin').disabled = false;
                }, 500 + index * 200);
            }
        }, 50);
    });
}

function evaluateResults(results) {
    const firstId = results[0].id;
    const matchCount = results.filter(s => s.id === firstId).length;

    let win = 0;
    if (matchCount >= 3) {
        win = results[0].payout * gameConfig.bet * (matchCount - 2);
        sounds.match();
    }

    if (matchCount === 5 && (firstId === 'jackpot_star' || firstId === 'sugar_wild')) {
        win += gameConfig.bet * 100 * gameConfig.level;
        sounds.jackpot();
        document.getElementById('jackpot-banner').classList.remove('hidden');
    }

    if (win > 0) {
        gameConfig.credits += win;
        gameConfig.win = win;
        if (win > 5000 && gameConfig.level < gameConfig.maxLevel) {
            gameConfig.level++;
            sounds.levelUp();
            buildLevelGrid();
        }
    } else {
        gameConfig.win = 0;
    }
    updateUI();
}

function updateUI() {
    document.getElementById('ui-credits').textContent = gameConfig.credits;
    document.getElementById('ui-bet').textContent = gameConfig.bet;
    document.getElementById('ui-win').textContent = gameConfig.win;
    document.getElementById('ui-bet-display').textContent = `Bet: ${gameConfig.bet}`;
    document.getElementById('ui-level').textContent = gameConfig.level;
}

function openWorkshop() {
    sounds.click();
    const container = document.getElementById('workshop-form-container');
    container.innerHTML = '';
    gameConfig.symbols.forEach((sym, idx) => {
        const row = document.createElement('div');
        row.className = 'workshop-row';
        row.innerHTML = `
            <input type="text" value="${sym.name}" id="ws-name-${idx}" placeholder="Name">
            <input type="text" value="${sym.img}" id="ws-img-${idx}" placeholder="Image Path">
            <input type="number" value="${sym.payout}" id="ws-payout-${idx}" placeholder="Payout">
        `;
        container.appendChild(row);
    });
    document.getElementById('workshop-modal').classList.remove('hidden');
}

function closeWorkshop() {
    sounds.click();
    document.getElementById('workshop-modal').classList.add('hidden');
}

function saveWorkshop() {
    sounds.click();
    gameConfig.symbols.forEach((sym, idx) => {
        const nameInput = document.getElementById(`ws-name-${idx}`);
        const imgInput = document.getElementById(`ws-img-${idx}`);
        const payoutInput = document.getElementById(`ws-payout-${idx}`);
        if (nameInput) sym.name = nameInput.value;
        if (imgInput) sym.img = imgInput.value;
        if (payoutInput) sym.payout = parseFloat(payoutInput.value) || sym.payout;
    });
    buildPaytable();
    initReels();
    closeWorkshop();
}

document.addEventListener('DOMContentLoaded', () => {
    initSplash();
    initReels();

    document.getElementById('btn-start-game').onclick = () => {
        sounds.init();
        sounds.click();
        switchScreen('game');
    };

    document.getElementById('btn-menu').onclick = () => {
        sounds.click();
        switchScreen('menu');
    };

    document.getElementById('btn-spin').onclick = spinReels;

    document.getElementById('btn-bet-plus').onclick = () => {
        sounds.click();
        if (gameConfig.bet < 10000) gameConfig.bet += 100;
        updateUI();
    };

    document.getElementById('btn-bet-minus').onclick = () => {
        sounds.click();
        if (gameConfig.bet > 100) gameConfig.bet -= 100;
        updateUI();
    };

    document.getElementById('btn-max-bet').onclick = () => {
        sounds.click();
        gameConfig.bet = 5000;
        updateUI();
    };

    document.getElementById('btn-mute').onclick = () => {
        gameConfig.muted = !gameConfig.muted;
        document.getElementById('btn-mute').textContent = gameConfig.muted ? '🔇' : '🔊';
        if (gameConfig.muted) sounds.stopBGM();
        else sounds.startBGM();
    };

    document.getElementById('btn-workshop').onclick = openWorkshop;
    document.getElementById('btn-workshop-close').onclick = closeWorkshop;
    document.getElementById('btn-workshop-save').onclick = saveWorkshop;
});
