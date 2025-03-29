import React, { useState } from 'react';
import AbsurdHoursSettings from './AbsurdHoursSettings';
import CalendarView from './CalendarView';
import GroupScheduler from './GroupScheduler';

const MeetingFinder = ({ testMode }) => {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="meeting-finder-container">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          My Availability
        </button>
        <button
          className={`tab ${activeTab === 'group' ? 'active' : ''}`}
          onClick={() => setActiveTab('group')}
        >
          Group Scheduling
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'calendar' && <CalendarView testMode={testMode} />}
        {activeTab === 'group' && <GroupScheduler testMode={testMode} />}
        {activeTab === 'settings' && <AbsurdHoursSettings />}
      </div>
      
      {testMode && (
        <div className="test-mode-indicator">
          <p>
            <strong>Test Mode is Active</strong> — You can test the app with simulated data without affecting your real calendar.
          </p>
        </div>
      )}
    </div>
  );
};

export default MeetingFinder;
