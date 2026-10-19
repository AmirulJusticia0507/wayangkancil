# TODO — Wayang Kancil Web Game

Daftar tugas dari `wayang_kancil_game_spec.md`. Setiap item selesai dikerjakan, **wajib langsung commit dan push ke `main`** sesuai aturan di `AGENTS.md`, lalu tandai `[DONE]` di `TODO.md`.

## Phase 1: Project Setup & Environment
- [x] [DONE] Initialize Node.js application (`npm init`).
- [x] [DONE] Install dependencies (`express`, `socket.io`).
- [x] [DONE] Configure Tailwind CSS CDN / CLI and static folder structure.

## Phase 2: Real-time Socket Server & Lobby
- [x] [DONE] Set up Express server to serve HTML/JS assets.
- [x] [DONE] Implement Socket.io connection, room creation, and room joining logic.

## Phase 3: Wayang Canvas Engine & Visual Aesthetics
- [x] [DONE] Implement HTML5 Canvas with Wayang silhouette aesthetic (shadow filter, parchment background).
- [x] [DONE] Add smooth player movement interpolation.

## Phase 4: Game Logic & Character Abilities
- [x] [DONE] Implement collision detection, score pickup logic (cucumbers), and player interaction.
- [x] [DONE] Add character specific abilities (e.g., Kancil sprint/trickery).

## Phase 5: Audio, Polish & Moral Story Screen
- [x] [DONE] Integrate Gamelan ambient sound effects.
- [x] [DONE] Add end-game screen displaying traditional Wayang Kancil moral lessons (*piwulang*).

## Phase 6: Cerita / Lakon Mode (Dalang / Storyteller)
- [x] [DONE] Create story data structure (Kancil & Buaya, Kancil & Harimau, Kancil & Siput, Kancil & Kerbau, Hakim Harimau & Gajah).
- [x] [DONE] Build narrative scene engine (dialogue, choices, puppet display).
- [x] [DONE] Implement story selection screen in lobby.
- [x] [DONE] Integrate story mode into main game flow.

## Phase 7: Piwulang, Multiple Endings & Multiplayer Story Voting
- [x] [DONE] Add dedicated piwulang screen per story after narrative ends.
- [x] [DONE] Implement multiple endings based on player choices (cerdas / paksa / damai).
- [x] [DONE] Add story progress tracking (localStorage).
- [x] [DONE] Implement multiplayer story voting (Dalang mode).

## Phase 8: v3 — Roadmap Lanjutan
- [ ] PWA offline/installable & performan canvas.
- [ ] Leaderboard skor multiplayer real-time.
- [ ] Karakter & lakon wayang tambahan.
- [ ] Animasi wayang kulit & transisi scene.
- [ ] Sistem hati / hubungan NPC dengan karakter wayang (Kancil, Pak Tani, Macan, Buaya).
- [ ] Kebun / peternakan sederhana di antar lakon cerita.
- [ ] Sistem musim yang memengaruhi ketersediaan item di map.

## Aturan Wajib
Setiap checklist di atas yang sudah selesai dikerjakan:

```bash
git add .
git commit -m "<pesan deskriptif>"
git push origin main
```

Lalu update `TODO.md` tandai `[DONE]`, commit dan push lagi.

Jangan menunggu banyak task menumpuk sebelum commit push.