export const getLocalYYYYMMDD = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getInitialDate = (cutoffHour = 4) => {
  const now = new Date();
  if (now.getHours() < cutoffHour) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return getLocalYYYYMMDD(yesterday);
  }
  return getLocalYYYYMMDD(now);
};

export const formatDateLabel = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = getLocalYYYYMMDD(today);
  const yesterdayStr = getLocalYYYYMMDD(yesterday);

  if (dateStr === todayStr) return 'Dzisiaj';
  if (dateStr === yesterdayStr) return 'Wczoraj';
  
  const day = date.getDate();
  const monthNames = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  return `${day} ${monthNames[date.getMonth()]}`;
};

export const isHabitActiveForDate = (habit, dateStr) => {
  if (habit.created && dateStr < habit.created) return false;
  if (!habit.frequency || habit.frequency.length === 0) return true; 
  const dayIndex = new Date(dateStr).getDay();
  return habit.frequency.includes(dayIndex);
};

export const getVirtualMissingEntries = (userHabits, userHistory, userNick) => {
  const mandatoryHabits = userHabits.filter(h => h.mandatory);
  if (mandatoryHabits.length === 0) return [];

  const startDates = mandatoryHabits.map(h => h.created).filter(Boolean).sort();
  let startDate = startDates.length > 0 ? new Date(startDates[0]) : new Date(new Date().setDate(new Date().getDate() - 30));
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const virtuals = [];
  // Limit lookback to 60 days
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - 60);
  if (startDate < limitDate) startDate = limitDate;

  for (let d = new Date(startDate); d < today; d.setDate(d.getDate() + 1)) {
      const dateStr = getLocalYYYYMMDD(d); // Use local helper
      if (userHistory.some(h => h.date === dateStr && h.nick === userNick)) continue;
      
      const missed = mandatoryHabits.filter(h => isHabitActiveForDate(h, dateStr));
      
      if (missed.length > 0) {
          virtuals.push({
              id: `virtual-${dateStr}`,
              date: dateStr,
              nick: userNick,
              mood: 0, 
              text: 'Brak wpisu. Nawyki obowiązkowe pominięte.',
              habits: [], 
              isVirtual: true, 
              timestamp: new Date(d).toISOString(),
              missedSnapshot: missed.map(h => ({ id: h.id, name: h.name, icon: h.icon })) 
          });
      }
  }
  return virtuals;
};

export const getMoodColor = (val) => {
  // Import COLORS here or pass it, but since it's a helper, let's hardcode or import
  // Better to import COLORS from theme
  // But for simplicity in this file, I'll assume COLORS is available or I'll re-import it.
  // Let's re-import to be safe.
  return val <= 3 ? '#f43f5e' : val <= 6 ? '#f59e0b' : '#059669';
};

export const getMoodIcon = (val, Frown, Meh, Smile, COLORS) => {
  // This one returns JSX, so it needs React. 
  // Maybe keep this in the component or pass the icon components.
  // Let's keep it simple and return just the color or type, but the original code returned JSX.
  // We will handle this in the component instead.
  return null;
};
