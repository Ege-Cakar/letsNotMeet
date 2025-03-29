import React, { useState, useEffect } from 'react';
import { auth, getUserSettings, updateUserSettings } from '../services/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

const AbsurdHoursSettings = () => {
  const [user] = useAuthState(auth);
  const [absurdHoursStart, setAbsurdHoursStart] = useState('00:00');
  const [absurdHoursEnd, setAbsurdHoursEnd] = useState('07:00');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      if (user) {
        try {
          const settings = await getUserSettings(user.uid);
          if (settings) {
            setAbsurdHoursStart(settings.absurdHoursStart || '00:00');
            setAbsurdHoursEnd(settings.absurdHoursEnd || '07:00');
          }
        } catch (error) {
          console.error("Error fetching settings:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchSettings();
  }, [user]);

  const handleSaveSettings = async () => {
    if (user) {
      try {
        setSaveStatus('Saving...');
        await updateUserSettings(user.uid, {
          absurdHoursStart,
          absurdHoursEnd
        });
        setSaveStatus('Settings saved!');
        setTimeout(() => setSaveStatus(''), 3000);
      } catch (error) {
        console.error("Error saving settings:", error);
        setSaveStatus('Error saving settings');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }
  };

  if (!user) {
    return <div>Please sign in to adjust your settings.</div>;
  }

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="settings-container">
      <h2>Define Your "Absurd Hours"</h2>
      <p>These are hours when you're not available for meetings.</p>
      
      <div className="settings-form">
        <div className="form-group">
          <label htmlFor="absurdHoursStart">Start Time:</label>
          <input
            type="time"
            id="absurdHoursStart"
            value={absurdHoursStart}
            onChange={(e) => setAbsurdHoursStart(e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="absurdHoursEnd">End Time:</label>
          <input
            type="time"
            id="absurdHoursEnd"
            value={absurdHoursEnd}
            onChange={(e) => setAbsurdHoursEnd(e.target.value)}
          />
        </div>
        
        <button onClick={handleSaveSettings} className="save-button">
          Save Settings
        </button>
        
        {saveStatus && <p className="save-status">{saveStatus}</p>}
      </div>
    </div>
  );
};

export default AbsurdHoursSettings;
