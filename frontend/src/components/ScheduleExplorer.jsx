import { useState, useEffect, useRef } from 'react'

const US_COLOR   = 'var(--teal-dim)'
const THEM_COLOR = '#dc2626'

const AFFILIATES = {
  '146':  { name: 'Miami Marlins',                 level: 'Major League Baseball' },
  '564':  { name: 'Jacksonville Jumbo Shrimp',     level: 'Triple-A'              },
  '4124': { name: 'Pensacola Blue Wahoos',          level: 'Double-A'              },
  '554':  { name: 'Beloit Sky Carp',               level: 'High-A'                },
  '479':  { name: 'Jupiter Hammerheads',            level: 'Single-A'              },
  '467':  { name: 'FCL Marlins',                   level: 'Rookie'                },
  '619':  { name: 'DSL Marlins',                   level: 'Rookie'                },
  '2127': { name: 'DSL Miami',                     level: 'Rookie'                },
  '385':  { name: 'Miami Marlins Prospects',        level: 'Minor League Baseball' },
  '3276': { name: 'Marlins Alt. Training Site',    level: 'Minor League Baseball' },
  '3277': { name: 'Marlins Organization',          level: 'Minor League Baseball' },
}

const DISPLAY_ORDER = ['146','564','4124','554','479','467','619','2127','385','3276','3277']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
}

function StateBadge({ state }) {
  if (!state) return null
  const cls = state === 'Not Started' ? 'not-started'
            : state === 'In Progress' ? 'in-progress'
            : 'completed'
  return <span className={`state-badge ${cls}`}>{state}</span>
}

function BaseDiamond({ runners = [] }) {
  const on = (base) => runners.includes(base)
  return (
    <div className="base-diamond">
      <div className="base-row"><div className={`base ${on('second') ? 'on' : ''}`} /></div>
      <div className="base-row">
        <div className={`base ${on('third') ? 'on' : ''}`} />
        <div className="base-gap" />
        <div className={`base ${on('first') ? 'on' : ''}`} />
      </div>
    </div>
  )
}

