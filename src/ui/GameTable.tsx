import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, ZoomIn } from 'react-native-reanimated';
import { potSize } from '../game/engine';
import { GameState } from '../game/types';
import { CardView } from './CardView';
import { PlayerSeat } from './PlayerSeat';
import { colors, radii } from './theme';

interface GameTableProps {
  state: GameState;
  onContinue: () => void;
}

export function GameTable({ state, onContinue }: GameTableProps) {
  const activeId = state.activePlayerIndex === null ? null : state.players[state.activePlayerIndex].id;
  const hero = state.players.find((player) => player.id === 'hero')!;
  const opponents = state.players.filter((player) => !player.isHuman);
  const reveal = state.phase !== 'betting';
  const pot = state.result?.pot ?? potSize(state);

  return (
    <View style={styles.shell}>
      <LinearGradient colors={[colors.feltLight, colors.felt, '#102F29']} style={styles.table}>
        <View pointerEvents="none" style={styles.innerLine} />
        <View style={styles.opponents}>
          {opponents.map((player) => (
            <PlayerSeat
              key={player.id}
              player={player}
              active={activeId === player.id}
              dealer={state.players[state.dealerIndex].id === player.id}
              revealCards={reveal && !player.folded}
            />
          ))}
        </View>

        <Animated.View layout={LinearTransition.springify()} style={styles.center}>
          <View style={styles.potPill}>
            <View style={styles.chipIcon}><View style={styles.chipInset} /></View>
            <Text style={styles.potLabel}>POT</Text>
            <Text style={styles.potValue}>{pot}</Text>
          </View>
          <View style={styles.board}>
            {[0, 1, 2, 3, 4].map((index) => (
              state.board[index]
                ? <CardView key={state.board[index].id} card={state.board[index]} delay={index * 65} />
                : <CardView key={`slot-${index}`} placeholder />
            ))}
          </View>
          <Text style={styles.message}>{state.message}</Text>
        </Animated.View>

        <View style={[styles.heroSeat, activeId === 'hero' && styles.heroActive, hero.folded && styles.heroFolded]}>
          <View style={styles.heroMeta}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>YOU</Text>
              {state.dealerIndex === state.players.indexOf(hero) && <Text style={styles.dealer}>D</Text>}
            </View>
            <Text style={styles.heroChips}>{hero.chips.toLocaleString()} chips</Text>
            {!!hero.lastAction && <Animated.Text entering={FadeIn.duration(140)} style={styles.heroAction}>{hero.lastAction}</Animated.Text>}
          </View>
          <View style={styles.heroCards}>
            {hero.hole.map((card, index) => <CardView key={card.id} card={card} size="hero" delay={index * 90} />)}
          </View>
        </View>

        {state.phase !== 'betting' && state.result && (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.resultBackdrop}>
            <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.resultCard}>
              <Text style={styles.resultEyebrow}>HAND {state.handNumber}</Text>
              <Text style={styles.resultTitle}>{state.result.title}</Text>
              <Text style={styles.resultDetail}>{state.result.detail}</Text>
              <Text style={styles.resultPot}>{state.result.pot} chip pot</Text>
              <Pressable accessibilityRole="button" onPress={onContinue} style={({ pressed }) => [styles.continueButton, pressed && { transform: [{ scale: 0.97 }] }]}>
                <Text style={styles.continueText}>{state.phase === 'matchComplete' ? 'New match' : 'Next hand'}</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 430, borderRadius: 34, backgroundColor: '#091C18', padding: 3, shadowColor: '#000', shadowOpacity: 0.38, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 14 },
  table: { flex: 1, borderRadius: 31, overflow: 'hidden', padding: 10 },
  innerLine: { ...StyleSheet.absoluteFill, margin: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24 },
  opponents: { flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  potPill: { height: 25, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, backgroundColor: 'rgba(9,13,24,0.55)', borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  chipIcon: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  chipInset: { width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(9,13,24,0.45)' },
  potLabel: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  potValue: { color: colors.white, fontSize: 12, fontWeight: '900' },
  board: { flexDirection: 'row', gap: 5 },
  message: { minHeight: 14, color: 'rgba(255,255,255,0.58)', fontSize: 10, fontWeight: '700' },
  heroSeat: { minHeight: 104, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(9,13,24,0.46)', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8 },
  heroActive: { borderColor: colors.mint, backgroundColor: 'rgba(99,230,190,0.08)' },
  heroFolded: { opacity: 0.52 },
  heroMeta: { flex: 1 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroName: { color: colors.white, fontSize: 12, fontWeight: '900', letterSpacing: 1.4 },
  heroChips: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  heroAction: { color: colors.mint, fontSize: 10, fontWeight: '800', marginTop: 8, textTransform: 'uppercase' },
  heroCards: { flexDirection: 'row', gap: 7, transform: [{ rotate: '-1deg' }] },
  dealer: { width: 17, height: 17, borderRadius: 9, overflow: 'hidden', backgroundColor: colors.cream, color: colors.ink, fontSize: 9, lineHeight: 17, textAlign: 'center', fontWeight: '900' },
  resultBackdrop: { ...StyleSheet.absoluteFill, zIndex: 10, alignItems: 'center', justifyContent: 'flex-end', padding: 12, backgroundColor: 'rgba(9,13,24,0.08)' },
  resultCard: { width: '100%', alignItems: 'center', backgroundColor: 'rgba(16,23,40,0.97)', borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, padding: 15 },
  resultEyebrow: { color: colors.mint, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  resultTitle: { color: colors.white, fontSize: 21, lineHeight: 25, fontWeight: '900', letterSpacing: -0.6, textAlign: 'center', marginTop: 5 },
  resultDetail: { color: colors.cream, fontSize: 13, fontWeight: '700', marginTop: 5, textTransform: 'capitalize' },
  resultPot: { color: colors.muted, fontSize: 10, fontWeight: '600', marginTop: 4 },
  continueButton: { height: 43, alignSelf: 'stretch', borderRadius: radii.medium, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  continueText: { color: '#09251E', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
});
