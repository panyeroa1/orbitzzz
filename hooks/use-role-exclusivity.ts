"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type Role = "broadcaster" | "translator" | null;

interface UseRoleExclusivityReturn {
  activeRole: Role;
  canUseBroadcaster: boolean;
  canUseTranslator: boolean;
  activateBroadcaster: () => Promise<boolean>;
  activateTranslator: () => Promise<boolean>;
  deactivateRole: () => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
}

const ROLE_STORAGE_KEY = "eburon_active_role";
const CLIENT_ID_KEY = "eburon_anon_client_id";

function getClientId(): string {
  if (typeof window === "undefined") return "";
  
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() || `client-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

/**
 * Hook to manage broadcaster/translator role exclusivity.
 * When Broadcaster is active, Translator is disabled on the same device/account.
 */
export function useRoleExclusivity(): UseRoleExclusivityReturn {
  const [activeRole, setActiveRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load initial role from localStorage
  useEffect(() => {
    const storedRole = localStorage.getItem(ROLE_STORAGE_KEY) as Role;
    if (storedRole) {
      setActiveRole(storedRole);
    }
    setIsLoading(false);
  }, []);

  // Persist role to localStorage and Supabase
  const persistRole = useCallback(async (role: Role) => {
    const clientId = getClientId();
    
    // Save to localStorage for device persistence
    if (role) {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
    
    // Save to Supabase for account-level persistence
    try {
      if (role) {
        // Check if row exists
        const { data: existing } = await supabase
          .from("eburon_roles")
          .select("id")
          .eq("client_id", clientId)
          .limit(1)
          .single();
        
        if (existing) {
          // Update existing row
          await supabase
            .from("eburon_roles")
            .update({ active_role: role, updated_at: new Date().toISOString() })
            .eq("client_id", clientId);
        } else {
          // Insert new row
          await supabase
            .from("eburon_roles")
            .insert({ 
              client_id: clientId, 
              active_role: role,
              updated_at: new Date().toISOString()
            });
        }
      } else {
        // Clear role in Supabase
        await supabase
          .from("eburon_roles")
          .update({ active_role: null, updated_at: new Date().toISOString() })
          .eq("client_id", clientId);
      }
    } catch (err) {
      console.warn("[RoleExclusivity] Supabase persistence failed (table may not exist):", err);
      // Continue without Supabase - localStorage still works for device-level
    }
  }, []);

  // Activate broadcaster role
  const activateBroadcaster = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Check if translator is already active
      if (activeRole === "translator") {
        setErrorMessage("Please stop the Translator first before starting Broadcaster.");
        setIsLoading(false);
        return false;
      }
      
      setActiveRole("broadcaster");
      await persistRole("broadcaster");
      setIsLoading(false);
      return true;
    } catch (err) {
      setErrorMessage("Failed to activate Broadcaster.");
      setIsLoading(false);
      return false;
    }
  }, [activeRole, persistRole]);

  // Activate translator role
  const activateTranslator = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Check if broadcaster is already active
      if (activeRole === "broadcaster") {
        setErrorMessage("Broadcaster is active on this device. Please use a different device or account for translation.");
        setIsLoading(false);
        return false;
      }
      
      setActiveRole("translator");
      await persistRole("translator");
      setIsLoading(false);
      return true;
    } catch (err) {
      setErrorMessage("Failed to activate Translator.");
      setIsLoading(false);
      return false;
    }
  }, [activeRole, persistRole]);

  // Deactivate current role
  const deactivateRole = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      setActiveRole(null);
      await persistRole(null);
    } catch (err) {
      console.error("[RoleExclusivity] Failed to deactivate role:", err);
    } finally {
      setIsLoading(false);
    }
  }, [persistRole]);

  return {
    activeRole,
    canUseBroadcaster: activeRole !== "translator",
    canUseTranslator: activeRole !== "broadcaster",
    activateBroadcaster,
    activateTranslator,
    deactivateRole,
    isLoading,
    errorMessage,
  };
}
