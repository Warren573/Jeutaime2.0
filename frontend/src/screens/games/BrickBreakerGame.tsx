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
const PADDLE_HEIGHT = 10;
const BALL_SIZE = 10;
const BRICK_ROWS = 5;
const BRICK_COLS = 6;
const BRICK_WIDTH = (GAME_WIDTH - 20) / BRICK_COLS - 4;
const BRICK_HEIGHT = 16;

interface Props {
  onEnd: (won: boolean, score: number) => void;
}

interface Brick {
  x: number;
  y: number;
  alive: boolean;
  color: string;
}

export default function BrickBreakerGame({ onEnd }: Props) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [ballX, setBallX] = useState(GAME_WIDTH / 2 - BALL_SIZE / 2);
  const [ballY, setBallY] = useState(GAME_HEIGHT - 80);
  const [ballVX, setBallVX] = useState(3);
  const [ballVY, setBallVY] = useState(-3);
  const [paddleX, setPaddleX] = useState(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
  const [gameStarted, setGameStarted] = useState(false);
  const [bricks, setBricks] = useState<Brick[]>([]);

  const colors = ['#E91E63', '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3'];

  useEffect(() => {
    const initialBricks: Brick[] = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        initialBricks.push({
          x: 10 + col * (BRICK_WIDTH + 4),
          y: 40 + row * (BRICK_HEIGHT + 4),
          alive: true,
          color: colors[row],
        });
      }
    }
    setBricks(initialBricks);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        let newX = paddleX + gesture.dx * 0.6;
        newX = Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, newX));
        setPaddleX(newX);
      },
    })
  ).current;

  useEffect(() => {
    if (!gameStarted) return;

    const interval = setInterval(() => {
      let newBallX = ballX + ballVX;
      let newBallY = ballY + ballVY;
      let newVX = ballVX;
      let newVY = ballVY;

      // Wall collision
      if (newBallX <= 0 || newBallX >= GAME_WIDTH - BALL_SIZE) {
        newVX = -newVX;
        newBallX = Math.max(0, Math.min(GAME_WIDTH - BALL_SIZE, newBallX));
      }
      if (newBallY <= 0) {
        newVY = Math.abs(newVY);
      }

      // Paddle collision
      if (
        newBallY >= GAME_HEIGHT - PADDLE_HEIGHT - BALL_SIZE - 20 &&
        newBallY <= GAME_HEIGHT - 20 &&
        newBallX + BALL_SIZE >= paddleX &&
        newBallX <= paddleX + PADDLE_WIDTH &&
        newVY > 0
      ) {
        newVY = -Math.abs(newVY);
        const hitPos = (newBallX - paddleX) / PADDLE_WIDTH;
        newVX = (hitPos - 0.5) * 6;
      }

      // Brick collision
      let hitBrick = false;
      const newBricks = bricks.map(brick => {
        if (!brick.alive) return brick;
        if (
          newBallX + BALL_SIZE >= brick.x &&
          newBallX <= brick.x + BRICK_WIDTH &&
          newBallY + BALL_SIZE >= brick.y &&
          newBallY <= brick.y + BRICK_HEIGHT
        ) {
          hitBrick = true;
          setScore(prev => prev + 10);
          return { ...brick, alive: false };
        }
        return brick;
      });

      if (hitBrick) {
        newVY = -newVY;
        setBricks(newBricks);
        
        // Check win
        if (newBricks.every(b => !b.alive)) {
          onEnd(true, score + 10);
        }
      }

      // Ball out of bounds
      if (newBallY >= GAME_HEIGHT) {
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          onEnd(false, score);
        } else {
          newBallX = GAME_WIDTH / 2 - BALL_SIZE / 2;
          newBallY = GAME_HEIGHT - 80;
          newVX = (Math.random() > 0.5 ? 1 : -1) * 3;
          newVY = -3;
        }
      }

      setBallX(newBallX);
      setBallY(newBallY);
      setBallVX(newVX);
      setBallVY(newVY);
    }, 16);

    return () => clearInterval(interval);
  }, [gameStarted, ballX, ballY, ballVX, ballVY, paddleX, bricks, lives, score]);

  if (!gameStarted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🧱 Casse-Brique</Text>
        <Text style={styles.rules}>Détruisez tous les blocs!</Text>
        <TouchableOpacity style={styles.startBtn} onPress={() => setGameStarted(true)}>
          <Text style={styles.startText}>Commencer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.scoreText}>Score: {score}</Text>
        <Text style={styles.livesText}>❤️ {lives}</Text>
      </View>
      <View style={styles.gameArea} {...panResponder.panHandlers}>
        {/* Bricks */}
        {bricks.map((brick, i) =>
          brick.alive ? (
            <View
              key={i}
              style={[
                styles.brick,
                {
                  left: brick.x,
                  top: brick.y,
                  backgroundColor: brick.color,
                },
              ]}
            />
          ) : null
        )}
        {/* Ball */}
        <View style={[styles.ball, { left: ballX, top: ballY }]} />
        {/* Paddle */}
        <View style={[styles.paddle, { left: paddleX }]} />
      </View>
      <Text style={styles.hint}>← Glissez pour bouger →</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#3A2818', marginBottom: 10 },
  rules: { fontSize: 14, color: '#8B6F47', marginBottom: 20 },
  startBtn: { backgroundColor: '#E91E63', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 25 },
  startText: { color: '#FFF', fontWeight: '700', fontSize: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', width: GAME_WIDTH, marginBottom: 10 },
  scoreText: { fontSize: 18, fontWeight: '700', color: '#4CAF50' },
  livesText: { fontSize: 18, fontWeight: '700', color: '#F44336' },
  gameArea: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  brick: {
    position: 'absolute',
    width: BRICK_WIDTH,
    height: BRICK_HEIGHT,
    borderRadius: 3,
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    backgroundColor: '#FFF',
    borderRadius: BALL_SIZE / 2,
  },
  paddle: {
    position: 'absolute',
    bottom: 20,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    backgroundColor: '#4FC3F7',
    borderRadius: 5,
  },
  hint: { marginTop: 10, fontSize: 12, color: '#8B6F47' },
});
