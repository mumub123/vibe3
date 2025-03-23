import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { App } from '.'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Failed to find the root element')
}

const root = ReactDOM.createRoot(rootElement)

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} catch (error) {
  console.error('Failed to render the app:', error)
  rootElement.innerHTML = '<div style="color: red; padding: 20px;">Failed to load the application. Please check the console for errors.</div>'
}
