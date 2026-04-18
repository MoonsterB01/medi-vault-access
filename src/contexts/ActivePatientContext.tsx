import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "activePatientContext";

export interface ActivePatientInfo {
  patientId: string;
  patientName: string;
  shareableId?: string | null;
  permissions?: { view?: boolean; upload?: boolean; appointments?: boolean };
}

interface ActivePatientContextValue {
  /** Currently active linked patient, or null when viewing your own account */
  activePatient: ActivePatientInfo | null;
  /** Switch to managing a linked patient's account */
  switchToPatient: (info: ActivePatientInfo) => void;
  /** Return to viewing your own account */
  switchToOwnAccount: () => void;
  /** True when currently viewing a linked (non-own) account */
  isFamilyMode: boolean;
}

const ActivePatientContext = createContext<ActivePatientContextValue | undefined>(undefined);

/**
 * Provider that tracks which patient account the user is currently viewing.
 * Defaults to the user's own account; can be switched to a linked patient via Family Access.
 * Persists across reloads via localStorage.
 */
export function ActivePatientProvider({ children }: { children: React.ReactNode }) {
  const [activePatient, setActivePatient] = useState<ActivePatientInfo | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ActivePatientInfo;
        if (parsed?.patientId) setActivePatient(parsed);
      }
    } catch {
      // ignore corrupted state
    }
  }, []);

  const switchToPatient = useCallback((info: ActivePatientInfo) => {
    setActivePatient(info);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    } catch {
      // storage may be unavailable; ignore
    }
  }, []);

  const switchToOwnAccount = useCallback(() => {
    setActivePatient(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ActivePatientContext.Provider
      value={{
        activePatient,
        switchToPatient,
        switchToOwnAccount,
        isFamilyMode: !!activePatient,
      }}
    >
      {children}
    </ActivePatientContext.Provider>
  );
}

export function useActivePatient() {
  const ctx = useContext(ActivePatientContext);
  if (!ctx) {
    throw new Error("useActivePatient must be used within ActivePatientProvider");
  }
  return ctx;
}
