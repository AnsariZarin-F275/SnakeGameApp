import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';

const SEGMENT_SIZE = 18;
const INITIAL_SNAKE_LENGTH = 4;
const GAME_SPEED_MS = 200;

type Position = { x: number; y: number };
type Direction = 'left' | 'right' | 'up' | 'down';

const DIRECTION_DELTAS: Record<Direction, Position> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  left: 'right',
  right: 'left',
  up: 'down',
  down: 'up',
};

function createInitialSnake(gridCols: number, gridRows: number): Position[] {
  const centerCol = Math.floor(gridCols / 2);
  const centerRow = Math.floor(gridRows / 2);

  return Array.from({ length: INITIAL_SNAKE_LENGTH }, (_, index) => ({
    x: centerCol - index,
    y: centerRow,
  }));
}

function getRandomFoodPosition(
  gridCols: number,
  gridRows: number,
  snake: Position[]
): Position {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));

  let position: Position;
  do {
    position = {
      x: Math.floor(Math.random() * gridCols),
      y: Math.floor(Math.random() * gridRows),
    };
  } while (occupied.has(`${position.x},${position.y}`));

  return position;
}

function wrapHorizontal(x: number, gridCols: number): number {
  if (gridCols <= 0) {
    return x;
  }
  if (x < 0) {
    return gridCols - 1;
  }
  if (x >= gridCols) {
    return 0;
  }
  return x;
}

function isTopOrBottomCollision(y: number, gridRows: number): boolean {
  return y < 0 || y >= gridRows;
}

