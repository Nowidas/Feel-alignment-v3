import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Activity, BookOpen, Users } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { getLocalYYYYMMDD, getMoodColor } from '../utils/helpers';

const StatsScreen = ({ history, user, userHabits }) => {
  // 1. Streak
  const myEntries = history.filter(h => h.nick === user.nick).sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  const today = getLocalYYYYMMDD(new Date());
  const yesterday = getLocalYYYYMMDD(new Date(new Date().setDate(new Date().getDate() - 1)));
  
  // Check if we have entry for today or yesterday to start streak
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
                   if (new Date(entryDate) < new Date(expectedDate)) break;
               }
           }
      }
  }

  // Max Streak Calculation
  let maxStreak = 0;
  if (myEntries.length > 0) {
      let currentCalcStreak = 1;
      maxStreak = 1;
      for (let i = 0; i < myEntries.length - 1; i++) {
          const curr = new Date(myEntries[i].date);
          const next = new Date(myEntries[i+1].date);
          const diffTime = Math.abs(curr - next);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          
          if (diffDays === 0) continue;

          if (diffDays === 1) {
              currentCalcStreak++;
          } else {
              if (currentCalcStreak > maxStreak) maxStreak = currentCalcStreak;
              currentCalcStreak = 1;
          }
      }
      if (currentCalcStreak > maxStreak) maxStreak = currentCalcStreak;
  }

  // Average Mood (Last 30 days)
  const getAvgMood = (entries) => {
      const last30 = entries.filter(e => {
          const d = new Date(e.date);
          const limit = new Date();
          limit.setDate(limit.getDate() - 30);
          return d >= limit;
      });
      return last30.length > 0 
        ? (last30.reduce((acc, curr) => acc + curr.mood, 0) / last30.length).toFixed(1) 
        : 0;
  };

  const avgMood = getAvgMood(myEntries);

  // Partner Entries
  const partnerEntries = user.partnerNick 
    ? history.filter(h => h.nick === user.partnerNick).sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];
  const partnerAvgMood = getAvgMood(partnerEntries);
  const partnerEntriesCount = partnerEntries.length;

  const getDynamicMoodColor = (val) => {
      if (val <= 2.7) return '#f43f5e'; // Red
      if (val <= 3.2) return '#a8a29e'; // Gray
      return '#059669'; // Green
  };

  // Partner Max Streak
  let partnerMaxStreak = 0;
  if (partnerEntries.length > 0) {
      let currentCalcStreak = 1;
      partnerMaxStreak = 1;
      for (let i = 0; i < partnerEntries.length - 1; i++) {
          const curr = new Date(partnerEntries[i].date);
          const next = new Date(partnerEntries[i+1].date);
          const diffTime = Math.abs(curr - next);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          
          if (diffDays === 0) continue;

          if (diffDays === 1) {
              currentCalcStreak++;
          } else {
              if (currentCalcStreak > partnerMaxStreak) partnerMaxStreak = currentCalcStreak;
              currentCalcStreak = 1;
          }
      }
      if (currentCalcStreak > partnerMaxStreak) partnerMaxStreak = currentCalcStreak;
  }

  // 2. Mood Heatmap (Last 30 days)
  const last30Days = [];
  const partnerLast30Days = [];
  for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalYYYYMMDD(d);
      
      const entry = myEntries.find(e => e.date === dateStr);
      last30Days.push({ date: dateStr, mood: entry ? entry.mood : 0 });
      
      const partnerEntry = partnerEntries.find(e => e.date === dateStr);
      partnerLast30Days.push({ date: dateStr, mood: partnerEntry ? partnerEntry.mood : 0 });
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
          
          {/* Top Row: Streak & Avg Mood */}
          <View style={{flexDirection: 'row', gap: 12, marginBottom: 12}}>
            <View style={[styles.card, {flex: 1, marginBottom: 0, padding: 16}]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8}}>
                    <View style={[styles.iconBox, {backgroundColor: COLORS.amber100}]}>
                        <Flame size={20} color={COLORS.amber500} fill={COLORS.amber500} />
                    </View>
                    <Text style={styles.statLabel}>Passa</Text>
                </View>
                <Text style={styles.statValue}>{streak} <Text style={{fontSize: 14, color: COLORS.stone400, fontWeight: '600'}}>dni</Text></Text>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4}}>
                    <Text style={styles.subStat}>Max: {maxStreak}</Text>
                    {user.partnerNick ? (
                        <View style={{alignItems: 'flex-end'}}>
                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
                                <Users size={10} color={COLORS.stone400} />
                                <Text style={{fontSize: 9, color: COLORS.stone400, fontWeight: '600'}}>{user.partnerNick}</Text>
                            </View>
                            <Text style={{fontSize: 11, fontWeight: '600', color: COLORS.stone400}}>max: {partnerMaxStreak}</Text>
                        </View>
                    ) : null}
                </View>
            </View>

            <View style={[styles.card, {flex: 1, marginBottom: 0, padding: 16}]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8}}>
                    <View style={[styles.iconBox, {backgroundColor: COLORS.emerald50}]}>
                        <Activity size={20} color={COLORS.emerald500} />
                    </View>
                    <Text style={styles.statLabel}>Śr. Mood (30d)</Text>
                </View>
                <Text style={[styles.statValue, {color: getDynamicMoodColor(avgMood)}]}>{avgMood}</Text>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4}}>
                    <Text style={styles.subStat}>/ 5</Text>
                    {user.partnerNick ? (
                        <View style={{alignItems: 'flex-end'}}>
                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
                                <Users size={10} color={COLORS.stone400} />
                                <Text style={{fontSize: 9, color: COLORS.stone400, fontWeight: '600'}}>{user.partnerNick}</Text>
                            </View>
                            <Text style={{fontSize: 11, fontWeight: '600', color: getDynamicMoodColor(partnerAvgMood)}}>{partnerAvgMood}</Text>
                        </View>
                    ) : null}
                </View>
            </View>
          </View>

          {/* Total Entries Row */}
          <View style={[styles.card, {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}]}>
             <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <View style={[styles.iconBox, {backgroundColor: COLORS.stone100}]}>
                    <BookOpen size={24} color={COLORS.stone600} />
                </View>
                <View>
                    <Text style={styles.statLabel}>Wszystkie wpisy</Text>
                    <Text style={styles.statValue}>{myEntries.length}</Text>
                </View>
             </View>
             {user.partnerNick ? (
                 <View style={{alignItems: 'flex-end'}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <Users size={14} color={COLORS.stone400} />
                        <Text style={styles.subStatLabel}>{user.partnerNick}</Text>
                    </View>
                    <Text style={{fontWeight: 'bold', color: COLORS.stone600}}>{partnerEntriesCount}</Text>
                 </View>
             ) : null}
          </View>

          {/* Mood Heatmap */}
          <View style={styles.card}>
              <Text style={styles.sectionTitle}>Nastrój (30 dni)</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center'}}>
                  {last30Days.map((d, i) => (
                      <View 
                        key={i} 
                        style={{
                            width: 24, 
                            height: 24, 
                            borderRadius: 4, 
                            backgroundColor: d.mood > 0 ? getMoodColor(d.mood) : COLORS.stone100,
                            opacity: d.mood > 0 ? 1 : 0.5
                        }} 
                      />
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

          {/* Partner Mood Heatmap */}
          {user.partnerNick ? (
              <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Nastrój (30 dni) {user.partnerNick}</Text>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center'}}>
                      {partnerLast30Days.map((d, i) => (
                          <View 
                              key={i} 
                              style={{
                                  width: 24, 
                                  height: 24, 
                                  borderRadius: 4, 
                                  backgroundColor: d.mood > 0 ? getMoodColor(d.mood) : COLORS.stone100,
                                  opacity: d.mood > 0 ? 1 : 0.5
                              }} 
                          />
                      ))}
                  </View>
              </View>
          ) : null}
      </View>
  );
};

const styles = StyleSheet.create({
  bigTitle: { fontSize: 28, fontWeight: '800', color: COLORS.stone800, marginBottom: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 20 },
  iconBox: { backgroundColor: COLORS.stone200, padding: 6, borderRadius: 8 },
  statLabel: { fontSize: 12, fontWeight: '700', color: COLORS.stone500, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.stone800 },
  subStat: { fontSize: 11, fontWeight: '600', color: COLORS.stone400, marginTop: 4 },
  subStatLabel: { fontSize: 10, fontWeight: '600', color: COLORS.stone400 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: COLORS.stone400, marginBottom: 12, letterSpacing: 1 },
  emptyText: { fontStyle: 'italic', color: COLORS.stone400, marginLeft: 10 }
});

export default StatsScreen;
