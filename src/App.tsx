import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import SlotView from './pages/SlotView'
import ResourcesDashboard from './pages/ResourcesDashboard'

export default function App() {
  return (
    <div className="app-root">
      <header className="topbar">
        <div className="brand">FieldX</div>
        <nav>
          <Link to="/">לוח משבצות</Link>
          <Link to="/resources">תמונת מצב</Link>
        </nav>
      </header>
      <main className="view">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/slots/:id" element={<SlotView />} />
          <Route path="/resources" element={<ResourcesDashboard />} />
        </Routes>
      </main>
    </div>
  )
}
