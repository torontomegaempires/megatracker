import type { Color, Credits, ExtraCredit } from '../data';
import { COLORS } from '../data';
import { zeroCredits } from './game';

/** Describe what the player has to do for an extra-credit choice. */
export function choicePrompt(amount: ExtraCredit): string {
  if (amount === '10for40') return 'Pick a color to give up 10 credits; you gain 10 in each of the other four.';
  if (amount === '10for10') return 'Pick a color to give up 10 credits, then a color to gain 10.';
  if (amount < 0) return `Pick one color to gain ${-amount} credits.`;
  return `Tap colors to add ${amount} credits in any mix, 5 at a time.`;
}

const sum = (d: Credits) => COLORS.reduce((t, c) => t + d[c], 0);
const negatives = (d: Credits) => COLORS.filter((c) => d[c] < 0);
const positives = (d: Credits) => COLORS.filter((c) => d[c] > 0);

export function choiceReady(amount: ExtraCredit, delta: Credits): boolean {
  if (amount === '10for40') return negatives(delta).length === 1;
  if (amount === '10for10') return negatives(delta).length === 1 && positives(delta).length === 1;
  return sum(delta) === Math.abs(amount);
}

/**
 * Apply a tap on a color to the pending choice. Returns the new delta, or the
 * same object when the tap is not allowed.
 */
export function choiceTap(amount: ExtraCredit, credits: Credits, delta: Credits, color: Color): Credits {
  if (amount === '10for40') {
    if (negatives(delta).length > 0 || credits[color] < 10) return delta;
    const out = zeroCredits();
    for (const c of COLORS) out[c] = c === color ? -10 : 10;
    return out;
  }
  if (amount === '10for10') {
    const neg = negatives(delta);
    if (neg.length === 0) {
      if (credits[color] < 10) return delta;
      return { ...zeroCredits(), [color]: -10 };
    }
    if (positives(delta).length > 0) return delta;
    // Second tap: gain 10 here. Tapping the same color again undoes the first tap.
    return { ...delta, [color]: delta[color] + 10 };
  }
  if (choiceReady(amount, delta)) return delta;
  const step = amount < 0 ? -amount : 5;
  return { ...delta, [color]: delta[color] + step };
}

/** Whether a tap on this color would do anything right now. */
export function choiceCanTap(amount: ExtraCredit, credits: Credits, delta: Credits, color: Color): boolean {
  return choiceTap(amount, credits, delta, color) !== delta;
}
