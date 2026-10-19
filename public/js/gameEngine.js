// Wayang Kancil - Canvas renderer & game loop
// Placeholder for Phase 3+ implementation

export default class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.players = new Map();
    this.items = [];
  }

  addPlayer(id, { name, character, x, y }) {
    this.players.set(id, { id, name, character, x, y, direction: 'right', actionState: 'idle' });
  }

  updatePlayer(id, { x, y, direction, actionState }) {
    const p = this.players.get(id);
    if (!p) return;
    p.x = x;
    p.y = y;
    p.direction = direction;
    p.actionState = actionState;
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const [id, p] of this.players) {
      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.fillRect(p.x - 20, p.y - 20, 40, 40);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(p.name, p.x, p.y - 28);
    }
  }
}
