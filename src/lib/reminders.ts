// Local reminders (no server needed). Rescheduled whenever the user changes their reminder settings.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Reminders } from '../store/AppStore';
import { SLOTS } from './dates';

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
    const msg: Record<string, [string, string]> = {
      breakfast: ["What's the breakfast scene? 🍳", `Log it in VYBE, ${name}. Two taps, done.`],
      morning_snack: ['Snack attack? 🍎', 'Had something mid-morning? Add it to your morning snack.'],
      lunch: ["What's for lunch? 🍛", 'Search, snap or type it. Mr. Vyb does the math.'],
      evening_snack: ['Chai-time snack? ☕', 'Samosa, biscuits, fruit? Log your evening snack.'],
      dinner: ["What's on the dinner menu? 🍲", "Log dinner and close today's rings 🔥"],
    };
    SLOTS.forEach(s => add(msg[s.key][0], msg[s.key][1], s.remind[0], s.remind[1]));
  }
  if (r.plan && planTitle) {
    add('Mr. Vyb ⚡', `Morning ${name}! Next step on "${planTitle}" is waiting. Let's go.`, 7, 0);
  }
  await Promise.all(jobs);
}
