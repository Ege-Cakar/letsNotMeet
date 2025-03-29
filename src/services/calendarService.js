export const fetchCalendarEvents = async (accessToken, timeMin, timeMax) => {
  try {
    // Format dates for Google Calendar API
    const formattedTimeMin = new Date(timeMin).toISOString();
    const formattedTimeMax = new Date(timeMax).toISOString();
    
    // Use freebusy API instead of events API for better privacy
    // This only returns busy/free info, not actual event details
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/freeBusy',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeMin: formattedTimeMin,
          timeMax: formattedTimeMax,
          items: [{ id: 'primary' }]
        })
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch calendar availability');
    }
    
    const data = await response.json();
    // Return busy periods in a format compatible with our existing code
    const busyPeriods = data.calendars?.primary?.busy || [];
    return busyPeriods.map(period => ({
      start: { dateTime: period.start },
      end: { dateTime: period.end }
    }));
  } catch (error) {
    console.error("Error fetching calendar availability", error);
    throw error;
  }
};

export const findAvailableSlots = (events, startDate, endDate, absurdHoursStart, absurdHoursEnd, duration = 30) => {
  // Convert absurd hours to minutes from midnight
  const absurdStartMinutes = convertTimeToMinutes(absurdHoursStart);
  const absurdEndMinutes = convertTimeToMinutes(absurdHoursEnd);
  
  // Create a date range to check (for the next 7 days by default)
  const dateRange = generateDateRange(startDate, endDate);
  
  // Find all busy times from the events
  const busyTimes = events.map(event => ({
    start: new Date(event.start.dateTime || `${event.start.date}T00:00:00`),
    end: new Date(event.end.dateTime || `${event.end.date}T23:59:59`)
  }));
  
  // Find available slots
  const availableSlots = [];
  
  dateRange.forEach(date => {
    // Start with working hours (9am to 5pm by default, can be customized later)
    const dayStart = new Date(date);
    dayStart.setHours(9, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(17, 0, 0, 0);
    
    // Skip absurd hours
    const dayMinutes = dayStart.getHours() * 60 + dayStart.getMinutes();
    if (isWithinAbsurdHours(dayMinutes, absurdStartMinutes, absurdEndMinutes)) {
      // Adjust start time to be after absurd hours
      dayStart.setHours(Math.floor(absurdEndMinutes / 60), absurdEndMinutes % 60, 0, 0);
    }
    
    let currentSlotStart = new Date(dayStart);
    
    while (currentSlotStart < dayEnd) {
      const currentSlotEnd = new Date(currentSlotStart);
      currentSlotEnd.setMinutes(currentSlotEnd.getMinutes() + duration);
      
      // Check if this slot overlaps with any busy times
      const isAvailable = !busyTimes.some(busyTime => 
        (currentSlotStart >= busyTime.start && currentSlotStart < busyTime.end) ||
        (currentSlotEnd > busyTime.start && currentSlotEnd <= busyTime.end) ||
        (currentSlotStart <= busyTime.start && currentSlotEnd >= busyTime.end)
      );
      
      // Check if any part of the slot is within absurd hours
      const slotStartMinutes = currentSlotStart.getHours() * 60 + currentSlotStart.getMinutes();
      const slotEndMinutes = currentSlotEnd.getHours() * 60 + currentSlotEnd.getMinutes();
      const isWithinAbsurd = isWithinAbsurdHours(slotStartMinutes, absurdStartMinutes, absurdEndMinutes) ||
                             isWithinAbsurdHours(slotEndMinutes, absurdStartMinutes, absurdEndMinutes);
      
      if (isAvailable && !isWithinAbsurd) {
        availableSlots.push({
          start: new Date(currentSlotStart),
          end: new Date(currentSlotEnd)
        });
      }
      
      // Move to next slot
      currentSlotStart.setMinutes(currentSlotStart.getMinutes() + 30); // 30-minute increments
    }
  });
  
  return availableSlots;
};

// Helper functions
const convertTimeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const isWithinAbsurdHours = (minutes, absurdStart, absurdEnd) => {
  // Handle case where absurd hours cross midnight
  if (absurdStart > absurdEnd) {
    return minutes >= absurdStart || minutes < absurdEnd;
  }
  return minutes >= absurdStart && minutes < absurdEnd;
};

const generateDateRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

