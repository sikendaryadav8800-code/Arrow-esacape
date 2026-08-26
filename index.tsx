import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useGame } from '@/context/GameContext';
import {
  Arrow,
  calculateStars,
  canArrowLeave,
  cloneArrows,
  createLevel,
  Difficulty,
  formatStars,
  getDailyLevelId,
  getDifficultySubtitle,
  getGridSize,
  getHintArrow,
  getReward,
  getTodayKey,
  getWorldName,
  isArrowUnlocked,
  LEVELS_PER_BATCH,
  Level,
  rotateDirection,
  WORLD_NAMES,
} from '@/lib/game';
import { playFeedback, SoundName } from '@/lib/sound';

type Screen = 'home' | 'levels' | 'daily' | 'settings' | 'game';
type IconName = React.ComponentProps<typeof Feather>['name'];
type Theme = typeof colors.light;

const directionIcons: Record<Arrow['direction'], IconName> = {
  up: 'arrow-up',
  right: 'arrow-right',
  down: 'arrow-down',
  left: 'arrow-left',
};

function useTheme() {
  const { state } = useGame();
  return state.settings.darkMode ? colors.dark : colors.light;
}

function AppIcon({ size = 48, themeOverride }: { size?: number; themeOverride?: Theme }) {
  const theme = themeOverride ?? useTheme();
  return (
    <View style={[styles.logoMark, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: theme.primarySoft }]}>
      <View style={[styles.logoGrid, { width: size * 0.62, height: size * 0.62, borderColor: theme.primary }]}>
        <Feather name="arrow-up-right" size={size * 0.47} color={theme.primary} strokeWidth={2.8} />
      </View>
    </View>
  );
}

function CoinBadge({ coins, themeOverride }: { coins: number; themeOverride?: Theme }) {
  const theme = themeOverride ?? useTheme();
  return (
    <View style={[styles.coinBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.coinIcon, { borderColor: theme.warning, backgroundColor: theme.warning + '22' }]}>
        <Text style={[styles.coinLetter, { color: theme.warning }]}>C</Text>
      </View>
      <Text style={[styles.coinValue, { color: theme.foreground }]}>{coins}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  icon,
  onPress,
  disabled = false,
  secondary = false,
  compact = false,
  themeOverride,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  compact?: boolean;
  themeOverride?: Theme;
}) {
  const theme = themeOverride ?? useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        compact && styles.compactButton,
        {
          backgroundColor: secondary ? theme.surface : theme.primary,
          borderColor: secondary ? theme.border : theme.primary,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {icon ? <Feather name={icon} size={compact ? 16 : 18} color={secondary ? theme.foreground : theme.white} /> : null}
      <Text style={[styles.primaryButtonText, { color: secondary ? theme.foreground : theme.white }]}>{label}</Text>
    </Pressable>
  );
}

function IconButton({ icon, label, onPress, disabled = false }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
      ]}
    >
      <Feather name={icon} size={19} color={theme.foreground} />
    </Pressable>
  );
}

