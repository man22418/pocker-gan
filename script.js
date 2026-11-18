const $ = (id) => document.getElementById(id);
const themeBtn = $('themeBtn');
const opponentsEl = $('opponents');
const boardEl = $('board');
const playerCardsEl = $('playerCards');
const statusEl = $('status');
const playerChipsEl = $('playerChips');
const playerSeatChipsEl = $('playerSeatChips');
const potEl = $('pot');
const dealBtn = $('dealBtn');
const foldBtn = $('foldBtn');
const checkBtn = $('checkBtn');
const betBtn = $('betBtn');

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const players = [
  { name: 'Avery', chips: 500, hand: [], folded: false },
  { name: 'Jordan', chips: 500, hand: [], folded: false },
  { name: 'Riley', chips: 500, hand: [], folded: false }
];
let playerChips = 500;
let deck = [];
let board = [];
let pot = 0;
let street = -1;
let handActive = false;
let playerFolded = false;
let revealed = false;
let handNumber = 0;

function updateStacks() {
  playerChipsEl.textContent = playerChips;
  playerSeatChipsEl.textContent = `${playerChips} chips`;
}

function makeDeck() {
  deck = suits.flatMap((suit) => ranks.map((rank, index) => ({ suit, rank, value: index + 2 })));
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function drawCard() { return deck.pop(); }

function cardElement(card, hidden = false) {
  const node = document.createElement('div');
  node.className = hidden ? 'card back' : `card${['♥', '♦'].includes(card.suit) ? ' red' : ''}`;
  if (!hidden) {
    node.innerHTML = `<span>${card.rank}${card.suit}</span><span class="suit-center">${card.suit}</span><span class="corner-bottom">${card.rank}${card.suit}</span>`;
    node.setAttribute('aria-label', `${card.rank} ${card.suit}`);
  } else {
    node.setAttribute('aria-label', 'Face-down card');
  }
  return node;
}

function renderCards(container, cards, hide = false) {
  container.replaceChildren();
  cards.forEach((card) => container.appendChild(cardElement(card, hide)));
}

function renderOpponents() {
  opponentsEl.replaceChildren();
  players.forEach((player) => {
    const seat = document.createElement('div');
    seat.className = `seat${player.folded ? ' folded' : ''}`;
    const name = document.createElement('div');
    name.className = 'seat-name';
    name.textContent = player.name;
    const stack = document.createElement('div');
    stack.className = 'seat-stack';
    stack.textContent = `${player.chips} chips`;
    const note = document.createElement('div');
    note.className = 'seat-note';
    note.textContent = player.folded ? 'Folded' : (revealed && !player.folded ? handName(player.hand.concat(board)) : 'In hand');
    const cards = document.createElement('div');
    cards.className = 'seat-cards';
    if (player.hand.length) renderCards(cards, player.hand, !revealed);
    seat.append(name, stack, note, cards);
    opponentsEl.appendChild(seat);
  });
}

function setButtons(active) {
  foldBtn.disabled = !active;
  checkBtn.disabled = !active;
  betBtn.disabled = !active || playerChips < 10;
  dealBtn.disabled = active;
}

function dealHand() {
  if (playerChips <= 0) {
    statusEl.textContent = 'You are out of chips. Start a fresh table to play again.';
    dealBtn.textContent = 'Out of chips';
    dealBtn.disabled = true;
    return;
  }
  makeDeck();
  board = [];
  pot = 0;
  street = 0;
  playerFolded = false;
  revealed = false;
  handActive = true;
  handNumber += 1;
  playerChips -= 10;
  pot += 40;
  players.forEach((player) => {
    if (player.chips <= 0) player.chips = 500;
    player.chips -= 10;
    player.folded = false;
    player.hand = [drawCard(), drawCard()];
  });
  const hand = [drawCard(), drawCard()];
  playerCardsEl.replaceChildren();
  renderCards(playerCardsEl, hand);
  window.playerHand = hand;
  boardEl.replaceChildren();
  potEl.textContent = pot;
  updateStacks();
  renderOpponents();
  statusEl.textContent = `Hand ${handNumber}: pre-flop. The table ante is 10 chips each.`;
  setButtons(true);
}

function getActivePlayers() { return players.filter((player) => !player.folded); }

function playerAction(action) {
  if (!handActive) return;
  if (action === 'fold') {
    playerFolded = true;
    const remaining = getActivePlayers();
    const winner = remaining[Math.floor(Math.random() * remaining.length)];
    if (winner) winner.chips += pot;
    pot = 0;
    potEl.textContent = pot;
    updateStacks();
    finishHand(`${winner ? winner.name : 'The table'} takes the pot. You folded.`);
    return;
  }
  if (action === 'bet') {
    playerChips -= 10;
    pot += 10;
    players.forEach((player) => {
      if (player.folded) return;
      if (Math.random() < 0.12 && street > 0) player.folded = true;
      else {
        player.chips -= 10;
        pot += 10;
      }
    });
    statusEl.textContent = 'You bet 10. The table responds…';
  } else {
    statusEl.textContent = 'You check. The table checks around…';
  }
  if (getActivePlayers().length === 0) {
    playerChips += pot;
    pot = 0;
    potEl.textContent = pot;
    updateStacks();
    finishHand('Everyone folded. You take the pot!');
    return;
  }
  potEl.textContent = pot;
  updateStacks();
  renderOpponents();
  advanceStreet();
}

function advanceStreet() {
  if (street === 0) {
    board.push(drawCard(), drawCard(), drawCard());
    street = 1;
    statusEl.textContent = 'The flop is out. Make your move.';
  } else if (street === 1) {
    board.push(drawCard());
    street = 2;
    statusEl.textContent = 'The turn is out. Make your move.';
  } else if (street === 2) {
    board.push(drawCard());
    street = 3;
    statusEl.textContent = 'The river is out. Make your move.';
  } else {
    showdown();
    return;
  }
  renderCards(boardEl, board);
}

function combinations(cards, size) {
  const results = [];
  function choose(start, chosen) {
    if (chosen.length === size) { results.push(chosen); return; }
    for (let i = start; i <= cards.length - (size - chosen.length); i += 1) choose(i + 1, chosen.concat(cards[i]));
  }
  choose(0, []);
  return results;
}

function evaluateFive(cards) {
  const values = cards.map((card) => card.value).sort((a, b) => b - a);
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const unique = [...new Set(values)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (unique.length === 5 && unique[0] - unique[4] === 4) straightHigh = unique[0];
  if (unique.join(',') === '14,5,4,3,2') straightHigh = 5;
  if (flush && straightHigh) return [8, straightHigh];
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]];
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]];
  if (flush) return [5, ...values];
  if (straightHigh) return [4, straightHigh];
  if (groups[0][1] === 3) return [3, groups[0][0], ...groups.slice(1).map((group) => group[0]).sort((a, b) => b - a)];
  if (groups[0][1] === 2 && groups[1][1] === 2) return [2, Math.max(groups[0][0], groups[1][0]), Math.min(groups[0][0], groups[1][0]), groups[2][0]];
  if (groups[0][1] === 2) return [1, groups[0][0], ...groups.slice(1).map((group) => group[0]).sort((a, b) => b - a)];
  return [0, ...values];
}

