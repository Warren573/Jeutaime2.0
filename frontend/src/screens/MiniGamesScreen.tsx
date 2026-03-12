import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { miniGames } from '../data/gameData';

// Import des jeux
import PongGame from './games/PongGame';
import BrickBreakerGame from './games/BrickBreakerGame';
import CardGame from './games/CardGame';
import StoryGame from './games/StoryGame';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============= MORPION =============
const TicTacToe = ({ onWin, onLose }: { onWin: () => void; onLose: () => void }) => {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b,c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handlePress = (index: number) => {
    if (board[index] || gameOver || !isPlayerTurn) return;
    
    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    
    const winner = checkWinner(newBoard);
    if (winner === 'X') { setGameOver(true); onWin(); return; }
    if (!newBoard.includes(null)) { setGameOver(true); return; }
    
    setIsPlayerTurn(false);
  };

  useEffect(() => {
    if (!isPlayerTurn && !gameOver) {
      setTimeout(() => {
        const empty = board.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
        if (empty.length === 0) return;
        const aiMove = empty[Math.floor(Math.random() * empty.length)];
        const newBoard = [...board];
        newBoard[aiMove] = 'O';
        setBoard(newBoard);
        
        const winner = checkWinner(newBoard);
        if (winner === 'O') { setGameOver(true); onLose(); return; }
        if (!newBoard.includes(null)) { setGameOver(true); return; }
        
        setIsPlayerTurn(true);
      }, 500);
    }
  }, [isPlayerTurn, gameOver]);

  return (
    <View style={tttStyles.container}>
      <Text style={tttStyles.title}>✖️ Morpion ⭕</Text>
      <View style={tttStyles.board}>
        {board.map((cell, index) => (
          <TouchableOpacity
            key={index}
            style={tttStyles.cell}
            onPress={() => handlePress(index)}
          >
            <Text style={[tttStyles.cellText, cell === 'X' ? tttStyles.x : tttStyles.o]}>
              {cell}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {gameOver && (
        <TouchableOpacity
          style={tttStyles.resetBtn}
          onPress={() => { setBoard(Array(9).fill(null)); setGameOver(false); setIsPlayerTurn(true); }}
        >
          <Text style={tttStyles.resetText}>Rejouer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const tttStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#3A2818', marginBottom: 24 },
  board: { flexDirection: 'row', flexWrap: 'wrap', width: SCREEN_WIDTH - 60, height: SCREEN_WIDTH - 60, maxWidth: 320, maxHeight: 320 },
  cell: { width: '33.33%', height: '33.33%', backgroundColor: '#FFF', borderWidth: 3, borderColor: '#8B6F47', alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 56, fontWeight: '700' },
  x: { color: '#E91E63' },
  o: { color: '#2196F3' },
  resetBtn: { marginTop: 30, backgroundColor: '#4CAF50', paddingHorizontal: 50, paddingVertical: 18, borderRadius: 25 },
  resetText: { color: '#FFF', fontWeight: '700', fontSize: 18 },
});

// ============= WHACK-A-MOLE (Tape-Taupe) =============
const WhackAMole = ({ onEnd }: { onEnd: (score: number) => void }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [activeMole, setActiveMole] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (!gameStarted) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onEnd(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    const moleTimer = setInterval(() => {
      setActiveMole(Math.floor(Math.random() * 9));
      setTimeout(() => setActiveMole(null), 700);
    }, 900);
    
    return () => { clearInterval(timer); clearInterval(moleTimer); };
  }, [gameStarted, score]);

  const hitMole = (index: number) => {
    if (index === activeMole) {
      setScore(prev => prev + 10);
      setActiveMole(null);
    }
  };

  if (!gameStarted) {
    return (
      <View style={wamStyles.container}>
        <Text style={wamStyles.title}>🔨 Tape-Taupe</Text>
        <Text style={wamStyles.rules}>Tapez les taupes le plus vite possible!</Text>
        <TouchableOpacity style={wamStyles.startBtn} onPress={() => setGameStarted(true)}>
          <Text style={wamStyles.startText}>Commencer!</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={wamStyles.container}>
      <View style={wamStyles.header}>
        <Text style={wamStyles.score}>Score: {score}</Text>
        <Text style={wamStyles.timer}>⏱️ {timeLeft}s</Text>
      </View>
      <View style={wamStyles.grid}>
        {Array(9).fill(null).map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[wamStyles.hole, activeMole === index && wamStyles.activeMole]}
            onPress={() => hitMole(index)}
          >
            {activeMole === index && <Text style={wamStyles.moleEmoji}>🐹</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const wamStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#3A2818', marginBottom: 12 },
  rules: { fontSize: 16, color: '#8B6F47', marginBottom: 24 },
  startBtn: { backgroundColor: '#FF9800', paddingHorizontal: 60, paddingVertical: 20, borderRadius: 30 },
  startText: { color: '#FFF', fontWeight: '700', fontSize: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', width: SCREEN_WIDTH - 60, marginBottom: 24 },
  score: { fontSize: 24, fontWeight: '700', color: '#4CAF50' },
  timer: { fontSize: 24, fontWeight: '700', color: '#F44336' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: SCREEN_WIDTH - 60, height: SCREEN_WIDTH - 60, maxWidth: 320, maxHeight: 320 },
  hole: { width: '33.33%', height: '33.33%', backgroundColor: '#8D6E63', borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#5D4037' },
  activeMole: { backgroundColor: '#A1887F' },
  moleEmoji: { fontSize: 50 },
});

// ============= MEMORY CARDS =============
const MemoryGame = ({ onEnd }: { onEnd: (pairs: number) => void }) => {
  const emojis = ['🌹', '💎', '🎁', '✨', '🍾', '💌', '🌟', '🎭'];
  const [cards, setCards] = useState<{ emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    const shuffled = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map(emoji => ({ emoji, flipped: false, matched: false }));
    setCards(shuffled);
  }, []);

  const flipCard = (index: number) => {
    if (cards[index].flipped || cards[index].matched || flippedIndices.length === 2) return;
    
    const newCards = [...cards];
    newCards[index].flipped = true;
    setCards(newCards);
    
    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);
    
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      const [first, second] = newFlipped;
      
      if (cards[first].emoji === newCards[second].emoji) {
        setTimeout(() => {
          const matched = [...newCards];
          matched[first].matched = true;
          matched[second].matched = true;
          setCards(matched);
          setFlippedIndices([]);
          const newMatches = matches + 1;
          setMatches(newMatches);
          if (newMatches === 8) onEnd(newMatches);
        }, 500);
      } else {
        setTimeout(() => {
          const reset = [...newCards];
          reset[first].flipped = false;
          reset[second].flipped = false;
          setCards(reset);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  return (
    <View style={memStyles.container}>
      <Text style={memStyles.title}>🃏 Memory</Text>
      <Text style={memStyles.info}>Paires: {matches}/8 | Coups: {moves}</Text>
      <View style={memStyles.grid}>
        {cards.map((card, index) => (
          <TouchableOpacity
            key={index}
            style={[memStyles.card, (card.flipped || card.matched) && memStyles.cardFlipped]}
            onPress={() => flipCard(index)}
          >
            <Text style={memStyles.cardEmoji}>
              {card.flipped || card.matched ? card.emoji : '❓'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const memStyles = StyleSheet.create({
  container: { alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#3A2818', marginBottom: 10 },
  info: { fontSize: 16, color: '#8B6F47', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'center' },
  card: { width: 60, height: 60, backgroundColor: '#8D6E63', borderRadius: 10, margin: 5, alignItems: 'center', justifyContent: 'center' },
  cardFlipped: { backgroundColor: '#FFF8E7' },
  cardEmoji: { fontSize: 28 },
});

// ============= ÉCRAN PRINCIPAL =============
export default function MiniGamesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addCoins, addPoints, incrementStat } = useStore();
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [result, setResult] = useState<{ won: boolean; reward: number } | null>(null);

  const handleWin = (game: string, reward: number) => {
    addCoins(reward);
    addPoints(15);
    incrementStat('gamesWon');
    setResult({ won: true, reward });
  };

  const handleLose = () => {
    addPoints(5);
    setResult({ won: false, reward: 0 });
  };

  const difficultyColors = {
    facile: '#4CAF50',
    moyen: '#FF9800',
    difficile: '#F44336',
  };

  if (result) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.resultBox}>
          <Text style={styles.resultEmoji}>{result.won ? '🎉' : '😢'}</Text>
          <Text style={styles.resultTitle}>{result.won ? 'Victoire!' : 'Perdu!'}</Text>
          {result.won && <Text style={styles.resultReward}>+{result.reward} 💰</Text>}
          <TouchableOpacity
            style={styles.playAgainBtn}
            onPress={() => { setResult(null); setCurrentGame(null); }}
          >
            <Text style={styles.playAgainText}>Retour aux jeux</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (currentGame) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentGame(null)}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </TouchableOpacity>
        
        <ScrollView contentContainerStyle={styles.gameContent}>
          {currentGame === 'tictactoe' && (
            <TicTacToe onWin={() => handleWin('tictactoe', 30)} onLose={handleLose} />
          )}
          {currentGame === 'whack' && (
            <WhackAMole onEnd={(score) => score >= 50 ? handleWin('whack', score) : handleLose()} />
          )}
          {currentGame === 'memory' && (
            <MemoryGame onEnd={() => handleWin('memory', 40)} />
          )}
          {currentGame === 'pong' && (
            <PongGame onEnd={(won, score) => won ? handleWin('pong', 60) : handleLose()} />
          )}
          {currentGame === 'brickbreaker' && (
            <BrickBreakerGame onEnd={(won, score) => won ? handleWin('brickbreaker', 70) : handleLose()} />
          )}
          {currentGame === 'cards' && (
            <CardGame onEnd={(won, coins) => won ? handleWin('cards', coins) : handleLose()} />
          )}
          {currentGame === 'story' && (
            <StoryGame onEnd={(won, score) => won ? handleWin('story', 50) : handleLose()} />
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎮 Mini-Jeux</Text>
        <Text style={styles.subtitle}>Gagnez des pièces en jouant!</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {miniGames.map(game => (
          <TouchableOpacity
            key={game.id}
            style={styles.gameCard}
            onPress={() => setCurrentGame(game.id)}
          >
            <Text style={styles.gameEmoji}>{game.emoji}</Text>
            <View style={styles.gameInfo}>
              <Text style={styles.gameName}>{game.name}</Text>
              <Text style={styles.gameDesc}>{game.description}</Text>
              <View style={styles.gameFooter}>
                <Text style={styles.gameReward}>🪙 {game.reward}</Text>
                <View style={[styles.diffBadge, { backgroundColor: difficultyColors[game.difficulty] }]}>
                  <Text style={styles.diffText}>{game.difficulty}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.playArrow}>▶</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  backText: { fontSize: 16, color: '#8B6F47', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#3A2818' },
  subtitle: { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  gameCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  gameEmoji: { fontSize: 40, marginRight: 14 },
  gameInfo: { flex: 1 },
  gameName: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  gameDesc: { fontSize: 13, color: '#8B6F47', marginTop: 2 },
  gameFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  gameReward: { fontSize: 14, color: '#DAA520', fontWeight: '600' },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  diffText: { fontSize: 10, color: '#FFF', fontWeight: '600', textTransform: 'capitalize' },
  playArrow: { fontSize: 18, color: '#8B6F47' },
  backBtn: { padding: 16 },
  backBtnText: { fontSize: 16, color: '#8B6F47' },
  gameContent: { flexGrow: 1 },
  resultBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  resultEmoji: { fontSize: 80, marginBottom: 20 },
  resultTitle: { fontSize: 32, fontWeight: '700', color: '#3A2818' },
  resultReward: { fontSize: 24, color: '#DAA520', fontWeight: '700', marginTop: 10 },
  playAgainBtn: { marginTop: 30, backgroundColor: '#4CAF50', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 25 },
  playAgainText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
