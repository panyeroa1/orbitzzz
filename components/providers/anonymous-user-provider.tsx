"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export function AnonymousUserProvider() {
  useEffect(() => {
    const initAnonymousUser = async () => {
      const ANON_USER_KEY = "eburon_anon_user_id";
      let userId = localStorage.getItem(ANON_USER_KEY);

      // Check if user already exists
      if (userId) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("id", userId)
          .single();

        if (existingUser) {
          console.log("[Anonymous User] Existing user found:", userId);
          return; // User already exists
        }
      }

      // Generate new anonymous user
      userId =
        crypto.randomUUID?.() || `anon-${Math.random().toString(36).slice(2)}`;

      try {
        const { error } = await supabase.from("users").insert({
          id: userId,
          email: `anonymous-${userId.slice(0, 8)}@eburon.local`,
          first_name: "Anonymous",
          last_name: "User",
          image_url: null,
        });

        if (error) {
          console.error("[Anonymous User] Creation error:", error);
          return;
        }

        // Save to localStorage
        localStorage.setItem(ANON_USER_KEY, userId);
        console.log("[Anonymous User] Created:", userId);
      } catch (err) {
        console.error("[Anonymous User] Exception:", err);
      }
    };

    initAnonymousUser();
  }, []);

  return null; // This is just a provider, no UI
}
