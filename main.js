import './style.css';

const BOARD_SIZE = 10;
const SHIPS = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 }
];

class Battleship {
  constructor() {
    this.playerBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
    this.aiBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
    this.playerShips = [];
    this.aiShips = [];
    this.currentShipIndex = 0;
    this.isHorizontal = true;
    this.gameStarted = false;
    this.playerTurn = true;
    this.processingTurn = false;
    this.gameEnded = false;
    
    this.initializeBoards();
    this.setupEventListeners();
    this.placeAIShips();
  }

  initializeBoards() {
    const playerBoardEl = document.getElementById('player-board');
    const aiBoardEl = document.getElementById('ai-board');
    
    this.createBoard(playerBoardEl, 'player');
    this.createBoard(aiBoardEl, 'ai');
  }

  createBoard(element, type) {
    element.innerHTML = '';
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = i;
        cell.dataset.col = j;
        cell.dataset.board = type;
        element.appendChild(cell);
      }
    }
  }

  setupEventListeners() {
    const playerBoard = document.getElementById('player-board');
    const aiBoard = document.getElementById('ai-board');
    const rotateBtn = document.getElementById('rotate-btn');

    playerBoard.addEventListener('mouseover', (e) => this.handleHover(e));
    playerBoard.addEventListener('mouseout', (e) => this.handleHover(e, true));
    playerBoard.addEventListener('click', (e) => this.handlePlayerBoardClick(e));
    aiBoard.addEventListener('click', (e) => this.handleAIBoardClick(e));
    rotateBtn.addEventListener('click', () => this.toggleRotation());
  }

  handleHover(e, isExit = false) {
    if (this.gameStarted) return;
    
    const cell = e.target;
    if (!cell.classList.contains('cell')) return;
    
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    
    if (this.currentShipIndex >= SHIPS.length) return;
    
    const ship = SHIPS[this.currentShipIndex];
    const cells = this.getShipCells(row, col, ship.size);
    
    if (!cells) return;
    
    cells.forEach(([r, c]) => {
      const cell = document.querySelector(`[data-board="player"][data-row="${r}"][data-col="${c}"]`);
      if (cell) {
        cell.style.backgroundColor = isExit ? '' : (this.canPlaceShip(row, col, ship.size) ? '#4CAF50' : '#f44336');
      }
    });
  }

  handlePlayerBoardClick(e) {
    if (this.gameStarted) return;
    
    const cell = e.target;
    if (!cell.classList.contains('cell')) return;
    
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    
    if (this.currentShipIndex >= SHIPS.length) return;
    
    const ship = SHIPS[this.currentShipIndex];
    if (this.placeShip(row, col, ship.size, this.playerBoard, this.playerShips)) {
      this.updateBoardDisplay();
      this.currentShipIndex++;
      
      if (this.currentShipIndex >= SHIPS.length) {
        this.startGame();
      }
    }
  }

  async handleAIBoardClick(e) {
    if (!this.gameStarted || !this.playerTurn || this.processingTurn || this.gameEnded) return;
    
    const cell = e.target;
    if (!cell.classList.contains('cell')) return;
    
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    
    if (this.aiBoard[row][col] === 'hit' || this.aiBoard[row][col] === 'miss') return;
    
    this.processingTurn = true;
    
    const isHit = this.aiBoard[row][col] === 'ship';
    this.aiBoard[row][col] = isHit ? 'hit' : 'miss';
    await this.updateBoardDisplay();
    
    if (this.checkWin(this.aiBoard)) {
      this.gameEnded = true;
      this.endGame(true);
      this.processingTurn = false;
      return;
    }
    
    this.playerTurn = false;
    await new Promise(resolve => setTimeout(resolve, 500));
    await this.aiTurn();
    this.processingTurn = false;
  }

  async aiTurn() {
    if (this.gameEnded) return;
    
    let row, col;
    do {
      row = Math.floor(Math.random() * BOARD_SIZE);
      col = Math.floor(Math.random() * BOARD_SIZE);
    } while (this.playerBoard[row][col] === 'hit' || this.playerBoard[row][col] === 'miss');
    
    const isHit = this.playerBoard[row][col] === 'ship';
    this.playerBoard[row][col] = isHit ? 'hit' : 'miss';
    
    // Ensure the board update is complete before continuing
    await this.updateBoardDisplay();
    
    if (this.checkWin(this.playerBoard)) {
      this.gameEnded = true;
      this.endGame(false);
      return;
    }
    
    this.playerTurn = true;
  }

  placeShip(row, col, size, board, ships) {
    if (!this.canPlaceShip(row, col, size)) return false;
    
    const cells = this.getShipCells(row, col, size);
    cells.forEach(([r, c]) => {
      board[r][c] = 'ship';
    });
    
    ships.push(cells);
    return true;
  }

  canPlaceShip(row, col, size) {
    const cells = this.getShipCells(row, col, size);
    if (!cells) return false;
    
    return cells.every(([r, c]) => {
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
      return this.playerBoard[r][c] === null;
    });
  }

  getShipCells(row, col, size) {
    const cells = [];
    for (let i = 0; i < size; i++) {
      if (this.isHorizontal) {
        if (col + i >= BOARD_SIZE) return null;
        cells.push([row, col + i]);
      } else {
        if (row + i >= BOARD_SIZE) return null;
        cells.push([row + i, col]);
      }
    }
    return cells;
  }

  placeAIShips() {
    SHIPS.forEach(ship => {
      let placed = false;
      while (!placed) {
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        this.isHorizontal = Math.random() < 0.5;
        
        if (this.canPlaceShip(row, col, ship.size)) {
          placed = this.placeShip(row, col, ship.size, this.aiBoard, this.aiShips);
        }
      }
    });
  }

  toggleRotation() {
    if (!this.gameStarted) {
      this.isHorizontal = !this.isHorizontal;
    } else {
      window.location.reload();
    }
  }

  async updateBoardDisplay() {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        for (let i = 0; i < BOARD_SIZE; i++) {
          for (let j = 0; j < BOARD_SIZE; j++) {
            const playerCell = document.querySelector(`[data-board="player"][data-row="${i}"][data-col="${j}"]`);
            const aiCell = document.querySelector(`[data-board="ai"][data-row="${i}"][data-col="${j}"]`);
            
            // Update player's board
            if (playerCell && this.playerBoard[i][j]) {
              playerCell.className = `cell ${this.playerBoard[i][j]}`;
            }
            
            // Update AI's board
            if (aiCell && this.aiBoard[i][j]) {
              aiCell.className = this.aiBoard[i][j] === 'ship' ? 'cell' : `cell ${this.aiBoard[i][j]}`;
            }
          }
        }
        resolve();
      });
    });
  }

  startGame() {
    this.gameStarted = true;
    const rotateBtn = document.getElementById('rotate-btn');
    rotateBtn.textContent = 'Restart Game';
  }

  checkWin(board) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (board[i][j] === 'ship') return false;
      }
    }
    return true;
  }

  endGame(playerWon) {
    const gameOver = document.createElement('div');
    gameOver.className = 'game-over';
    gameOver.innerHTML = `
      <h2>${playerWon ? 'Victory!' : 'Defeat!'}</h2>
      <button onclick="window.location.reload()">Play Again</button>
    `;
    document.body.appendChild(gameOver);
  }
}

new Battleship();
