import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0f172a" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="settings"
          options={{
            presentation: "modal",
            headerShown: true,
            headerTitle: "Settings",
            headerStyle: { backgroundColor: "#1e293b" },
            headerTintColor: "#fff",
          }}
        />
      </Stack>
    </>
  );
}
