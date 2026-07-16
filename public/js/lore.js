// ==================== Lore modal ====================
const loreModal = document.getElementById('loreModal');
const loreText = document.getElementById('loreText');
const loreCloseBtn = document.getElementById('loreCloseBtn');
const viewLoreBtn = document.getElementById('viewLoreBtn');

const LORE_PARAGRAPHS = [
  "On the planet Katarosh, home to all bull kind, peace lasted for centuries. Then a dictator seized the throne and began crushing every corner of the planet with an iron fist.",
  "One night, the dictator had a terrible dream: a bull would rise and topple his throne. Paranoid, he refused to take any chances. He ordered his entire matador army to hunt down and capture every bull on Katarosh, whether they were an actual threat or just an ordinary bull grazing in a field.",
  "Chonk's parents knew the matadors would eventually reach their door. Heartbroken, they placed Chonk into their one and only emergency space capsule and launched him far from Katarosh, not knowing where he would end up, only that he had to survive.",
  "The capsule crash landed on Earth.",
  "The moment Chonk touched down on unfamiliar ground, one instinct took over: run. Not because he knew where to go, but because standing still meant getting caught.",
  "But Katarosh never stopped searching. The dictator eventually learned Chonk was still alive, and sent wave after wave of matadors to Earth to drag him home. Each reentry capsule burned through the atmosphere, streaking across the sky like falling meteors. Every time Chonk's signal was detected, an automatic warning flare lit up like fireworks, marking his location.",
  "The antique shops he passed through were no longer just places to run. They became battlegrounds. Every shattered vase, every collapsed shelf, was a trace of Chonk dodging and striking back at the matadors chasing him.",
  "The longer he survived, the more matadors were sent, the fiercer the attacks became, until Chonk was no longer just a terrified fugitive on the run, but something that had started fighting back."
];

function renderLore() {
  loreText.innerHTML = LORE_PARAGRAPHS.map((p, i) =>
    `<p style="animation-delay:${Math.min(i,10)*0.05}s">${p}</p>`
  ).join('');
}

function openLore() {
  renderLore();
  loreModal.classList.add('show');
}

viewLoreBtn.addEventListener('click', openLore);
loreCloseBtn.addEventListener('click', () => { loreModal.classList.remove('show'); });
