"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from "firebase/auth";
import { 
  ref, 
  onValue, 
  set, 
  update, 
  remove, 
  get, 
  onDisconnect 
} from "firebase/database";
import { auth, rtdb } from "@/lib/firebase";
import { DEFAULT_AVATAR_COLOR, DEFAULT_AVATAR_EMOJI } from "@/lib/avatar";

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  avatarColor: string;
  avatarEmoji: string;
  partnerCode: string;
  status: "online" | "offline";
  lastActive?: number;
};

// Minimal public view of a user, resolved from a shared partner code. This is
// all the data stored in the public `partnerCodes/{code}` entry, so resolving a
// code never reads the owner's private `users/{uid}` profile node.
export type PartnerPreview = {
  uid: string;
  displayName: string;
  avatarColor: string;
  avatarEmoji: string;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string, 
    password: string, 
    displayName: string, 
    avatarColor: string, 
    avatarEmoji: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Omit<UserProfile, "uid" | "email" | "partnerCode" | "status">>) => Promise<void>;
  resolvePartnerCode: (code: string) => Promise<PartnerPreview | null>;
  sendPartnerRequest: (partnerUid: string) => Promise<void>;
  acceptPartnerRequest: (partnerUid: string) => Promise<void>;
  declinePartnerRequest: (partnerUid: string) => Promise<void>;
  removePartner: (partnerUid: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to generate a unique 6-character partner code
  const generatePartnerCode = async (): Promise<string> => {
    let attempts = 0;
    while (attempts < 10) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      // Verify uniqueness in RTDB
      const codeRef = ref(rtdb, `partnerCodes/${code}`);
      const snapshot = await get(codeRef);
      if (!snapshot.exists()) {
        return code;
      }
      attempts++;
    }
    // Fallback if loop fails
    return `TC-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  useEffect(() => {
    // Tears down the profile/presence listeners for the previously signed-in
    // user. onAuthStateChanged ignores its callback's return value, so we must
    // track this ourselves and call it on the next auth change and on unmount —
    // otherwise listeners on the old uid leak (and throw permission-denied
    // against security rules once the user signs out).
    let cleanupUserListeners: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      cleanupUserListeners?.();
      cleanupUserListeners = undefined;

      setUser(firebaseUser);

      if (firebaseUser) {
        const profileRef = ref(rtdb, `users/${firebaseUser.uid}`);

        // Listen to the user's profile in RTDB
        const unsubscribeProfile = onValue(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile({ uid: firebaseUser.uid, email: firebaseUser.email || "", ...snapshot.val() });
          } else {
            setProfile(null);
          }
          setLoading(false);
        });

        // Set up presence tracking
        const connectedRef = ref(rtdb, ".info/connected");
        const statusRef = ref(rtdb, `users/${firebaseUser.uid}/status`);
        const lastActiveRef = ref(rtdb, `users/${firebaseUser.uid}/lastActive`);

        const unsubscribePresence = onValue(connectedRef, (snapshot) => {
          if (snapshot.val() === true) {
            // Write online status
            set(statusRef, "online");

            // Set disconnect operation to turn offline
            onDisconnect(statusRef).set("offline");
            onDisconnect(lastActiveRef).set(Date.now());
          }
        });

        cleanupUserListeners = () => {
          unsubscribeProfile();
          unsubscribePresence();
        };
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      cleanupUserListeners?.();
      unsubscribeAuth();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    displayName: string, 
    avatarColor: string, 
    avatarEmoji: string
  ) => {
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = credential.user;
      
      const partnerCode = await generatePartnerCode();

      // Write public profile to RTDB
      const profileData = {
        displayName: displayName || "Anonymous User",
        avatarColor: avatarColor || DEFAULT_AVATAR_COLOR,
        avatarEmoji: avatarEmoji || DEFAULT_AVATAR_EMOJI,
        partnerCode,
        status: "online" as const,
        createdAt: Date.now()
      };

      // Set user record
      await set(ref(rtdb, `users/${newUser.uid}`), profileData);

      // Set reverse partner-code map. Store the display fields here (not just the
      // uid) so resolving a shared code never has to read the owner's private
      // users/{uid} node — that stays readable only by the owner and partners.
      await set(ref(rtdb, `partnerCodes/${partnerCode}`), {
        uid: newUser.uid,
        displayName: profileData.displayName,
        avatarColor: profileData.avatarColor,
        avatarEmoji: profileData.avatarEmoji,
      });

    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const signOut = async () => {
    setLoading(true);
    if (user) {
      // Clean up presence to offline manually before signing out
      try {
        await set(ref(rtdb, `users/${user.uid}/status`), "offline");
        await set(ref(rtdb, `users/${user.uid}/lastActive`), Date.now());
      } catch {}
    }
    await firebaseSignOut(auth);
    setProfile(null);
    setUser(null);
    setLoading(false);
  };

  const updateProfile = async (updates: Partial<Omit<UserProfile, "uid" | "email" | "partnerCode" | "status">>) => {
    if (!user) throw new Error("User not authenticated");
    await update(ref(rtdb, `users/${user.uid}`), updates);

    // Mirror display changes into the public code entry so a resolved code never
    // shows a stale name/avatar.
    if (profile?.partnerCode) {
      const mirror: Record<string, unknown> = {};
      if (updates.displayName !== undefined) mirror.displayName = updates.displayName;
      if (updates.avatarColor !== undefined) mirror.avatarColor = updates.avatarColor;
      if (updates.avatarEmoji !== undefined) mirror.avatarEmoji = updates.avatarEmoji;
      if (Object.keys(mirror).length > 0) {
        await update(ref(rtdb, `partnerCodes/${profile.partnerCode}`), mirror);
      }
    }
  };

  const resolvePartnerCode = async (code: string): Promise<PartnerPreview | null> => {
    const cleanCode = code.trim().toUpperCase();
    const codeSnap = await get(ref(rtdb, `partnerCodes/${cleanCode}`));

    if (!codeSnap.exists()) return null;

    // Read the display fields straight from the shared code entry — no access to
    // the owner's private users/{uid} node is needed or attempted.
    const data = codeSnap.val();
    if (!data?.uid) return null;

    return {
      uid: data.uid,
      displayName: data.displayName || "Partner",
      avatarColor: data.avatarColor || DEFAULT_AVATAR_COLOR,
      avatarEmoji: data.avatarEmoji || DEFAULT_AVATAR_EMOJI,
    };
  };

  const sendPartnerRequest = async (partnerUid: string) => {
    if (!user || !profile) throw new Error("User not authenticated");
    if (user.uid === partnerUid) throw new Error("You cannot add yourself");

    const requestRef = ref(rtdb, `requests/${partnerUid}/${user.uid}`);
    await set(requestRef, {
      uid: user.uid,
      displayName: profile.displayName,
      avatarColor: profile.avatarColor,
      avatarEmoji: profile.avatarEmoji,
      timestamp: Date.now()
    });
  };

  const acceptPartnerRequest = async (partnerUid: string) => {
    if (!user) throw new Error("User not authenticated");

    // Add to mutual partner lists
    const updates: { [key: string]: any } = {};
    updates[`partners/${user.uid}/${partnerUid}`] = true;
    updates[`partners/${partnerUid}/${user.uid}`] = true;

    // Remove request
    updates[`requests/${user.uid}/${partnerUid}`] = null;

    await update(ref(rtdb), updates);
  };

  const declinePartnerRequest = async (partnerUid: string) => {
    if (!user) throw new Error("User not authenticated");
    const requestRef = ref(rtdb, `requests/${user.uid}/${partnerUid}`);
    await remove(requestRef);
  };

  const removePartner = async (partnerUid: string) => {
    if (!user) throw new Error("User not authenticated");
    
    const updates: { [key: string]: any } = {};
    updates[`partners/${user.uid}/${partnerUid}`] = null;
    updates[`partners/${partnerUid}/${user.uid}`] = null;

    await update(ref(rtdb), updates);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        resolvePartnerCode,
        sendPartnerRequest,
        acceptPartnerRequest,
        declinePartnerRequest,
        removePartner
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
