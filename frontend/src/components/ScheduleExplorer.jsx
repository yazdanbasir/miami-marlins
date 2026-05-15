import { useState, useEffect } from 'react'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
}

function Val({ v }) {
  if (v === null || v === undefined) return <span className="card-value null">—</span>
  return <span className="card-value">{String(v)}</span>
}

function MonoVal({ v }) {
  if (v === null || v === undefined) return <span className="card-value null">—</span>
  return <span className="card-value mono">{String(v)}</span>
}

function Row({ label, children }) {
  return (
    <div className="card-row">
      <span className="card-label">{label}</span>
      {children}
    </div>
  )
}

function StateBadge({ state }) {
  if (!state) return <span className="state-badge no-game">No Game</span>
  const cls = state === 'Not Started' ? 'not-started'
            : state === 'In Progress' ? 'in-progress'
            : 'completed'
  return <span className={`state-badge ${cls}`}>{state}</span>
}

function ScoreDisplay({ us, them }) {
  const weWon = us > them
  return (
    <div className="score-display">
      <span className={weWon ? 'win' : 'loss'}>{us}</span>
      {' – '}
      <span className={!weWon ? 'win' : 'loss'}>{them}</span>
    </div>
  )
}

function GameCard({ teamId, data }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="team-card">
        <div className="card-header">
          <div>
            <div className="card-team-name" style={{ color: 'var(--text-muted)' }}>Team {teamId}</div>
          </div>
          <StateBadge state={null} />
        </div>
        <div className="card-body">
          <span className="card-no-game">No game scheduled</span>
        </div>
      </div>
    )
  }

  const entries = Array.isArray(data) ? data : [data]

  return (
    <div className="team-card">
      <div className="card-header">
        <div>
          <div className="card-team-name">{entries[0].teamName}</div>
          <div className="card-level">{entries[0].level}</div>
        </div>
        <StateBadge state={entries[0].state} />
      </div>

      {entries.map((game, i) => (
        <div key={i} className="card-body">
          {i > 0 && <div className="divider" style={{ marginBottom: 8 }} />}
          {entries.length > 1 && (
            <Row label="Game"><span className="card-value">#{i + 1} of {entries.length}</span></Row>
          )}

          {game.state === 'Not Started' && (
            <>
              <Row label="Time"><Val v={formatTime(game.gameTime)} /></Row>
              <Row label="Venue"><Val v={game.venue} /></Row>
              <Row label="Opponent"><Val v={game.opponent} /></Row>
              {game.opponentParentClub && (
                <Row label="Parent Club"><Val v={game.opponentParentClub} /></Row>
              )}
              <div className="divider" />
              <Row label="Probable (Us)"><Val v={game.probablePitchers?.us} /></Row>
              <Row label="Probable (Them)"><Val v={game.probablePitchers?.them} /></Row>
            </>
          )}

          {game.state === 'In Progress' && (
            <>
              <ScoreDisplay us={game.score?.us} them={game.score?.them} />
              <Row label="Inning"><MonoVal v={`${game.inningHalf} ${game.inning}`} /></Row>
              <Row label="Outs"><MonoVal v={game.outs} /></Row>
              <Row label="Runners">
                <span className="card-value">
                  {game.runnersOnBase?.length ? game.runnersOnBase.join(', ') : 'Bases empty'}
                </span>
              </Row>
              <div className="divider" />
              <Row label="Venue"><Val v={game.venue} /></Row>
              <Row label="Opponent"><Val v={game.opponent} /></Row>
              {game.opponentParentClub && (
                <Row label="Parent Club"><Val v={game.opponentParentClub} /></Row>
              )}
              <div className="divider" />
              <Row label="Pitcher"><Val v={game.currentPitcher} /></Row>
              <Row label="Batter"><Val v={game.currentBatter} /></Row>
            </>
          )}

          {game.state === 'Completed' && (
            <>
              <ScoreDisplay us={game.finalScore?.us} them={game.finalScore?.them} />
              <Row label="Opponent"><Val v={game.opponent} /></Row>
              {game.opponentParentClub && (
                <Row label="Parent Club"><Val v={game.opponentParentClub} /></Row>
              )}
              <div className="divider" />
              <Row label="W"><Val v={game.winningPitcher} /></Row>
              <Row label="L"><Val v={game.losingPitcher} /></Row>
              <Row label="SV"><Val v={game.savePitcher} /></Row>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ScheduleExplorer() {
  const [date, setDate]       = useState(today())
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

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

  function handleLoad() { load(date) }

  return (
    <div>
      <div className="section-title">Schedule Explorer</div>

      <div className="explorer-controls">
        <input
          type="date"
          className="date-input"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <button className="load-btn" onClick={handleLoad} disabled={loading}>
          {loading ? 'Loading…' : 'Load'}
        </button>
        {loading && <span className="loading-text">Fetching schedule…</span>}
        {error && <span style={{ fontSize: 13, color: '#dc2626' }}>Error: {error}</span>}
      </div>

      {data && (
        <div className="cards-grid">
          {Object.entries(data).map(([teamId, game]) => (
            <GameCard key={teamId} teamId={teamId} data={game} />
          ))}
        </div>
      )}
    </div>
  )
}
