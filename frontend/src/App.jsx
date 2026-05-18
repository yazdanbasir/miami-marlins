import marlinsLogo from './assets/marlins.svg'
import ApiDocs from './components/ApiDocs'
import ScheduleExplorer from './components/ScheduleExplorer'

export default function App() {
  return (
    <div className="app-wrapper">
      <header className="app-header">
        <span className="header-title"><span>MIA</span></span>
        <span className="header-center">Take-Home Interview Project</span>
        <img src={marlinsLogo} alt="Miami Marlins" className="header-logo" />
      </header>

      <main className="app-content">
        <ApiDocs />
        <ScheduleExplorer />
      </main>
    </div>
  )
}
