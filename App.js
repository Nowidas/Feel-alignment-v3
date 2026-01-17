import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, 
  Alert, StatusBar, StyleSheet, Platform, ActivityIndicator,
  KeyboardAvoidingView, Keyboard, Image
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications'; 
import { 
  BookHeart, Users, Settings, BarChart2
} from 'lucide-react-native';

// Import Screens
import OnboardingScreen from './src/screens/OnboardingScreen';
import DailyScreen from './src/screens/DailyScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import Toast from './src/components/Toast';

// Import Constants & Utils
import { COLORS, JOURNAL_PROMPTS } from './src/constants/theme';
import { getInitialDate, getLocalYYYYMMDD } from './src/utils/helpers';

// --- NOTIFICATION CONFIG ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Create a channel for Android (required for notifications to work properly)
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('daily-reminder', {
    name: 'Daily Reminder',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
}

export default function App() {
  // --- STATE ---
  const [view, setView] = useState('loading'); 
  const [user, setUser] = useState({ 
    nick: '', partnerNick: '', notificationTime: '23:00', apiEndpoint: '', apiToken: '', dayCutoffHour: 4,
    profilePic: ''
  });
  
  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [dailyEntry, setDailyEntry] = useState({ mood: 3, text: '', habits: [] }); 
  const [editingId, setEditingId] = useState(null);
  const [history, setHistory] = useState([]);
  const [userHabits, setUserHabits] = useState([]);
  const [toast, setToast] = useState(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() });
  };

  const currentPrompt = useMemo(() => {
    return JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)];
  }, [selectedDate]);

  // --- INIT ---r
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
        const defaults = [];
        setUserHabits(defaults);
        await AsyncStorage.setItem('fa_habits', JSON.stringify(defaults));
      }

      if (savedHistory) setHistory(JSON.parse(savedHistory));

      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.dayCutoffHour === undefined) u.dayCutoffHour = 4;
        setUser(u);
        setSelectedDate(getInitialDate(u.dayCutoffHour));
        setView('daily');
        if (u.apiEndpoint) syncWithCloud(u, false); 
        scheduleNotification(u.notificationTime || '23:00', false);
      } else {
        setView('onboarding');
      }
    } catch (e) {
      console.error("Load error", e);
      setView('onboarding');
    }
  };

  // --- NOTIFICATIONS LOGIC ---
  const scheduleNotification = async (timeStr, isUserAction = true) => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        if (isUserAction) Alert.alert("Brak uprawnień", "Powiadomienia nie są włączone w ustawieniach systemu.");
        return;
      }

      const [hours, minutes] = timeStr.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return;

      // If user changed time OR it's a new schedule
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Schedule notification with daily trigger
      // Using direct object format for best compatibility across Expo versions
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "FeelingAlignment 📝",
          body: "Plss tell me about your day 👉👈",
          sound: true,
          ...(Platform.OS === 'android' && { channelId: 'daily-reminder' }),
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      // Save the scheduled time
      await AsyncStorage.setItem('lastScheduledNotificationTime', timeStr);

      if (isUserAction) {
        if (Platform.OS === 'ios') {
          // On iOS, sometimes notifications don't show up in development if not careful
          Alert.alert("Ustawiono", `Przypomnienie o ${timeStr}. Upewnij się, że masz włączone powiadomienia w ustawieniach.`);
        } else {
          Alert.alert("Ustawiono", `Przypomnienie o ${timeStr}`);
        }
      }
    } catch (error) {
      console.log("Notification Error:", error);
      if (isUserAction) Alert.alert("Info", "Wystąpił problem przy ustawianiu powiadomienia.");
    }
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
        if (showAlert) showToast("Synchronizacja zakończona");
      }
    } catch (e) {
      if (showAlert) Alert.alert("Błąd Sync", e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const pushEntry = async (entry, action = 'save') => {
    if (!user.apiEndpoint) return;
    try {
      await fetch(user.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, 
        body: JSON.stringify({ ...entry, token: user.apiToken, action })
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
      ? history.map(h => h.id === editingId ? { ...newEntry, reactions: h.reactions || {} } : h)
      : [newEntry, ...history];
    
    newHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    setHistory(newHistory);
    await AsyncStorage.setItem('fa_history', JSON.stringify(newHistory));
    
    pushEntry(newEntry, 'save'); 
    
    setDailyEntry({ mood: 3, text: '', habits: [] });
    setEditingId(null);
    showToast("Twój dzień został zapisany.");
  };

  const toggleReaction = async (entryId, emoji) => {
    const updatedHistory = history.map(entry => {
      if (entry.id === entryId) {
        const reactions = { ...(entry.reactions || {}) };
        const myNick = user.nick;
        if (!reactions[emoji]) reactions[emoji] = [];

        if (reactions[emoji].includes(myNick)) {
          reactions[emoji] = reactions[emoji].filter(n => n !== myNick);
        } else {
          reactions[emoji] = [...reactions[emoji], myNick];
        }

        const newEntry = { ...entry, reactions };
        pushEntry(newEntry, 'save'); // Sync with cloud
        return newEntry;
      }
      return entry;
    });

    setHistory(updatedHistory);
    await AsyncStorage.setItem('fa_history', JSON.stringify(updatedHistory));
  };

  const deleteEntry = async (id) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    await AsyncStorage.setItem('fa_history', JSON.stringify(newHistory));
    
    pushEntry({ id }, 'delete');

    if (editingId === id) {
      setEditingId(null);
      setDailyEntry({ mood: 3, text: '', habits: [] });
    }
  };

  const handleEditFromHistory = (entry) => {
    setSelectedDate(entry.date);
    const habitIds = (entry.habits || []).map(h => h.id || h);
    setDailyEntry({ mood: entry.mood, text: entry.text, habits: habitIds });
    setEditingId(entry.id);
    setView('daily');
  };

  // --- RENDER ---
  
  if (view === 'loading') {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={COLORS.stone800} />
      </View>
    );
  }

  if (view === 'onboarding') {
    return (
      <OnboardingScreen 
        user={user} 
        setUser={setUser} 
        onComplete={() => {
          setView('daily');
          scheduleNotification(user.notificationTime || '23:00', false);
        }} 
      />
    );
  }

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      <View style={styles.header}>
        <View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <BookHeart size={20} color={COLORS.stone800}/>
            <Text style={styles.headerTitle}>FeelingAlignment</Text>
          </View>
          <Text style={styles.headerSubtitle}>Dziennik Uczuć</Text>
        </View>
        <View style={styles.avatar}>
          {user.profilePic ? (
            <Image source={{ uri: user.profilePic }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{user.nick ? user.nick[0] : '?'}</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "height" : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.scrollContent} 
          contentContainerStyle={{paddingBottom: 100}} 
          ref={scrollViewRef}
        >
          {view === 'daily' && (
            <DailyScreen 
              user={user}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              dailyEntry={dailyEntry}
              setDailyEntry={setDailyEntry}
              userHabits={userHabits}
              history={history}
              onSave={handleSaveEntry}
              editingId={editingId}
              currentPrompt={currentPrompt}
            />
          )}

          {view === 'history' && (
            <HistoryScreen 
              history={history}
              user={user}
              userHabits={userHabits}
              onEdit={handleEditFromHistory}
              onDelete={deleteEntry}
              onToggleReaction={toggleReaction}
            />
          )}

          {view === 'stats' && (
            <StatsScreen 
              history={history}
              user={user}
              userHabits={userHabits}
            />
          )}

          {view === 'settings' && (
            <SettingsScreen 
              user={user}
              setUser={setUser}
              userHabits={userHabits}
              setUserHabits={setUserHabits}
              syncWithCloud={syncWithCloud}
              isSyncing={isSyncing}
              scheduleNotification={scheduleNotification}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {!isKeyboardVisible && (
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setView('daily')}>
          <BookHeart size={24} color={view==='daily'?COLORS.white:COLORS.stone400}/>
          <Text style={[styles.navText, view==='daily'&&styles.navTextActive]}>Dziś</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setView('history')}>
          <Users size={24} color={view==='history'?COLORS.white:COLORS.stone400}/>
          <Text style={[styles.navText, view==='history'&&styles.navTextActive]}>Historia</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setView('stats')}>
          <BarChart2 size={24} color={view==='stats'?COLORS.white:COLORS.stone400}/>
          <Text style={[styles.navText, view==='stats'&&styles.navTextActive]}>Statystyki</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setView('settings')}>
          <Settings size={24} color={view==='settings'?COLORS.white:COLORS.stone400}/>
          <Text style={[styles.navText, view==='settings'&&styles.navTextActive]}>Opcje</Text>
        </TouchableOpacity>
      </View>
      )}
      <Toast message={toast?.msg} type={toast?.type} onHide={() => setToast(null)} />
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingVertical: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bg },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.stone800, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.stone400, fontWeight: '700' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.stone200, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, overflow: 'hidden' },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: COLORS.stone600 },
  avatarImg: { width: '100%', height: '100%' },
  scrollContent: { flex: 1, paddingHorizontal: 20 },
  navBar: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: COLORS.stone900, borderRadius: 24, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, shadowColor: "#000", shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  navBtn: { alignItems: 'center', gap: 4, padding: 10, minWidth: 60 },
  navText: { fontSize: 10, color: COLORS.stone400, fontWeight: '600' },
  navTextActive: { color: COLORS.white },
});
