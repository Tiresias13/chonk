// ==================== DOM refs ====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreBox = document.getElementById('scoreBox');
const bestBox = document.getElementById('best');
const msg = document.getElementById('msg');
const powerBar = document.getElementById('powerBar');
const powerFill = document.getElementById('powerFill');
const walletScreen = document.getElementById('walletScreen');
const startBtn = document.getElementById('startBtn');
const wsLogo = document.getElementById('wsLogo');
const usernameInput = document.getElementById('usernameInput');
const welcomeBack = document.getElementById('welcomeBack');
const countrySelect = document.getElementById('countrySelect');
const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
const connectWalletBtn = document.getElementById('connectWalletBtn');
const lbModal = document.getElementById('lbModal');
const lbFullList = document.getElementById('lbFullList');
const lbYouRow = document.getElementById('lbYouRow');
const lbCloseBtn = document.getElementById('lbCloseBtn');
const streakBox = document.getElementById('streakBox');
const blockScreen = document.getElementById('blockScreen');

const W = canvas.width, H = canvas.height;
const GROUND_Y = H * 0.85;
const BEST_KEY = 'chonk_best_score';
let bestScore = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
bestBox.textContent = 'BEST ' + bestScore;

// --- Load images ---
const IMG = {};
const ASSET_KEYS = ['CHONK','CHONK_POWER','ROCK_BODY_1','ROCK_BODY_2','LANTERN_BODY_1',
  'DRAGON_SHELF','METEOR','MATADOR','SHIBA','POWERUP_ICON','LOGO','BG1','BG2','BG3','BG4'];
const ASSET_FILES = {
  CHONK: 'CHONK.png', CHONK_POWER: 'CHONK_POWER.png', ROCK_BODY_1: 'ROCK_BODY_1.png',
  ROCK_BODY_2: 'ROCK_BODY_2.png', LANTERN_BODY_1: 'LANTERN_BODY_1.png', DRAGON_SHELF: 'DRAGON_SHELF.png',
  METEOR: 'METEOR.png', MATADOR: 'MATADOR.png', SHIBA: 'SHIBA.png', POWERUP_ICON: 'POWERUP_ICON.png',
  LOGO: 'LOGO.png', BG1: 'BG1.jpg', BG2: 'BG2.jpg', BG3: 'BG3.jpg', BG4: 'BG4.jpg'
};
let loadedCount = 0;
ASSET_KEYS.forEach(k => {
  const im = new Image();
  im.src = 'assets/images/' + ASSET_FILES[k];
  im.onload = () => loadedCount++;
  IMG[k] = im;
});
function allLoaded() { return loadedCount >= ASSET_KEYS.length; }
wsLogo.src = 'assets/images/LOGO.png';

const USERNAME_KEY = 'chonk_username';
const COUNTRY_KEY = 'chonk_country';
let telegramId = null;
let telegramLockedName = null;

// --- Country list (name + emoji flag) ---
const COUNTRIES = [
  ['ID','Indonesia','\ud83c\uddee\ud83c\udde9'],['US','United States','\ud83c\uddfa\ud83c\uddf8'],['GB','United Kingdom','\ud83c\uddec\ud83c\udde7'],
  ['SG','Singapore','\ud83c\uddf8\ud83c\uddec'],['MY','Malaysia','\ud83c\uddf2\ud83c\uddfe'],['PH','Philippines','\ud83c\uddf5\ud83c\udded'],
  ['VN','Vietnam','\ud83c\uddfb\ud83c\uddf3'],['TH','Thailand','\ud83c\uddf9\ud83c\udded'],['IN','India','\ud83c\uddee\ud83c\uddf3'],['CN','China','\ud83c\udde8\ud83c\uddf3'],
  ['JP','Japan','\ud83c\uddef\ud83c\uddf5'],['KR','South Korea','\ud83c\uddf0\ud83c\uddf7'],['AU','Australia','\ud83c\udde6\ud83c\uddfa'],
  ['CA','Canada','\ud83c\udde8\ud83c\udde6'],['DE','Germany','\ud83c\udde9\ud83c\uddea'],['FR','France','\ud83c\uddeb\ud83c\uddf7'],['NL','Netherlands','\ud83c\uddf3\ud83c\uddf1'],
  ['BR','Brazil','\ud83c\udde7\ud83c\uddf7'],['MX','Mexico','\ud83c\uddf2\ud83c\uddfd'],['NG','Nigeria','\ud83c\uddf3\ud83c\uddec'],['ZA','South Africa','\ud83c\uddff\ud83c\udde6'],
  ['RU','Russia','\ud83c\uddf7\ud83c\uddfa'],['TR','Turkey','\ud83c\uddf9\ud83c\uddf7'],['AE','UAE','\ud83c\udde6\ud83c\uddea'],['SA','Saudi Arabia','\ud83c\uddf8\ud83c\udde6'],
  ['PK','Pakistan','\ud83c\uddf5\ud83c\uddf0'],['BD','Bangladesh','\ud83c\udde7\ud83c\udde9'],['EG','Egypt','\ud83c\uddea\ud83c\uddec'],['IT','Italy','\ud83c\uddee\ud83c\uddf9'],
  ['ES','Spain','\ud83c\uddea\ud83c\uddf8'],['PL','Poland','\ud83c\uddf5\ud83c\uddf1'],['UA','Ukraine','\ud83c\uddfa\ud83c\udde6'],['AR','Argentina','\ud83c\udde6\ud83c\uddf7'],
  ['OTHER','Other','\ud83c\udf10']
];
const COUNTRY_FLAG = {};
COUNTRIES.forEach(([code,,flag]) => { COUNTRY_FLAG[code] = flag; });
COUNTRIES.forEach(([code, name, flag]) => {
  const opt = document.createElement('option');
  opt.value = code;
  opt.textContent = flag + ' ' + name;
  countrySelect.appendChild(opt);
});
const savedCountry = localStorage.getItem(COUNTRY_KEY);
if (savedCountry) countrySelect.value = savedCountry;
let currentCountry = countrySelect.value || 'ID';
countrySelect.addEventListener('change', () => {
  currentCountry = countrySelect.value;
  localStorage.setItem(COUNTRY_KEY, currentCountry);
});

// --- Telegram Mini App gate: this game only runs inside Telegram ---
let currentUsername = '';
let runningInTelegram = false;

if (window.Telegram && window.Telegram.WebApp) {
  try {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    const tgUser = Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user;
    if (tgUser && tgUser.id && Telegram.WebApp.initData) {
      telegramId = String(tgUser.id);
      telegramLockedName = (tgUser.username ? tgUser.username : (tgUser.first_name || 'Player')).slice(0, 20);
      runningInTelegram = true;
    }
  } catch (err) { /* not running inside Telegram */ }
}

if (!runningInTelegram) {
  // Block all game access outside of Telegram: no canvas render, no API calls.
  blockScreen.style.display = 'flex';
  walletScreen.style.display = 'none';
} else {
  currentUsername = telegramLockedName;
  usernameInput.style.display = 'none';
  welcomeBack.style.display = 'block';
  welcomeBack.textContent = 'Welcome back, ' + telegramLockedName + '!';
}