function isSelfCollision(newHead: Position, snake: Position[]): boolean {
  return snake.some(
    (segment) => segment.x === newHead.x && segment.y === newHead.y
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [snake, setSnake] = useState<Position[]>([]);
  const [food, setFood] = useState<Position | null>(null);
  const [direction, setDirection] = useState<Direction>('right');
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameAreaWidth, setGameAreaWidth] = useState(0);
  const [gameAreaHeight, setGameAreaHeight] = useState(0);

  const hasInitialized = useRef(false);
  const foodRef = useRef<Position | null>(null);
  const directionRef = useRef<Direction>(direction);
  const gridColsRef = useRef(0);
  const gridRowsRef = useRef(0);

  const gridCols = Math.floor(gameAreaWidth / SEGMENT_SIZE);
  const gridRows = Math.floor(gameAreaHeight / SEGMENT_SIZE);

  foodRef.current = food;
  directionRef.current = direction;
  gridColsRef.current = gridCols;
  gridRowsRef.current = gridRows;

  const handleStartGame = () => {
    if (snake.length === 0 || food === null || gridCols === 0 || gridRows === 0) {
      return;
    }
    setIsPlaying(true);
  };

  const handleRestartGame = () => {
    if (gridCols === 0 || gridRows === 0) {
      return;
    }

    const initialSnake = createInitialSnake(gridCols, gridRows);

    directionRef.current = 'right';
    setDirection('right');
    setScore(0);
    setSnake(initialSnake);
    setFood(getRandomFoodPosition(gridCols, gridRows, initialSnake));
    setIsGameOver(false);
    setIsPlaying(true);
  };

  const handleGameOver = () => {
    setIsPlaying(false);
    setIsGameOver(true);
  };

  const handleGameAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setGameAreaWidth(width);
    setGameAreaHeight(height);

    const cols = Math.floor(width / SEGMENT_SIZE);
    const rows = Math.floor(height / SEGMENT_SIZE);

    if (!hasInitialized.current && cols > 0 && rows > 0) {
      const initialSnake = createInitialSnake(cols, rows);
      setSnake(initialSnake);
      setFood(getRandomFoodPosition(cols, rows, initialSnake));
      hasInitialized.current = true;
    }
  };

  const moveLeft = () => changeDirection('left');
  const moveRight = () => changeDirection('right');
  const moveUp = () => changeDirection('up');
  const moveDown = () => changeDirection('down');

  function changeDirection(newDirection: Direction) {
    if (directionRef.current === OPPOSITE_DIRECTIONS[newDirection]) {
      return;
    }

    directionRef.current = newDirection;
    setDirection(newDirection);
  }

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const gameLoop = setInterval(() => {
      setSnake((currentSnake) => {
        if (currentSnake.length === 0) {
          return currentSnake;
        }

        const cols = gridColsRef.current;
        const rows = gridRowsRef.current;
        if (cols === 0 || rows === 0) {
          return currentSnake;
        }

        const head = currentSnake[0];
        const delta = DIRECTION_DELTAS[directionRef.current];
        const newHead: Position = {
          x: wrapHorizontal(head.x + delta.x, cols),
          y: head.y + delta.y,
        };

        if (isTopOrBottomCollision(newHead.y, rows)) {
          handleGameOver();
          return currentSnake;
        }

        if (isSelfCollision(newHead, currentSnake)) {
          handleGameOver();
          return currentSnake;
        }

        const currentFood = foodRef.current;
        if (!currentFood) {
          return [newHead, ...currentSnake.slice(0, -1)];
        }

        const ateFood =
          newHead.x === currentFood.x && newHead.y === currentFood.y;

        if (ateFood) {
          const grownSnake = [newHead, ...currentSnake];
          setScore((currentScore) => currentScore + 1);
          setFood(getRandomFoodPosition(cols, rows, grownSnake));
          return grownSnake;
        }

        return [newHead, ...currentSnake.slice(0, -1)];
      });
    }, GAME_SPEED_MS);

    return () => clearInterval(gameLoop);
  }, [isPlaying]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? '#0f1419' : '#f4f7f5' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.content}>
        <Text style={[styles.title, { color: isDark ? '#ffffff' : '#1a2e1a' }]}>
          Snake Game
        </Text>

        <View
          style={[
            styles.scoreCard,
            {
              backgroundColor: isDark ? '#1a2420' : '#ffffff',
              borderColor: isDark ? '#2d3b32' : '#e0ebe3',
            },
          ]}>
          <Text style={[styles.scoreLabel, { color: isDark ? '#9ca89f' : '#5c6b5f' }]}>
            Current Score
          </Text>
          <Text style={[styles.scoreValue, { color: isDark ? '#4ade80' : '#16a34a' }]}>
            {score}
          </Text>
        </View>

        <View
          style={[
            styles.gameArea,
            {
              backgroundColor: isDark ? '#141c17' : '#e8f0ea',
              borderColor: isDark ? '#243028' : '#d4e4d8',
            },
          ]}
          onLayout={handleGameAreaLayout}>
          {food && (
            <View
              style={[
                styles.food,
                {
                  left: food.x * SEGMENT_SIZE,
                  top: food.y * SEGMENT_SIZE,
                },
              ]}
            />
          )}

          {snake.map((segment, index) => (
            <View
              key={`${segment.x}-${segment.y}-${index}`}
              style={[
                styles.segment,
                {
                  left: segment.x * SEGMENT_SIZE,
                  top: segment.y * SEGMENT_SIZE,
                },
                index === 0 && styles.headSegment,
                index === snake.length - 1 && styles.tailSegment,
              ]}
            />
          ))}

          {isGameOver && (
            <View style={styles.gameOverOverlay}>
              <Text style={[styles.gameOverTitle, { color: isDark ? '#ffffff' : '#1a2e1a' }]}>
                Game Over
              </Text>
              <Text style={[styles.gameOverScore, { color: isDark ? '#4ade80' : '#16a34a' }]}>
                Final Score: {score}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <View style={styles.controlRow}>
            <Pressable
              style={({ pressed }) => [
                styles.controlButton,
                {
                  backgroundColor: isDark ? '#1a2420' : '#ffffff',
                  borderColor: isDark ? '#2d3b32' : '#d4e4d8',
                },
                pressed && styles.controlButtonPressed,
              ]}
              onPress={moveUp}>
              <Text style={[styles.controlButtonText, { color: isDark ? '#ffffff' : '#1a2e1a' }]}>
                Move Up
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.controlButton,
                {
                  backgroundColor: isDark ? '#1a2420' : '#ffffff',
                  borderColor: isDark ? '#2d3b32' : '#d4e4d8',
                },
                pressed && styles.controlButtonPressed,
              ]}
              onPress={moveDown}>
              <Text style={[styles.controlButtonText, { color: isDark ? '#ffffff' : '#1a2e1a' }]}>
                Move Down
              </Text>
            </Pressable>
          </View>

          <View style={styles.controlRow}>
            <Pressable
              style={({ pressed }) => [
                styles.controlButton,
                {
                  backgroundColor: isDark ? '#1a2420' : '#ffffff',
                  borderColor: isDark ? '#2d3b32' : '#d4e4d8',
                },
                pressed && styles.controlButtonPressed,
              ]}
              onPress={moveLeft}>
              <Text style={[styles.controlButtonText, { color: isDark ? '#ffffff' : '#1a2e1a' }]}>
                Move Left
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.controlButton,
                {
                  backgroundColor: isDark ? '#1a2420' : '#ffffff',
                  borderColor: isDark ? '#2d3b32' : '#d4e4d8',
                },
                pressed && styles.controlButtonPressed,
              ]}
              onPress={moveRight}>
              <Text style={[styles.controlButtonText, { color: isDark ? '#ffffff' : '#1a2e1a' }]}>
                Move Right
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            isPlaying && styles.startButtonDisabled,
            pressed && !isPlaying && styles.startButtonPressed,
          ]}
          onPress={isGameOver ? handleRestartGame : handleStartGame}
          disabled={isPlaying}>
          <Text style={styles.startButtonText}>
            {isPlaying ? 'Playing...' : isGameOver ? 'Restart Game' : 'Start Game'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );  
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  scoreCard: {
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  gameArea: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  food: {
    position: 'absolute',
    width: SEGMENT_SIZE,
    height: SEGMENT_SIZE,
    backgroundColor: '#ef4444',
    borderRadius: SEGMENT_SIZE / 2,
  },
  segment: {
    position: 'absolute',
    width: SEGMENT_SIZE,
    height: SEGMENT_SIZE,
    backgroundColor: '#22c55e',
  },
  headSegment: {
    backgroundColor: '#4ade80',
    borderRadius: 4,
  },
  tailSegment: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    gap: 8,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  gameOverScore: {
    fontSize: 20,
    fontWeight: '600',
  },
  controls: {
    gap: 12,
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  controlButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  controlButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  startButton: {
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonDisabled: {
    backgroundColor: '#86efac',
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonPressed: {
    backgroundColor: '#16a34a',
    transform: [{ scale: 0.98 }],
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
