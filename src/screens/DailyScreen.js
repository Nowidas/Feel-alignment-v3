import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar as CalendarIcon, Send, Check, ChevronLeft, ChevronRight, BookHeart } from 'lucide-react-native';
import { COLORS, ICON_MAP, DAYS_MAP } from '../constants/theme';
import { getLocalYYYYMMDD, formatDateLabel, getMoodColor, getMoodIcon, isHabitActiveForDate } from '../utils/helpers';
import MoodSlider from '../components/MoodSlider';
import { Smile, Frown, Meh } from 'lucide-react-native';

const DailyScreen = ({ 
  user, selectedDate, setSelectedDate, dailyEntry, setDailyEntry, 
  userHabits, history, onSave, editingId, currentPrompt 
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const getMoodIconComponent = (val) => {
      return val <= 3 ? <Frown size={40} color={COLORS.rose500}/> : val <= 6 ? <Meh size={40} color={COLORS.amber500}/> : <Smile size={40} color={COLORS.emerald600}/>;
  };

  const renderCalendar = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={{width: 32, height: 32, margin: 2}} />);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = getLocalYYYYMMDD(new Date(year, month, d));
      const isSelected = dateStr === selectedDate;
      
      const hasMyEntry = history.some(h => h.date === dateStr && h.nick === user.nick);
      const hasPartnerEntry = user.partnerNick && history.some(h => h.date === dateStr && h.nick === user.partnerNick);
      
      days.push(
        <TouchableOpacity 
          key={d} 
          style={[
            styles.dayBtn, 
            { margin: 2 },
            isSelected && styles.dayBtnActive
          ]} 
          onPress={() => {
            setSelectedDate(dateStr);
            setDailyEntry({mood: 5, text: '', habits: []});
            // setEditingId(null); // This should be handled by parent or passed down
            setIsCalendarOpen(false);
          }}
        >
          <Text style={[styles.dayBtnText, isSelected && styles.dayBtnTextActive]}>{d}</Text>
          <View style={{flexDirection: 'row', gap: 2, position: 'absolute', bottom: 4}}>
            {hasMyEntry && <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: isSelected ? COLORS.emerald400 : COLORS.emerald500}} />}
            {hasPartnerEntry && <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: isSelected ? COLORS.amber400 : COLORS.amber500}} />}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarOverlay}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => setCalendarViewDate(new Date(year, month - 1, 1))}>
            <ChevronLeft size={24} color={COLORS.stone800} />
          </TouchableOpacity>
          <Text style={{fontWeight: 'bold', fontSize: 16, color: COLORS.stone800, textTransform: 'capitalize'}}>
            {firstDay.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => setCalendarViewDate(new Date(year, month + 1, 1))}>
            <ChevronRight size={24} color={COLORS.stone800} />
          </TouchableOpacity>
        </View>
        <View style={{flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8}}>
          {DAYS_MAP.map(d => <Text key={d} style={{width: 32, textAlign: 'center', fontSize: 10, fontWeight: 'bold', color: COLORS.stone400}}>{d}</Text>)}
        </View>
        <View style={styles.calendarGrid}>
          {days}
        </View>
        <TouchableOpacity style={{alignItems: 'center', marginTop: 10}} onPress={() => setIsCalendarOpen(false)}>
            <Text style={{color: COLORS.stone500, fontSize: 12, fontWeight: 'bold'}}>Zamknij</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View>
      <View style={styles.dateStrip}>
        {(() => {
          const todayStr = getLocalYYYYMMDD(new Date());
          const y = new Date(); y.setDate(y.getDate()-1);
          const yesterdayStr = getLocalYYYYMMDD(y);
          const isToday = selectedDate === todayStr;
          const isYesterday = selectedDate === yesterdayStr;
          const isOther = !isToday && !isYesterday;

          return (
            <>
              <TouchableOpacity style={[styles.dateBtn, isToday && styles.dateBtnActive]} onPress={() => {setSelectedDate(todayStr); setDailyEntry({mood:5,text:'',habits:[]}); }}>
                <Text style={[styles.dateBtnText, isToday && styles.dateBtnTextActive]}>Dziś</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dateBtn, isYesterday && styles.dateBtnActive]} onPress={() => {setSelectedDate(yesterdayStr); setDailyEntry({mood:5,text:'',habits:[]}); }}>
                <Text style={[styles.dateBtnText, isYesterday && styles.dateBtnTextActive]}>Wczoraj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dateBtn, isOther && styles.dateBtnActive]} onPress={() => setIsCalendarOpen(!isCalendarOpen)}>
                <CalendarIcon size={16} color={isOther ? COLORS.white : COLORS.stone500} />
              </TouchableOpacity>
            </>
          );
        })()}
      </View>
      {isCalendarOpen && renderCalendar()}
      <Text style={styles.currentDateLabel}>{formatDateLabel(selectedDate)}</Text>
      <View style={styles.card}>
        <View style={{alignItems: 'center', marginBottom: 20}}>
            {getMoodIconComponent(dailyEntry.mood)}
            <Text style={[styles.moodValue, { color: getMoodColor(dailyEntry.mood) }]}>{dailyEntry.mood}/10</Text>
            <MoodSlider value={dailyEntry.mood} onChange={(v) => setDailyEntry({...dailyEntry, mood: v})} />
        </View>
        <View style={styles.habitsGrid}>{userHabits.filter(h => isHabitActiveForDate(h, selectedDate)).map(h => { const isActive = dailyEntry.habits.includes(h.id); const Icon = ICON_MAP[h.icon] || Check; return ( <TouchableOpacity key={h.id} style={[styles.habitChip, isActive && styles.habitChipActive, h.mandatory && !isActive && styles.habitChipMandatory]} onPress={() => { const newH = isActive ? dailyEntry.habits.filter(id => id !== h.id) : [...dailyEntry.habits, h.id]; setDailyEntry({...dailyEntry, habits: newH}); }}><Icon size={14} color={isActive ? COLORS.white : COLORS.stone500} /><Text style={[styles.habitText, isActive && styles.habitTextActive]}>{h.name}</Text></TouchableOpacity> )})}</View>
        <TextInput style={styles.textArea} multiline placeholder={currentPrompt} placeholderTextColor={COLORS.stone300} value={dailyEntry.text} onChangeText={t => setDailyEntry({...dailyEntry, text: t})}/>
        <TouchableOpacity style={styles.mainButton} onPress={onSave}><Send size={20} color="white" /><Text style={styles.mainButtonText}>{editingId ? 'Aktualizuj' : 'Zapisz'}</Text></TouchableOpacity>
      </View>
      <View style={{marginTop: 20}}>
        <Text style={styles.sectionTitle}>Tego dnia</Text>
        {history.filter(h => h.date === selectedDate).map((e,i) => (
          <View key={i} style={[styles.historyItem, {flexDirection: 'column', gap: 8}]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={{fontWeight:'bold', fontSize: 14, color: COLORS.stone800}}>{e.nick}</Text>
              <View style={{flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '70%'}}>
                {e.mood > 0 && (
                  <View style={{backgroundColor: getMoodColor(e.mood) + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6}}>
                    <Text style={{fontSize: 10, color: getMoodColor(e.mood), fontWeight: '700'}}>Mood: {e.mood}</Text>
                  </View>
                )}
                {e.habits && e.habits.map((h, idx) => {
                  const habitName = typeof h === 'object' ? h.name : 'Nawyk';
                  return (
                    <View key={idx} style={{backgroundColor: COLORS.emerald50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: COLORS.emerald400}}>
                      <Text style={{fontSize: 10, color: COLORS.emerald600, fontWeight: '700'}}>{habitName}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            {e.text ? <Text style={{fontSize: 13, color: COLORS.stone600, lineHeight: 18}}>{e.text}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dateStrip: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 4, borderRadius: 16, marginBottom: 10 },
  dateBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  dateBtnActive: { backgroundColor: COLORS.stone800 },
  dateBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.stone500 },
  dateBtnTextActive: { color: COLORS.white },
  currentDateLabel: { textAlign: 'center', fontSize: 11, fontWeight: '800', color: COLORS.stone400, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 20 },
  moodValue: { fontSize: 24, fontWeight: '800', marginVertical: 10 },
  habitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  habitChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.stone100, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  habitChipActive: { backgroundColor: COLORS.stone800 },
  habitChipMandatory: { borderWidth: 1, borderColor: COLORS.rose200, backgroundColor: COLORS.rose100 },
  habitText: { fontSize: 11, fontWeight: '700', color: COLORS.stone500 },
  habitTextActive: { color: COLORS.white },
  textArea: { backgroundColor: COLORS.stone50, borderRadius: 16, padding: 16, height: 140, textAlignVertical: 'top', fontSize: 14, color: COLORS.stone800, borderWidth: 1, borderColor: COLORS.stone100 },
  mainButton: { backgroundColor: COLORS.stone800, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderRadius: 16, marginTop: 16 },
  mainButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: COLORS.stone400, marginBottom: 12, letterSpacing: 1 },
  historyItem: { backgroundColor: COLORS.white, padding: 16, borderRadius: 16, marginBottom: 10, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: COLORS.stone100 },
  dayBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.stone200 },
  dayBtnActive: { backgroundColor: COLORS.stone800, borderColor: COLORS.stone800 },
  dayBtnText: { fontSize: 10, fontWeight: '700', color: COLORS.stone400 },
  dayBtnTextActive: { color: COLORS.white },
  calendarOverlay: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 10, zIndex: 100 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' }
});

export default DailyScreen;
