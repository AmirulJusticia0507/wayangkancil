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
    moral: '"Jangan sembarang percaya pada penampilan luar. Kecerdikan lebih ampuh dari kekuatan kasar."',
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

  'ep-4': {
    id: 'ep-4',
    title: 'Kancil dan Kerbau',
    subtitle: 'Menyelamatkan Kerbau dari Serigala',
    story: `Seekor Kerbau menolong Serigala yang tertindih pohon. Namun setelah
bebas, Serigala justru ingin memakan si Kerbau. Kancil datang sebagai hakim dan
meminta mereka menceritakan kejadian awal. Saat pohon kembali dijatuhkan
menindih Serigala, Kancil mengajak Kerbau pergi dan membiarkan hewan licik itu
kapok.`,
    objective: 'Bantu Kerbau melarikan diri dari Serigala. Gunakan logika hakim untuk membalikkan situasi.',
    ability: 'mediate',
    abilityDesc: 'Panggil pertemuan hakim — semua musuh berhenti bergerak sesaat',
    winCondition: 'Escort Kerbau ke tempat aman',
    moral: '"Kebaikan tidak harus dibalas dengan kejahatan. Bijaklah dalam memilih siapa yang dipercaya."',
    bgColor: '#2a2a1a', // hutan pohon runtuh
    enemyType: 'serigala',
  },

  'ep-5': {
    id: 'ep-5',
    title: 'Kancil Hakim',
    subtitle: 'Mengadili Harimau dan Gajah',
    story: `Terjadi perselisihan wilayah atau sumber air antara hewan-hewan besar
di hutan yang berisiko memicu perang. Kancil dipanggil sebagai mediator yang
cerdik. Menggunakan logika halus dan strategi akal, Kancil berhasil
menyelesaikan sengketa tanpa ada pertumpahan darah di hutan.`,
    objective: 'Mengadili sengketa antara Harimau dan Gajah tanpa pertarungan. Pilih opsi perdamaian yang benar.',
    ability: 'negotiate',
    abilityDesc: 'Buka dialog perdamaian — musuh becomes neutral',
    winCondition: 'Resolve conflict peacefully',
    moral: '"Perdamaian melalui dialog lebih baik dari perang. Akal dapat menyelesaikan sengketa tanpa darah."',
    bgColor: '#2d1b10', // dewan hutan
    enemyType: null, // no enemy, negotiation only
  },

  'ep-6': {
    id: 'ep-6',
    title: 'Kancil dan Elang',
    subtitle: 'Saat Kancil Jadi Makanan Elang',
    story: `Saat Kancil melintas di atas lembah, seekor Elang raksasa melesat
dari langit dan mencoba menangkapnya. Kancil yang terjatuh ke tanah bilang
kepada Elang bahwa batuk badannya adalah "obat ajaib Raja Hutan" yang bisa
menyembuhkan sakit Elang. Elang yang penasaran menahan nafsu makannya dan
mendekatkan telinga — sampai Kancil lolos kabur.`,
    objective: 'Hindari tangkapan Elang dengan menipu dia menggunakan kata-kata.',
    ability: 'bluff',
    abilityDesc: 'Buat Elang ragu-ragu dan berhenti menyerang sesaat',
    winCondition: 'Survive until Elang menyerah',
    moral: '"Kata-kata yang cerdik dapat menyelamatkan dari bahkan ancaman yang datang dari langit."',
    bgColor: '#4a2e18', // langit lembah petang
    enemyType: 'elang',
  },

  'ep-7': {
    id: 'ep-7',
    title: 'Kancil dan Beruang',
    subtitle: 'Madu Palsu di Pohon Tua',
    story: `Seekor Beruang gemuk dan malas mencari madu di hutan. Kancil
menemukan Beruang di bawah pohon tua dan bilang bahwa di ujung cabang paling
tinggi terdapat "madu terbaik di seluruh hutan" yang dijaga oleh lebah raksasa.
Beruang yang gigih memanjat pohon, tapi malah terjebak di dahan lentur yang
memukulkan. Kancil kemudian membagikan madu sebenarnya kepada hewan lain.`,
    objective: 'Bantu hewan lain mendapatkan madu sambil menipu Beruang.',
    ability: 'trickery',
    abilityDesc: 'Spawn ilusi madu yang menarik perhatian Beruang',
    winCondition: 'Beruang terperangkap dan madu terbagi',
    moral: '"Jangan biarkan keserakahan dan kecanduan membuatmu lupa akan bahaya di sekitar."',
    bgColor: '#3a4a2a', // hutan tropis siang hari
    enemyType: 'beruang',
  },
};

export function getEpisode(episodeId) {
  return EPISODES[episodeId] || null;
}

export function getAllEpisodes() {
  return Object.values(EPISODES);
}
