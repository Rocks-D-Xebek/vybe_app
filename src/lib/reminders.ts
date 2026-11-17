// Local reminders (no server needed). Rescheduled whenever the user changes their reminder settings.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Reminders } from '../store/AppStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
  }),
});

const daily = (hour: number, minute: number) =>
  ({ type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute }) as Notifications.DailyTriggerInput;

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('vybe', {
      name: 'VYBE reminders', importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function applyReminders(r: Reminders, name: string, planTitle?: string) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const jobs: Promise<string>[] = [];
  const add = (title: string, body: string, h: number, m: number) =>
    jobs.push(Notifications.scheduleNotificationAsync({
      content: { title, body, ...(Platform.OS === 'android' ? { channelId: 'vybe' } : {}) } as any,
      trigger: daily(h, m),
    }));

  if (r.water) {
    const msgs = ['Sip check 💧 Grab a glass of water', 'Hydration check! Your body will thank you 💦',
      'Water break, champ 🥤', 'Stay hydrated, stay unstoppable 💧', 'One more glass before dinner? 💧'];
    [10, 12, 15, 17, 19].forEach((h, i) => add('Hydration check', msgs[i], h, 0));
  }
  if (r.meals) {
    add("What's the breakfast scene? 🍳", `Snap it in VYBE, ${name}. Mr. Vyb does the math.`, 8, 45);
    add("What's for lunch? 🍛", 'Log it in 5 seconds, scan, type or barcode.', 13, 30);
    add("What's on the dinner menu? 🍲", "Log dinner and close today's rings 🔥", 20, 30);
  }
  if (r.plan && planTitle) {
    add('Mr. Vyb ⚡', `Morning ${name}! Next step on "${planTitle}" is waiting. Let's go.`, 7, 0);
  }
  await Promise.all(jobs);
}
