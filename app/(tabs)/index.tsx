import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';

const SEGMENT_SIZE = 18;
const INITIAL_SNAKE_LENGTH = 4;
const GAME_SPEED_MS = 240;

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

function hexToRgb(hex: string): [number, number, number] {
  const parsed = hex.replace('#', '');
  const value = parseInt(parsed, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function interpolateColor(fromHex: string, toHex: string, factor: number): string {
  const [r1, g1, b1] = hexToRgb(fromHex);
  const [r2, g2, b2] = hexToRgb(toHex);
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

function getBodySegmentColor(index: number, total: number): string {
  const factor = total <= 1 ? 0 : index / (total - 1);
  return interpolateColor('#4ade80', '#15803d', factor);
}

function getDirectionAngle(direction: Direction): string {
  switch (direction) {
    case 'right':
      return '0deg';
    case 'down':
      return '90deg';
    case 'left':
      return '180deg';
    case 'up':
      return '270deg';
    default:
      return '0deg';
  }
}

const HIGH_SCORE_STORAGE_KEY = '@snake_game:high_score';

async function loadHighScore(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch (error) {
    console.warn('Failed to load high score:', error);
    return 0;
  }
}

async function saveHighScore(value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(HIGH_SCORE_STORAGE_KEY, value.toString());
  } catch (error) {
    console.warn('Failed to save high score:', error);
  }
}

type AnimatedButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

function AnimatedButton({ onPress, disabled, style, children }: AnimatedButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [snake, setSnake] = useState<Position[]>([]);
  const [food, setFood] = useState<Position | null>(null);
  const [direction, setDirection] = useState<Direction>('right');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameAreaWidth, setGameAreaWidth] = useState(0);
  const [gameAreaHeight, setGameAreaHeight] = useState(0);

  const hasInitialized = useRef(false);
  const foodRef = useRef<Position | null>(null);
  const directionRef = useRef<Direction>(direction);
  const gridColsRef = useRef(0);
  const gridRowsRef = useRef(0);
  const scoreRef = useRef(score);
  const segmentAnimsRef = useRef<Animated.ValueXY[]>([]);
  const foodScale = useRef(new Animated.Value(0)).current;

  const gridCols = Math.floor(gameAreaWidth / SEGMENT_SIZE);
  const gridRows = Math.floor(gameAreaHeight / SEGMENT_SIZE);

  foodRef.current = food;
  directionRef.current = direction;
  gridColsRef.current = gridCols;
  gridRowsRef.current = gridRows;
  scoreRef.current = score;

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

    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      saveHighScore(finalScore);
    }
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
    loadHighScore().then(setHighScore);
  }, []);

  // Animates each segment's visual position smoothly whenever the snake
  // state changes. This only watches state from the outside — it never
  // touches the game loop, collision checks, or movement math below.
  useEffect(() => {
    const anims = segmentAnimsRef.current;

    while (anims.length < snake.length) {
      const segment = snake[anims.length];
      anims.push(
        new Animated.ValueXY({ x: segment.x * SEGMENT_SIZE, y: segment.y * SEGMENT_SIZE })
      );
    }
    if (anims.length > snake.length) {
      anims.length = snake.length;
    }

    snake.forEach((segment, index) => {
      Animated.timing(anims[index], {
        toValue: { x: segment.x * SEGMENT_SIZE, y: segment.y * SEGMENT_SIZE },
        duration: GAME_SPEED_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    });
  }, [snake]);

  // Plays a small "pop" animation whenever a new food position appears.
  useEffect(() => {
    if (!food) {
      return;
    }
    foodScale.setValue(0.3);
    Animated.spring(foodScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [food, foodScale]);

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
    <LinearGradient
      colors={isDark ? ['#0f1419', '#1a2420', '#0f1419'] : ['#f4f7f5', '#e8f0ea', '#f4f7f5']}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <View style={styles.content}>
        <Text style={[styles.title, { color: isDark ? '#ffffff' : '#1a2e1a' }]}>
          Snake Game
        </Text>

        <Text style={[styles.bestScoreText, { color: isDark ? '#9ca89f' : '#5c6b5f' }]}>
          Best Score: {highScore}
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
            <Animated.View
              style={[
                styles.food,
                {
                  left: food.x * SEGMENT_SIZE,
                  top: food.y * SEGMENT_SIZE,
                  transform: [{ scale: foodScale }],
                },
              ]}>
              <View style={styles.appleLeaf} />
              <View style={styles.appleStem} />
              <View style={styles.appleBody}>
                <View style={styles.appleShine} />
              </View>
            </Animated.View>
          )}

          {snake.map((segment, index) => {
            const anim = segmentAnimsRef.current[index];
            if (!anim) {
              return null;
            }

            const isHead = index === 0;
            const isTail = index === snake.length - 1 && snake.length > 1;
            const backgroundColor = isHead
              ? '#4ade80'
              : isTail
                ? '#15803d'
                : getBodySegmentColor(index, snake.length);

            return (
              <Animated.View
                key={index}
                style={[
                  styles.segment,
                  {
                    left: anim.x,
                    top: anim.y,
                    backgroundColor,
                  },
                  isHead && [
                    styles.headSegment,
                    { transform: [{ rotate: getDirectionAngle(direction) }] },
                  ],
                  isTail && styles.tailSegment,
                ]}>
                {isHead && (
                  <>
                    <View style={[styles.eye, styles.eyeTop]} />
                    <View style={[styles.eye, styles.eyeBottom]} />
                  </>
                )}
              </Animated.View>
            );
          })}

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
            <AnimatedButton
              style={[
                styles.controlButton,
                {
                  backgroundColor: isDark ? '#1a2420' : '#ffffff',
                  borderColor: isDark ? '#2d3b32' : '#d4e4d8',
                },
              ]}
              onPress={moveUp}>
              <Text style={[styles.controlButtonText, { color: isDark ? '#ffffff' : '#1a2e1a' }]}>
                Move Up
              </Text>
            </AnimatedButton>

            <AnimatedButton
              style={[
                styles.controlButton,
                {
                  backgroundColor: isDark ? '#1a2420' : '#ffffff',
                  borderColor: isDark ? '#2d3b32' : '#d4e4d8',
                },
              ]}
              onPress={moveDown}>
              <Text style={[styles.controlButtonText, { color: isDark ? '#ffffff' : '#1a2e1a' }]}>
                Move Down
              </Text>
            </AnimatedButton>
          </View>

          <View style={styles.controlRow}>
            <AnimatedButton
              style={[
                styles.controlButton,
                {
                  backgroundColor: isDark ? '#1a2420' : '#ffffff',
                  borderColor: isDark ? '#2d3b32' : '#d4e4d8',
                },
              ]}
              onPress={moveLeft}>
              <Text style={[styles.controlButtonText, { color: isDark ? '#ffffff' : '#1a2e1a' }]}>
                Move Left
              </Text>
            </AnimatedButton>

            <AnimatedButton
              style={[
                styles.controlButton,
                {
                  backgroundColor: isDark ? '#1a2420' : '#ffffff',
                  borderColor: isDark ? '#2d3b32' : '#d4e4d8',
                },
              ]}
              onPress={moveRight}>
              <Text style={[styles.controlButtonText, { color: isDark ? '#ffffff' : '#1a2e1a' }]}>
                Move Right
              </Text>
            </AnimatedButton>
          </View>
        </View>

        <AnimatedButton
          style={[styles.startButton, isPlaying && styles.startButtonDisabled]}
          onPress={isGameOver ? handleRestartGame : handleStartGame}
          disabled={isPlaying}>
          <Text style={styles.startButtonText}>
            {isPlaying ? 'Playing...' : isGameOver ? 'Restart Game' : 'Start Game'}
          </Text>
        </AnimatedButton>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
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
  bestScoreText: {
    fontSize: 14,
    fontWeight: '600',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleBody: {
    width: SEGMENT_SIZE,
    height: SEGMENT_SIZE,
    borderRadius: SEGMENT_SIZE / 2,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleShine: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  appleStem: {
    position: 'absolute',
    top: -3,
    width: 3,
    height: 5,
    borderRadius: 1.5,
    backgroundColor: '#78350f',
    zIndex: 1,
  },
  appleLeaf: {
    position: 'absolute',
    top: -4,
    left: SEGMENT_SIZE / 2,
    width: 7,
    height: 5,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    transform: [{ rotate: '30deg' }],
    zIndex: 1,
  },
  segment: {
    position: 'absolute',
    width: SEGMENT_SIZE,
    height: SEGMENT_SIZE,
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  headSegment: {
    borderRadius: SEGMENT_SIZE / 2,
  },
  eye: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    right: 3,
    backgroundColor: '#0f1419',
  },
  eyeTop: {
    top: 4,
  },
  eyeBottom: {
    bottom: 4,
  },
  tailSegment: {
    borderRadius: SEGMENT_SIZE / 2,
    transform: [{ scale: 0.7 }],
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
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
