import React, { useState, useEffect } from 'react';
import { auth, getUserSettings } from '../services/firebase';
import { fetchCalendarEvents } from '../services/calendarService';
import { useAuthState } from 'react-firebase-hooks/auth';

const GroupScheduler = ({ testMode }) => {
  const [user] = useAuthState(auth);
  const [participants, setParticipants] = useState([
    { id: 'user', name: 'You', selected: true, busyPeriods: [] }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAllHours, setShowAllHours] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  // Removed common free times state since we're no longer showing that section
  // const [commonFreeTimes, setCommonFreeTimes] = useState([]);

  // Date manipulation helpers
  const getWeekStart = (date) => {
    const result = new Date(date);
    const day = result.getDay() || 7; // Convert Sunday from 0 to 7
    if (day !== 1) { // If not Monday
      result.setHours(-24 * (day - 1)); // Go back to Monday
    }
    return result;
  };

  const getWeekEnd = (date) => {
    const result = new Date(getWeekStart(date));
    result.setDate(result.getDate() + 6); // Sunday
    result.setHours(23, 59, 59);
    return result;
  };

  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const formatDateHeader = (date) => {
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Generate array of dates for the week view
  const getDaysOfWeek = (startDate) => {
    const days = [];
    const start = new Date(startDate);
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  };

  // Navigation handlers
  const previousWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const nextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format time for display
  const formatTime = (hour, quarterHour) => {
    const minutes = quarterHour * 15;
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
  // State for absurd hours settings
  const [absurdHours, setAbsurdHours] = useState({
    start: '00:00', // Default: midnight
    end: '07:00'    // Default: 7am
  });
  
  // Check if a time is within absurd hours (based on user settings)
  const isAbsurdHour = (hour, quarterHour) => {
    const timeInMinutes = hour * 60 + quarterHour * 15;
    
    // Convert absurd hours to minutes
    const startParts = absurdHours.start.split(':').map(Number);
    const endParts = absurdHours.end.split(':').map(Number);
    
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    
    // Handle the case where absurd hours cross midnight
    if (startMinutes > endMinutes) {
      return timeInMinutes >= startMinutes || timeInMinutes < endMinutes;
    } else {
      return timeInMinutes >= startMinutes && timeInMinutes < endMinutes;
    }
  };

  // Generate test data for test mode
  const generateTestData = (startDate, endDate, seed = 1) => {
    const testBusyPeriods = [];
    const currentDate = new Date(startDate);
    
    // Create a realistic pattern of busy periods with different patterns based on seed
    while (currentDate <= endDate) {
      // Work days (Monday - Friday)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // Morning meeting (9-10am with varying probability based on seed)
        if (Math.random() < (0.5 + seed * 0.1)) {
          const morningMeeting = new Date(currentDate);
          morningMeeting.setHours(9, 0, 0, 0);
          
          const morningMeetingEnd = new Date(morningMeeting);
          morningMeetingEnd.setHours(10, 0, 0, 0);
          
          testBusyPeriods.push({
            start: { dateTime: morningMeeting.toISOString() },
            end: { dateTime: morningMeetingEnd.toISOString() }
          });
        }
        
        // Lunch (12-1pm with varying time based on seed)
        const lunch = new Date(currentDate);
        lunch.setHours(11 + seed % 2, 30 * (seed % 2), 0, 0);
        
        const lunchEnd = new Date(lunch);
        lunchEnd.setHours(lunch.getHours() + 1, lunch.getMinutes(), 0, 0);
        
        testBusyPeriods.push({
          start: { dateTime: lunch.toISOString() },
          end: { dateTime: lunchEnd.toISOString() }
        });
        
        // Afternoon meeting
        if (Math.random() < (0.3 + seed * 0.1)) {
          const afternoonMeeting = new Date(currentDate);
          afternoonMeeting.setHours(14 + seed % 3, 0, 0, 0);
          
          const afternoonMeetingEnd = new Date(afternoonMeeting);
          afternoonMeetingEnd.setHours(afternoonMeeting.getHours() + 1, 0, 0, 0);
          
          testBusyPeriods.push({
            start: { dateTime: afternoonMeeting.toISOString() },
            end: { dateTime: afternoonMeetingEnd.toISOString() }
          });
        }
      } else {
        // Weekend activities (with 20% probability)
        if (Math.random() < 0.2) {
          const weekendActivity = new Date(currentDate);
          weekendActivity.setHours(12 + Math.floor(Math.random() * 6), 0, 0, 0);
          
          const weekendActivityEnd = new Date(weekendActivity);
          weekendActivityEnd.setHours(weekendActivity.getHours() + 2, 0, 0, 0);
          
          testBusyPeriods.push({
            start: { dateTime: weekendActivity.toISOString() },
            end: { dateTime: weekendActivityEnd.toISOString() }
          });
        }
      }
      
      // Increment date by 1 day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return testBusyPeriods;
  };

  // Check if a time slot is busy for a participant
  const isBusy = (participant, day, hour, quarterHour) => {
    const slotStart = new Date(day);
    slotStart.setHours(hour, quarterHour * 15, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + 15);
    
    return participant.busyPeriods.some(period => {
      const periodStart = new Date(period.start.dateTime);
      const periodEnd = new Date(period.end.dateTime);
      
      // Check if the periods overlap
      return (
        (slotStart >= periodStart && slotStart < periodEnd) ||
        (slotEnd > periodStart && slotEnd <= periodEnd) ||
        (slotStart <= periodStart && slotEnd >= periodEnd)
      );
    });
  };

  // Check if a time slot is commonly free for all selected participants
  const isCommonlyFree = (day, hour, quarterHour) => {
    const selectedParticipants = participants.filter(p => p.selected);
    
    // No participants selected
    if (selectedParticipants.length === 0) return false;
    
    // Check if all selected participants are free
    return selectedParticipants.every(participant => !isBusy(participant, day, hour, quarterHour));
  };

  // This function has been removed to simplify the UI
  // We're now showing availability directly in the calendar view
  /*
  const findCommonFreeTimes = () => {
    const weekStart = getWeekStart(currentDate);
    const days = getDaysOfWeek(weekStart);
    const commonFree = [];
    
    // Loop through each day
    days.forEach(day => {
      // Loop through each hour
      for (let hour = 0; hour < 24; hour++) {
        // Loop through each quarter hour
        for (let quarter = 0; quarter < 4; quarter++) {
          // Skip absurd hours based on user settings
          if (isAbsurdHour(hour, quarter)) continue;
          
          // Check if this time is free for all selected participants
          if (isCommonlyFree(day, hour, quarter)) {
            const timeSlot = {
              day: new Date(day),
              hour,
              quarter,
              time: formatTime(hour, quarter)
            };
            commonFree.push(timeSlot);
          }
        }
      }
    });
    
    return commonFree;
  };
  */
  
  // Add a new test participant
  const addParticipant = () => {
    if (!newParticipantName.trim()) return;
    
    const startDate = getWeekStart(currentDate);
    const endDate = getWeekEnd(currentDate);
    
    // Create a test participant with a unique seed for varied busy periods
    const newId = Date.now().toString();
    const newParticipant = {
      id: newId,
      name: newParticipantName,
      selected: true,
      busyPeriods: testMode 
        ? generateTestData(startDate, endDate, participants.length + 1) 
        : [] // In real mode, you would get this from their shared calendar
    };
    
    setParticipants([...participants, newParticipant]);
    setNewParticipantName('');
  };
  
  // Toggle participant selection
  const toggleParticipant = (id) => {
    setParticipants(participants.map(p => 
      p.id === id ? { ...p, selected: !p.selected } : p
    ));
  };
  
  // Remove a participant
  const removeParticipant = (id) => {
    // Cannot remove the user
    if (id === 'user') return;
    
    setParticipants(participants.filter(p => p.id !== id));
  };

  // Update your (user) calendar data
  useEffect(() => {
    const fetchUserCalendarData = async () => {
      if (user) {
        try {
          setLoading(true);
          setError(null);
          
          const startDate = getWeekStart(currentDate);
          const endDate = getWeekEnd(currentDate);
          
          let userBusyPeriods = [];
          
          // Try to get user settings for absurd hours in both modes
          try {
            const settings = await getUserSettings(user.uid);
            if (settings && settings.absurdHoursStart && settings.absurdHoursEnd) {
              setAbsurdHours({
                start: settings.absurdHoursStart,
                end: settings.absurdHoursEnd
              });
            }
            
            if (testMode) {
              // In test mode, generate fake data for the user
              userBusyPeriods = generateTestData(startDate, endDate, 0);
            } else {
              // In real mode, fetch the user's actual calendar data
              if (settings && settings.calendarToken) {
                userBusyPeriods = await fetchCalendarEvents(
                  settings.calendarToken,
                  startDate,
                  endDate
                );
              } else {
                setError("Calendar access not granted. Please sign out and sign in again.");
              }
            }
          } catch (err) {
            console.error("Error fetching user data:", err);
            if (!testMode) {
              setError("Could not access your calendar. Please sign out and sign in again.");
            } else {
              // In test mode, still provide test data even if settings fetch fails
              userBusyPeriods = generateTestData(startDate, endDate, 0);
            }
          }
          
          // Update the user's busy periods
          setParticipants(prevParticipants => 
            prevParticipants.map(p => 
              p.id === 'user' ? { ...p, busyPeriods: userBusyPeriods } : p
            )
          );
          
          // If in test mode, update test participants too
          if (testMode) {
            setParticipants(prevParticipants => 
              prevParticipants.map(p => 
                p.id !== 'user' 
                  ? { ...p, busyPeriods: generateTestData(startDate, endDate, parseInt(p.id) % 10) } 
                  : p
              )
            );
          }
          
        } catch (err) {
          console.error("Error in group scheduler:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchUserCalendarData();
  }, [user, currentDate, testMode]);

  // Removed this effect since we're not showing common free times anymore
  /*
  useEffect(() => {
    const commonTimes = findCommonFreeTimes();
    setCommonFreeTimes(commonTimes);
  }, [participants, currentDate]);
  */

  // Render week view
  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDate);
    const days = getDaysOfWeek(weekStart);
    
    // Create hours array based on view preference
    const hours = [];
    if (showAllHours) {
      // Show all 24 hours
      for (let i = 0; i < 24; i++) {
        hours.push(i);
      }
    } else {
      // Show only working hours (9am to 6pm)
      for (let i = 9; i <= 18; i++) {
        hours.push(i);
      }
    }
    
    // Quarter hours (0, 15, 30, 45 minutes)
    const quarterHours = [0, 1, 2, 3];
    
    const selectedParticipants = participants.filter(p => p.selected);
    
    return (
      <div className="week-view">
        <div className="calendar-header">
          <div className="time-column-header"></div>
          {days.map((day, index) => (
            <div key={index} className="day-header">
              {formatDateHeader(day)}
            </div>
          ))}
        </div>
        
        <div className="calendar-body">
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              {quarterHours.map((quarter) => (
                <div key={`${hour}-${quarter}`} className="calendar-row">
                  {quarter === 0 && (
                    <div className="time-column hour-start">{formatTime(hour, 0)}</div>
                  )}
                  {quarter !== 0 && (
                    <div className="time-column quarter">{formatTime(hour, quarter)}</div>
                  )}
                  
                  {days.map((day, dayIndex) => {
                    const absurd = isAbsurdHour(hour, quarter);
                    
                    // Check how many participants are busy
                    const busyCount = selectedParticipants.filter(
                      participant => isBusy(participant, day, hour, quarter) || absurd
                    ).length;
                    
                    // Calculate the availability class based on busy count
                    // We use a clear naming scheme: available-X-of-Y
                    const availableCount = selectedParticipants.length - busyCount;
                    const availabilityClass = `available-${availableCount}-of-${selectedParticipants.length}`;
                    
                    // For backward compatibility with CSS
                    let fallbackClass = '';
                    if (busyCount === 0) {
                      fallbackClass = 'all-available';
                    } else if (busyCount === selectedParticipants.length) {
                      fallbackClass = 'none-available';
                    } else if (availableCount > selectedParticipants.length / 2) {
                      fallbackClass = 'mostly-available';
                    } else if (availableCount === selectedParticipants.length / 2) {
                      fallbackClass = 'half-available';
                    } else {
                      fallbackClass = 'mostly-busy';
                    }
                    
                    return (
                      <div 
                        key={dayIndex} 
                        className={`calendar-cell ${availabilityClass} ${fallbackClass} ${absurd ? 'absurd-hour' : ''} ${quarter === 0 ? 'hour-start' : ''}`}
                        title={`${availableCount}/${selectedParticipants.length} available`}
                      >
                        {quarter === 0 && availableCount > 0 && availableCount < selectedParticipants.length && (
                          <span className="availability-indicator">{availableCount}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // This function has been removed to simplify the UI
  /*
  const renderCommonFreeTimes = () => {
    if (commonFreeTimes.length === 0) {
      return <div className="no-common-times">No common free times found for the selected participants.</div>;
    }
    
    // Group by day
    const timesByDay = {};
    commonFreeTimes.forEach(time => {
      const dayStr = time.day.toLocaleDateString();
      if (!timesByDay[dayStr]) {
        timesByDay[dayStr] = [];
      }
      timesByDay[dayStr].push(time);
    });
    
    return (
      <div className="common-times-container">
        <h3>Common Available Times</h3>
        {Object.keys(timesByDay).map(dayStr => (
          <div key={dayStr} className="day-times">
            <h4>{new Date(dayStr).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
            <div className="time-slots">
              {timesByDay[dayStr].map((time, index) => (
                <div key={index} className="time-slot-chip">
                  {time.time}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  */

  if (!user) {
    return <div>Please sign in to use group scheduling.</div>;
  }

  if (loading && participants.length === 1) {
    return <div>Loading calendar data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="group-scheduler-container">
      <div className="scheduler-header">
        <h2>Group Scheduler</h2>
        <p>Find common free times across multiple calendars</p>
      </div>
      
      <div className="participants-section">
        <h3>Participants</h3>
        <div className="participants-list">
          {participants.map(participant => (
            <div key={participant.id} className={`participant-item ${participant.selected ? 'selected' : ''}`}>
              <div className="participant-checkbox">
                <input 
                  type="checkbox" 
                  checked={participant.selected}
                  onChange={() => toggleParticipant(participant.id)} 
                  id={`participant-${participant.id}`}
                />
                <label htmlFor={`participant-${participant.id}`}>{participant.name}</label>
              </div>
              {participant.id !== 'user' && (
                <button 
                  className="remove-participant-btn"
                  onClick={() => removeParticipant(participant.id)}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
        
        {testMode && (
          <div className="add-participant-form">
            <input
              type="text"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              placeholder="Add test participant..."
              className="participant-input"
            />
            <button 
              onClick={addParticipant}
              className="add-participant-btn"
              disabled={!newParticipantName.trim()}
            >
              Add
            </button>
          </div>
        )}
        
        {!testMode && (
          <div className="participant-info">
            <p>
              In production, you would be able to add real participants by:<br />
              1. Sending them a scheduling link<br />
              2. Having them connect their calendar<br />
              3. Viewing the combined availability
            </p>
          </div>
        )}
      </div>
      
      <div className="calendar-controls">
        <div className="navigation-buttons">
          <button className="nav-button" onClick={previousWeek}>
            <span className="icon">←</span> Previous
          </button>
          <button className="nav-button today" onClick={goToToday}>Today</button>
          <button className="nav-button" onClick={nextWeek}>
            Next <span className="icon">→</span>
          </button>
        </div>
        <div className="view-filters">
          <button 
            className={`view-filter-button ${!showAllHours ? 'active' : ''}`}
            onClick={() => setShowAllHours(false)}
          >
            Working Hours
          </button>
          <button 
            className={`view-filter-button ${showAllHours ? 'active' : ''}`}
            onClick={() => setShowAllHours(true)}
          >
            All Hours
          </button>
        </div>
      </div>
      
      <div className="calendar-scrollable-view">
        {renderWeekView()}
      </div>
      
      <div className="availability-legend">
        {(() => {
          // Get selected participants
          const activeParticipants = participants.filter(p => p.selected);
          
          if (activeParticipants.length > 0) {
            return (
              <>
                <div className="legend-item">
                  <div className={`legend-color all-available available-${activeParticipants.length}-of-${activeParticipants.length}`}></div>
                  <span>{activeParticipants.length}/{activeParticipants.length} Available</span>
                </div>
                
                {/* Generate legend items for various availability levels */}
                {activeParticipants.length > 1 && Array.from({ length: activeParticipants.length - 1 }, (_, i) => {
                  const available = activeParticipants.length - 1 - i;
                  return available > 0 ? (
                    <div className="legend-item" key={available}>
                      <div className={`legend-color available-${available}-of-${activeParticipants.length}`}></div>
                      <span>{available}/{activeParticipants.length} Available</span>
                    </div>
                  ) : null;
                }).filter(Boolean)}
                
                <div className="legend-item">
                  <div className={`legend-color none-available available-0-of-${activeParticipants.length}`}></div>
                  <span>0/{activeParticipants.length} Available</span>
                </div>
                
                <div className="legend-item">
                  <div className="legend-color absurd-hour"></div>
                  <span>Absurd Hours</span>
                </div>
              </>
            );
          } else {
            return (
              <div className="no-participants-legend">
                Select participants to see availability legend
              </div>
            );
          }
        })()}
      </div>
    </div>
  );
};

export default GroupScheduler;