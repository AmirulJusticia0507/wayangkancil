# AGENTS.md — Wayang Kancil Web Game

Instruksi untuk agen AI yang bekerja pada repository ini. File ini harus dibaca sebelum memulai setiap task.

## 📖 Deskripsi Proyek

Game web interaktif multiplayer/realtime yang diinspirasi oleh **Wayang Kancil** (tradisi wayang kulit rakyat Indonesia). Pemain mengontrol karakter wayang (Si Kancil, Pak Tani, Macan, Buaya) di dalam layar bayangan (*Kelir*) yang diilhami oleh cahaya pelita (*Blencong*).

Dokumentasi teknis lengkap tersedia di `wayang_kancil_game_spec.md`.

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend UI | HTML5 + Tailwind CSS |
| Frontend Logic | JavaScript (ES6+) |
| Backend Runtime | Node.js |
| Server Framework | Express.js |
| Real-time Engine | Socket.io |

## 🏗 Project Structure

```text
wayang-kancil-game/
├── package.json
├── server.js               # Node.js + Express + Socket.io entry point
├── public/
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js          # Socket connection & UI handler
│   ├── js/gameEngine.js    # Canvas renderer & game loop
│   ├── js/sound.js         # Gamelan sound effects / audio manager
│   └── assets/
│       ├── puppets/
│       ├── audio/
│       └── background/
├── README.md
└── AGENTS.md
```

## 🔌 Socket.io Events (penting saat mengubah server/client)

| Event | Direction | Payload | Keterangan |
| :--- | :--- | :--- | :--- |
| `joinRoom` | Client → Server | `{ roomId, playerName, character }` | Gabung lobby room |
| `playerMoved` | Client → Server | `{ x, y, direction, actionState }` | Broadcast gerakan pemain |
| `gameStateUpdate` | Server → Clients | `{ players, items, score, timer }` | Sync state dunia (~30–60 FPS) |
| `useAbility` | Client → Server | `{ abilityId, targetPos }` | Trigger ability karakter |
| `gameOver` | Server → Clients | `{ winner, finalScores }` | Akhir sesi & layar moral |

## 🛡️ Aturan Wajib Setiap Task

**Setiap ada task yang diselesaikan, wajib langsung commit dan push ke branch `main`.** Jangan menunggu sampai banyak task menumpuk.

Workflow yang harus diikuti setelah setiap task selesai:

```bash
git add .
git commit -m "<pesan commit deskriptif singkat>"
git push origin main
```

Contoh pesan commit:
- `feat: add socket.io joinRoom handler`
- `fix: fix canvas movement interpolation`
- `docs: update AGENTS.md with new socket event`
- `chore: install express and socket.io dependencies`

Jangan melakukan commit kosong. Pastikan ada perubahan file yang nyata sebelum commit.

## ✅ Definition of Done untuk Setiap Task

1. Kode ditulis sesuai stack dan struktur proyek di atas.
2. Socket event yang ditambah/diubah sudah cocok dengan tabel di atas dan `wayang_kancil_game_spec.md`.
3. Tidak ada file yang tertinggal (cek `git status`).
4. Sudah `git add .`, `git commit`, dan `git push origin main`.
5. Repositori di GitHub (`origin/main`) sudah terupdate setelah push.

## 🧠 Catatan untuk Agen

- Selalu baca `wayang_kancil_game_spec.md` sebelum mengubah fitur agar selaras dengan roadmap dan spesifikasi.
- Roadmap v3 lihat `TODO.md` Phase 8 (jangan duplikasi daftar checklist di sini).
- Jika terdapat keraguan tentang arah implementasi, tanyakan kepada pengguna sebelum melanjutkan.
- Prioritaskan konsistensi estetika wayang kulit (siluet, latar bayangan *Kelir*, cahaya *Blencong*, bunyi Gamelan).

## 🌱 Prinsip Desain Budaya Jawa (dari analisis karakter Kancil)

Setiap fitur dan cerita yang ditambahkan harus mempertimbangkan dimensi kultural berikut:

### A. Ngawur Tanpa Aji — Akal Mengalahkan Kekuatan
Kancil mewakili *wong cilik* yang menang melalui *akal budi*, *eling lan waspada*, dan kelincahan berpikir, bukan kekuatan fisik.
- Implementasi: ability Kancil harus berfokus pada strategi, ilusi, dan strategi bertahan (misal: sprint, bluff, teleport), bukan serang langsung.

### B. Kepemimpinan Jawa & Nalar — Menang tanpa Ngasorake
Kancil sebagai mediator/penengah konflik (misal: Harimau vs Kerbau) mencerminkan pemimpin yang cerdik menyelesaikan masalah tanpa pertumpahan darah.
- Implementasi: episode negosiasi (ep-5) harus hadirkan opsi perdamaian sebagai ending terbaik, bukan paksa.

### C. Dualisme Watak — Kancil Cerdik vs Culas
Kecerdikan Kancil dihormati jika digunakan untuk bertahan dan membela lemah, tetapi dikritik jika digunakan untuk merugikan (misal: mencuri timun Pak Tani).
- Implementasi: multiple endings harus mencerminkan konsekuensi — ending "cerdik" berbeda dengan ending "paksa/culas".

### D. Pesan Moral yang Telah Dianalisis
| Nilai | Implementasi dalam Cerita |
| :--- | :--- |
| **Oja Dumeh** (Jangan sombong) | Kancil kalah dari Siput karena meremehkan lawan |
| **Gotong Royong** | Kerja kolektif siput mengalahkan kecepatan individual |
| **Ngundhuh Wohing Pakarti** | Tindakan licik yang merugikan akan membawa konsekuensi |
| **Akal Unjuk Diri** | Kancil memanfaatkan situasi untuk keluar dari ancaman |

### Aturan Implementasi
- Hindari menggambarkan Kancil sebagai sosok jahat murni; dia adalah pemulang strategi bertahan hidup.
- Setiap episode harus menyampaikan *piwulang* (pelajaran moral) yang jelas di akhir.
- Desain visual harus tetap estetika wayang kulit (siluet, latar bayangan *Kelir*, cahaya *Blencong*).