const handNames = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
function evaluateHand(cards) {
  return combinations(cards, 5).map(evaluateFive).sort(compareRanks).at(-1);
}
function compareRanks(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const difference = (a[i] || 0) - (b[i] || 0);
    if (difference) return difference;
  }
  return 0;
}
function handName(cards) { return handNames[evaluateHand(cards)[0]]; }

function showdown() {
  revealed = true;
  const contenders = [{ name: 'You', hand: window.playerHand, player: null }, ...getActivePlayers().map((player) => ({ name: player.name, hand: player.hand, player }))];
  const ranked = contenders.map((entry) => ({ ...entry, rank: evaluateHand(entry.hand.concat(board)) }));
  ranked.sort((a, b) => compareRanks(b.rank, a.rank));
  const winners = ranked.filter((entry) => compareRanks(entry.rank, ranked[0].rank) === 0);
  const share = Math.floor(pot / winners.length);
  winners.forEach((winner) => {
    if (winner.player) winner.player.chips += share;
    else playerChips += share;
  });
  pot = 0;
  potEl.textContent = pot;
  updateStacks();
  renderOpponents();
  const winnerNames = winners.map((winner) => winner.name).join(' and ');
  const handLabel = handNames[ranked[0].rank[0]];
  finishHand(`${winnerNames} win${winners.length === 1 ? 's' : ''} with ${handLabel}!`);
}

function finishHand(message) {
  handActive = false;
  setButtons(false);
  dealBtn.disabled = false;
  dealBtn.textContent = 'Deal Next Hand';
  statusEl.textContent = message;
  if (playerFolded) renderCards(playerCardsEl, window.playerHand);
  renderOpponents();
}

foldBtn.addEventListener('click', () => playerAction('fold'));
checkBtn.addEventListener('click', () => playerAction('check'));
betBtn.addEventListener('click', () => playerAction('bet'));
dealBtn.addEventListener('click', dealHand);
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  themeBtn.textContent = document.body.classList.contains('light-mode') ? '☀' : '☾';
});

updateStacks();
renderOpponents();
