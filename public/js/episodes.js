// Wayang Kancil - Episode & Story Mode data (Phase 6)
// Setiap episode mengadaptasi salah satu cerita khasanah Si Kancil.

export const EPISODES = {
  'ep-1': {
    id: 'ep-1',
    title: 'Kancil dan Buaya',
    subtitle: 'Menyeberangi Sungai',
    story: `Kancil ingin menyeberangi sungai yang dalam dan penuh buaya kelaparan
untuk mencapai buah-buahan di seberang. Ia membohongi para buaya bahwa
Raja Hutan mengundangnya untuk membagikan daging segar, dan meminta semua
buaya berbaris rapat dari ujung ke ujung sungai. Kancil melompati punggung
buaya satu per satu sambil menghitung, lalu kabur santai saat sampai di seberang.`,
    objective: 'Lompat di atas punggung buaya satu per satu sampai mencapai tepi seberang sungai. Jangan jatuh ke air!',
    ability: 'bluff',
    abilityDesc: 'Buat semua buaya berbaris lurus sebentar (musuh terpendam)',
    winCondition: 'Reach the other side of the river',
    moral: '"Kecerdikan dapat mengatasi bahkan ancaman yang tampak mustahil. Jangan takut hadapi rintangan besar, gunakan akal."',
    bgColor: '#1a2e2a', // air sungai gelap
    enemyType: 'buaya',
  },

  'ep-2': {
    id: 'ep-2',
    title: 'Kancil dan Harimau',
    subtitle: 'Gong & Sabuk Raja Sulaiman',
    story: `Harimau yang hendak memakan Kancil berhasil diakali berkali-kali.
Pertama, Kancil menunjuk sarang lebah raksasa dan bilang itu "Gong Keramat
Raja Sulaiman" yang suaranya merdu. Harimau memukulnya, lalu disengat ratusan
lebah. Kedua, Kancil menunjuk ular sawa yang sedang tidur dan bilang itu
"Sabuk Sakti Raja Sulaiman". Saat Harimau mencoba memakainya, ular terbangun
dan melilit Harimau.`,
    objective: 'Hindari serangan Harimau dengan menggunakan ilusi. Gunakan "Gong" dan "Sabuk Palsu" untuk menipu dia.',
    ability: 'illusion',
    abilityDesc: 'Spawn objek ilusi yang menarik perhatian musuh',
    winCondition: 'Survive until time runs out',
    moral: '"Jangan simply percaya pada penampilan luar. Kecerdikan lebih ampuh dari kekuatan kasar."',
    bgColor: '#2d1b10', // hutan gelap
    enemyType: 'macan',
  },

  'ep-3': {
    id: 'ep-3',
    title: 'Kancil dan Siput',
    subtitle: 'Lomba Lari di Tepi Sungai',
    story: `Kancil yang sombong mengolok-olok Siput karena jalannya sangat lambat,
lalu mengajak Siput lomba lari. Siput menerima tantangan dan secara cerdik
mengumpulkan teman-teman siputnya di sepanjang tepi sungai. Setiap kali Kancil
memanggil, siput yang berada di depannya akan menjawab. Kancil yang panik dan
kelelahan berlari kencang akhirnya menyerah, terkecoh oleh kerja sama para siput.`,
    objective: 'Lari mencapai finish terlebih dahulu. Tapi waspada — suara di depan mungkin milik teman Siput, bukan Siput itu sendiri.',
    ability: 'echo',
    abilityDesc: 'Buat suara tiruan yang menyesatkan lawan',
    winCondition: 'Reach the finish line first',
    moral: '"Jangan sombong dengan kecepatan. Kerja sama dan strategi dapat mengalahkan kekuatan individu."',
    bgColor: '#3a4a2a', // tepi sungai hijau
    enemyType: 'siput',
  },
};

export function getEpisode(episodeId) {
  return EPISODES[episodeId] || null;
}

export function getAllEpisodes() {
  return Object.values(EPISODES);
}
