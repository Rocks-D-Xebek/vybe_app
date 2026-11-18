// VYBE Premium through Google Play Billing, handled by RevenueCat.
// The public Android SDK key goes in app.json → expo.extra.revenuecatAndroidKey (safe to ship).
// The server learns about purchases from the webhook (backend/revenuecat-webhook.php) and sets profiles.is_premium.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';

const key = ((Constants.expoConfig?.extra ?? {}) as { revenuecatAndroidKey?: string }).revenuecatAndroidKey ?? '';
export const ENTITLEMENT = 'premium';
export const billingReady = Platform.OS === 'android' && key.startsWith('goog_');

let configured = false;
export function setupPurchases(userId?: string) {
  if (!billingReady) return;
  try {
    if (!configured) { Purchases.configure({ apiKey: key, appUserID: userId ?? null }); configured = true; }
    else if (userId) Purchases.logIn(userId).catch(() => {});
  } catch {}
}

export const hasPremium = (info?: CustomerInfo | null) => Boolean(info?.entitlements.active[ENTITLEMENT]);

export async function getPackages(): Promise<PurchasesPackage[]> {
  if (!billingReady) return [];
  const o = await Purchases.getOfferings();
  return o.current?.availablePackages ?? [];
}

export async function buy(pkg: PurchasesPackage) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return hasPremium(customerInfo);
}

export async function restore() {
  if (!billingReady) return false;
  return hasPremium(await Purchases.restorePurchases());
}

export async function logOutPurchases() {
  if (billingReady && configured) await Purchases.logOut().catch(() => {});
}
