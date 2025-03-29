import React, { useState } from 'react';
import { auth } from './services/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import Auth from './components/Auth';
import MeetingFinder from './components/MeetingFinder';
import ScheduleLink from './components/ScheduleLink';
import './App.css';

function App() {
  const [user] = useAuthState(auth);
  const [testMode, setTestMode] = useState(false);

  const toggleTestMode = () => {
    setTestMode(!testMode);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Let's Not Meet — Calendar Scheduler</h1>
        <div className="header-controls">
          <div className="test-mode-toggle">
            <label className="switch">
              <input 
                type="checkbox" 
                checked={testMode}
                onChange={toggleTestMode}
              />
              <span className="slider round"></span>
            </label>
            <span className="test-mode-label">Test Mode</span>
          </div>
          <Auth />
        </div>
      </header>
      
      <main className="App-main">
        {user ? (
          <>
            <MeetingFinder testMode={testMode} />
            <ScheduleLink testMode={testMode} />
          </>
        ) : (
          <div className="welcome-message">
            <h2>Welcome to Let's Not Meet</h2>
            <p>Find the perfect time to meet with others without sharing calendar details. Sign in with your Google account to get started.</p>
          </div>
        )}
      </main>
      
      <footer className="App-footer">
        <p>&copy; 2025 Let's Not Meet — Calendar Scheduler</p>
      </footer>
    </div>
  );
}

export default App;

