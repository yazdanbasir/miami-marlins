import { useState } from 'react'
import marlinsLogo from './assets/marlins.svg'
import ApiDocs from './components/ApiDocs'
import ScheduleExplorer from './components/ScheduleExplorer'

const TABS = [
  { id: 'schedule', label: 'Schedule' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('schedule')

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <span className="header-title"><span>MIA</span> · Schedule</span>
        <img src={marlinsLogo} alt="Miami Marlins" className="header-logo" />
        <div className="header-spacer" />
        <nav className="tab-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-content">
        {activeTab === 'schedule' && (
          <>
            <ApiDocs />
            <ScheduleExplorer />
          </>
        )}
      </main>
    </div>
  )
}
