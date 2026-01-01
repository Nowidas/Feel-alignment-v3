import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { RefreshCw, Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, ICON_MAP, DAYS_MAP } from '../constants/theme';
import { getLocalYYYYMMDD } from '../utils/helpers';

const SettingsScreen = ({ user, setUser, userHabits, setUserHabits, syncWithCloud, isSyncing, scheduleNotification }) => {
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('droplet');
  const [newHabitMandatory, setNewHabitMandatory] = useState(false);
  const [newHabitFrequency, setNewHabitFrequency] = useState([0,1,2,3,4,5,6]); 
  const [showTimePicker, setShowTimePicker] = useState(false); 

  const getNotificationDateObj = () => {
    const d = new Date();
    const [h, m] = (user.notificationTime || '20:00').split(':');
    d.setHours(parseInt(h), parseInt(m), 0, 0);
    return d;
  };

  const onTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const h = String(selectedDate.getHours()).padStart(2, '0');
      const m = String(selectedDate.getMinutes()).padStart(2, '0');
      const newTime = `${h}:${m}`;
      const newUser = {...user, notificationTime: newTime};
      setUser(newUser);
      AsyncStorage.setItem('fa_user', JSON.stringify(newUser));
      scheduleNotification(newTime); 
    }
  };

  const toggleNewHabitDay = (dayIndex) => {
    if (newHabitFrequency.includes(dayIndex)) {
      setNewHabitFrequency(newHabitFrequency.filter(d => d !== dayIndex));
    } else {
      setNewHabitFrequency([...newHabitFrequency, dayIndex].sort());
    }
  };

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) return;
    const newHabit = {
      id: Date.now().toString(),
      name: newHabitName,
      icon: newHabitIcon,
      mandatory: newHabitMandatory,
      frequency: newHabitFrequency,
      created: new Date().toISOString().split('T')[0] // Using simple date for creation
    };
    const updatedHabits = [...userHabits, newHabit];
    setUserHabits(updatedHabits);
    await AsyncStorage.setItem('fa_habits', JSON.stringify(updatedHabits));
    setNewHabitName('');
    setNewHabitMandatory(false);
    setNewHabitFrequency([0,1,2,3,4,5,6]);
    Alert.alert("Sukces", "Dodano nowy nawyk");
  };

  const handleDeleteHabit = async (id) => {
    if (Platform.OS === 'web') {
      if (confirm("Czy na pewno chcesz usunąć ten nawyk? Nie będzie on już sugerowany do zaznaczenia, ale historia wykonanych nawyków pozostanie.")) {
        const updatedHabits = userHabits.map(h => h.id === id ? { ...h, archived: true, archivedAt: getLocalYYYYMMDD(new Date()) } : h);
        setUserHabits(updatedHabits);
        await AsyncStorage.setItem('fa_habits', JSON.stringify(updatedHabits));
      }
    } else {
      Alert.alert("Usuń nawyk", "Czy na pewno chcesz usunąć ten nawyk? Nie będzie on już sugerowany do zaznaczenia, ale historia wykonanych nawyków pozostanie.", [
        { text: "Anuluj" },
        { text: "Usuń", style: "destructive", onPress: async () => {
            // Soft delete: mark as archived instead of removing
            const updatedHabits = userHabits.map(h => h.id === id ? { ...h, archived: true, archivedAt: getLocalYYYYMMDD(new Date()) } : h);
            setUserHabits(updatedHabits);
            await AsyncStorage.setItem('fa_habits', JSON.stringify(updatedHabits));
        }}
      ]);
    }
  };

  return (
    <View style={styles.card}>
       <Text style={styles.sectionTitle}>Ustawienia</Text>
       <View style={styles.settingRow}><Text>Synchronizacja</Text><TouchableOpacity onPress={()=>syncWithCloud(user, true)}><RefreshCw size={20} color={COLORS.stone800} className={isSyncing?'animate-spin':''}/></TouchableOpacity></View>
       
       <View style={styles.inputGroup}><Text style={styles.label}>Twój Nick</Text><TextInput style={styles.input} value={user.nick} onChangeText={t => setUser({...user, nick: t})} onEndEditing={() => AsyncStorage.setItem('fa_user', JSON.stringify(user))} /></View>
       <View style={styles.inputGroup}><Text style={styles.label}>Nick Znajomego</Text><TextInput style={styles.input} value={user.partnerNick} onChangeText={t => setUser({...user, partnerNick: t})} onEndEditing={() => AsyncStorage.setItem('fa_user', JSON.stringify(user))} /></View>

       <View style={styles.inputGroup}><Text style={styles.label}>API Endpoint</Text><TextInput style={[styles.input, {fontSize: 10}]} value={user.apiEndpoint} onChangeText={t => setUser({...user, apiEndpoint: t})} onEndEditing={() => AsyncStorage.setItem('fa_user', JSON.stringify(user))} /></View>
       <View style={styles.inputGroup}><Text style={styles.label}>API Token</Text><TextInput style={styles.input} secureTextEntry value={user.apiToken} onChangeText={t => setUser({...user, apiToken: t})} onEndEditing={() => AsyncStorage.setItem('fa_user', JSON.stringify(user))} /></View>
       
       <View style={styles.inputGroup}><Text style={styles.label}>Godzina przypomnienia</Text><TouchableOpacity onPress={()=>setShowTimePicker(true)} style={styles.input}><Text>{user.notificationTime}</Text></TouchableOpacity></View>
       {showTimePicker && (<DateTimePicker value={getNotificationDateObj()} mode="time" is24Hour={true} display="default" onChange={onTimeChange} />)}
       
       <View style={styles.inputGroup}>
         <Text style={styles.label}>Godzina zmiany dnia (0-23)</Text>
         <TextInput 
           style={styles.input} 
           keyboardType="numeric" 
           maxLength={2}
           value={String(user.dayCutoffHour !== undefined ? user.dayCutoffHour : 4)} 
           onChangeText={t => {
             if (t === '') {
               setUser({...user, dayCutoffHour: ''});
               return;
             }
             const val = parseInt(t);
             if (!isNaN(val) && val >= 0 && val <= 23) {
               const newUser = {...user, dayCutoffHour: val};
               setUser(newUser);
               AsyncStorage.setItem('fa_user', JSON.stringify(newUser));
             }
           }}
           onEndEditing={() => {
             let finalVal = user.dayCutoffHour;
             if (finalVal === '' || isNaN(finalVal)) finalVal = 4;
             const newUser = {...user, dayCutoffHour: finalVal};
             setUser(newUser);
             AsyncStorage.setItem('fa_user', JSON.stringify(newUser));
           }}
         />
       </View>
       
       <View style={{marginTop:20, borderTopWidth:1, borderColor:COLORS.stone100, paddingTop:10}}>
         <Text style={styles.sectionTitle}>Zarządzanie Nawykami</Text>
         <View style={styles.addHabitForm}><Text style={styles.subLabel}>Dodaj nowy</Text>
         <View style={styles.iconRow}><ScrollView horizontal showsHorizontalScrollIndicator={false}>{Object.keys(ICON_MAP).filter(k=>k!=='check').map(key => { const Icon = ICON_MAP[key]; return ( <TouchableOpacity key={key} onPress={() => setNewHabitIcon(key)} style={[styles.iconBtn, newHabitIcon === key && styles.iconBtnActive]}><Icon size={16} color={newHabitIcon === key ? COLORS.white : COLORS.stone400} /></TouchableOpacity> ) })}</ScrollView></View>
         <TextInput 
            style={[styles.input, {marginBottom:10}]} 
            placeholder="Nazwa nawyku" 
            placeholderTextColor={COLORS.stone400}
            value={newHabitName} 
            onChangeText={setNewHabitName} 
         />
         <View style={styles.settingRow}><Text style={styles.smallLabel}>Obowiązkowy?</Text><TouchableOpacity onPress={() => setNewHabitMandatory(!newHabitMandatory)}><View style={[styles.toggle, newHabitMandatory && styles.toggleActive]}><View style={[styles.toggleKnob, newHabitMandatory && styles.toggleKnobActive]}/></View></TouchableOpacity></View>
         <View style={{marginBottom: 10}}><Text style={styles.smallLabel}>Dni:</Text><View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 5}}>{DAYS_MAP.map((d, i) => ( <TouchableOpacity key={i} onPress={() => toggleNewHabitDay(i)} style={[styles.dayBtn, newHabitFrequency.includes(i) && styles.dayBtnActive]}><Text style={[styles.dayBtnText, newHabitFrequency.includes(i) && styles.dayBtnTextActive]}>{d}</Text></TouchableOpacity> ))}</View></View>
         <TouchableOpacity style={styles.mainButton} onPress={handleAddHabit}><Text style={styles.mainButtonText}>Dodaj</Text></TouchableOpacity></View>
         {userHabits.filter(h => !h.archived).map(h => (<View key={h.id} style={styles.habitRow}><Text style={{fontWeight:'bold', color:COLORS.stone600}}>{h.name}</Text><TouchableOpacity onPress={()=>handleDeleteHabit(h.id)}><Trash2 size={16} color={COLORS.stone300}/></TouchableOpacity></View>))}
       </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: COLORS.stone400, marginBottom: 12, letterSpacing: 1 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.stone500, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: COLORS.stone50, borderWidth: 1, borderColor: COLORS.stone200, padding: 12, borderRadius: 12, fontSize: 14, color: COLORS.stone800 },
  addHabitForm: { backgroundColor: COLORS.stone50, padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.stone100 },
  subLabel: { fontSize: 10, fontWeight: '800', color: COLORS.stone400, textTransform: 'uppercase', marginBottom: 10 },
  iconRow: { marginBottom: 10 },
  iconBtn: { padding: 10, borderRadius: 10, marginRight: 8, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.stone200 },
  iconBtnActive: { backgroundColor: COLORS.stone800, borderColor: COLORS.stone800 },
  smallLabel: { fontSize: 12, fontWeight: '600', color: COLORS.stone600 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORS.stone200, padding: 2 },
  toggleActive: { backgroundColor: COLORS.emerald500 },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 },
  toggleKnobActive: { transform: [{ translateX: 20 }] },
  dayBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.stone200 },
  dayBtnActive: { backgroundColor: COLORS.stone800, borderColor: COLORS.stone800 },
  dayBtnText: { fontSize: 10, fontWeight: '700', color: COLORS.stone400 },
  dayBtnTextActive: { color: COLORS.white },
  mainButton: { backgroundColor: COLORS.stone800, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderRadius: 16, marginTop: 16 },
  mainButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  habitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.stone100 },
});

export default SettingsScreen;