function ScreenShell({ children, scroll = true, themeOverride }: { children: React.ReactNode; scroll?: boolean; themeOverride?: Theme }) {
  const theme = themeOverride ?? useTheme();
  const insets = useSafeAreaInsets();
  const content = (
    <View style={[styles.shell, { backgroundColor: theme.background, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
      {children}
    </View>
  );
  if (!scroll) return content;
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>{content}</ScrollView>;
}

function HomeScreen({ onNavigate, onPlay }: { onNavigate: (screen: Screen) => void; onPlay: () => void }) {
  const theme = colors.dark;
  const { state } = useGame();
  const batchStart = Math.floor((Math.max(1, state.unlockedLevel) - 1) / LEVELS_PER_BATCH) * LEVELS_PER_BATCH + 1;
  const completedCount = Object.keys(state.completed).filter((levelId) => {
    const numericLevel = Number(levelId);
    return numericLevel >= batchStart && numericLevel < batchStart + LEVELS_PER_BATCH;
  }).length;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -7, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [float]);

  return (
    <ScreenShell themeOverride={theme}>
      <View style={styles.homeTop}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>THE DIRECTIONAL PUZZLE</Text>
          <Text style={[styles.homeGreeting, { color: theme.foreground }]}>Find your way out.</Text>
        </View>
        <CoinBadge coins={state.coins} themeOverride={theme} />
      </View>

      <View style={styles.hero}>
        <View style={[styles.heroGlow, { backgroundColor: theme.primarySoft }]} />
        <Animated.View style={{ transform: [{ translateY: float }] }}>
            <AppIcon size={92} themeOverride={theme} />
        </Animated.View>
        <Text style={[styles.logoType, { color: theme.foreground }]}>ARROW ESCAPE</Text>
        <Text style={[styles.tagline, { color: theme.mutedForeground }]}>Clear the Path. Master the Flow.</Text>
        <View style={styles.heroArrows}>
          {(['arrow-up', 'arrow-right', 'arrow-down', 'arrow-left'] as IconName[]).map((icon, index) => (
            <View key={icon} style={[styles.heroArrow, { backgroundColor: index === 1 ? theme.primary : theme.surface, borderColor: theme.border }]}>
              <Feather name={icon} size={20} color={index === 1 ? theme.white : theme.primary} />
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.progressCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={[styles.cardKicker, { color: theme.mutedForeground }]}>YOUR JOURNEY</Text>
            <Text style={[styles.progressTitle, { color: theme.foreground }]}>Level {state.unlockedLevel} unlocked</Text>
          </View>
          <Text style={[styles.progressPercent, { color: theme.primary }]}>{completedCount}/200</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.surfaceMuted }]}>
          <View style={[styles.progressFill, { width: `${Math.min(100, (completedCount / 200) * 100)}%`, backgroundColor: theme.primary }]} />
        </View>
      </View>

      <View style={styles.homeActions}>
         <PrimaryButton label="PLAY" icon="play" onPress={onPlay} themeOverride={theme} />
        <View style={styles.actionRow}>
           <PrimaryButton label="LEVELS" icon="grid" secondary compact onPress={() => onNavigate('levels')} themeOverride={theme} />
           <PrimaryButton label="DAILY PUZZLE" icon="calendar" secondary compact onPress={() => onNavigate('daily')} themeOverride={theme} />
        </View>
         <PrimaryButton label="SETTINGS" icon="settings" secondary compact onPress={() => onNavigate('settings')} themeOverride={theme} />
      </View>

      <View style={styles.homeFooter}>
        <Feather name="shield" size={14} color={theme.mutedForeground} />
        <Text style={[styles.footerText, { color: theme.mutedForeground }]}>Offline by design · Progress saved on this device</Text>
      </View>
    </ScreenShell>
  );
}

function LevelsScreen({ onBack, onSelect, initialLevel }: { onBack: () => void; onSelect: (levelId: number) => void; initialLevel: number }) {
  const theme = useTheme();
  const { state } = useGame();
  const [batchIndex, setBatchIndex] = useState(Math.floor((Math.max(1, initialLevel) - 1) / LEVELS_PER_BATCH));
  const availableBatchCount = Math.max(1, Math.ceil(state.unlockedLevel / LEVELS_PER_BATCH));
  const batchStart = batchIndex * LEVELS_PER_BATCH + 1;
  const batchEnd = batchStart + LEVELS_PER_BATCH - 1;
  return (
    <ScreenShell>
      <View style={styles.pageHeader}>
        <IconButton icon="chevron-left" label="Back" onPress={onBack} />
        <View style={styles.pageHeaderCenter}>
          <Text style={[styles.pageTitle, { color: theme.foreground }]}>Choose a level</Text>
          <Text style={[styles.pageSubtitle, { color: theme.mutedForeground }]}>{batchStart}–{batchEnd} · One way through.</Text>
        </View>
        <CoinBadge coins={state.coins} />
      </View>
      {WORLD_NAMES.map((world, worldIndex) => {
        const start = batchStart + worldIndex * 25;
        const worldLevels = Array.from({ length: 25 }, (_, index) => start + index);
        return (
          <View key={world} style={[styles.worldCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.worldHeader}>
              <View>
                <Text style={[styles.worldNumber, { color: theme.primary }]}>WORLD {worldIndex + 1}</Text>
                <Text style={[styles.worldName, { color: theme.foreground }]}>{world}</Text>
              </View>
              <Text style={[styles.worldRange, { color: theme.mutedForeground }]}>{start} — {start + 24}</Text>
            </View>
            <View style={styles.levelGrid}>
              {worldLevels.map((levelId) => {
                const locked = levelId > state.unlockedLevel;
                const stars = state.completed[String(levelId)] ?? 0;
                return (
                  <Pressable
                    key={levelId}
                    accessibilityLabel={locked ? `Level ${levelId} locked` : `Play level ${levelId}`}
                    accessibilityRole="button"
                    disabled={locked}
                    onPress={() => onSelect(levelId)}
                    style={({ pressed }) => [
                      styles.levelTile,
                      { backgroundColor: locked ? theme.surfaceMuted : theme.background, borderColor: stars ? theme.primary : theme.border, opacity: pressed ? 0.72 : locked ? 0.55 : 1 },
                    ]}
                  >
                    {locked ? <Feather name="lock" size={15} color={theme.locked} /> : <Text style={[styles.levelNumber, { color: theme.foreground }]}>{levelId}</Text>}
                    <Text style={[styles.starsText, { color: stars ? theme.gold : theme.mutedForeground }]}>{stars ? formatStars(stars) : '☆☆☆'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      <View style={styles.batchNavigation}>
        <PrimaryButton
          label="PREVIOUS"
          icon="chevron-left"
          secondary
          compact
          disabled={batchIndex === 0}
          onPress={() => setBatchIndex((current) => Math.max(0, current - 1))}
        />
        <View style={styles.batchLabel}>
          <Text style={[styles.batchLabelTitle, { color: theme.foreground }]}>SET {batchIndex + 1}</Text>
          <Text style={[styles.batchLabelDetail, { color: theme.mutedForeground }]}>{batchStart}–{batchEnd}</Text>
        </View>
        <PrimaryButton
          label="NEXT"
          icon="chevron-right"
          secondary
          compact
          disabled={batchIndex >= availableBatchCount - 1}
          onPress={() => setBatchIndex((current) => Math.min(availableBatchCount - 1, current + 1))}
        />
      </View>
    </ScreenShell>
  );
}

function DailyScreen({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  const theme = useTheme();
  const { state } = useGame();
  const dailyLevel = getDailyLevelId();
  const claimed = state.dailyDate === getTodayKey();
  return (
    <ScreenShell>
      <View style={styles.pageHeader}>
        <IconButton icon="chevron-left" label="Back" onPress={onBack} />
        <View style={styles.pageHeaderCenter}>
          <Text style={[styles.pageTitle, { color: theme.foreground }]}>Daily puzzle</Text>
          <Text style={[styles.pageSubtitle, { color: theme.mutedForeground }]}>A fresh path every day</Text>
        </View>
        <CoinBadge coins={state.coins} />
      </View>
      <View style={[styles.dailyHero, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
        <View style={styles.dailyStamp}><Feather name="calendar" size={25} color={theme.white} /></View>
        <Text style={styles.dailyTitle}>TODAY'S ESCAPE</Text>
        <Text style={styles.dailyDate}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        <View style={styles.dailyMetaRow}>
          <View><Text style={styles.dailyMetaLabel}>PUZZLE</Text><Text style={styles.dailyMetaValue}>#{dailyLevel}</Text></View>
          <View><Text style={styles.dailyMetaLabel}>REWARD</Text><Text style={styles.dailyMetaValue}>+50 coins</Text></View>
          <View><Text style={styles.dailyMetaLabel}>STREAK</Text><Text style={styles.dailyMetaValue}>{state.dailyStreak} days</Text></View>
        </View>
        <PrimaryButton label={claimed ? 'PLAY AGAIN' : 'PLAY DAILY'} icon="play" onPress={onPlay} />
      </View>
      <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Feather name="zap" size={20} color={theme.warning} />
        <View style={styles.infoText}>
          <Text style={[styles.infoTitle, { color: theme.foreground }]}>Keep the chain alive</Text>
          <Text style={[styles.infoBody, { color: theme.mutedForeground }]}>Complete today's puzzle to claim 50 coins and grow your streak.</Text>
        </View>
      </View>
    </ScreenShell>
  );
}

function SettingsScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const { state, toggleSetting } = useGame();
  const settings: Array<{ key: 'sound' | 'vibration' | 'darkMode'; title: string; detail: string; icon: IconName }> = [
    { key: 'sound', title: 'Sound effects', detail: 'Whooshes, taps and level moments', icon: 'volume-2' },
    { key: 'vibration', title: 'Vibration', detail: 'Tactile feedback on your device', icon: 'smartphone' },
    { key: 'darkMode', title: 'Dark mode', detail: 'A calmer palette for late-night paths', icon: 'moon' },
  ];
  return (
    <ScreenShell>
      <View style={styles.pageHeader}>
        <IconButton icon="chevron-left" label="Back" onPress={onBack} />
        <View style={styles.pageHeaderCenter}><Text style={[styles.pageTitle, { color: theme.foreground }]}>Settings</Text><Text style={[styles.pageSubtitle, { color: theme.mutedForeground }]}>Make the escape yours</Text></View>
        <View style={{ width: 42 }} />
      </View>
      <View style={[styles.settingsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {settings.map((setting, index) => (
          <View key={setting.key} style={[styles.settingRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
            <View style={[styles.settingIcon, { backgroundColor: theme.primarySoft }]}><Feather name={setting.icon} size={18} color={theme.primary} /></View>
            <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: theme.foreground }]}>{setting.title}</Text><Text style={[styles.settingDetail, { color: theme.mutedForeground }]}>{setting.detail}</Text></View>
            <Switch value={state.settings[setting.key]} onValueChange={() => toggleSetting(setting.key)} trackColor={{ false: theme.surfaceMuted, true: theme.primary }} thumbColor={theme.white} />
          </View>
        ))}
      </View>
      <View style={[styles.aboutCard, { backgroundColor: theme.surfaceMuted }]}>
        <AppIcon size={48} />
        <Text style={[styles.aboutTitle, { color: theme.foreground }]}>ARROW ESCAPE</Text>
        <Text style={[styles.aboutText, { color: theme.mutedForeground }]}>Clear the Path. Master the Flow.</Text>
        <Text style={[styles.aboutVersion, { color: theme.mutedForeground }]}>Version 1.0 · Built to play offline</Text>
      </View>
    </ScreenShell>
  );
}

function ArrowTile({
  arrow,
  cellSize,
  theme,
  exiting,
  shaking,
  highlighted,
  locked,
  onPress,
  onExitComplete,
}: {
  arrow: Arrow;
  cellSize: number;
  theme: typeof colors.light;
  exiting: boolean;
  shaking: boolean;
  highlighted: boolean;
  locked: boolean;
  onPress: () => void;
  onExitComplete: () => void;
}) {
  const exit = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(0)).current;
  const direction = arrow.direction;

  useEffect(() => {
    if (!exiting) return;
    const distance = cellSize * 3.3;
    Animated.parallel([
      Animated.timing(exit, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onExitComplete(); });
  }, [cellSize, direction, exit, exiting, onExitComplete]);

  useEffect(() => {
    if (shaking) {
      Animated.sequence([
        Animated.timing(shake, { toValue: -5, duration: 45, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 5, duration: 45, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -3, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [shake, shaking]);

  useEffect(() => {
    if (!highlighted) return;
    Animated.loop(Animated.sequence([
      Animated.timing(hint, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.timing(hint, { toValue: 0, duration: 550, useNativeDriver: true }),
    ])).start();
  }, [highlighted, hint]);

  const escapeDistance = cellSize * 3.3;
  const travel = direction === 'left' ? { translateX: exit.interpolate({ inputRange: [0, 1], outputRange: [0, -escapeDistance] }) } : direction === 'right' ? { translateX: exit.interpolate({ inputRange: [0, 1], outputRange: [0, escapeDistance] }) } : direction === 'up' ? { translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, -escapeDistance] }) } : { translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, escapeDistance] }) };
  return (
    <Pressable
      accessibilityLabel={`${arrow.direction} arrow${arrow.locked ? ', locked' : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={{ position: 'absolute', left: arrow.col * cellSize, top: arrow.row * cellSize, width: cellSize, height: cellSize }}
    >
      <Animated.View style={[styles.arrowTile, { backgroundColor: locked ? theme.surfaceMuted : theme.surface, borderColor: highlighted ? theme.primary : arrow.rotatable && !arrow.rotated ? theme.warning : theme.border, transform: [{ translateX: shake }, travel, { scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0.76] }) }], opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0.08] }) }]}>
        <Animated.View style={{ opacity: highlighted ? hint.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) : 1 }}>
          <Feather name={directionIcons[arrow.direction]} size={Math.max(20, Math.min(42, cellSize * 0.56))} color={arrow.locked ? theme.locked : arrow.rotatable && !arrow.rotated ? theme.warning : highlighted ? theme.primary : theme.arrow} strokeWidth={2.2} />
        </Animated.View>
        {locked ? <View style={[styles.arrowBadge, { backgroundColor: theme.surface }]}><Feather name="lock" size={11} color={theme.locked} /></View> : null}
        {arrow.rotatable && !arrow.rotated ? <View style={[styles.arrowBadge, { backgroundColor: theme.warning }]}><Feather name="rotate-cw" size={11} color={theme.white} /></View> : null}
      </Animated.View>
    </Pressable>
  );
}

function GameHeader({ level, hearts, coins, onBack, onPause }: { level: Level; hearts: number; coins: number; onBack: () => void; onPause: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.gameHeader}>
      <IconButton icon="chevron-left" label="Exit level" onPress={onBack} />
      <View style={styles.gameHeaderTitle}><Text style={[styles.gameLevel, { color: theme.foreground }]}>LEVEL {level.id}</Text><Text style={[styles.gameDifficulty, { color: theme.primary }]}>{level.difficulty} · {getDifficultySubtitle(level.difficulty)}</Text></View>
      <View style={styles.gameHeaderRight}><View style={styles.hearts}>{[0, 1, 2].map((heart) => <Feather key={heart} name="heart" size={17} color={heart < hearts ? theme.danger : theme.locked} fill={heart < hearts ? theme.danger : 'transparent'} />)}</View><CoinBadge coins={coins} /><IconButton icon="pause" label="Pause" onPress={onPause} /></View>
    </View>
  );
}

function GameScreen({ level, onBack, onComplete, isDaily = false }: { level: Level; onBack: () => void; onComplete: (stars: number, reward: number, daily: boolean) => void; isDaily?: boolean }) {
  const theme = useTheme();
  const { state, spendCoins } = useGame();
  const { width } = useWindowDimensions();
  const [arrows, setArrows] = useState<Arrow[]>(() => cloneArrows(level.arrows));
  const [hearts, setHearts] = useState(3);
  const [moves, setMoves] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [undoStack, setUndoStack] = useState<Array<{ arrows: Arrow[]; hearts: number; moves: number; attempts: number }>>([]);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [hintId, setHintId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState<'complete' | 'gameover' | null>(null);
  const [inputLocked, setInputLocked] = useState(false);
  const [completionData, setCompletionData] = useState<{ stars: number; reward: number } | null>(null);
  const [boardWidth, setBoardWidth] = useState(0);

  const feedback = useCallback((name: SoundName) => playFeedback(name, state.settings.sound, state.settings.vibration), [state.settings.sound, state.settings.vibration]);
  const cellSize = boardWidth ? (boardWidth - 4) / level.size : 0;
  const activeCount = arrows.length;

  const pushUndo = useCallback(() => {
    setUndoStack((stack) => [...stack, { arrows: cloneArrows(arrows), hearts, moves, attempts }].slice(-30));
  }, [arrows, attempts, hearts, moves]);

  const handleWrong = useCallback((id: string) => {
    if (exitingId || finished || inputLocked) return;
    setShakingId(id);
    setAttempts((value) => value + 1);
    setHearts((value) => value - 1);
    feedback('wrong');
    setTimeout(() => setShakingId(null), 240);
    if (hearts <= 1) {
      setInputLocked(true);
      setTimeout(() => { setFinished('gameover'); feedback('gameover'); }, 300);
    }
  }, [exitingId, feedback, finished, hearts, inputLocked]);

  const handleArrowPress = useCallback((id: string) => {
    if (exitingId || finished || paused || inputLocked) return;
    const arrow = arrows.find((candidate) => candidate.id === id);
    if (!arrow) return;
    if (!isArrowUnlocked(arrow, arrows)) {
      handleWrong(id);
      feedback('locked');
      return;
    }
    if (arrow.rotatable && !arrow.rotated) {
      pushUndo();
      setArrows((current) => current.map((candidate) => candidate.id === id ? { ...candidate, rotated: true, direction: candidate.solutionDirection } : candidate));
      feedback('rotate');
      return;
    }
    if (!canArrowLeave(arrow, arrows, level.size)) {
      handleWrong(id);
      return;
    }
    pushUndo();
    setAttempts((value) => value + 1);
    setExitingId(id);
    feedback('exit');
  }, [arrows, exitingId, feedback, finished, handleWrong, inputLocked, level.size, paused, pushUndo]);

  const handleExitComplete = useCallback(() => {
    if (!exitingId) return;
    const remaining = arrows.filter((arrow) => arrow.id !== exitingId);
    setArrows(remaining);
    setExitingId(null);
    setMoves((value) => value + 1);
    if (remaining.length === 0) {
      const stars = calculateStars(attempts + 1, level.arrows.length);
      const reward = isDaily ? 50 : getReward(level.id);
      setFinished('complete');
      setCompletionData({ stars, reward });
      feedback('complete');
    }
  }, [arrows, attempts, exitingId, feedback, isDaily, level.arrows.length, level.id]);

  const handleUndo = useCallback(() => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous || exitingId) return;
    setArrows(cloneArrows(previous.arrows));
    setHearts(previous.hearts);
    setMoves(previous.moves);
    setAttempts(previous.attempts);
    setUndoStack((stack) => stack.slice(0, -1));
    feedback('undo');
  }, [exitingId, feedback, undoStack]);

  const handleHint = useCallback(() => {
    if (exitingId || finished || inputLocked) return;
    if (!spendCoins(15)) {
      feedback('wrong');
      return;
    }
    const hint = getHintArrow(arrows, level.size);
    if (!hint) return;
    setHintId(hint.id);
    feedback('hint');
    setTimeout(() => setHintId(null), 1800);
  }, [arrows, exitingId, feedback, finished, inputLocked, level.size, spendCoins]);

  const handleRestart = useCallback(() => {
    setArrows(cloneArrows(level.arrows));
    setHearts(3);
    setMoves(0);
    setAttempts(0);
    setUndoStack([]);
    setExitingId(null);
    setShakingId(null);
    setFinished(null);
    setCompletionData(null);
    setInputLocked(false);
    setPaused(false);
    feedback('restart');
  }, [feedback, level.arrows]);

  return (
    <View style={[styles.gameShell, { backgroundColor: theme.background, paddingTop: useSafeAreaInsets().top + 8, paddingBottom: useSafeAreaInsets().bottom + 12 }]}>
      <GameHeader level={level} hearts={hearts} coins={state.coins} onBack={onBack} onPause={() => { setPaused(true); feedback('click'); }} />
      <View style={styles.gameIntro}>
        <Text style={[styles.gamePrompt, { color: theme.foreground }]}>{isDaily ? 'Today’s challenge' : 'Clear the path'}</Text>
        <Text style={[styles.gameTip, { color: theme.mutedForeground }]}>Tap an arrow only when its escape route is clear.</Text>
      </View>
      <View style={[styles.boardFrame, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]} onLayout={(event) => setBoardWidth(event.nativeEvent.layout.width - 32)}>
        <View style={[styles.board, { width: boardWidth, height: boardWidth, backgroundColor: theme.background, borderColor: theme.border }]}>
          {Array.from({ length: level.size * level.size }, (_, index) => <View key={index} style={[styles.gridCell, { width: cellSize, height: cellSize, borderColor: theme.grid }]} />)}
          {arrows.map((arrow) => (
            <ArrowTile key={arrow.id} arrow={arrow} cellSize={cellSize} theme={theme} exiting={exitingId === arrow.id} shaking={shakingId === arrow.id} highlighted={hintId === arrow.id} locked={!isArrowUnlocked(arrow, arrows)} onPress={() => handleArrowPress(arrow.id)} onExitComplete={handleExitComplete} />
          ))}
        </View>
      </View>
      <View style={styles.gameStatusRow}>
        <View><Text style={[styles.statusLabel, { color: theme.mutedForeground }]}>MOVES</Text><Text style={[styles.statusValue, { color: theme.foreground }]}>{moves}</Text></View>
        <View style={styles.remainingPill}><View style={[styles.statusDot, { backgroundColor: theme.secondary }]} /><Text style={[styles.remainingText, { color: theme.foreground }]}>{activeCount} remaining</Text></View>
        <View><Text style={[styles.statusLabel, { color: theme.mutedForeground }]}>BEST</Text><Text style={[styles.statusValue, { color: theme.foreground }]}>{state.completed[String(level.id)] ? formatStars(state.completed[String(level.id)]) : '—'}</Text></View>
      </View>
      <View style={styles.gameControls}>
        <ControlButton icon="corner-up-left" label="UNDO" onPress={handleUndo} disabled={!undoStack.length || Boolean(exitingId)} />
        <ControlButton icon="zap" label="HINT · 15" onPress={handleHint} disabled={Boolean(exitingId) || finished === 'complete'} accent />
        <ControlButton icon="rotate-ccw" label="RESTART" onPress={handleRestart} disabled={Boolean(exitingId)} />
      </View>
      <Text style={[styles.gameFooter, { color: theme.mutedForeground }]}>{getDifficultySubtitle(level.difficulty)} · Every arrow has a way out</Text>

      <Modal transparent visible={paused} animationType="fade" onRequestClose={() => setPaused(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: theme.primarySoft }]}><Feather name="pause" size={24} color={theme.primary} /></View>
            <Text style={[styles.modalTitle, { color: theme.foreground }]}>PAUSED</Text>
            <Text style={[styles.modalBody, { color: theme.mutedForeground }]}>The board is waiting for you.</Text>
            <PrimaryButton label="RESUME" icon="play" onPress={() => { setPaused(false); feedback('click'); }} />
            <PrimaryButton label="RESTART" icon="rotate-ccw" secondary onPress={() => { setPaused(false); handleRestart(); }} />
            <Pressable onPress={onBack} style={styles.modalTextButton}><Text style={[styles.modalTextButtonLabel, { color: theme.mutedForeground }]}>EXIT LEVEL</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={finished !== null} animationType="fade" onRequestClose={() => setFinished(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: finished === 'complete' ? theme.primarySoft : theme.dangerSoft }]}><Feather name={finished === 'complete' ? 'award' : 'heart'} size={25} color={finished === 'complete' ? theme.primary : theme.danger} /></View>
            <Text style={[styles.modalTitle, { color: theme.foreground }]}>{finished === 'complete' ? 'LEVEL COMPLETE!' : 'GAME OVER'}</Text>
            {finished === 'complete' ? <><Text style={[styles.bigStars, { color: theme.gold }]}>{formatStars(completionData?.stars ?? calculateStars(attempts, level.arrows.length))}</Text><Text style={[styles.modalBody, { color: theme.mutedForeground }]}>Moves: {moves} · Reward: +{completionData?.reward ?? (isDaily ? 50 : getReward(level.id))} coins</Text><PrimaryButton label={isDaily ? 'CLAIM & PLAY AGAIN' : 'NEXT LEVEL'} icon="arrow-right" onPress={() => onComplete(completionData?.stars ?? calculateStars(attempts, level.arrows.length), completionData?.reward ?? (isDaily ? 50 : getReward(level.id)), isDaily)} /></> : <><Text style={[styles.modalBody, { color: theme.mutedForeground }]}>You made 3 wrong moves.</Text><PrimaryButton label="TRY AGAIN" icon="rotate-ccw" onPress={handleRestart} /></>}
            <PrimaryButton label="REPLAY" icon="refresh-cw" secondary onPress={handleRestart} />
            <Pressable onPress={onBack} style={styles.modalTextButton}><Text style={[styles.modalTextButtonLabel, { color: theme.mutedForeground }]}>LEVELS</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ControlButton({ icon, label, onPress, disabled = false, accent = false }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; accent?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.controlButton, { backgroundColor: accent ? theme.primarySoft : theme.surface, borderColor: accent ? theme.primary : theme.border, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
      <Feather name={icon} size={17} color={accent ? theme.primary : theme.foreground} />
      <Text style={[styles.controlLabel, { color: accent ? theme.primary : theme.foreground }]}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  const { state, hydrated, completeLevel, claimDailyReward } = useGame();
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [dailyPlaying, setDailyPlaying] = useState(false);
  const theme = state.settings.darkMode ? colors.dark : colors.light;

  const selected = useMemo(() => createLevel(selectedLevel), [selectedLevel]);
  const dailyLevel = useMemo(() => createLevel(getDailyLevelId()), []);

  const go = useCallback((next: Screen) => {
    playFeedback('click', state.settings.sound, state.settings.vibration);
    setScreen(next);
  }, [state.settings.sound, state.settings.vibration]);

  const handleGameComplete = useCallback((stars: number, reward: number, daily: boolean) => {
    if (daily) {
      claimDailyReward(getTodayKey());
      setDailyPlaying(false);
      setScreen('daily');
    } else {
    completeLevel(selectedLevel, stars, reward);
    setSelectedLevel(selectedLevel + 1);
    setScreen('game');
    }
  }, [claimDailyReward, completeLevel, selectedLevel]);

  if (!hydrated) {
    return <View style={[styles.loading, { backgroundColor: theme.background }]}><AppIcon size={72} /><Text style={[styles.loadingText, { color: theme.mutedForeground }]}>Preparing your paths…</Text></View>;
  }
  if (screen === 'home') return <HomeScreen onNavigate={go} onPlay={() => { setSelectedLevel(state.unlockedLevel); setScreen('game'); playFeedback('start', state.settings.sound, state.settings.vibration); }} />;
  if (screen === 'levels') return <LevelsScreen initialLevel={selectedLevel} onBack={() => go('home')} onSelect={(levelId) => { setSelectedLevel(levelId); setScreen('game'); playFeedback('start', state.settings.sound, state.settings.vibration); }} />;
  if (screen === 'settings') return <SettingsScreen onBack={() => go('home')} />;
  if (screen === 'daily' && !dailyPlaying) return <DailyScreen onBack={() => go('home')} onPlay={() => { setDailyPlaying(true); setScreen('game'); playFeedback('daily', state.settings.sound, state.settings.vibration); }} />;
  return <GameScreen key={dailyPlaying ? `daily-${dailyLevel.id}` : `level-${selectedLevel}`} level={dailyPlaying ? dailyLevel : selected} isDaily={dailyPlaying} onBack={() => { setDailyPlaying(false); go(dailyPlaying ? 'daily' : 'levels'); }} onComplete={handleGameComplete} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  shell: { flex: 1, paddingHorizontal: 20, gap: 18 },
  homeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  homeGreeting: { fontFamily: 'Inter_700Bold', fontSize: 25, marginTop: 5, letterSpacing: -0.7 },
  hero: { alignItems: 'center', justifyContent: 'center', minHeight: 260, position: 'relative', overflow: 'hidden', borderRadius: 30 },
  heroGlow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, opacity: 0.72 },
  logoMark: { alignItems: 'center', justifyContent: 'center', shadowColor: '#11243D', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 6 },
  logoGrid: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 12, borderStyle: 'dashed' },
  logoType: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: 2.2, marginTop: 18 },
  tagline: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 6 },
  heroArrows: { flexDirection: 'row', gap: 8, marginTop: 22 },
  heroArrow: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  progressCard: { borderWidth: 1, borderRadius: 20, padding: 17, gap: 15, shadowColor: '#11243D', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardKicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 },
  progressTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, marginTop: 4 },
  progressPercent: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  progressTrack: { height: 8, borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 8 },
  homeActions: { gap: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryButton: { minHeight: 50, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 18 },
  compactButton: { flex: 1, minHeight: 47, paddingHorizontal: 8 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 0.7 },
  homeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 8 },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, paddingVertical: 7, paddingHorizontal: 9 },
  coinIcon: { width: 20, height: 20, borderWidth: 2, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  coinLetter: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  coinValue: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 54 },
  pageHeaderCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  pageTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4 },
  pageSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1 },
  worldCard: { borderWidth: 1, borderRadius: 20, padding: 15, gap: 15 },
  worldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  worldNumber: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.3 },
  worldName: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 4 },
  worldRange: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  levelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelTile: { width: '17.5%', aspectRatio: 0.88, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
  levelNumber: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  starsText: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: -0.7 },
  batchNavigation: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2, paddingBottom: 6 },
  batchLabel: { alignItems: 'center', minWidth: 58 },
  batchLabelTitle: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  batchLabelDetail: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 3 },
  dailyHero: { borderWidth: 1, borderRadius: 26, padding: 22, gap: 8, overflow: 'hidden' },
  dailyStamp: { width: 50, height: 50, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  dailyTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#FFFFFF', letterSpacing: 0.5 },
  dailyDate: { fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.82)' },
  dailyMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15 },
  dailyMetaLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, color: 'rgba(255,255,255,0.64)', letterSpacing: 1 },
  dailyMetaValue: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFFFFF', marginTop: 4 },
  infoCard: { borderRadius: 18, padding: 16, flexDirection: 'row', gap: 12 },
  infoText: { flex: 1, gap: 4 },
  infoTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  infoBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  settingsCard: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 16 },
  settingRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  settingCopy: { flex: 1, gap: 4 },
  settingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  settingDetail: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  aboutCard: { alignItems: 'center', padding: 23, borderRadius: 22, gap: 7 },
  aboutTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 1.4, marginTop: 5 },
  aboutText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  aboutVersion: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 5 },
  gameShell: { flex: 1, paddingHorizontal: 16 },
  gameHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  gameHeaderTitle: { flex: 1 },
  gameLevel: { fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 0.6 },
  gameDifficulty: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5, marginTop: 3 },
  gameHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  hearts: { flexDirection: 'row', gap: 2 },
  gameIntro: { marginTop: 12, gap: 4, alignItems: 'center' },
  gamePrompt: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.5 },
  gameTip: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center' },
  boardFrame: { alignSelf: 'center', width: '100%', maxWidth: 430, padding: 16, borderWidth: 1, borderRadius: 27, marginTop: 16, shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  board: { alignSelf: 'center', position: 'relative', flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  gridCell: { borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  arrowTile: { flex: 1, margin: 3, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, shadowColor: '#11243D', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  arrowBadge: { position: 'absolute', right: 2, top: 2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  gameStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, marginTop: 17 },
  statusLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  statusValue: { fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 3 },
  remainingPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  remainingText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  gameControls: { flexDirection: 'row', gap: 8, marginTop: 18 },
  controlButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  controlLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  gameFooter: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 14 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 370, borderRadius: 26, borderWidth: 1, padding: 24, alignItems: 'center', gap: 12 },
  modalIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: 0.5 },
  modalBody: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 3 },
  bigStars: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: 2 },
  modalTextButton: { padding: 10, marginTop: 2 },
  modalTextButtonLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1 },
});