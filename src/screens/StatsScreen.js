import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import { COLORS, DAYS_MAP } from '../constants/theme';
import { getLocalYYYYMMDD, getMoodColor } from '../utils/helpers';

const StatsScreen = ({ history, user, userHabits }) => {
  // 1. Streak
  const myEntries = history.filter(h => h.nick === user.nick).sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  const today = getLocalYYYYMMDD(new Date());
  const yesterday = getLocalYYYYMMDD(new Date(new Date().setDate(new Date().getDate() - 1)));
  
  // Check if we have entry for today or yesterday to start streak
  let currentDate = myEntries.length > 0 && myEntries[0].date === today ? today : yesterday;
  
  if (myEntries.length > 0) {
      const lastEntryDate = myEntries[0].date;
      if (lastEntryDate === today || lastEntryDate === yesterday) {
           let checkDate = new Date(lastEntryDate);
           streak = 0;
           for (let i = 0; i < myEntries.length; i++) {
               const entryDate = myEntries[i].date;
               const expectedDate = getLocalYYYYMMDD(checkDate);
               if (entryDate === expectedDate) {
                   streak++;
                   checkDate.setDate(checkDate.getDate() - 1);
               } else {
                   // If gap is bigger than 1 day, break
                   if (new Date(entryDate) < new Date(expectedDate)) break;
               }
           }
      }
  }

  // 2. Mood Chart (Last 7 days)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalYYYYMMDD(d);
      const entry = myEntries.find(e => e.date === dateStr);
      last7Days.push({ date: dateStr, mood: entry ? entry.mood : 0, dayName: DAYS_MAP[d.getDay()] });
  }

  // 3. Habits (Last 30 days)
  const last30DaysEntries = myEntries.filter(e => {
      const d = new Date(e.date);
      const limit = new Date();
      limit.setDate(limit.getDate() - 30);
      return d >= limit;
  });
  
  const habitCounts = {};
  last30DaysEntries.forEach(e => {
      if (e.habits) {
          e.habits.forEach(h => {
              const id = h.id || h; 
              habitCounts[id] = (habitCounts[id] || 0) + 1;
          });
      }
  });
  
  const sortedHabits = Object.entries(habitCounts)
      .map(([id, count]) => {
          const habitDef = userHabits.find(h => h.id === id);
          return habitDef ? { ...habitDef, count } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

  return (
      <View>
          <Text style={styles.bigTitle}>Statystyki</Text>
          
          {/* Streak Card */}
          <View style={styles.card}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <View style={[styles.iconBox, {backgroundColor: COLORS.amber100}]}>
                      <Flame size={24} color={COLORS.amber500} fill={COLORS.amber500} />
                  </View>
                  <View>
                      <Text style={styles.statLabel}>Twoja Passa</Text>
                      <Text style={styles.statValue}>{streak} dni</Text>
                  </View>
              </View>
          </View>

          {/* Mood Chart */}
          <View style={styles.card}>
              <Text style={styles.sectionTitle}>Nastrój (7 dni)</Text>
              <View style={{flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, paddingTop: 20}}>
                  {last7Days.map((d, i) => (
                      <View key={i} style={{alignItems: 'center', gap: 6, flex: 1}}>
                          {d.mood > 0 ? (
                              <View style={{
                                  width: 12, 
                                  height: `${d.mood * 10}%`, 
                                  backgroundColor: getMoodColor(d.mood), 
                                  borderRadius: 6,
                                  minHeight: 12
                              }} />
                          ) : (
                              <View style={{width: 12, height: 4, backgroundColor: COLORS.stone200, borderRadius: 2}} />
                          )}
                          <Text style={{fontSize: 10, color: COLORS.stone400, fontWeight: 'bold'}}>{d.dayName}</Text>
                      </View>
                  ))}
              </View>
          </View>

          {/* Top Habits */}
          <View style={styles.card}>
              <Text style={styles.sectionTitle}>Top Nawyki (30 dni)</Text>
              {sortedHabits.length > 0 ? sortedHabits.map((h, i) => (
                  <View key={i} style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12}}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                          <Text style={{fontWeight: 'bold', color: COLORS.stone400, width: 20}}>{i+1}.</Text>
                          <Text style={{fontWeight: '600', color: COLORS.stone700}}>{h.name}</Text>
                      </View>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                          <Text style={{fontWeight: 'bold', color: COLORS.stone800}}>{h.count}</Text>
                          <Text style={{fontSize: 10, color: COLORS.stone400}}>razy</Text>
                      </View>
                  </View>
              )) : <Text style={styles.emptyText}>Brak danych o nawykach.</Text>}
          </View>
      </View>
  );
};

const styles = StyleSheet.create({
  bigTitle: { fontSize: 28, fontWeight: '800', color: COLORS.stone800, marginBottom: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 20 },
  iconBox: { backgroundColor: COLORS.stone200, padding: 6, borderRadius: 8 },
  statLabel: { fontSize: 12, fontWeight: '700', color: COLORS.stone500, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.stone800 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: COLORS.stone400, marginBottom: 12, letterSpacing: 1 },
  emptyText: { fontStyle: 'italic', color: COLORS.stone400, marginLeft: 10 }
});

export default StatsScreen;
