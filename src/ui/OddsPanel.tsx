import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { colors, radii } from './theme';

interface OddsPanelProps {
  equity: number;
  hand: string;
  outs: number | null;
  opponentCount: number;
  callAmount: number;
  pot: number;
}

export function OddsPanel({ equity, hand, outs, opponentCount, callAmount, pot }: OddsPanelProps) {
  const potOdds = callAmount > 0 ? callAmount / (pot + callAmount) : 0;
  const edge = equity - potOdds;
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} exiting={FadeOutDown.duration(140)} style={styles.panel}>
      <View style={styles.scoreBlock}>
        <Text style={styles.eyebrow}>EQUITY</Text>
        <Text style={styles.score}>{Math.round(equity * 100)}%</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.hand}>{hand}</Text>
        <Text style={styles.meta}>
          {callAmount > 0
            ? `Pot needs ${Math.round(potOdds * 100)}% · ${edge >= 0 ? 'good price' : 'tough price'}`
            : `${opponentCount} opponent${opponentCount === 1 ? '' : 's'}${outs !== null ? ` · ${outs} immediate outs` : ''}`}
        </Text>
        <Text style={styles.note}>Your estimated pot share—not Elo.</Text>
      </View>
      <View style={[styles.edge, { backgroundColor: edge >= 0 ? colors.mint : colors.coral }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { flexDirection: 'row', alignItems: 'center', minHeight: 68, marginHorizontal: 4, marginBottom: 8, borderRadius: radii.medium, backgroundColor: 'rgba(16,23,40,0.96)', borderWidth: 1, borderColor: colors.border, overflow: 'hidden', paddingRight: 12 },
  scoreBlock: { width: 78, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: colors.mint, fontSize: 8, fontWeight: '900', letterSpacing: 1.6 },
  score: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  copy: { flex: 1 },
  hand: { color: colors.white, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' },
  meta: { color: colors.muted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  note: { color: 'rgba(255,255,255,0.38)', fontSize: 8, marginTop: 2 },
  edge: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 3 },
});

