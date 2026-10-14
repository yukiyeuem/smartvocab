import { UserCardState } from './db';

export interface SrsCalculationResult {
  nextState: UserCardState;
  isLeech: boolean;
}

export function calculateNextSrs(
  currentState: UserCardState,
  rating: 1 | 2 | 3 | 4, // 1=Again, 2=Hard, 3=Good, 4=Easy
  now: number = Date.now()
): SrsCalculationResult {
  let ease = currentState.ease_factor || 2.5;
  let interval = currentState.interval_days || 0;
  let reps = currentState.repetitions || 0;
  let lapses = currentState.lapses || 0;

  switch (rating) {
    case 1: // Again
      reps = 0;
      lapses += 1;
      ease = Math.max(1.3, ease - 0.20);
      interval = 1;
      break;

    case 2: // Hard
      if (reps === 0) {
        interval = 1;
      } else {
        interval = Math.max(1, Math.round(interval * 1.2));
      }
      ease = Math.max(1.3, ease - 0.15);
      reps += 1;
      break;

    case 3: // Good
      if (reps === 0) {
        interval = 1;
      } else if (reps === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * ease);
      }
      reps += 1;
      break;

    case 4: // Easy
      if (reps === 0) {
        interval = 4;
      } else if (reps === 1) {
        interval = 10;
      } else {
        interval = Math.round(interval * ease * 1.3);
      }
      ease = Math.min(3.0, ease + 0.15);
      reps += 1;
      break;
  }

  // Interval limits: min 1, max 365 days
  interval = Math.min(365, Math.max(1, interval));

  // Compute due_at: aligned to start of day in the user's future (interval * 24 hours)
  const targetDate = new Date(now + interval * 86400000);
  targetDate.setHours(0, 0, 0, 0);
  const due_at = targetDate.getTime();

  const nextState: UserCardState = {
    ...currentState,
    ease_factor: Number(ease.toFixed(2)),
    interval_days: interval,
    repetitions: reps,
    lapses,
    due_at,
    last_reviewed_at: now,
  };

  const isLeech = lapses >= 8;

  return { nextState, isLeech };
}
