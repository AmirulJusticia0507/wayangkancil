# TODO — Wayang Kancil Web Game

Daftar tugas dari `wayang_kancil_game_spec.md`. Setiap item selesai dikerjakan, **wajib langsung commit dan push ke `main`** sesuai aturan di `AGENTS.md`.

## Phase 1: Project Setup & Environment

- [ ] Initialize Node.js application (`npm init`).
- [ ] Install dependencies (`express`, `socket.io`).
- [ ] Configure Tailwind CSS CDN / CLI and static folder structure.

## Phase 2: Real-time Socket Server & Lobby

- [ ] Set up Express server to serve HTML/JS assets.
- [ ] Implement Socket.io connection, room creation, and room joining logic.

## Phase 3: Wayang Canvas Engine & Visual Aesthetics

- [ ] Implement HTML5 Canvas with Wayang silhouette aesthetic (shadow filter, parchment background).
- [ ] Add smooth player movement interpolation.

## Phase 4: Game Logic & Character Abilities

- [ ] Implement collision detection, score pickup logic (cucumbers), and player interaction.
- [ ] Add character specific abilities (e.g., Kancil sprint/trickery).

## Phase 5: Audio, Polish & Moral Story Screen

- [ ] Integrate Gamelan ambient sound effects.
- [ ] Add end-game screen displaying traditional Wayang Kancil moral lessons (*piwulang*).

## Aturan Wajib

Setiap checklist di atas yang sudah dicentang (selesai dikerjakan):

```bash
git add .
git commit -m "<pesan deskriptif>"
git push origin main
```

Jangan menunggu banyak task menumpuk sebelum commit push.
