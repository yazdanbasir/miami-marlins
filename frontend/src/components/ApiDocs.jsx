import { useState } from 'react'

const STATES = {
  'Not Started': {
    fields: [
      { name: 'teamName',              type: 'string'       },
      { name: 'level',                 type: 'string'       },
      { name: 'state',                 type: 'string'       },
      { name: 'gameTime',              type: 'string'       },
      { name: 'venue',                 type: 'string'       },
      { name: 'opponent',              type: 'string'       },
      { name: 'opponentParentClub',    type: 'string | null'},
      { name: 'probablePitchers.us',   type: 'string | null'},
      { name: 'probablePitchers.them', type: 'string | null'},
    ],
    example: `{
  "564": {
    "teamName": "Jacksonville Jumbo Shrimp",
    "level": "Triple-A",
    "state": "Not Started",
    "gameTime": "2026-05-15T23:45:00Z",
    "venue": "AutoZone Park",
    "opponent": "Memphis Redbirds",
    "opponentParentClub": "St. Louis Cardinals",
    "probablePitchers": {
      "us": "Dax Fulton",
      "them": null
    }
  }
}`,
  },
  'In Progress': {
    fields: [
      { name: 'teamName',           type: 'string'        },
      { name: 'level',              type: 'string'        },
      { name: 'state',              type: 'string'        },
      { name: 'venue',              type: 'string'        },
      { name: 'opponent',           type: 'string'        },
      { name: 'opponentParentClub', type: 'string | null' },
      { name: 'score.us',           type: 'number'        },
      { name: 'score.them',         type: 'number'        },
      { name: 'inning',             type: 'number'        },
      { name: 'inningHalf',         type: 'string'        },
      { name: 'outs',               type: 'number'        },
      { name: 'runnersOnBase',      type: 'string[]'      },
      { name: 'currentPitcher',     type: 'string | null' },
      { name: 'currentBatter',      type: 'string | null' },
    ],
    example: `{
  "146": {
    "teamName": "Miami Marlins",
    "level": "Major League Baseball",
    "state": "In Progress",
    "venue": "loanDepot park",
    "opponent": "Chicago White Sox",
    "opponentParentClub": null,
    "score": { "us": 3, "them": 2 },
    "inning": 7,
    "inningHalf": "Bottom",
    "outs": 1,
    "runnersOnBase": ["first", "third"],
    "currentPitcher": "Sandy Alcantara",
    "currentBatter": "Jazz Chisholm Jr."
  }
}`,
  },
  'Completed': {
    fields: [
      { name: 'teamName',           type: 'string'        },
      { name: 'level',              type: 'string'        },
      { name: 'state',              type: 'string'        },
      { name: 'opponent',           type: 'string'        },
      { name: 'opponentParentClub', type: 'string | null' },
      { name: 'finalScore.us',      type: 'number'        },
      { name: 'finalScore.them',    type: 'number'        },
      { name: 'winningPitcher',     type: 'string | null' },
      { name: 'losingPitcher',      type: 'string | null' },
      { name: 'savePitcher',        type: 'string | null' },
    ],
    example: `{
  "146": {
    "teamName": "Miami Marlins",
    "level": "Major League Baseball",
    "state": "Completed",
    "opponent": "Chicago White Sox",
    "opponentParentClub": null,
    "finalScore": { "us": 10, "them": 0 },
    "winningPitcher": "Sandy Alcantara",
    "losingPitcher": "Shane Smith",
    "savePitcher": null
  }
}`,
  },
}

function highlight(json) {
  return json
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="jk">$1</span>$2')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="js">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="jn">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="jnull">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="jb">$1</span>')
}

export default function ApiDocs() {
  const [active, setActive] = useState('Not Started')
  const { fields, example } = STATES[active]

  return (
    <div>
      <div className="section-title">API Reference</div>

      <div className="docs-card">
        <div className="docs-top">
          <div className="docs-endpoint-row">
            <span className="method-badge">GET</span>
            <span className="endpoint-path">/schedule</span>
            <span className="endpoint-desc">Returns the day's schedule for all Marlins affiliates</span>
          </div>
          <div className="docs-param-row">
            <span className="param-label">date</span>
            <span className="param-type">YYYY-MM-DD</span>
            <span className="param-optional">optional</span>
            <span className="param-note">— defaults to today. Returns <code className="inline-code">{'{}'}</code> for teams with no game, a game object if one game, or an array for doubleheaders.</span>
          </div>
        </div>

        <div className="docs-response">
          <div className="state-tabs">
            {Object.keys(STATES).map(s => (
              <button
                key={s}
                className={`state-tab${active === s ? ' active' : ''}`}
                onClick={() => setActive(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="response-split">
            <div className="response-fields">
              <div className="response-panel-header">Fields</div>
              {fields.map(f => (
                <div key={f.name} className="rf-row">
                  <span className="rf-name">{f.name}</span>
                  <span className="rf-type">{f.type}</span>
                </div>
              ))}
            </div>
            <div className="response-example">
              <div className="response-panel-header">Example Response</div>
              <pre
                className="json-block"
                dangerouslySetInnerHTML={{ __html: highlight(example) }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
