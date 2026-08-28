'use client';

import liff from '@line/liff';

export interface LiffUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  email?: string;
}

let isInitialized = false;

export async function initLiff(liffId?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isInitialized) return true;

  const targetLiffId = liffId || process.env.NEXT_PUBLIC_LIFF_ID;
  if (!targetLiffId) {
    console.warn('LINE LIFF ID is not configured.');
    return false;
  }

  try {
    await liff.init({ liffId: targetLiffId });
    isInitialized = true;
    return true;
  } catch (err) {
    console.error('Failed to initialize LIFF:', err);
    return false;
  }
}

export function isLiffLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return liff.isLoggedIn();
  } catch {
    return false;
  }
}

export function loginLiff(redirectUri?: string) {
  if (typeof window === 'undefined') return;
  try {
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: redirectUri || window.location.href });
    }
  } catch (err) {
    console.error('LIFF login failed:', err);
  }
}

export function logoutLiff() {
  if (typeof window === 'undefined') return;
  try {
    if (liff.isLoggedIn()) {
      liff.logout();
      window.location.reload();
    }
  } catch (err) {
    console.error('LIFF logout failed:', err);
  }
}

export async function getLiffProfile(): Promise<LiffUserProfile | null> {
  if (typeof window === 'undefined') return null;
  try {
    if (!liff.isLoggedIn()) {
      return null;
    }
    const profile = await liff.getProfile();
    const idToken = liff.getDecodedIDToken();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
      email: idToken?.email,
    };
  } catch (err) {
    console.error('Failed to get LIFF profile:', err);
    return null;
  }
}

export function closeLiffWindow() {
  if (typeof window === 'undefined') return;
  try {
    if (liff.isInClient()) {
      liff.closeWindow();
    }
  } catch (err) {
    console.error('Failed to close LIFF window:', err);
  }
}
