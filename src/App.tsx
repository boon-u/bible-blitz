import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BibleTimeline } from './components/BibleTimeline';
import { GameBoard } from './components/GameBoard';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { ProfilePicker } from './components/ProfilePicker';
import { RoundComplete } from './components/RoundComplete';
import { WelcomeScreen } from './components/WelcomeScreen';
import type { CanonMode } from './game/canon';
import {
  applyMove,
  createRound,
  getHighScore,
  saveHighScore,
  timeBonus,
  type RoundState,
} from './game/logic';
import { useProfiles } from './lib/profiles';
import { createSession, saveRoundResult } from './lib/scores';
import { supabase } from './lib/supabase';
import './App.css';

type Screen = 'welcome' | 'playing' | 'roundComplete' | 'leaderboard';

function App() {
  const profiles = useProfiles(supabase);
  const [screen, setScreen] = useState<Screen>('welcome');
  const [canonMode, setCanonMode] = useState<CanonMode>('all');
  const [round, setRound] = useState<RoundState>(() => createRound('all'));
  const [totalScore, setTotalScore] = useState(0);
  const [highScore, setHighScore] = useState(getHighScore);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [roundBonus, setRoundBonus] = useState(0);
  const [animating, setAnimating] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const roundStart = useRef<number>(Date.now());

  useEffect(() => {
    if (screen !== 'playing') return;

    const tick = () => {
      setElapsedMs(Date.now() - roundStart.current);
    };

    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [screen, round.startIndex, round.targetIndex]);

  const handleChoose = useCallback(
    (direction: 'left' | 'right') => {
      if (animating || round.finished || screen !== 'playing') return;

      setAnimating(true);

      setTimeout(() => {
        setRound((prev) => {
          const next = applyMove(prev, direction);

          if (next.finished) {
            const bonus = next.failed ? 0 : timeBonus(Date.now() - roundStart.current);
            const finalRoundScore = next.roundScore + bonus;
            const elapsed = Date.now() - roundStart.current;

            setRoundBonus(bonus);
            setTotalScore((s) => {
              const updated = s + finalRoundScore;
              if (!next.failed) {
                saveHighScore(updated);
              }
              setHighScore(getHighScore());
              return updated;
            });

            if (supabase && profiles.selected) {
              void saveRoundResult(supabase, {
                profileId: profiles.selected.id,
                sessionId: sessionIdRef.current,
                round: next,
                finalScore: finalRoundScore,
                elapsedMs: elapsed,
              });
            }

            setTimeout(() => setScreen('roundComplete'), 600);
          }

          return next;
        });
        setAnimating(false);
      }, 350);
    },
    [animating, round.finished, screen, profiles.selected],
  );

  useEffect(() => {
    if (screen !== 'playing') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleChoose('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleChoose('right');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, handleChoose]);

  const startGame = useCallback(async () => {
    const newRound = createRound(canonMode);
    setRound(newRound);
    setTotalScore(0);
    setRoundBonus(0);
    setElapsedMs(0);
    roundStart.current = Date.now();
    sessionIdRef.current = null;

    if (supabase && profiles.selected) {
      sessionIdRef.current = await createSession(
        supabase,
        profiles.selected.id,
        canonMode,
      );
    }

    setScreen('playing');
  }, [canonMode, profiles.selected]);

  const nextRound = useCallback(() => {
    const newRound = createRound(canonMode);
    setRound(newRound);
    setRoundBonus(0);
    setElapsedMs(0);
    roundStart.current = Date.now();
    setScreen('playing');
  }, [canonMode]);

  const endSession = useCallback(() => {
    sessionIdRef.current = null;
    setScreen('welcome');
  }, []);

  if (profiles.loading) {
    return (
      <div className="app loading-screen">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        >
          📖
        </motion.span>
      </div>
    );
  }

  if (!profiles.selected) {
    return (
      <div className="app">
        <ProfilePicker
          profiles={profiles.profiles}
          onSelect={profiles.selectProfile}
          onCreate={profiles.createProfile}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="bg-shapes" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="bg-blob"
            animate={{
              y: [0, -30, 0],
              x: [0, i % 2 === 0 ? 20 : -20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 6 + i,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <main className="main">
        <AnimatePresence mode="wait">
          {screen === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <WelcomeScreen
                highScore={highScore}
                mode={canonMode}
                onModeChange={setCanonMode}
                profile={profiles.selected}
                onSwitchProfile={profiles.clearProfile}
                onShowLeaderboard={() => setScreen('leaderboard')}
                onStart={startGame}
              />
            </motion.div>
          )}

          {screen === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LeaderboardPanel
                profile={profiles.selected}
                onBack={() => setScreen('welcome')}
              />
            </motion.div>
          )}

          {screen === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="play-layout"
            >
              <GameBoard
                round={round}
                elapsedMs={elapsedMs}
                totalScore={totalScore + round.roundScore}
                highScore={highScore}
                onChoose={handleChoose}
                disabled={animating}
              />
              <BibleTimeline
                round={round}
                showTarget={false}
                feedback={round.lastFeedback}
              />
            </motion.div>
          )}

          {screen === 'roundComplete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RoundComplete
                round={round}
                elapsedMs={elapsedMs}
                roundBonus={roundBonus}
                totalScore={totalScore}
                onNextRound={nextRound}
                onEndSession={endSession}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="footer">
        <span>66 books · Binary search training</span>
        {profiles.selected && (
          <span className="footer-profile">Playing as {profiles.selected.username}</span>
        )}
      </footer>
    </div>
  );
}

export default App;
