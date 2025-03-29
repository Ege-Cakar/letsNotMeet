import React, { useState, useEffect } from 'react';
import { auth, getUserSettings } from '../services/firebase';
import { fetchCalendarEvents, findAvailableSlots } from '../services/calendarService';
import { useAuthState } from 'react-firebase-hooks/auth';

const CalendarView = ({ testMode }) => {
  const [user] = useAuthState(auth);
  const [busyPeriods, setBusyPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('week'); // 'day', 'week', or 'month'
  const [showAllHours, setShowAllHours] = useState(false); // Toggle between all hours and working hours
  
  // Generate test data for test mode
  const generateTestData = (startDate, endDate) => {
    const testBusyPeriods = [];
    const currentDate = new Date(startDate);
    
    // Create a realistic pattern of busy periods (40% of working hours)
    while (currentDate <= endDate) {
      // Work days (Monday - Friday)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // Morning meeting (9-10am with 70% probability on weekdays)
        if (Math.random() < 0.7) {
          const morningMeeting = new Date(currentDate);
          morningMeeting.setHours(9, 0, 0, 0);
          
          const morningMeetingEnd = new Date(morningMeeting);
          morningMeetingEnd.setHours(10, 0, 0, 0);
          
          testBusyPeriods.push({
            start: { dateTime: morningMeeting.toISOString() },
            end: { dateTime: morningMeetingEnd.toISOString() }
          });
        }
        
        // Lunch (12-1pm every day)
        const lunch = new Date(currentDate);
        lunch.setHours(12, 0, 0, 0);
        
        const lunchEnd = new Date(lunch);
        lunchEnd.setHours(13, 0, 0, 0);
        
        testBusyPeriods.push({
          start: { dateTime: lunch.toISOString() },
          end: { dateTime: lunchEnd.toISOString() }
        });
        
        // Afternoon meeting (2-3pm with 50% probability on weekdays)
        if (Math.random() < 0.5) {
          const afternoonMeeting = new Date(currentDate);
          afternoonMeeting.setHours(14, 0, 0, 0);
          
          const afternoonMeetingEnd = new Date(afternoonMeeting);
          afternoonMeetingEnd.setHours(15, 0, 0, 0);
          
          testBusyPeriods.push({
            start: { dateTime: afternoonMeeting.toISOString() },
            end: { dateTime: afternoonMeetingEnd.toISOString() }
          });
        }
        
        // Late afternoon meeting (4-5pm with 30% probability on weekdays)
        if (Math.random() < 0.3) {
          const lateMeeting = new Date(currentDate);
          lateMeeting.setHours(16, 0, 0, 0);
          
          const lateMeetingEnd = new Date(lateMeeting);
          lateMeetingEnd.setHours(17, 0, 0, 0);
          
          testBusyPeriods.push({
            start: { dateTime: lateMeeting.toISOString() },
            end: { dateTime: lateMeetingEnd.toISOString() }
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

  useEffect(() => {
    const fetchCalendarData = async () => {
      if (user) {
        try {
          setLoading(true);
          setError(null); // Clear previous errors
          
          // Get date range for current view
          const startDate = getWeekStart(currentDate);
          const endDate = getWeekEnd(currentDate);
          
          // Use test data in test mode
          if (testMode) {
            // In test mode, still try to get user settings for absurd hours
            try {
              const settings = await getUserSettings(user.uid);
              if (settings && settings.absurdHoursStart && settings.absurdHoursEnd) {
                setAbsurdHours({
                  start: settings.absurdHoursStart,
                  end: settings.absurdHoursEnd
                });
              }
            } catch (error) {
              console.log("Using default absurd hours in test mode");
            }
            
            // Generate consistent test data
            const testBusyPeriods = generateTestData(startDate, endDate);
            setBusyPeriods(testBusyPeriods);
            setLoading(false);
            return;
          }
          
          // Normal mode: use real calendar data
          // Get user settings
          const settings = await getUserSettings(user.uid);
          if (!settings) {
            throw new Error("User settings not found. Please sign out and sign in again.");
          }
          
          if (!settings.calendarToken) {
            throw new Error("Calendar access not granted. Please sign out and sign in again, ensuring you allow calendar access.");
          }
          
          // Set absurd hours from user settings
          if (settings.absurdHoursStart && settings.absurdHoursEnd) {
            setAbsurdHours({
              start: settings.absurdHoursStart,
              end: settings.absurdHoursEnd
            });
          }
          
          // Fetch calendar busy times (not actual events, just availability)
          const busy = await fetchCalendarEvents(
            settings.calendarToken,
            startDate,
            endDate
          );
          setBusyPeriods(busy);
          
        } catch (err) {
          console.error("Error fetching calendar data:", err);
          
          // Provide more user-friendly error messages
          if (err.message.includes('Failed to fetch')) {
            setError("Could not access your calendar. Your session may have expired. Please sign out and sign in again.");
          } else {
            setError(err.message);
          }
        } finally {
          setLoading(false);
        }
      }
    };

    fetchCalendarData();
  }, [user, currentDate, testMode]);

  // Helper to check if a time slot is busy
  const isBusy = (day, hour, quarterHour) => {
    const slotStart = new Date(day);
    slotStart.setHours(hour, quarterHour * 15, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + 15);
    
    return busyPeriods.some(period => {
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
  
  // Format time for display
  const formatTime = (hour, quarterHour) => {
    const minutes = quarterHour * 15;
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
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
                    const busy = isBusy(day, hour, quarter);
                    const absurd = isAbsurdHour(hour, quarter);
                    
                    return (
                      <div 
                        key={dayIndex} 
                        className={`calendar-cell ${busy ? 'busy' : 'available'} ${absurd ? 'absurd-hour' : ''} ${quarter === 0 ? 'hour-start' : ''}`}
                      ></div>
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

  if (!user) {
    return <div>Please sign in to view your calendar.</div>;
  }

  if (loading) {
    return <div>Loading calendar data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header-section">
        <h2>Your Calendar</h2>
        
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
      </div>
      
      <div className="calendar-scrollable-view">
        {renderWeekView()}
      </div>
      
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-color busy"></div>
          <span>Busy</span>
        </div>
        <div className="legend-item">
          <div className="legend-color absurd-hour"></div>
          <span>Absurd Hours</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
