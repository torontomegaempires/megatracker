/** Monotonically increasing message sequence counter. */
let _seq = 0;

export function nextSeq(): number {
	return ++_seq;
}

/** Sync the counter to at least `n` (used when receiving a snapshot). */
export function setSeq(n: number): void {
	if (n > _seq) _seq = n;
}

export function resetSeq(): void {
	_seq = 0;
}
