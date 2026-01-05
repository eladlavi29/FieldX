import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import SlotView from './pages/SlotView'

export default function App() {
  return (
    <div className="app-root">
      <header className="topbar">
        <div className="brand">FieldX</div>
        <nav>
          <Link to="/">משבצות</Link>
        </nav>
      </header>
      <main className="view">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/slots/:id" element={<SlotView />} />
        </Routes>
      </main>
    </div>
  )
}