function GameCard({ teamId, game, gameNum, totalGames }) {
  const affiliate = AFFILIATES[teamId]
  const name  = game?.teamName  || affiliate?.name  || `Team ${teamId}`
  const level = game?.level     || affiliate?.level || ''

  return (
    <div className="team-card">
      <div className="card-header">
        <div className="card-header-left">
          <div className="card-team-name">{name}</div>
          <div className="card-level">{level}{gameNum ? ` · Game ${gameNum} of ${totalGames}` : ''}</div>
        </div>
        {game && <StateBadge state={game.state} />}
      </div>

      <div className="card-body">
        {game.state === 'Completed' && (
          <>
            <div className="card-score">
              <span style={{ color: US_COLOR }}>{game.finalScore?.us ?? 0}</span>
              <span className="score-sep">–</span>
              <span style={{ color: THEM_COLOR }}>{game.finalScore?.them ?? 0}</span>
            </div>
            <div className="card-opponent">{game.opponent}</div>
            <div className="card-parent-club">{game.opponentParentClub || ' '}</div>
            <div className="card-divider" />
            <div className="card-pitchers">
              <div className="pitcher-row">
                <span className="pitcher-label">W</span>
                <span className="pitcher-value">{game.winningPitcher || '—'}</span>
              </div>
              <div className="pitcher-row">
                <span className="pitcher-label">L</span>
                <span className="pitcher-value">{game.losingPitcher || '—'}</span>
              </div>
              {game.savePitcher && (
                <div className="pitcher-row">
                  <span className="pitcher-label">SV</span>
                  <span className="pitcher-value">{game.savePitcher}</span>
                </div>
              )}
            </div>
          </>
        )}

        {game.state === 'Not Started' && (
          <>
            <div className="card-opponent">{game.opponent}</div>
            <div className="card-parent-club">{game.opponentParentClub || ' '}</div>
            <div className="card-divider" />
            <div className="card-live-bar">
              <span className="live-venue">{game.venue}</span>
              <span className="live-stat">{formatTime(game.gameTime)}</span>
            </div>
            <div className="card-divider" />
            <div className="card-pitchers">
              <div className="pitcher-row">
                <span className="pitcher-label">P (us)</span>
                <span className="pitcher-value">{game.probablePitchers?.us || '—'}</span>
              </div>
              <div className="pitcher-row">
                <span className="pitcher-label">P (them)</span>
                <span className="pitcher-value">{game.probablePitchers?.them || '—'}</span>
              </div>
            </div>
          </>
        )}

        {game.state === 'In Progress' && (
          <>
            <div className="card-score">
              <span style={{ color: US_COLOR }}>{game.score?.us ?? 0}</span>
              <span className="score-sep">–</span>
              <span style={{ color: THEM_COLOR }}>{game.score?.them ?? 0}</span>
            </div>
            <div className="card-opponent">{game.opponent}</div>
            <div className="card-parent-club">{game.opponentParentClub || ' '}</div>
            <div className="card-divider" />
            <div className="card-live-bar">
              <span className="live-venue">{game.venue}</span>
              <div className="live-indicators">
                <span className="live-stat">{game.inningHalf === 'Bottom' ? '↓' : '↑'}{game.inning}</span>
                <span className="live-stat">{[0,1,2].map(i => i < game.outs ? '●' : '○').join('')}</span>
                <BaseDiamond runners={game.runnersOnBase} />
              </div>
            </div>
            <div className="card-divider" />
            <div className="card-pitchers">
              <div className="pitcher-row">
                <span className="pitcher-label">P</span>
                <span className="pitcher-value">{game.currentPitcher || '—'}</span>
              </div>
              <div className="pitcher-row">
                <span className="pitcher-label">AB</span>
                <span className="pitcher-value">{game.currentBatter || '—'}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ScheduleExplorer() {
  const [date, setDate]       = useState(today())
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const debounceRef           = useRef(null)

  async function load(d) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/schedule?date=${d}`)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(date) }, [])

  function handleDateChange(e) {
    const d = e.target.value
    setDate(d)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(d), 300)
  }

  const ordered     = data ? DISPLAY_ORDER.map(id => [id, data[id]]) : []
  const withoutGame = ordered.filter(([, v]) => !v || Object.keys(v).length === 0)

  const expanded = ordered
    .filter(([, v]) => v && Object.keys(v).length > 0)
    .flatMap(([id, v]) =>
      Array.isArray(v)
        ? v.map((game, i) => ({ teamId: id, game, gameNum: i + 1, totalGames: v.length }))
        : [{ teamId: id, game: v, gameNum: null, totalGames: null }]
    )

  const inProgress = expanded.filter(e => e.game.state === 'In Progress')
  const notStarted = expanded.filter(e => e.game.state === 'Not Started')
  const completed  = expanded.filter(e => e.game.state === 'Completed')
  const hasGames   = inProgress.length + notStarted.length + completed.length > 0

  const GameGroup = ({ label, entries }) => entries.length === 0 ? null : (
    <div className="game-group">
      <div className="game-group-label">{label}</div>
      <div className="cards-grid">
        {entries.map(({ teamId, game, gameNum, totalGames }) => (
          <GameCard
            key={`${teamId}-${gameNum ?? 0}`}
            teamId={teamId}
            game={game}
            gameNum={gameNum}
            totalGames={totalGames}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <div className="section-title">Schedule Explorer</div>

      <div className="explorer-controls">
        <input
          type="date"
          className="date-input"
          value={date}
          onChange={handleDateChange}
        />
        <button className="load-btn" onClick={() => load(date)} disabled={loading}>
          ↻
        </button>
        {loading && <span className="loading-text">Loading…</span>}
        {error && <span className="error-text">Error: {error}</span>}
      </div>

      {data && (
        <>
          {!hasGames && (
            <div className="no-games-today">No games scheduled for this date.</div>
          )}

          <GameGroup label="In Progress" entries={inProgress} />
          <GameGroup label="Not Started" entries={notStarted} />
          <GameGroup label="Completed"   entries={completed} />

          {withoutGame.length > 0 && (
            <div className="off-today">
              <span className="off-today-label">Off today</span>
              {withoutGame.map(([id], i) => (
                <span key={id}>
                  {i > 0 && <span className="off-today-sep">·</span>}
                  {AFFILIATES[id]?.name || `Team ${id}`}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
