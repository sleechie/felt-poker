import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ActionBar } from './src/ui/ActionBar';
import { GameTable } from './src/ui/GameTable';
import { OddsPanel } from './src/ui/OddsPanel';
import { colors, radii } from './src/ui/theme';
import { applyAction, createGame, getLegalActions, potSize, restartMatch, startNextHand } from './src/game/engine';
import { countImmediateOuts, estimateEquity, EquityResult } from './src/game/equity';
import { describeCurrentHand } from './src/game/evaluator';
import { decideBotAction } from './src/game/npc';
import { GameState, PokerAction } from './src/game/types';
import { loadGame, loadSettings, saveGame, saveSettings } from './src/game/storage';
import { GameSound, useGameSounds } from './src/hooks/useGameSounds';

SplashScreen.setOptions({ duration: 350, fade: true });

function HeaderToggle({ active, label, icon, onPress }: { active: boolean; label: string; icon: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.toggle, active && styles.toggleActive, pressed && { opacity: 0.72 }]}
    >
      <Text style={[styles.toggleIcon, active && styles.toggleTextActive]}>{icon}</Text>
      <Text style={[styles.toggleLabel, active && styles.toggleTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PokerApp() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [showOdds, setShowOdds] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [equity, setEquity] = useState<EquityResult | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const playSound = useGameSounds(soundOn);
  const previousStreet = useRef(game.street);
  const previousPhase = useRef(game.phase);

  const hero = game.players.find((player) => player.id === 'hero')!;
  const heroTurn = game.activePlayerIndex !== null && game.players[game.activePlayerIndex].id === hero.id;
  const legal = getLegalActions(game, hero.id);
  const activeOpponents = game.players.filter((player) => !player.isHuman && !player.folded && (player.chips > 0 || player.committed > 0)).length;

  useEffect(() => {
    Promise.all([loadGame(), loadSettings()]).then(([savedGame, settings]) => {
      if (savedGame) setGame(savedGame);
      if (settings) {
        setSoundOn(settings.soundOn);
        setShowOdds(settings.showOdds);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) saveGame(game);
  }, [game, hydrated]);

  useEffect(() => {
    if (hydrated) saveSettings({ soundOn, showOdds });
  }, [hydrated, showOdds, soundOn]);

  useEffect(() => {
    if (!showOdds || hero.folded || hero.hole.length !== 2 || activeOpponents === 0) {
      setEquity(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      const result = estimateEquity(hero.hole, game.board, activeOpponents, 420);
      if (!cancelled) setEquity(result);
    }, 30);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeOpponents, game.board, game.handNumber, hero.folded, hero.hole, showOdds]);

  useEffect(() => {
    if (game.street !== previousStreet.current) playSound('card');
    if (game.phase !== previousPhase.current && game.phase !== 'betting') {
      playSound(game.result?.winnerIds.includes('hero') ? 'win' : 'chips');
      if (game.result?.winnerIds.includes('hero')) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    previousStreet.current = game.street;
    previousPhase.current = game.phase;
  }, [game.phase, game.result?.winnerIds, game.street, playSound]);

  useEffect(() => {
    if (!hydrated || game.phase !== 'betting' || game.activePlayerIndex === null) return;
    const active = game.players[game.activePlayerIndex];
    if (active.isHuman) return;
    const handNumber = game.handNumber;
    const actionId = game.lastActionId;
    const timer = setTimeout(() => {
      setGame((current) => {
        if (current.handNumber !== handNumber || current.lastActionId !== actionId || current.activePlayerIndex === null) return current;
        const bot = current.players[current.activePlayerIndex];
        if (bot.isHuman) return current;
        const decision = decideBotAction(current, bot.id);
        const sound: GameSound = decision.action.type === 'fold' ? 'fold' : 'chips';
        playSound(sound);
        return applyAction(current, bot.id, decision.action);
      });
    }, 520 + Math.random() * 380);
    return () => clearTimeout(timer);
  }, [game.activePlayerIndex, game.handNumber, game.lastActionId, game.phase, game.players, hydrated, playSound]);

  const handleAction = useCallback((action: PokerAction) => {
    playSound(action.type === 'fold' ? 'fold' : 'chips');
    if (action.type === 'raise') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    else Haptics.selectionAsync().catch(() => undefined);
    setGame((current) => applyAction(current, 'hero', action));
  }, [playSound]);

  const handleContinue = useCallback(() => {
    playSound('card');
    setGame((current) => current.phase === 'matchComplete' ? restartMatch() : startNextHand(current));
  }, [playSound]);

  const handDescription = useMemo(
    () => hero.hole.length ? describeCurrentHand([...hero.hole, ...game.board]) : 'No hand',
    [game.board, hero.hole],
  );

  return (
    <LinearGradient colors={[colors.background, '#0D1424', colors.background]} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>FELT</Text>
            <Text style={styles.subtitle}>NO-LIMIT HOLD’EM</Text>
          </View>
          <View style={styles.headerActions}>
            <HeaderToggle active={showOdds} label="ODDS" icon="%" onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              setShowOdds((value) => !value);
            }} />
            <HeaderToggle active={soundOn} label="SOUND" icon="♪" onPress={() => setSoundOn((value) => !value)} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="About and privacy"
              onPress={() => setAboutOpen(true)}
              style={({ pressed }) => [styles.infoButton, pressed && { opacity: 0.72 }]}
            >
              <Text style={styles.infoText}>i</Text>
            </Pressable>
          </View>
        </View>

        <GameTable state={game} onContinue={handleContinue} />

        <View style={styles.controls}>
          {showOdds && equity && game.phase === 'betting' && (
            <OddsPanel
              equity={equity.equity}
              hand={handDescription}
              outs={countImmediateOuts(hero.hole, game.board)}
              opponentCount={activeOpponents}
              callAmount={legal.callAmount}
              pot={potSize(game)}
            />
          )}
          {heroTurn && game.phase === 'betting' ? (
            <ActionBar legal={legal} pot={potSize(game)} currentBet={game.currentBet} onAction={handleAction} />
          ) : game.phase === 'betting' ? (
            <Animated.View entering={FadeIn.duration(180)} style={styles.waiting}>
              <View style={styles.thinkingDot} />
              <Text style={styles.waitingText}>{game.players[game.activePlayerIndex!]?.name ?? 'Table'} is thinking</Text>
            </Animated.View>
          ) : (
            <View style={styles.waiting}><Text style={styles.waitingText}>Showdown · cards revealed</Text></View>
          )}
        </View>
      </SafeAreaView>
      <Modal visible={aboutOpen} transparent animationType="fade" onRequestClose={() => setAboutOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutEyebrow}>FELT POKER · 1.0</Text>
            <Text style={styles.aboutTitle}>Private by design.</Text>
            <Text style={styles.aboutBody}>
              Felt has no accounts, analytics, ads, tracking, purchases, or network requests. Your game and settings stay on this device and are removed when you delete the app.
            </Text>
            <Text style={styles.aboutDetail}>Single-player Texas Hold’em · 5 / 10 blinds · 600-chip stacks</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close about and privacy"
              onPress={() => setAboutOpen(false)}
              style={({ pressed }) => [styles.doneButton, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <StatusBar style="light" />
    </LinearGradient>
  );
}

export default function App() {
  return <SafeAreaProvider><PokerApp /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 12, paddingBottom: 4 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  brand: { color: colors.white, fontSize: 20, lineHeight: 21, fontWeight: '900', letterSpacing: 4 },
  subtitle: { color: colors.muted, fontSize: 7, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 7 },
  toggle: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, backgroundColor: colors.backgroundSoft, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  toggleActive: { backgroundColor: 'rgba(99,230,190,0.12)', borderColor: 'rgba(99,230,190,0.55)' },
  toggleIcon: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  toggleLabel: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  toggleTextActive: { color: colors.mint },
  infoButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSoft, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  infoText: { color: colors.muted, fontSize: 13, fontWeight: '900', fontStyle: 'italic' },
  controls: { minHeight: 88, paddingTop: 7 },
  waiting: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  thinkingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.amber },
  waitingText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(3,6,12,0.78)' },
  aboutCard: { width: '100%', maxWidth: 350, padding: 24, backgroundColor: colors.backgroundSoft, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border },
  aboutEyebrow: { color: colors.mint, fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  aboutTitle: { color: colors.white, fontSize: 25, fontWeight: '900', letterSpacing: -0.7, marginTop: 9 },
  aboutBody: { color: '#CED3DD', fontSize: 13, lineHeight: 19, fontWeight: '600', marginTop: 12 },
  aboutDetail: { color: colors.muted, fontSize: 10, lineHeight: 15, fontWeight: '700', marginTop: 14 },
  doneButton: { height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint, borderRadius: radii.medium, marginTop: 22 },
  doneText: { color: '#09251E', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
});
