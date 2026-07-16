// ==================== Lore modal ====================
const loreModal = document.getElementById('loreModal');
const loreText = document.getElementById('loreText');
const loreCloseBtn = document.getElementById('loreCloseBtn');
const viewLoreBtn = document.getElementById('viewLoreBtn');

const LORE_PARAGRAPHS = [
  "Di planet Katarosh, tempat asal segala bangsa banteng, hidup damai selama berabad-abad — sampai seorang diktator naik tahta dan mulai mencekik seluruh penjuru planet dengan tangan besi.",
  "Suatu malam, sang diktator bermimpi buruk: seekor banteng akan bangkit dan meruntuhkan singgasananya. Paranoid, dia gak mau ambil resiko. Dia perintahkan seluruh pasukan matador-nya untuk memburu dan menangkap setiap banteng yang ada di Katarosh — gak peduli mana yang beneran ancaman, mana yang cuma banteng biasa lagi makan rumput.",
  "Orang tua Chonk tau cepat atau lambat matador bakal sampai ke depan pintu mereka. Dengan berat hati, mereka masukkan Chonk ke dalam kapsul luar angkasa darurat satu-satunya yang mereka punya, dan meluncurkannya menjauh dari Katarosh — gak peduli tujuannya kemana, yang penting selamat.",
  "Kapsul itu terdampar di Bumi.",
  "Begitu Chonk napak di tanah asing itu, insting pertama yang muncul cuma satu: lari. Bukan karena dia tau kemana, tapi karena diam berarti gampang ditemukan.",
  "Tapi Katarosh gak berhenti mencari. Diktator akhirnya tau Chonk masih hidup — dan mengirim gelombang demi gelombang matador ke Bumi buat menyeretnya pulang. Setiap kapsul re-entry mereka membakar atmosfer dan terlihat seperti meteor jatuh dari langit. Setiap kali sinyal Chonk terdeteksi, suar peringatan otomatis meledak-ledak macam petasan, menandai posisinya.",
  "Toko barang antik yang dia lewati bukan lagi tempat lari biasa — itu berubah jadi arena pertempuran. Setiap vas pecah, setiap rak roboh, adalah bekas Chonk menghindar dan menghajar balik matador yang mengejarnya.",
  "Makin jauh dia bertahan, makin banyak matador yang dikirim, makin ganas serangan yang datang — sampai titik di mana Chonk bukan lagi cuma buronan yang lari ketakutan, tapi sesuatu yang mulai balas menyerang balik."
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
