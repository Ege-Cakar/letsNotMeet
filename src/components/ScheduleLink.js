import React, { useState } from 'react';
import { auth, getUserSettings } from '../services/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

const ScheduleLink = ({ testMode }) => {
  const [user] = useAuthState(auth);
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [schedulingLink, setSchedulingLink] = useState('');

  const generateLink = () => {
    if (user) {
      // In a real implementation, we would create a unique token and store it in Firestore
      // For the prototype, we'll just create a dummy link with the user's ID
      const baseUrl = window.location.origin;
      const testParam = testMode ? '?test=true' : '';
      const link = `${baseUrl}/schedule/${user.uid}${testParam}`;
      setSchedulingLink(link);
      setLinkGenerated(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(schedulingLink)
      .then(() => {
        alert('Link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
      });
  };

  if (!user) {
    return <div>Please sign in to generate a scheduling link.</div>;
  }

  return (
    <div className="schedule-link-container">
      <h2>Share Your Availability</h2>
      <p>
        Generate a link to share with others so they can schedule meetings with you without seeing
        the details of your calendar.
      </p>
      
      {!linkGenerated ? (
        <button onClick={generateLink} className="generate-link-button">
          Generate Scheduling Link
        </button>
      ) : (
        <div className="link-display">
          <input
            type="text"
            value={schedulingLink}
            readOnly
            className="link-input"
          />
          <button onClick={copyToClipboard} className="copy-link-button">
            Copy Link
          </button>
        </div>
      )}
      
      {linkGenerated && (
        <div className="link-instructions">
          <h3>How it works</h3>
          <ol>
            <li>Send this link to people who want to schedule time with you</li>
            <li>They'll see your available times without seeing your actual calendar events</li>
            <li>They can select a time that works for them</li>
            <li>You'll receive a notification to confirm the meeting</li>
          </ol>
          
          {testMode && (
            <div className="test-mode-note">
              <p>
                <strong>Note:</strong> Since test mode is active, this link will show simulated availability data.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleLink;
