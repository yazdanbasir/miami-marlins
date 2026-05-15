import { useState } from 'react'

const COMMON_FIELDS = [
  { name: 'teamName',           type: 'string',       desc: 'Affiliate team name, e.g. "Jupiter Hammerheads"' },
  { name: 'level',              type: 'string',       desc: 'Competition level, e.g. "Single-A", "Triple-A", "Major League Baseball"' },
  { name: 'state',              type: 'string',       desc: '"Not Started" | "In Progress" | "Completed"' },
  { name: 'opponent',           type: 'string',       desc: 'Opponent team name' },
  { name: 'opponentParentClub', type: 'string | null', desc: 'Opponent\'s MLB parent org, e.g. "New York Mets". null if opponent is MLB.' },
]

const STATE_FIELDS = {
  'Not Started': [
    { name: 'gameTime',             type: 'string',       desc: 'Scheduled start time in ISO 8601 UTC format' },
    { name: 'venue',                type: 'string',       desc: 'Stadium name' },
    { name: 'probablePitchers.us',  type: 'string | null', desc: 'Our probable starter full name, if announced' },
    { name: 'probablePitchers.them',type: 'string | null', desc: 'Opponent probable starter full name, if announced' },
  ],
  'In Progress': [
    { name: 'venue',         type: 'string',        desc: 'Stadium name' },
    { name: 'score.us',      type: 'number',        desc: 'Our current runs' },
    { name: 'score.them',    type: 'number',        desc: 'Opponent current runs' },
    { name: 'inning',        type: 'number',        desc: 'Current inning number' },
    { name: 'inningHalf',    type: 'string',        desc: '"Top" or "Bottom"' },
    { name: 'outs',          type: 'number',        desc: 'Current number of outs (0–2)' },
    { name: 'runnersOnBase', type: 'string[]',      desc: 'Occupied bases, e.g. ["first", "third"]' },
    { name: 'currentPitcher',type: 'string | null', desc: 'Pitcher currently on the mound' },
    { name: 'currentBatter', type: 'string | null', desc: 'Batter currently at the plate' },
  ],
  Completed: [
    { name: 'finalScore.us',   type: 'number',        desc: 'Our final runs scored' },
    { name: 'finalScore.them', type: 'number',        desc: 'Opponent final runs scored' },
    { name: 'winningPitcher',  type: 'string | null', desc: 'Winning pitcher full name' },
    { name: 'losingPitcher',   type: 'string | null', desc: 'Losing pitcher full name' },
    { name: 'savePitcher',     type: 'string | null', desc: 'Save pitcher full name, or null if no save' },
  ],
}

function FieldsGrid({ fields }) {
  return (
    <div className="fields-grid">
      <div className="fields-header">Field</div>
      <div className="fields-header">Type</div>
      <div className="fields-header">Description</div>
      {fields.map(f => (
        <>
          <div key={f.name + '-n'} className="field-name">{f.name}</div>
          <div key={f.name + '-t'} className="field-type">{f.type}</div>
          <div key={f.name + '-d'} className="field-desc">{f.desc}</div>
        </>
      ))}
    </div>
  )
}

export default function ApiDocs() {
  const [activeState, setActiveState] = useState('Not Started')

  return (
    <div>
      <div className="section-title">API Reference</div>
      <div className="docs-panel">

        <div className="docs-endpoint">
          <span className="method-badge">GET</span>
          <span className="endpoint-path">/schedule</span>
          <span className="endpoint-desc">Returns the day's schedule for all 11 Marlins affiliates</span>
        </div>

        <div className="docs-section">
          <div className="docs-section-title">Parameters</div>
          <table className="params-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="param-name">date</span></td>
                <td><span className="param-type">YYYY-MM-DD</span></td>
                <td><span className="param-optional">No</span></td>
                <td className="param-desc">Calendar date to query. Defaults to today when omitted.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="docs-section">
          <div className="docs-section-title">Response</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            A dict keyed by affiliate team ID (string). Each value is <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: '#f3f4f6', padding: '1px 5px', borderRadius: 3 }}>{'{}'}</code> if no game,
            a game object if one game, or an array of game objects for doubleheaders.
          </p>

          <div className="docs-section-title" style={{ marginBottom: 12 }}>Common Fields (always present when a game exists)</div>
          <FieldsGrid fields={COMMON_FIELDS} />

          <div className="docs-section-title" style={{ marginTop: 20, marginBottom: 12 }}>State-specific Fields</div>
          <div className="state-tabs">
            {Object.keys(STATE_FIELDS).map(s => (
              <button
                key={s}
                className={`state-tab${activeState === s ? ' active' : ''}`}
                onClick={() => setActiveState(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <FieldsGrid fields={STATE_FIELDS[activeState]} />
        </div>

      </div>
    </div>
  )
}
