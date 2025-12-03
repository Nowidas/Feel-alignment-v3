import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

const OnboardingScreen = ({ user, setUser, onComplete }) => {
  const handleStart = async () => {
    if (user.nick && user.apiEndpoint) {
      await AsyncStorage.setItem('fa_user', JSON.stringify(user));
      onComplete();
    } else {
      Alert.alert("Wymagany Nick i URL");
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <View style={styles.centerContent}>
          <View style={styles.logoContainer}><ShieldCheck size={40} color={COLORS.stone700} /></View>
          <Text style={styles.title}>FeelingAlignment</Text>
          <View style={styles.form}>
            <TextInput style={styles.input} placeholder="Twój Nick" onChangeText={t => setUser({...user, nick: t})}/>
            <TextInput style={styles.input} placeholder="Nick Partnera" onChangeText={t => setUser({...user, partnerNick: t})}/>
            <TextInput style={styles.input} placeholder="API Endpoint URL" onChangeText={t => setUser({...user, apiEndpoint: t})} autoCapitalize="none"/>
            <TextInput style={styles.input} placeholder="Secret Token" onChangeText={t => setUser({...user, apiToken: t})} secureTextEntry/>
            <TouchableOpacity style={styles.mainButton} onPress={handleStart}>
              <Text style={styles.mainButtonText}>Rozpocznij</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  logoContainer: { marginBottom: 20, width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.stone100, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.stone800, marginBottom: 8 },
  form: { width: '100%', gap: 12 },
  input: { backgroundColor: COLORS.stone50, borderWidth: 1, borderColor: COLORS.stone200, padding: 12, borderRadius: 12, fontSize: 14, color: COLORS.stone800 },
  mainButton: { backgroundColor: COLORS.stone800, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderRadius: 16, marginTop: 16 },
  mainButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});

export default OnboardingScreen;
