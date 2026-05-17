import { useState, useEffect, useRef } from 'react'

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

function GameCard({ teamId, data }) {
  const affiliate = AFFILIATES[teamId]
  const name  = data?.teamName  || affiliate?.name  || `Team ${teamId}`
  const level = data?.level     || affiliate?.level || ''

  const entries = Array.isArray(data) ? data : (data && Object.keys(data).length ? [data] : null)

  return (
    <div className="team-card">
      <div className="card-header">
        <div className="card-header-left">
          <div className="card-team-name">{name}</div>
          <div className="card-level">{level}</div>
        </div>
        {entries && <StateBadge state={entries[0].state} />}
      </div>

      {!entries ? (
        <div className="card-body">
          <span className="card-no-game">No game scheduled</span>
        </div>
      ) : (
        entries.map((game, i) => (
          <div key={i} className="card-body">
            {i > 0 && <div className="card-divider" />}
            {entries.length > 1 && (
              <div className="game-number">Game {i + 1} of {entries.length}</div>
            )}

            {game.state === 'Completed' && (
              <>
                <div className="card-score">
                  <span className={game.finalScore.us > game.finalScore.them ? 'score-win' : 'score-loss'}>
                    {game.finalScore.us}
                  </span>
                  <span className="score-sep">–</span>
                  <span className={game.finalScore.them > game.finalScore.us ? 'score-win' : 'score-loss'}>
                    {game.finalScore.them}
                  </span>
                </div>
                <div className="card-opponent">{game.opponent}</div>
                <div className="card-parent-club">{game.opponentParentClub || ' '}</div>
                <div className="card-divider" />
                <div className="card-decisions">
                  <span className="decision-label">W</span>
                  <span className="decision-value">{game.winningPitcher || '—'}</span>
                  <span className="decision-label">L</span>
                  <span className="decision-value">{game.losingPitcher || '—'}</span>
                  <span className="decision-label">SV</span>
                  <span className="decision-value">{game.savePitcher || '—'}</span>
                </div>
              </>
            )}

            {game.state === 'Not Started' && (
              <>
                <div className="card-opponent">{game.opponent}</div>
                <div className="card-parent-club">{game.opponentParentClub || ' '}</div>
                <div className="card-divider" />
                <div className="card-meta-row">
                  <span>{formatTime(game.gameTime)}</span>
                  <span className="meta-sep">·</span>
                  <span>{game.venue}</span>
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
                  <span className={game.score.us > game.score.them ? 'score-win' : 'score-loss'}>
                    {game.score.us}
                  </span>
                  <span className="score-sep">–</span>
                  <span className={game.score.them > game.score.us ? 'score-win' : 'score-loss'}>
                    {game.score.them}
                  </span>
                </div>
                <div className="card-situation">
                  <div className="situation-text">
                    <span>{game.inningHalf === 'Bottom' ? 'Bot' : 'Top'} {game.inning}</span>
                    <span className="meta-sep">·</span>
                    <span>{game.outs} {game.outs === 1 ? 'out' : 'outs'}</span>
                  </div>
                  <BaseDiamond runners={game.runnersOnBase} />
                </div>
                <div className="card-divider" />
                <div className="card-meta-row">
                  <span>{game.opponent}</span>
                  <span className="meta-sep">·</span>
                  <span>{game.venue}</span>
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
        ))
      )}
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

  const ordered    = data ? DISPLAY_ORDER.map(id => [id, data[id]]) : []
  const withGame   = ordered.filter(([, v]) => v && Object.keys(v).length > 0)
  const withoutGame = ordered.filter(([, v]) => !v || Object.keys(v).length === 0)

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
          {loading ? '↻' : '↻'}
        </button>
        {loading && <span className="loading-text">Loading…</span>}
        {error && <span className="error-text">Error: {error}</span>}
      </div>

      {data && (
        <>
          {withGame.length > 0 ? (
            <div className="cards-grid">
              {withGame.map(([id, game]) => (
                <GameCard key={id} teamId={id} data={game} />
              ))}
            </div>
          ) : (
            <div className="no-games-today">No games scheduled for this date.</div>
          )}

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
