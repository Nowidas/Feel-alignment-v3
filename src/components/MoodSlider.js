import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { COLORS } from '../constants/theme';

const MoodSlider = ({ value, onChange }) => {
  return (
    <View style={styles.sliderContainer}>
      <Slider
        style={{width: '100%', height: 40}}
        minimumValue={1}
        maximumValue={5}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={COLORS.stone800}
        maximumTrackTintColor={COLORS.stone200}
        thumbTintColor={COLORS.stone800}
      />
      <View style={styles.sliderMarkers}>
        {[1, 3, 5].map(n => (
          <Text key={n} style={styles.sliderMarkerText}>{n}</Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sliderContainer: { width: '100%', height: 40, justifyContent: 'center' },
  sliderMarkers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  sliderMarkerText: { fontSize: 10, color: COLORS.stone400, fontWeight: 'bold' },
});

export default MoodSlider;
