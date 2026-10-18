import { MapPane } from './components/MapPane.tsx'
import { OverviewPanel } from './components/OverviewPanel.tsx'
import { Sidebar } from './components/Sidebar.tsx'
import './styles/overview.css'

export default function App() {
  return (
    <main className="app-frame">
      <Sidebar />
      <OverviewPanel />
      <MapPane />
    </main>
  )
}
