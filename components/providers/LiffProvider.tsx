'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initLiff, getLiffProfile, isLiffLoggedIn, loginLiff, logoutLiff, LiffUserProfile } from '@/lib/liff';
import { Customer } from '@/types/database';

interface LiffContextType {
  isInitialized: boolean;
  isLoggedIn: boolean;
  profile: LiffUserProfile | null;
  customer: Customer | null;
  customerId: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setManualCustomer: (cust: Customer) => void;
}

const LiffContext = createContext<LiffContextType>({
  isInitialized: false,
  isLoggedIn: false,
  profile: null,
  customer: null,
  customerId: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refreshProfile: async () => {},
  setManualCustomer: () => {},
});

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<LiffUserProfile | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync profile with database
  const syncWithDatabase = async (userProfile: LiffUserProfile) => {
    try {
      const res = await fetch('/api/auth/liff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: userProfile.userId,
          displayName: userProfile.displayName,
          pictureUrl: userProfile.pictureUrl,
          statusMessage: userProfile.statusMessage,
          email: userProfile.email,
        }),
      });
      const data = await res.json();
      if (data.success && data.customer) {
        setCustomer(data.customer);
        setCustomerId(data.customerId);
      }
    } catch (err) {
      console.error('Failed to sync LIFF profile with backend:', err);
    }
  };

  const init = async () => {
    setIsLoading(true);
    try {
      const liffReady = await initLiff();
      setIsInitialized(liffReady);

      if (liffReady && isLiffLoggedIn()) {
        setIsLoggedIn(true);
        const userProfile = await getLiffProfile();
        setProfile(userProfile);
        if (userProfile) {
          await syncWithDatabase(userProfile);
        }
      } else {
        // Check saved browser session for desktop testing
        const savedCustomerStr = typeof window !== 'undefined' ? localStorage.getItem('resort_active_customer') : null;
        if (savedCustomerStr) {
          try {
            const savedCust = JSON.parse(savedCustomerStr);
            setCustomer(savedCust);
            setCustomerId(savedCust.id);
            setProfile({
              userId: `web-${savedCust.id}`,
              displayName: savedCust.full_name,
              pictureUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              email: savedCust.email,
            });
          } catch {
            // Ignore parse error
          }
        }
      }
    } catch (err) {
      console.error('LIFF Provider Init Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const refreshProfile = async () => {
    if (profile) {
      await syncWithDatabase(profile);
    }
  };

  const setManualCustomer = (cust: Customer) => {
    setCustomer(cust);
    setCustomerId(cust.id);
    setProfile({
      userId: `web-${cust.id}`,
      displayName: cust.full_name,
      pictureUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      email: cust.email,
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('resort_active_customer', JSON.stringify(cust));
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('resort_active_customer');
    }
    setCustomer(null);
    setCustomerId(null);
    setProfile(null);
    setIsLoggedIn(false);
    logoutLiff();
  };

  return (
    <LiffContext.Provider
      value={{
        isInitialized,
        isLoggedIn,
        profile,
        customer,
        customerId,
        isLoading,
        login: loginLiff,
        logout: handleLogout,
        refreshProfile,
        setManualCustomer,
      }}
    >
      {children}
    </LiffContext.Provider>
  );
}

export function useLiff() {
  return useContext(LiffContext);
}
