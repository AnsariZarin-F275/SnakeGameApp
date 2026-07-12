import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AboutScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark
    ? {
        background: '#0f1419',
        middle: '#1a2420',
        card: '#1a2420',
        border: '#2d3b32',
        title: '#ffffff',
        text: '#d1d9d3',
        muted: '#9ca89f',
        accent: '#4ade80',
      }
    : {
        background: '#f4f7f5',
        middle: '#e8f0ea',
        card: '#ffffff',
        border: '#e0ebe3',
        title: '#1a2e1a',
        text: '#3f5143',
        muted: '#5c6b5f',
        accent: '#16a34a',
      };

  return (
    <LinearGradient colors={[colors.background, colors.middle, colors.background]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.title }]}>About</Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>🐍 Snake Game</Text>
            <Text style={[styles.description, { color: colors.text }]}>
              A classic Snake game built using React Native and Expo. Guide the snake, collect food, and achieve the highest score while avoiding walls and collisions.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.muted }]}>👩‍💻 Developer</Text>
            <Text style={[styles.developer, { color: colors.title }]}>Zarin Fatima Ansari</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>🎮 How to Play</Text>
            <Text style={[styles.control, { color: colors.text }]}>• Use the direction buttons to move the snake.</Text>
            <Text style={[styles.control, { color: colors.text }]}>• Eat food to increase your score.</Text>
            <Text style={[styles.control, { color: colors.text }]}>• Avoid hitting the walls.</Text>
            <Text style={[styles.control, { color: colors.text }]}>• Avoid colliding with yourself.</Text>
            <Text style={[styles.control, { color: colors.text }]}>• Try to beat your highest score.</Text>
          </View>
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
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  developer: {
    fontSize: 18,
    fontWeight: '600',
  },
  control: {
    fontSize: 16,
    lineHeight: 24,
  },
});
