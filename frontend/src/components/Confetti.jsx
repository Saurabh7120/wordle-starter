import { useEffect, useState } from 'react'

const COLORS = ['green', 'yellow', 'accent', 'quiet']

export default function Confetti({ onDone }) {
  const [bits] = useState(() =>
    Array.from({ length: 70 }, () => ({
      '--x': `${Math.random() * 100}vw`,
      '--dx': `${(Math.random() - 0.5) * 40}vw`,
      '--rise': `${45 + Math.random() * 45}vh`,
      '--rot': `${Math.random() * 720 - 360}deg`,
      '--c': `var(--${COLORS[Math.floor(Math.random() * COLORS.length)]})`,
      animationDelay: `${Math.random() * 0.3}s`,
      animationDuration: `${1.8 + Math.random() * 1.2}s`,
    })),
  )
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((style, i) => <i key={i} style={style} />)}
    </div>
  )
}
