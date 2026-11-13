import type { PointerEvent as ReactPointerEvent } from 'react';

// Update CSS variables on the hovered element, without triggering React renders.
const pendingFrames = new WeakMap<HTMLElement, number>();

export function updateInteractiveCardMotion(event: ReactPointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const card = event.currentTarget;
  const { clientX, clientY } = event;
  const previous = pendingFrames.get(card);
  if (previous !== undefined) window.cancelAnimationFrame(previous);

  const frame = window.requestAnimationFrame(() => {
    pendingFrames.delete(card);
    if (!card.isConnected) return;
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    card.style.setProperty('--iau-card-pointer-x', `${Math.round(x * 100)}%`);
    card.style.setProperty('--iau-card-pointer-y', `${Math.round(y * 100)}%`);
    card.style.setProperty('--iau-card-rotate-x', `${((0.5 - y) * 4.6).toFixed(2)}deg`);
    card.style.setProperty('--iau-card-rotate-y', `${((x - 0.5) * -4.6).toFixed(2)}deg`);
  });
  pendingFrames.set(card, frame);
}

export function resetInteractiveCardMotion(event: ReactPointerEvent<HTMLElement>) {
  const card = event.currentTarget;
  const pending = pendingFrames.get(card);
  if (pending !== undefined) {
    window.cancelAnimationFrame(pending);
    pendingFrames.delete(card);
  }
  card.style.removeProperty('--iau-card-rotate-x');
  card.style.removeProperty('--iau-card-rotate-y');
  card.style.removeProperty('--iau-card-pointer-x');
  card.style.removeProperty('--iau-card-pointer-y');
}
