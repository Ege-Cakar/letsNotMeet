import React, { useState, useEffect } from 'react';
import { auth, getUserSettings, updateUserSettings } from '../services/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

const AbsurdHoursSettings = () => {
  const [user] = useAuthState(auth);
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('07:00');
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (user) {
        try {
          setLoading(true);
          const settings = await getUserSettings(user.uid);
          if (settings) {
            setStartTime(settings.absurdHoursStart || '00:00');
            setEndTime(settings.absurdHoursEnd || '07:00');
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (user) {
      try {
        await updateUserSettings(user.uid, {
          absurdHoursStart: startTime,
          absurdHoursEnd: endTime,
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        console.error("Error saving settings:", error);
      }
    }
  };

  if (!user) {
    return <div>Please sign in to update your settings.</div>;
  }

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="settings-container">
      <h2>Absurd Hours Settings</h2>
      <p>Set the hours during which you don't want to have meetings scheduled.</p>
      
      <form onSubmit={handleSave} className="settings-form">
        <div className="form-group">
          <label htmlFor="absurdStart">Start Time:</label>
          <input
            id="absurdStart"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="absurdEnd">End Time:</label>
          <input
            id="absurdEnd"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" className="save-button">Save Settings</button>
        
        {saveSuccess && <p className="save-status">Settings saved successfully!</p>}
      </form>
    </div>
  );
};

export default AbsurdHoursSettings;
