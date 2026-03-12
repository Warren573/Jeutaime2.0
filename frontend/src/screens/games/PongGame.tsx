import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  TouchableOpacity,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAME_WIDTH = Math.min(SCREEN_WIDTH - 40, 320);
const GAME_HEIGHT = 400;
const PADDLE_WIDTH = 60;
const PADDLE_HEIGHT = 12;
const BALL_SIZE = 14;

interface Props {
  onEnd: (won: boolean, score: number) => void;
}

export default function PongGame({ onEnd }: Props) {
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [ballX, setBallX] = useState(GAME_WIDTH / 2 - BALL_SIZE / 2);
  const [ballY, setBallY] = useState(GAME_HEIGHT / 2 - BALL_SIZE / 2);
  const [ballVX, setBallVX] = useState(3);
  const [ballVY, setBallVY] = useState(3);
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
  const [aiX, setAiX] = useState(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
  const [gameStarted, setGameStarted] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        let newX = playerX + gesture.dx * 0.5;
        newX = Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, newX));
        setPlayerX(newX);
      },
    })
  ).current;

  useEffect(() => {
    if (!gameStarted) return;

    const interval = setInterval(() => {
      // Move ball
      let newBallX = ballX + ballVX;
      let newBallY = ballY + ballVY;
      let newVX = ballVX;
      let newVY = ballVY;

      // Wall collision (left/right)
      if (newBallX <= 0 || newBallX >= GAME_WIDTH - BALL_SIZE) {
        newVX = -newVX;
        newBallX = Math.max(0, Math.min(GAME_WIDTH - BALL_SIZE, newBallX));
      }

      // Player paddle collision (bottom)
      if (
        newBallY >= GAME_HEIGHT - PADDLE_HEIGHT - BALL_SIZE - 10 &&
        newBallY <= GAME_HEIGHT - 10 &&
        newBallX + BALL_SIZE >= playerX &&
        newBallX <= playerX + PADDLE_WIDTH &&
        newVY > 0
      ) {
        newVY = -Math.abs(newVY) - 0.5;
        newVX = newVX + ((newBallX - playerX - PADDLE_WIDTH / 2) / PADDLE_WIDTH) * 2;
      }

      // AI paddle collision (top)
      if (
        newBallY <= PADDLE_HEIGHT + 10 &&
        newBallY >= 10 &&
        newBallX + BALL_SIZE >= aiX &&
        newBallX <= aiX + PADDLE_WIDTH &&
        newVY < 0
      ) {
        newVY = Math.abs(newVY) + 0.3;
        newVX = newVX + ((newBallX - aiX - PADDLE_WIDTH / 2) / PADDLE_WIDTH) * 2;
      }

      // Score
      if (newBallY <= 0) {
        setPlayerScore(prev => {
          const newScore = prev + 1;
          if (newScore >= 5) onEnd(true, newScore);
          return newScore;
        });
        newBallX = GAME_WIDTH / 2 - BALL_SIZE / 2;
        newBallY = GAME_HEIGHT / 2 - BALL_SIZE / 2;
        newVX = (Math.random() > 0.5 ? 1 : -1) * 3;
        newVY = 3;
      } else if (newBallY >= GAME_HEIGHT - BALL_SIZE) {
        setAiScore(prev => {
          const newScore = prev + 1;
          if (newScore >= 5) onEnd(false, playerScore);
          return newScore;
        });
        newBallX = GAME_WIDTH / 2 - BALL_SIZE / 2;
        newBallY = GAME_HEIGHT / 2 - BALL_SIZE / 2;
        newVX = (Math.random() > 0.5 ? 1 : -1) * 3;
        newVY = -3;
      }

      // AI movement
      const aiCenter = aiX + PADDLE_WIDTH / 2;
      const ballCenter = newBallX + BALL_SIZE / 2;
      if (aiCenter < ballCenter - 10) {
        setAiX(prev => Math.min(GAME_WIDTH - PADDLE_WIDTH, prev + 3));
      } else if (aiCenter > ballCenter + 10) {
        setAiX(prev => Math.max(0, prev - 3));
      }

      setBallX(newBallX);
      setBallY(newBallY);
      setBallVX(newVX);
      setBallVY(newVY);
    }, 16);

    return () => clearInterval(interval);
  }, [gameStarted, ballX, ballY, ballVX, ballVY, playerX, aiX]);

  if (!gameStarted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🏓 Pong</Text>
        <Text style={styles.rules}>Premier à 5 points gagne!</Text>
        <TouchableOpacity style={styles.startBtn} onPress={() => setGameStarted(true)}>
          <Text style={styles.startText}>Commencer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.score}>{aiScore} - {playerScore}</Text>
      <View style={styles.gameArea} {...panResponder.panHandlers}>
        {/* AI Paddle */}
        <View style={[styles.paddle, styles.aiPaddle, { left: aiX }]} />
        {/* Ball */}
        <View style={[styles.ball, { left: ballX, top: ballY }]} />
        {/* Player Paddle */}
        <View style={[styles.paddle, styles.playerPaddle, { left: playerX }]} />
        {/* Center line */}
        <View style={styles.centerLine} />
      </View>
      <Text style={styles.hint}>← Glissez pour bouger →</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#3A2818', marginBottom: 10 },
  rules: { fontSize: 14, color: '#8B6F47', marginBottom: 20 },
  startBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 25 },
  startText: { color: '#FFF', fontWeight: '700', fontSize: 18 },
  score: { fontSize: 32, fontWeight: '700', color: '#3A2818', marginBottom: 10 },
  gameArea: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  paddle: {
    position: 'absolute',
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    backgroundColor: '#FFF',
    borderRadius: 4,
  },
  aiPaddle: { top: 10 },
  playerPaddle: { bottom: 10 },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    backgroundColor: '#FFD700',
    borderRadius: BALL_SIZE / 2,
  },
  centerLine: {
    position: 'absolute',
    top: GAME_HEIGHT / 2 - 1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  hint: { marginTop: 10, fontSize: 12, color: '#8B6F47' },
});
