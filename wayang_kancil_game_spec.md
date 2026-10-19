# Technical Specification & Roadmap: Wayang Kancil Web Game

An interactive, web-based multiplayer/real-time game inspired by **Wayang Kancil** (Indonesian shadow puppet fable tradition).

---

## 1. Tech Stack Overview

| Layer | Technology | Usage / Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | **HTML5** + **Tailwind CSS** | Structure and responsive styling (shadow puppet theater aesthetic). |
| **Frontend Logic** | **JavaScript (ES6+)** | DOM manipulation, HTML5 Canvas rendering, audio, and client Socket events. |
| **Backend Runtime**| **Node.js** | Server-side runtime environment. |
| **Server Framework**| **Express.js** | Serving static web assets and API endpoints. |
| **Real-time Engine**| **Socket.io** | Bi-directional, event-based real-time communication for multiplayer/session syncing. |

---

## 2. Game Concept & Gameplay Mechanics

### Core Premise
Players control Wayang Kancil characters (Si Kancil, Pak Tani, Macan, Buaya) inside a traditional shadow screen (*Kelir*) environment lit by a oil lamp (*Blcong*).

### Gameplay Modes
1. **P2P / Multiplayer Chase & Outsmart Mode:**
   * **Role 1 (Si Kancil):** Collects cucumbers/fruits across the obstacle map while dodging traps and enemies.
   * **Role 2 (Pak Tani / Macan / Buaya):** Pursues Kancil or sets up traps in real-time.
2. **Interactive Storyteller / Dalang Mode:**
   * One player acts as the **Dalang** (puppet master) controlling puppet positions, sound effects, and story choices, while audience/players vote or interact in real-time via Socket.io.

---

## 3. Architecture & Socket.io Event Flow

```
[ Client A (Browser) ] <--- Websocket ---> [ Node.js + Socket.io Server ] <--- Websocket ---> [ Client B (Browser) ]
      (Canvas + UI)                               (Game State Room)                                (Canvas + UI)
```

### Key Socket Events

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `joinRoom` | Client $\rightarrow$ Server | `{ roomId, playerName, character }` | Player joins a game room lobby. |
| `playerMoved` | Client $\rightarrow$ Server | `{ x, y, direction, actionState }` | Broadcasts player movement updates. |
| `gameStateUpdate` | Server $\rightarrow$ Clients | `{ players, items, score, timer }` | Server syncs world state at ~30–60 FPS tick rate. |
| `useAbility` | Client $\rightarrow$ Server | `{ abilityId, targetPos }` | Triggers character-specific abilities (e.g., Kancil trick, Buaya snap). |
| `gameOver` | Server $\rightarrow$ Clients | `{ winner, finalScores }` | Signals end of session and displays leaderboard/moral story screen. |

---

## 4. Project Structure

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

---

## 5. Development Milestones & Roadmap

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

- [ ] **Phase 6: Episode & Story Mode**
  - Define episode data structure (story, objective, ability, moral).
  - Add episode selection UI in lobby.
  - Implement Episode 1: Kancil & Buaya (river crossing).
  - Implement Episode 2: Kancil & Harimau (gong & sabuk trick).
  - Implement Episode 3: Kancil & Siput (race with echo).
  - Add story intro and outro screens with *piwulang*.
  - Episode-specific win conditions and abilities.