import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LegalActions, PokerAction } from '../game/types';
import { colors, radii } from './theme';

interface ActionBarProps {
  legal: LegalActions;
  pot: number;
  currentBet: number;
  onAction: (action: PokerAction) => void;
}

interface ActionButtonProps {
  label: string;
  tone?: 'quiet' | 'light' | 'accent';
  disabled?: boolean;
  onPress: () => void;
}

function ActionButton({ label, tone = 'quiet', disabled, onPress }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[`${tone}Button`], pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, styles[`${tone}Text`]]}>{label}</Text>
    </Pressable>
  );
}

export function ActionBar({ legal, pot, currentBet, onAction }: ActionBarProps) {
  const potAfterCall = pot + legal.callAmount;
  const raiseTarget = Math.min(
    legal.maxRaiseTo,
    Math.max(legal.minRaiseTo, currentBet + Math.max(10, Math.round((potAfterCall * 0.66) / 5) * 5)),
  );
  return (
    <Animated.View entering={FadeInDown.springify().damping(17)} style={styles.container}>
      <View style={styles.row}>
        <ActionButton
          label="Fold"
          disabled={!legal.canFold}
          onPress={() => onAction({ type: 'fold' })}
        />
        <ActionButton
          label={legal.canCheck ? 'Check' : `Call ${legal.callAmount}`}
          tone="light"
          disabled={!legal.canCheck && !legal.canCall}
          onPress={() => onAction({ type: legal.canCheck ? 'check' : 'call' })}
        />
        <ActionButton
          label={`${currentBet > 0 ? 'Raise' : 'Bet'} ${raiseTarget}`}
          tone="accent"
          disabled={!legal.canRaise}
          onPress={() => onAction({ type: 'raise', amount: raiseTarget })}
        />
      </View>
      <Text style={styles.hint}>No-limit · raise uses a smart ⅔-pot size</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 4, paddingTop: 4 },
  row: { flexDirection: 'row', gap: 8 },
  button: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.medium, borderWidth: 1 },
  quietButton: { backgroundColor: colors.backgroundSoft, borderColor: colors.border },
  lightButton: { backgroundColor: colors.cream, borderColor: colors.cream },
  accentButton: { backgroundColor: colors.mint, borderColor: colors.mint },
  buttonText: { fontSize: 13, fontWeight: '900' },
  quietText: { color: colors.white },
  lightText: { color: colors.ink },
  accentText: { color: '#09251E' },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.86 },
  disabled: { opacity: 0.25 },
  hint: { color: 'rgba(255,255,255,0.28)', textAlign: 'center', fontSize: 8, fontWeight: '600', marginTop: 6 },
});

