import { useState } from 'react'
import type { Challenge } from '@/domain/challenge'

interface ChallengeViewProps {
  challenge: Challenge
  onSubmit: (text: string) => void
  submitLabel?: string
}

/** English↔Korean vocabulary prompt + answer input, shared by dungeon events. */
export function ChallengeView({ challenge, onSubmit, submitLabel = 'Answer' }: ChallengeViewProps) {
  const [text, setText] = useState('')
  const asksForKorean = challenge.direction === 'eng_to_kor'

  return (
    <div className="panel challenge-prompt">
      <div className="prompt-label">{asksForKorean ? 'Translate to Korean' : 'Translate to English'}</div>
      <div className="prompt-word" lang={asksForKorean ? 'en' : 'ko'}>
        {challenge.prompt}
      </div>
      <form
        className="answer-row"
        style={{ marginTop: 14 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) onSubmit(text)
        }}
      >
        <input
          type="text"
          autoFocus
          lang={asksForKorean ? 'ko' : 'en'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={asksForKorean ? '한국어로 입력...' : 'Type in English...'}
        />
        <button className="btn btn-primary" type="submit" disabled={!text.trim()}>
          {submitLabel}
        </button>
      </form>
    </div>
  )
}
