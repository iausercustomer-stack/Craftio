import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';

// A visible error message helps diagnose problems instead of leaving a blank page.
class AppError extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('Kala Nidhi could not render:', error); }
  render() {
    if (this.state.failed) return <main style={{ padding: 32 }}><h1>We could not open the studio</h1><p>Try reloading the page. If it continues, open the browser Console and share the error shown there.</p><button onClick={() => location.reload()}>Reload page</button></main>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(<React.StrictMode><AppError><App /></AppError></React.StrictMode>);
