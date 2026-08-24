import type { ReactNode } from 'react'

/**
 * Bottom-sheet popup that hosts a vocabulary Challenge (event, attack, or
 * defense). Visually matches SlidePanel/the app's other popups, but with no
 * close affordance — answering isn't optional, so there's nothing to
 * dismiss on backdrop tap.
 */
export function ChallengeModal({ children }: { children: ReactNode }) {
  return (
    <div className="overlay-backdrop challenge-modal-backdrop">
      <div className="slide-panel challenge-modal-panel">{children}</div>
    </div>
  )
}
