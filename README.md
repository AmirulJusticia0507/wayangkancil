# Wayang Kancil Web Game

An interactive, web-based multiplayer/real-time game inspired by **Wayang Kancil** (Indonesian shadow puppet fable tradition).

## 🎮 Game Concept

Players control Wayang Kancil characters (Si Kancil, Pak Tani, Macan, Buaya) inside a traditional shadow screen (*Kelir*) environment lit by an oil lamp (*Blencong*).

### Gameplay Modes

1. **P2P / Multiplayer Chase & Outsmart Mode**
   - **Si Kancil:** Collects cucumbers/fruits across the obstacle map while dodging traps and enemies.
   - **Pak Tani / Macan / Buaya:** Pursues Kancil or sets up traps in real-time.

2. **Interactive Storyteller / Dalang Mode**
   - One player acts as the **Dalang** (puppet master) controlling puppet positions, sound effects, and story choices, while audience/players vote or interact in real-time via Socket.io.

## 🛠 Tech Stack

| Layer | Technology | Usage / Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5 + Tailwind CSS | Structure and responsive styling (shadow puppet theater aesthetic). |
| **Frontend Logic** | JavaScript (ES6+) | DOM manipulation, HTML5 Canvas rendering, audio, and client Socket events. |
| **Backend Runtime** | Node.js | Server-side runtime environment. |
| **Server Framework** | Express.js | Serving static web assets and API endpoints. |
| **Real-time Engine** | Socket.io | Bi-directional, event-based real-time communication for multiplayer/session syncing. |

## 🏗 Project Structure

```text
wayang-kancil-game/
├── package.json
├── server.js               # Node.js + Express + Socket.io entry point
├── public/
│   ├── index.html          # Main application page (Tailwind CSS included)
│   ├── css/
│   │   └── style.css       # Custom animations (shadow flicker, puppet joints)
│   ├── js/
│   │   ├── main.js         # Socket connection & UI handler
│   │   ├── gameEngine.js   # Canvas renderer & game loop
│   │   └── sound.js        # Gamelan sound effects / audio manager
│   └── assets/
│       ├── puppets/        # Kancil, Pak Tani, Macan SVG/PNG silhouettes
│       ├── audio/          # Gamelan background & sound effects
│       └── background/     # Kelir screen & Blencong light texture
└── README.md
```

## 🔌 Socket.io Event Flow

```
[ Client A (Browser) ] <--- Websocket ---> [ Node.js + Socket.io Server ] <--- Websocket ---> [ Client B (Browser) ]
      (Canvas + UI)                               (Game State Room)                                (Canvas + UI)
```

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `joinRoom` | Client → Server | `{ roomId, playerName, character }` | Player joins a game room lobby. |
| `playerMoved` | Client → Server | `{ x, y, direction, actionState }` | Broadcasts player movement updates. |
| `gameStateUpdate` | Server → Clients | `{ players, items, score, timer }` | Server syncs world state at ~30–60 FPS tick rate. |
| `useAbility` | Client → Server | `{ abilityId, targetPos }` | Triggers character-specific abilities (e.g., Kancil trick, Buaya snap). |
| `gameOver` | Server → Clients | `{ winner, finalScores }` | Signals end of session and displays leaderboard/moral story screen. |

## 🗺 Roadmap

- [ ] **Phase 1: Project Setup & Environment**
  - Initialize Node.js application (`npm init`).
  - Install dependencies (`express`, `socket.io`).
  - Configure Tailwind CSS CDN / CLI and static folder structure.
- [ ] **Phase 2: Real-time Socket Server & Lobby**
  - Set up Express server to serve HTML/JS assets.
  - Implement Socket.io connection, room creation, and room joining logic.
- [ ] **Phase 3: Wayang Canvas Engine & Visual Aesthetics**
  - Implement HTML5 Canvas with Wayang silhouette aesthetic (shadow filter, parchment background).
  - Add smooth player movement interpolation.
- [ ] **Phase 4: Game Logic & Character Abilities**
  - Implement collision detection, score pickup logic (cucumbers), and player interaction.
  - Add character specific abilities (e.g., Kancil sprint/trickery).
- [ ] **Phase 5: Audio, Polish & Moral Story Screen**
  - Integrate Gamelan ambient sound effects.
  - Add end-game screen displaying traditional Wayang Kancil moral lessons (*piwulang*).

## 🚀 Getting Started

```bash
# Clone repository
git clone https://github.com/AmirulJusticia0507/wayangkancil.git
cd wayangkancil

# Install dependencies
npm install

# Run server
node server.js
```

## 🌱 Prinsip Desain Budaya Jawa

Karakter Kancil dalam game ini tidak hanya sebagai simbol kecerdikan, tetapi cerminan strategi bertahan hidup dan filosofi kepemimpinan Jawa:

### A. Ngawur Tanpa Aji — Akal Mengalahkan Kekuatan
Kancil mewakili *wong cilik* yang menang melalui *akal budi*, *eling lan waspada*, dan kelincahan berpikir, bukan kekuatan fisik. Ability Kancil berfokus pada strategi, ilusi, dan bertahan (sprint, bluff, teleport), bukan serang langsung.

### B. Kepemimpinan Jawa — Menang tanpa Ngasorake
Kancil sebagai mediator konflik (misal: Harimau vs Kerbau) mencerminkan pemimpin yang cerdik menyelesaikan masalah tanpa pertumpahan darah. Episode negosiasi menawarkan opsi perdamaian sebagai ending terbaik.

### C. Dualisme Watak — Kancil Cerdik vs Culas
Kecerdikan Kancil dihormati jika digunakan untuk bertahan dan membela lemah, tetapi dikritik jika digunakan untuk merugikan (misal: mencuri timun). Multiple endings mencerminkan konsekuensi setiap pilihan.

### D. Pesan Moral (*Piwulang*)
| Nilai | Implementasi dalam Cerita |
| :--- | :--- |
| **Oja Dumeh** (Jangan sombong) | Kancil kalah dari Siput karena meremehkan lawan |
| **Gotong Royong** | Kerja kolektif siput mengalahkan kecepatan individual |
| **Ngundhuh Wohing Pakarti** | Tindakan licik yang merugikan akan membawa konsekuensi |
| **Akal Unjuk Diri** | Kancil memanfaatkan situasi untuk keluar dari ancaman |

## 📄 License

This project is inspired by the Indonesian Wayang Kancil shadow puppet fable tradition.