import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Edit2, Trash2, Check, X } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { formatDateLabel, getMoodColor, isHabitActiveForDate, getVirtualMissingEntries } from '../utils/helpers';

const HistoryScreen = ({ history, user, userHabits, onEdit, onDelete }) => {
  const confirmDelete = (id) => {
    // We need to pass this up or handle alert here. 
    // Since Alert is UI, we can do it here but the actual delete logic is passed down.
    // But wait, Alert.alert with callback is tricky if logic is in parent.
    // Let's assume onDelete handles the confirmation or we do it here.
    // The original code had confirmDelete in App.js.
    // Let's just call onDelete(id) and let parent handle confirmation or do it here.
    // Better to do it here to keep UI logic together.
    onDelete(id);
  };

  return (
    <View>
       <Text style={styles.bigTitle}>Historia</Text>
       {[...history, ...getVirtualMissingEntries(userHabits, history, user.nick)].sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry, idx) => {
          const isMe = entry.nick === user.nick;
          const isVirtual = entry.isVirtual;
          let skippedHabits = [];
          if (isMe && !isVirtual) {
              skippedHabits = userHabits.filter(h => h.mandatory && isHabitActiveForDate(h, entry.date) && !(entry.habits || []).some(done => (done.id || done) === h.id));
          } else if (isVirtual) {
              skippedHabits = entry.missedSnapshot || [];
          }

          return (
            <View key={idx} style={[styles.historyCard, isMe ? (isVirtual ? {backgroundColor: COLORS.stone50, borderColor: COLORS.stone300, borderStyle: 'dashed', borderWidth: 1} : {backgroundColor: COLORS.white, borderColor: COLORS.stone200, borderWidth: 1}) : {}]}>
                <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:8}}>
                    <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
                        <View style={[styles.avatarSmall, isMe ? {backgroundColor: COLORS.stone800} : {}]}><Text style={[styles.avatarTextSmall, isMe ? {color: 'white'} : {}]}>{entry.nick[0]}</Text></View>
                        <Text style={styles.historyDate}>{formatDateLabel(entry.date)}</Text>
                    </View>
                    {isMe && !isVirtual && (
                        <View style={{flexDirection:'row', gap:12}}>
                            <TouchableOpacity onPress={() => onEdit(entry)}><Edit2 size={18} color={COLORS.stone400} /></TouchableOpacity>
                            <TouchableOpacity onPress={() => confirmDelete(entry.id)}><Trash2 size={18} color={COLORS.rose400} /></TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={{flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:8}}>
                    {entry.mood > 0 && (
                        <View style={[styles.moodBadge, {backgroundColor: getMoodColor(entry.mood) + '20'}]}>
                            <Text style={[styles.moodBadgeText, {color: getMoodColor(entry.mood)}]}>Mood: {entry.mood}</Text>
                        </View>
                    )}
                    {isVirtual && (<View style={[styles.moodBadge, {backgroundColor: COLORS.stone200}]}><Text style={[styles.moodBadgeText, {color: COLORS.stone500}]}>Pominięty</Text></View>)}
                    
                    {entry.habits && entry.habits.map((h, i) => {
                        const habitName = typeof h === 'object' ? h.name : 'Nawyk';
                        return (<View key={`done-${i}`} style={styles.habitBadge}><Check size={10} color={COLORS.emerald600} /><Text style={styles.habitBadgeText}>{habitName}</Text></View>)
                    })}
                    
                    {skippedHabits.map((h, i) => (
                        <View key={`skip-${i}`} style={[styles.habitBadge, {backgroundColor: COLORS.rose100, borderColor: COLORS.rose200}]}>
                            <X size={10} color={COLORS.rose500} />
                            <Text style={[styles.habitBadgeText, {color: COLORS.rose500, textDecorationLine: 'line-through'}]}>{h.name}</Text>
                        </View>
                    ))}
                </View>
                <Text style={[styles.historyText, isVirtual && {fontStyle:'italic', color: COLORS.stone400}]}>{entry.text}</Text>
            </View>
          )
       })}
    </View>
  );
};

const styles = StyleSheet.create({
  bigTitle: { fontSize: 28, fontWeight: '800', color: COLORS.stone800, marginBottom: 20 },
  historyCard: { padding: 16, borderRadius: 20, backgroundColor: COLORS.stone50, marginBottom: 12, borderWidth: 1, borderColor: 'transparent' },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.amber100, justifyContent: 'center', alignItems: 'center' },
  avatarTextSmall: { fontSize: 12, fontWeight: 'bold', color: COLORS.amber700 },
  historyDate: { fontSize: 12, fontWeight: '700', color: COLORS.stone400, textTransform: 'uppercase', marginTop: 8 },
  moodBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  moodBadgeText: { fontSize: 10, fontWeight: '800' },
  habitBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.emerald50, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.emerald400 },
  habitBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.emerald600 },
  historyText: { marginTop: 6, fontSize: 13, color: COLORS.stone600, lineHeight: 18 },
});

export default HistoryScreen;
