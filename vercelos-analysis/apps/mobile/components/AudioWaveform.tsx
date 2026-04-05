import { View } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";

interface AudioWaveformProps {
  isActive: boolean;
  barCount?: number;
}

export function AudioWaveform({
  isActive,
  barCount = 40,
}: AudioWaveformProps) {
  return (
    <View className="flex-row items-center justify-center h-16 gap-1">
      {Array.from({ length: barCount }).map((_, index) => (
        <WaveformBar
          key={index}
          index={index}
          isActive={isActive}
          totalBars={barCount}
        />
      ))}
    </View>
  );
}

interface WaveformBarProps {
  index: number;
  isActive: boolean;
  totalBars: number;
}

function WaveformBar({ index, isActive, totalBars }: WaveformBarProps) {
  const height = useSharedValue(8);

  // Calculate base height based on position (bell curve effect)
  const center = totalBars / 2;
  const distanceFromCenter = Math.abs(index - center);
  const maxDistanceRatio = distanceFromCenter / center;
  const baseMultiplier = 1 - maxDistanceRatio * 0.7;

  useEffect(() => {
    if (isActive) {
      // Random delay for each bar to create wave effect
      const delay = (index % 8) * 50;
      const minHeight = 8;
      const maxHeight = 48 * baseMultiplier;

      height.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(maxHeight, {
              duration: 300 + Math.random() * 200,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(minHeight + Math.random() * 16, {
              duration: 300 + Math.random() * 200,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          true
        )
      );
    } else {
      height.value = withTiming(8, { duration: 300 });
    }
  }, [isActive, baseMultiplier, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[animatedStyle]}
      className="w-1 rounded-full bg-primary"
    />
  );
}
