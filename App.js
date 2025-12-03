import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  Alert, Modal, StatusBar, StyleSheet, Platform, Dimensions, ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import Slider from '@react-native-community/slider';
// USUNIĘTO SafeAreaView z 'react-native' aby uniknąć konfliktu
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications'; 
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { 
  Bell, BookHeart, Send, Users, Settings, Smile, Frown, Meh, 
  Calendar as CalendarIcon, Trash2, Edit2, ChevronLeft, ChevronRight, 
  X, AlertCircle, Check, BarChart2, TrendingUp, Activity, 
  ArrowUpRight, ArrowDownRight, Minus, Flame, Trophy, Plus, 
  Droplet, Moon, Sun, BookOpen, Dumbbell, Music, Coffee, 
  Laptop, Briefcase, Heart, AlertTriangle, Server, Lock, UserPlus, Cloud, RefreshCw, ShieldCheck
} from 'lucide-react-native';

// --- NOTIFICATION CONFIG ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// --- THEME COLORS (Cozy Stone Palette) ---
const COLORS = {
  bg: '#F5F4F0',
  white: '#FFFFFF',
  stone50: '#fafaf9',
  stone100: '#f5f5f4',
  stone200: '#e7e5e4',
  stone300: '#d6d3d1',
  stone400: '#a8a29e',
  stone500: '#78716c',
  stone600: '#57534e',
  stone700: '#44403c',
  stone800: '#292524',
  stone900: '#1c1917',
  rose100: '#ffe4e6',
  rose400: '#fb7185',
  rose500: '#f43f5e',
  rose600: '#e11d48',
  amber100: '#fef3c7',
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  amber700: '#b45309',
  emerald50: '#ecfdf5',
  emerald400: '#34d399',
  emerald500: '#10b981',
  emerald600: '#059669',
  slate200: '#e2e8f0'
};

const ICON_MAP = {
  'droplet': Droplet, 'moon': Moon, 'sun': Sun, 'book': BookOpen, 
  'dumbbell': Dumbbell, 'music': Music, 'coffee': Coffee, 'laptop': Laptop, 
  'briefcase': Briefcase, 'heart': Heart, 'check': Check
};

const DAYS_MAP = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];

const JOURNAL_PROMPTS = [
  "Wylej myśli na papier...", "Za co jesteś dzisiaj wdzięczny?", 
  "Co dzisiaj wywołało Twój uśmiech?", "Czego nowego się dzisiaj dowiedziałeś?", 
  "Jaka była najtrudniejsza chwila dnia?", "Co zrobiłeś dzisiaj dla siebie?", 
  "Jakie masz nastawienie na jutro?", "Opisz dzień w 3 słowach.", 
  "Z kim dzisiaj rozmawiałeś?", "Jaki mały sukces odniosłeś?"
];

// --- HELPERS ---

// FIX: Use local time instead of UTC (toISOString)
const getLocalYYYYMMDD = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitialDate = () => {
  const now = new Date();
  if (now.getHours() < 2) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return getLocalYYYYMMDD(yesterday);
  }
  return getLocalYYYYMMDD(now);
};

