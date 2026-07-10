import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FlipInEasyY, LinearTransition } from 'react-native-reanimated';
import { Card } from '../game/types';
import { colors, radii, shadows } from './theme';

type CardSize = 'board' | 'hero' | 'mini';

interface CardViewProps {
  card?: Card;
  hidden?: boolean;
  placeholder?: boolean;
  size?: CardSize;
  delay?: number;
}

const RANK_LABEL: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

const SUIT_LABEL = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' } as const;

const dimensions = {
  mini: { width: 29, height: 41 },
  board: { width: 50, height: 70 },
  hero: { width: 64, height: 90 },
};

export function CardView({ card, hidden = false, placeholder = false, size = 'board', delay = 0 }: CardViewProps) {
  const dimension = dimensions[size];
  if (placeholder) {
    return <View style={[styles.placeholder, dimension]} />;
  }

  if (hidden || !card) {
    return (
      <Animated.View
        entering={FadeInDown.delay(delay).springify().damping(15)}
        layout={LinearTransition.springify()}
        style={[styles.card, styles.back, dimension, size === 'mini' && styles.miniRadius]}
      >
        <View style={styles.backInset}>
          <View style={styles.backMark} />
        </View>
      </Animated.View>
    );
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <Animated.View
      entering={FlipInEasyY.delay(delay).springify().damping(16)}
      layout={LinearTransition.springify()}
      style={[styles.card, dimension, size === 'mini' && styles.miniRadius]}
    >
      <Text style={[styles.rank, size === 'mini' && styles.miniRank, isRed && styles.red]}>{RANK_LABEL[card.rank]}</Text>
      <Text style={[styles.suit, size === 'mini' && styles.miniSuit, isRed && styles.red]}>{SUIT_LABEL[card.suit]}</Text>
      {size !== 'mini' && (
        <Text style={[styles.centerSuit, size === 'hero' && styles.heroCenterSuit, isRed && styles.red]}>{SUIT_LABEL[card.suit]}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cream,
    borderRadius: radii.small,
    paddingHorizontal: 6,
    paddingVertical: 5,
    overflow: 'hidden',
    ...shadows.card,
  },
  miniRadius: { borderRadius: 6, paddingHorizontal: 3, paddingVertical: 2 },
  rank: { color: colors.ink, fontSize: 17, lineHeight: 18, fontWeight: '900', letterSpacing: -0.5 },
  suit: { color: colors.ink, fontSize: 14, lineHeight: 15 },
  centerSuit: { color: colors.ink, fontSize: 25, lineHeight: 27, position: 'absolute', right: 6, bottom: 4 },
  heroCenterSuit: { fontSize: 31, lineHeight: 33 },
  miniRank: { fontSize: 10, lineHeight: 11 },
  miniSuit: { fontSize: 9, lineHeight: 10 },
  red: { color: colors.red },
  back: { backgroundColor: '#7888FF', padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  backInset: { flex: 1, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '0deg' }] },
  backMark: { width: '42%', aspectRatio: 1, backgroundColor: 'rgba(9,13,24,0.48)', transform: [{ rotate: '45deg' }], borderRadius: 2 },
  placeholder: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', borderRadius: radii.small, backgroundColor: 'rgba(255,255,255,0.025)' },
});

