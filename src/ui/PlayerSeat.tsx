import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { PlayerState } from '../game/types';
import { CardView } from './CardView';
import { colors, radii } from './theme';

interface PlayerSeatProps {
  player: PlayerState;
  active: boolean;
  dealer: boolean;
  revealCards: boolean;
}

export function PlayerSeat({ player, active, dealer, revealCards }: PlayerSeatProps) {
  const accent = player.persona?.color ?? colors.blue;
  const out = player.chips === 0 && player.committed === 0;
  return (
    <Animated.View
      layout={LinearTransition.springify()}
      style={[styles.seat, active && { borderColor: accent, backgroundColor: `${accent}18` }, (player.folded || out) && styles.dimmed]}
    >
      <View style={styles.nameRow}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text numberOfLines={1} style={styles.name}>{player.name}</Text>
        {dealer && <Text style={styles.dealer}>D</Text>}
      </View>
      <Text style={styles.chips}>{out ? 'OUT' : player.chips.toLocaleString()}</Text>
      <View style={styles.miniCards}>
        {player.hole.map((card, index) => (
          <CardView key={card.id} card={card} hidden={!revealCards || player.folded} size="mini" delay={80 * index} />
        ))}
      </View>
      {!!player.lastAction && (
        <Animated.Text entering={FadeIn.duration(150)} numberOfLines={1} style={[styles.action, active && { color: accent }]}>
          {player.lastAction}
        </Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  seat: { width: '31.5%', minHeight: 102, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, backgroundColor: 'rgba(9,13,24,0.38)', padding: 8 },
  dimmed: { opacity: 0.44 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  name: { flex: 1, color: colors.white, fontWeight: '800', fontSize: 11 },
  dealer: { width: 15, height: 15, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.cream, color: colors.ink, fontSize: 9, lineHeight: 15, textAlign: 'center', fontWeight: '900' },
  chips: { color: colors.muted, fontSize: 10, fontWeight: '700', marginLeft: 11, marginTop: 1 },
  miniCards: { position: 'absolute', flexDirection: 'row', gap: 2, right: 7, top: 38 },
  action: { position: 'absolute', left: 8, right: 6, bottom: 5, color: colors.muted, fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
});