const formatDateLabel = (dateStr) => {
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

const isHabitActiveForDate = (habit, dateStr) => {
  if (habit.created && dateStr < habit.created) return false;
  if (!habit.frequency || habit.frequency.length === 0) return true; 
  const dayIndex = new Date(dateStr).getDay();
  return habit.frequency.includes(dayIndex);
};

const getVirtualMissingEntries = (userHabits, userHistory, userNick) => {
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

// --- CUSTOM COMPONENTS ---

const MoodSlider = ({ value, onChange }) => {
  return (
    <View style={styles.sliderContainer}>
      <Slider
        style={{width: '100%', height: 40}}
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={COLORS.stone800}
        maximumTrackTintColor={COLORS.stone200}
        thumbTintColor={COLORS.stone800}
      />
      <View style={styles.sliderMarkers}>
        {[1, 5, 10].map(n => (
          <Text key={n} style={styles.sliderMarkerText}>{n}</Text>
        ))}
      </View>
    </View>
  );
};

export default function App() {
  // --- STATE ---
  const [view, setView] = useState('loading'); 
  const [user, setUser] = useState({ 
    nick: '', partnerNick: '', notificationTime: '20:00', apiEndpoint: '', apiToken: '' 
  });
  
  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [dailyEntry, setDailyEntry] = useState({ mood: 5, text: '', habits: [] }); 
  const [editingId, setEditingId] = useState(null);
  const [history, setHistory] = useState([]);
  const [userHabits, setUserHabits] = useState([]);
  
  // UI State for Habits & Notifications
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('droplet');
  const [newHabitMandatory, setNewHabitMandatory] = useState(false);
  const [newHabitFrequency, setNewHabitFrequency] = useState([0,1,2,3,4,5,6]); 
  const [showTimePicker, setShowTimePicker] = useState(false); 

  const [isSyncing, setIsSyncing] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const scrollViewRef = useRef(null);

  const currentPrompt = useMemo(() => {
    return JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)];
  }, [selectedDate]);

  // --- INIT ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('fa_user');
      const savedHistory = await AsyncStorage.getItem('fa_history');
      const savedHabits = await AsyncStorage.getItem('fa_habits');
      
      if (savedHabits) setUserHabits(JSON.parse(savedHabits));
      else {
        const defaults = [
          { id: 'h1', name: 'Woda', icon: 'droplet', frequency: [0,1,2,3,4,5,6], mandatory: true, created: getInitialDate() },
          { id: 'h2', name: 'Sen 8h', icon: 'moon', frequency: [0,1,2,3,4,5,6], mandatory: true, created: getInitialDate() }
        ];
        setUserHabits(defaults);
        await AsyncStorage.setItem('fa_habits', JSON.stringify(defaults));
      }

      if (savedHistory) setHistory(JSON.parse(savedHistory));

      if (savedUser) {
        const u = JSON.parse(savedUser);
        setUser(u);
        setView('daily');
        if (u.apiEndpoint) syncWithCloud(u, false); 
      } else {
        setView('onboarding');
      }
    } catch (e) {
      console.error("Load error", e);
      setView('onboarding');
    }
  };

  // --- NOTIFICATIONS LOGIC (SAFE) ---
  const scheduleNotification = async (timeStr) => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert("Brak uprawnień", "Powiadomienia nie są włączone w ustawieniach systemu.");
        return;
      }

      const [hours, minutes] = timeStr.split(':').map(Number);

      await Notifications.cancelAllScheduledNotificationsAsync();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "FeelingAlignment 📝",
          body: "Czas na chwilę refleksji. Jak Ci minął dzień?",
          sound: true,
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      Alert.alert("Ustawiono", `Przypomnienie o ${timeStr}`);
    } catch (error) {
      console.log("Notification Warning (Expo Go):", error);
      Alert.alert("Info", "Ustawiono czas. W wersji deweloperskiej powiadomienia mogą nie przychodzić.");
    }
  };

  const onTimeChange = async (event, date) => {
    setShowTimePicker(false);
    if (date) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      const updatedUser = { ...user, notificationTime: timeStr };
      setUser(updatedUser);
      await AsyncStorage.setItem('fa_user', JSON.stringify(updatedUser));
      
      await scheduleNotification(timeStr);
    }
  };

  const getNotificationDateObj = () => {
    const d = new Date();
    const [h, m] = (user.notificationTime || '20:00').split(':').map(Number);
    d.setHours(h);
    d.setMinutes(m);
    return d;
  };

  // --- SYNC ---
  const syncWithCloud = async (currentUser = user, showAlert = true) => {
    if (!currentUser.apiEndpoint) {
      if (showAlert) Alert.alert("Błąd", "Brak skonfigurowanego API");
      return;
    }
    setIsSyncing(true);
    try {
      const url = `${currentUser.apiEndpoint}?token=${currentUser.apiToken || ''}`;
      const response = await fetch(url);
      const cloudData = await response.json();
      
      if (cloudData.error) throw new Error(cloudData.error);
      
      if (Array.isArray(cloudData)) {
        // Filter and Normalize Dates to Local Time
        const relevantData = cloudData.filter(item => 
           item.nick === currentUser.nick || item.nick === currentUser.partnerNick
        ).map(item => ({
           ...item,
           date: item.date.length > 10 ? getLocalYYYYMMDD(item.date) : item.date 
        }));
        
        const sorted = relevantData.sort((a, b) => new Date(b.date) - new Date(a.date));
        setHistory(sorted);
        await AsyncStorage.setItem('fa_history', JSON.stringify(sorted));
        if (showAlert) Alert.alert("Sukces", "Synchronizacja zakończona");
      }
    } catch (e) {
      if (showAlert) Alert.alert("Błąd Sync", e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const pushEntry = async (entry) => {
    if (!user.apiEndpoint) return;
    try {
      // Używamy 'no-cors' lub 'text/plain' aby uniknąć preflight OPTIONS, którego Google Apps Script nie obsługuje
      await fetch(user.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, 
        body: JSON.stringify({ ...entry, token: user.apiToken })
      });
    } catch (e) { console.log("Push fail", e); }
  };

  // --- HANDLERS ---
  const handleSaveEntry = async () => {
    if (!dailyEntry.text.trim() && dailyEntry.habits.length === 0) {
      Alert.alert("Pusty wpis", "Napisz coś lub zaznacz nawyk.");
      return;
    }

    const habitsSnapshot = dailyEntry.habits.map(hid => {
      const h = userHabits.find(uh => uh.id === hid);
      return h ? { id: hid, name: h.name, icon: h.icon } : null;
    }).filter(Boolean);

    const newEntry = {
      id: editingId || Date.now(),
      date: selectedDate,
      nick: user.nick,
      mood: dailyEntry.mood,
      text: dailyEntry.text,
      habits: habitsSnapshot,
      timestamp: new Date().toISOString()
    };

    let newHistory = editingId 
      ? history.map(h => h.id === editingId ? newEntry : h)
      : [newEntry, ...history];
    
    newHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    setHistory(newHistory);
    await AsyncStorage.setItem('fa_history', JSON.stringify(newHistory));
    
    pushEntry(newEntry); 
    
    setDailyEntry({ mood: 5, text: '', habits: [] });
    setEditingId(null);
    Alert.alert("Zapisano", "Twój dzień został zapisany.");
  };

  const deleteEntry = async (id) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    await AsyncStorage.setItem('fa_history', JSON.stringify(newHistory));
    if (editingId === id) {
      setEditingId(null);
      setDailyEntry({ mood: 5, text: '', habits: [] });
    }
  };

  // --- HABIT HANDLERS (SETTINGS) ---
  const toggleNewHabitDay = (dayIndex) => {
    if (newHabitFrequency.includes(dayIndex)) {
      if (newHabitFrequency.length > 1) { 
         setNewHabitFrequency(newHabitFrequency.filter(d => d !== dayIndex));
      }
    } else {
      setNewHabitFrequency([...newHabitFrequency, dayIndex].sort());
    }
  };

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) return;
    const newHabit = {
      id: `h-${Date.now()}`,
      name: newHabitName,
      icon: newHabitIcon,
      mandatory: newHabitMandatory,
      frequency: newHabitFrequency,
      created: getInitialDate()
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
    Alert.alert("Usuń nawyk", "Czy na pewno chcesz usunąć ten nawyk z konfiguracji? Historia pozostanie zachowana.", [
      { text: "Anuluj" },
      { text: "Usuń", style: "destructive", onPress: async () => {
          const updatedHabits = userHabits.filter(h => h.id !== id);
          setUserHabits(updatedHabits);
          await AsyncStorage.setItem('fa_habits', JSON.stringify(updatedHabits));
      }}
    ]);
  };

  const handleEditFromHistory = (entry) => {
    setSelectedDate(entry.date);
    // Handle legacy (array of strings) vs snapshot (array of objects)
    const habitIds = (entry.habits || []).map(h => h.id || h);
    setDailyEntry({ mood: entry.mood, text: entry.text, habits: habitIds });
    setEditingId(entry.id);
    setView('daily');
  };

  const confirmDelete = (id) => {
    Alert.alert("Usuń wpis", "Czy na pewno? Operacja nieodwracalna.", [
      { text: "Anuluj" },
      { text: "Usuń", style: "destructive", onPress: () => deleteEntry(id) }
    ]);
  };

  // --- RENDER HELPERS ---
  const getMoodColor = (val) => {
    if (val <= 3) return COLORS.rose500;
    if (val <= 6) return COLORS.amber500;
    return COLORS.emerald500;
  };
  const getMoodBg = (val) => {
    if (val === 0) return 'bg-gray-100 text-gray-400';
    if (val <= 3) return 'bg-rose-100 text-rose-700';
    if (val <= 6) return 'bg-amber-100 text-amber-800';
    return 'bg-emerald-100 text-emerald-800';
  };

  const getMoodIcon = (val) => {
    if (val <= 3) return <Frown size={40} color={COLORS.rose500} />;
    if (val <= 6) return <Meh size={40} color={COLORS.amber500} />;
    return <Smile size={40} color={COLORS.emerald500} />;
  };

  // --- VIEWS ---
  
  if (view === 'onboarding') {
    return (
      <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
            <View style={styles.centerContent}>
              <View style={styles.logoContainer}><ShieldCheck size={40} color={COLORS.stone700} /></View>
              <Text style={styles.title}>FeelingAlignment</Text>
              <Text style={styles.subtitle}>Skonfiguruj bezpieczne połączenie</Text>
              <View style={styles.form}>
                <TextInput style={styles.input} placeholder="Twój Nick" onChangeText={t => setUser({...user, nick: t})}/>
                <TextInput style={styles.input} placeholder="Nick Partnera" onChangeText={t => setUser({...user, partnerNick: t})}/>
                <TextInput style={styles.input} placeholder="API Endpoint URL" onChangeText={t => setUser({...user, apiEndpoint: t})} autoCapitalize="none"/>
                <TextInput style={styles.input} placeholder="Secret Token" onChangeText={t => setUser({...user, apiToken: t})} secureTextEntry/>
                <TouchableOpacity style={styles.mainButton} onPress={async () => { if(user.nick && user.apiEndpoint) { await AsyncStorage.setItem('fa_user', JSON.stringify(user)); setView('daily'); } else Alert.alert("Błąd", "Wymagany Nick i URL"); }}><Text style={styles.mainButtonText}>Rozpocznij</Text></TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (view === 'loading') return <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color={COLORS.stone800} /></View>;

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      <View style={styles.header}>
        <View><View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><BookHeart size={20} color={COLORS.stone800}/><Text style={styles.headerTitle}>FeelingAlignment</Text></View><Text style={styles.headerSubtitle}>Dziennik Uczuć</Text></View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user.nick[0]}</Text></View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}>
        <ScrollView style={styles.scrollContent} contentContainerStyle={{paddingBottom: 100}} ref={scrollViewRef}>
          
          {view === 'daily' && (
            <View>
              <View style={styles.dateStrip}>
                <TouchableOpacity style={[styles.dateBtn, selectedDate === getLocalYYYYMMDD(new Date()) && styles.dateBtnActive]} onPress={() => {setSelectedDate(getLocalYYYYMMDD(new Date())); setDailyEntry({mood:5,text:'',habits:[]}); setEditingId(null);}}><Text style={[styles.dateBtnText, selectedDate === getLocalYYYYMMDD(new Date()) && styles.dateBtnTextActive]}>Dziś</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.dateBtn, selectedDate !== getLocalYYYYMMDD(new Date()) && styles.dateBtnActive]} onPress={() => {const y = new Date(); y.setDate(y.getDate()-1); setSelectedDate(getLocalYYYYMMDD(y)); setDailyEntry({mood:5,text:'',habits:[]}); setEditingId(null);}}><Text style={[styles.dateBtnText, selectedDate !== getLocalYYYYMMDD(new Date()) && styles.dateBtnTextActive]}>Wczoraj</Text></TouchableOpacity>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setIsCalendarOpen(!isCalendarOpen)}><CalendarIcon size={16} color={COLORS.stone500} /></TouchableOpacity>
              </View>
              {isCalendarOpen && renderCalendar()}
              <Text style={styles.currentDateLabel}>{formatDateLabel(selectedDate)}</Text>
              <View style={styles.card}>
                <View style={{alignItems: 'center', marginBottom: 20}}>{getMoodIcon(dailyEntry.mood)}<Text style={[styles.moodValue, { color: getMoodColor(dailyEntry.mood) }]}>{dailyEntry.mood}/10</Text><MoodSlider value={dailyEntry.mood} onChange={(v) => setDailyEntry({...dailyEntry, mood: v})} /></View>
                <View style={styles.habitsGrid}>{userHabits.filter(h => isHabitActiveForDate(h, selectedDate)).map(h => { const isActive = dailyEntry.habits.includes(h.id); const Icon = ICON_MAP[h.icon] || Check; return ( <TouchableOpacity key={h.id} style={[styles.habitChip, isActive && styles.habitChipActive, h.mandatory && !isActive && styles.habitChipMandatory]} onPress={() => { const newH = isActive ? dailyEntry.habits.filter(id => id !== h.id) : [...dailyEntry.habits, h.id]; setDailyEntry({...dailyEntry, habits: newH}); }}><Icon size={14} color={isActive ? COLORS.white : COLORS.stone500} /><Text style={[styles.habitText, isActive && styles.habitTextActive]}>{h.name}</Text></TouchableOpacity> )})}</View>
                <TextInput style={styles.textArea} multiline placeholder={currentPrompt} placeholderTextColor={COLORS.stone300} value={dailyEntry.text} onChangeText={t => setDailyEntry({...dailyEntry, text: t})}/>
                <TouchableOpacity style={styles.mainButton} onPress={handleSaveEntry}><Send size={20} color="white" /><Text style={styles.mainButtonText}>{editingId ? 'Aktualizuj' : 'Zapisz'}</Text></TouchableOpacity>
              </View>
              <View style={{marginTop: 20}}><Text style={styles.sectionTitle}>Tego dnia</Text>{history.filter(h => h.date === selectedDate).map((e,i) => (<View key={i} style={styles.historyItem}><Text style={{fontWeight:'bold'}}>{e.nick}</Text><Text style={{flex:1, marginLeft:10}}>{e.text}</Text></View>))}</View>
            </View>
          )}

          {view === 'history' && (
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
                                    <TouchableOpacity onPress={() => handleEditFromHistory(entry)}><Edit2 size={18} color={COLORS.stone400} /></TouchableOpacity>
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
          )}

          {view === 'settings' && (
            <View style={styles.card}>
               <Text style={styles.sectionTitle}>Ustawienia</Text>
               <View style={styles.settingRow}><Text>Synchronizacja</Text><TouchableOpacity onPress={()=>syncWithCloud(user, true)}><RefreshCw size={20} color={COLORS.stone800} className={isSyncing?'animate-spin':''}/></TouchableOpacity></View>
               
               <View style={styles.inputGroup}><Text style={styles.label}>API Endpoint</Text><TextInput style={[styles.input, {fontSize: 10}]} value={user.apiEndpoint} onChangeText={t => setUser({...user, apiEndpoint: t})} onEndEditing={() => AsyncStorage.setItem('fa_user', JSON.stringify(user))} /></View>
               <View style={styles.inputGroup}><Text style={styles.label}>API Token</Text><TextInput style={styles.input} secureTextEntry value={user.apiToken} onChangeText={t => setUser({...user, apiToken: t})} onEndEditing={() => AsyncStorage.setItem('fa_user', JSON.stringify(user))} /></View>
               
               <View style={styles.inputGroup}><Text style={styles.label}>Godzina przypomnienia</Text><TouchableOpacity onPress={()=>setShowTimePicker(true)} style={styles.input}><Text>{user.notificationTime}</Text></TouchableOpacity></View>
               {showTimePicker && (<DateTimePicker value={getNotificationDateObj()} mode="time" is24Hour={true} display="default" onChange={onTimeChange} />)}
               
               <View style={{marginTop:20, borderTopWidth:1, borderColor:COLORS.stone100, paddingTop:10}}>
                 <Text style={styles.sectionTitle}>Zarządzanie Nawykami</Text>
                 <View style={styles.addHabitForm}><Text style={styles.subLabel}>Dodaj nowy</Text>
                 <View style={styles.iconRow}><ScrollView horizontal showsHorizontalScrollIndicator={false}>{Object.keys(ICON_MAP).filter(k=>k!=='check').map(key => { const Icon = ICON_MAP[key]; return ( <TouchableOpacity key={key} onPress={() => setNewHabitIcon(key)} style={[styles.iconBtn, newHabitIcon === key && styles.iconBtnActive]}><Icon size={16} color={newHabitIcon === key ? COLORS.white : COLORS.stone400} /></TouchableOpacity> ) })}</ScrollView></View>
                 <TextInput style={[styles.input, {marginBottom:10}]} placeholder="Nazwa nawyku" value={newHabitName} onChangeText={setNewHabitName} />
                 <View style={styles.settingRow}><Text style={styles.smallLabel}>Obowiązkowy?</Text><TouchableOpacity onPress={() => setNewHabitMandatory(!newHabitMandatory)}><View style={[styles.toggle, newHabitMandatory && styles.toggleActive]}><View style={[styles.toggleKnob, newHabitMandatory && styles.toggleKnobActive]}/></View></TouchableOpacity></View>
                 <View style={{marginBottom: 10}}><Text style={styles.smallLabel}>Dni:</Text><View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 5}}>{DAYS_MAP.map((d, i) => ( <TouchableOpacity key={i} onPress={() => toggleNewHabitDay(i)} style={[styles.dayBtn, newHabitFrequency.includes(i) && styles.dayBtnActive]}><Text style={[styles.dayBtnText, newHabitFrequency.includes(i) && styles.dayBtnTextActive]}>{d}</Text></TouchableOpacity> ))}</View></View>
                 <TouchableOpacity style={styles.mainButton} onPress={handleAddHabit}><Text style={styles.mainButtonText}>Dodaj</Text></TouchableOpacity></View>
                 {userHabits.map(h => (<View key={h.id} style={styles.habitRow}><Text style={{fontWeight:'bold', color:COLORS.stone600}}>{h.name}</Text><TouchableOpacity onPress={()=>handleDeleteHabit(h.id)}><Trash2 size={16} color={COLORS.stone300}/></TouchableOpacity></View>))}
               </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setView('daily')}><BookHeart size={24} color={view==='daily'?COLORS.stone800:COLORS.stone400}/><Text style={[styles.navText, view==='daily'&&styles.navTextActive]}>Dziś</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setView('history')}><Users size={24} color={view==='history'?COLORS.stone800:COLORS.stone400}/><Text style={[styles.navText, view==='history'&&styles.navTextActive]}>Historia</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setView('settings')}><Settings size={24} color={view==='settings'?COLORS.stone800:COLORS.stone400}/><Text style={[styles.navText, view==='settings'&&styles.navTextActive]}>Opcje</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bg },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.stone800, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.stone400, fontWeight: '700' },
  iconBox: { backgroundColor: COLORS.stone200, padding: 6, borderRadius: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.stone200, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: COLORS.stone600 },
  scrollContent: { flex: 1, paddingHorizontal: 20 },
  dateStrip: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 4, borderRadius: 16, marginBottom: 10 },
  dateBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  dateBtnActive: { backgroundColor: COLORS.stone800, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  dateBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.stone500 },
  dateBtnTextActive: { color: COLORS.white },
  currentDateLabel: { textAlign: 'center', fontSize: 11, fontWeight: '800', color: COLORS.stone400, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 20 },
  moodValue: { fontSize: 24, fontWeight: '800', marginVertical: 10 },
  sliderContainer: { width: '100%', height: 40, justifyContent: 'center' },
  sliderTrack: { height: 8, backgroundColor: COLORS.stone200, borderRadius: 4, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: COLORS.stone700 },
  sliderTouchArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sliderMarkers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sliderMarkerText: { fontSize: 10, color: COLORS.stone400, fontWeight: 'bold' },
  habitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  habitChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.stone100, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  habitChipActive: { backgroundColor: COLORS.stone800, borderColor: COLORS.stone800 },
  habitChipMandatory: { borderColor: COLORS.rose400 },
  habitText: { fontSize: 11, fontWeight: '700', color: COLORS.stone500 },
  habitTextActive: { color: COLORS.white },
  textArea: { backgroundColor: COLORS.stone50, borderRadius: 16, padding: 16, height: 140, textAlignVertical: 'top', fontSize: 14, color: COLORS.stone800, borderWidth: 1, borderColor: COLORS.stone100 },
  mainButton: { backgroundColor: COLORS.stone800, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderRadius: 16, marginTop: 16, shadowColor: COLORS.stone800, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  mainButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  navBar: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: COLORS.stone900, borderRadius: 24, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, shadowColor: "#000", shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  navBtn: { alignItems: 'center', gap: 4 },
  navText: { fontSize: 10, color: COLORS.stone400, fontWeight: '600' },
  navTextActive: { color: COLORS.white },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: COLORS.stone400, marginBottom: 12, letterSpacing: 1 },
  historyItem: { backgroundColor: COLORS.white, padding: 16, borderRadius: 16, marginBottom: 10, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: COLORS.stone100 },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.amber100, justifyContent: 'center', alignItems: 'center' },
  avatarTextSmall: { fontSize: 12, fontWeight: 'bold', color: COLORS.amber700 },
  historyNick: { fontWeight: '800', fontSize: 14, color: COLORS.stone800 },
  moodBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  moodBadgeText: { fontSize: 10, fontWeight: '800' },
  historyText: { marginTop: 6, fontSize: 13, color: COLORS.stone600, lineHeight: 18 },
  bigTitle: { fontSize: 28, fontWeight: '800', color: COLORS.stone800, marginBottom: 20 },
  historyCard: { padding: 16, borderRadius: 20, backgroundColor: COLORS.stone50, marginBottom: 12, borderWidth: 1, borderColor: 'transparent' },
  historyCardMe: { backgroundColor: COLORS.white, borderColor: COLORS.stone200 },
  historyDate: { fontSize: 12, fontWeight: '700', color: COLORS.stone400, textTransform: 'uppercase', marginTop: 8 },
  habitBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.emerald50, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.emerald400 },
  habitBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.emerald600 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.stone500, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: COLORS.stone50, borderWidth: 1, borderColor: COLORS.stone200, padding: 12, borderRadius: 12, fontSize: 14, color: COLORS.stone800 },
  habitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.stone100 },
  addBtn: { backgroundColor: COLORS.stone800, width: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  logoContainer: { marginBottom: 20, width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.stone100, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.stone800, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.stone500, marginBottom: 30 },
  form: { width: '100%', gap: 12 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.stone800, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontStyle: 'italic', color: COLORS.stone400, marginLeft: 10 },
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
  calendarOverlay: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 10, zIndex: 100 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' }
});