import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserProfile, SecondaryLevel } from "../types";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { supabase } from "../lib/supabaseClient";
import { saveUserProfileToSupabase, updateStudentLevelSupabase, signOutSupabase } from "../data/supabaseStorage";
import { syncUserToFirestore } from "../lib/firebaseClient";

export interface ProfileContextType {
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  refreshProfile: (forcedUid?: string) => Promise<UserProfile | null>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile | null | void>;
  updateClass: (newClass: SecondaryLevel) => Promise<void>;
  logout?: () => Promise<void>;
  isSyncing: boolean;
  setIsSyncing: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ProfileContext = createContext<ProfileContextType>({
  user: null,
  setUser: () => {},
  refreshProfile: async () => null,
  updateProfile: async () => null,
  updateClass: async () => {},
  logout: async () => {},
  isSyncing: false,
  setIsSyncing: () => {},
});

export const AuthContext = ProfileContext;

export const ProfileProvider: React.FC<{
  children: React.ReactNode;
  initialUser?: UserProfile | null;
  onUserChanged?: (user: UserProfile | null) => void;
  logoutHandler?: () => Promise<void>;
}> = ({ children, initialUser, onUserChanged, logoutHandler }) => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const [user, setUserState] = useState<UserProfile | null>(() => {
    if (initialUser) return initialUser;
    const cached = roomRepo.getUserProfile();
    if (cached && (cached.displayName || cached.email)) return cached;
    try {
      const rawLocal = localStorage.getItem("savoirplus_user_profile");
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (parsed && (parsed.displayName || parsed.email)) return parsed;
      }
      const rawSession = sessionStorage.getItem("savoirplus_user_profile");
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed && (parsed.displayName || parsed.email)) return parsed;
      }
      const rawSavoir = localStorage.getItem("savoir_user");
      if (rawSavoir) {
        const parsed = JSON.parse(rawSavoir);
        if (parsed && (parsed.displayName || parsed.email)) return parsed;
      }
    } catch {}
    return null;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const setUser = useCallback((newUserOrUpdater: React.SetStateAction<UserProfile | null>) => {
    setUserState((prev) => {
      const nextUser = typeof newUserOrUpdater === "function" ? newUserOrUpdater(prev) : newUserOrUpdater;
      if (nextUser) {
        const resolvedName = (nextUser.displayName || nextUser.fullName || "").trim() || "Élève";
        const parts = resolvedName.split(/\s+/);
        const prenom = nextUser.prenom || (parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0]);
        const nom = nextUser.nom || (parts.length > 1 ? parts[parts.length - 1] : "");
        const formattedUser: UserProfile = {
          ...nextUser,
          displayName: resolvedName,
          fullName: resolvedName,
          prenom,
          nom,
        };
        setTimeout(() => {
          roomRepo.setUserProfile(formattedUser);
          roomRepo.registerOrUpdateStudent(formattedUser);
          try {
            localStorage.setItem("savoirplus_user_profile", JSON.stringify(formattedUser));
            localStorage.setItem("savoir_user", JSON.stringify(formattedUser));
            sessionStorage.setItem("savoirplus_user_profile", JSON.stringify(formattedUser));
          } catch {}
          syncUserToFirestore(formattedUser).catch(() => {});
          if (onUserChanged) {
            onUserChanged(formattedUser);
          }
        }, 0);
        return formattedUser;
      } else {
        setTimeout(() => {
          roomRepo.clearUserProfile();
          try {
            localStorage.removeItem("savoirplus_user_profile");
            localStorage.removeItem("savoir_user");
            sessionStorage.removeItem("savoirplus_user_profile");
          } catch {}
          if (onUserChanged) {
            onUserChanged(null);
          }
        }, 0);
        return null;
      }
    });
  }, [onUserChanged, roomRepo]);

  // Synchronisation systématique du profil depuis Supabase avec résolution stricte du nom/prénom
  const refreshProfile = useCallback(async (forcedUid?: string): Promise<UserProfile | null> => {
    if (!supabase) return null;
    try {
      let targetId = forcedUid;
      let authUserMeta: any = null;
      if (!targetId) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          targetId = authData.user.id;
          authUserMeta = authData.user.user_metadata;
        }
      }
      if (!targetId) {
        targetId = user?.id || user?.uid;
      }
      if (!targetId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetId)
        .single();

      if (error || !data) {
        console.warn("[refreshProfile] Supabase single fetch notice:", error?.message);
        return null;
      }

      const rawField = data.classe || data.level || data.class_name || data.new_class_name || data.niveau;
      const hasValidClasseField = Boolean(
        rawField &&
        String(rawField).trim() !== "" &&
        rawField !== "null" &&
        rawField !== "undefined"
      );
      const rawClasse = hasValidClasseField ? String(rawField).trim() : null;
      const rawLevel = rawClasse ? (rawClasse as SecondaryLevel) : undefined;
      const isExplicitAdmin = Boolean(data.is_admin || data.role === "admin");
      const role = data.role || (isExplicitAdmin ? "admin" : "eleve");

      const resolvedDisplayName =
        (data.display_name && data.display_name.trim()) ||
        (data.full_name && data.full_name.trim()) ||
        (authUserMeta?.display_name && authUserMeta.display_name.trim()) ||
        (authUserMeta?.full_name && authUserMeta.full_name.trim()) ||
        (authUserMeta?.name && authUserMeta.name.trim()) ||
        (user?.displayName && user.displayName.trim()) ||
        (user?.fullName && user.fullName.trim()) ||
        (roomRepo.getUserProfile()?.displayName) ||
        (data.email ? data.email.split("@")[0] : "") ||
        (isExplicitAdmin ? "Administrateur" : "Élève");

      const nameParts = resolvedDisplayName.trim().split(/\s+/);
      const prenom = (data.prenom && String(data.prenom).trim() && data.prenom !== "Élève" ? String(data.prenom).trim() : null) ||
        (nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0]);
      const nom = (data.nom && String(data.nom).trim() && data.nom !== "Élève" ? String(data.nom).trim() : null) ||
        (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");

      const freshProfile: UserProfile = {
        id: data.id,
        uid: data.id,
        email: data.email,
        displayName: resolvedDisplayName,
        fullName: resolvedDisplayName,
        prenom,
        nom,
        role,
        studentId: data.student_id,
        matricule: data.matricule || data.student_id,
        level: isExplicitAdmin ? undefined : rawLevel,
        classe: isExplicitAdmin ? undefined : (rawClasse || (null as any)),
        phoneNumber: data.phone_number || "",
        phone: data.phone_number || "",
        photoUrl: data.photo_url || data.avatar_url || "",
        photoURL: data.photo_url || data.avatar_url || "",
        avatarUrl: data.avatar_url || data.photo_url || "",
        avatar_url: data.avatar_url || data.photo_url || "",
        isAdmin: isExplicitAdmin,
        isVIP: Boolean(data.is_vip),
        vipPlan: data.vip_plan,
        vipExpiresAt: data.vip_expires_at ? Number(data.vip_expires_at) : undefined,
        isProfileComplete: Boolean(isExplicitAdmin || (data.is_profile_complete && rawClasse)),
        lastSeen: data.last_seen ? Number(data.last_seen) : Date.now(),
        createdAt: data.created_at ? Number(data.created_at) : Date.now(),
      };

      // Si le nom était manquant dans la table profiles de Supabase, on la met à jour
      if (!data.display_name && resolvedDisplayName && supabase) {
        supabase.from("profiles").update({
          display_name: resolvedDisplayName,
          full_name: resolvedDisplayName,
          updated_at: Date.now(),
        }).eq("id", targetId).then(() => {}, () => {});
      }

      // Écraser le state React local et le cache Room avec la donnée fraîche
      roomRepo.setUserProfile(freshProfile);
      roomRepo.registerOrUpdateStudent(freshProfile);
      try {
        localStorage.setItem("savoirplus_user_profile", JSON.stringify(freshProfile));
        sessionStorage.setItem("savoirplus_user_profile", JSON.stringify(freshProfile));
      } catch {}
      setUserState(freshProfile);
      if (onUserChanged) {
        onUserChanged(freshProfile);
      }

      return freshProfile;
    } catch (err) {
      console.warn("[refreshProfile] Exception:", err);
      return null;
    }
  }, [user?.id, user?.uid, user?.displayName, user?.fullName, onUserChanged, roomRepo]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<UserProfile | null> => {
    const updated = roomRepo.updateUserProfile(updates);
    if (updated) {
      setUserState(updated);
      roomRepo.registerOrUpdateStudent(updated);
      try {
        localStorage.setItem("savoirplus_user_profile", JSON.stringify(updated));
        sessionStorage.setItem("savoirplus_user_profile", JSON.stringify(updated));
      } catch {}
      await saveUserProfileToSupabase(updated).catch(console.warn);
      return await refreshProfile(updated.id || updated.uid);
    }
    return null;
  }, [refreshProfile, roomRepo]);

  const updateClass = useCallback(async (newClass: SecondaryLevel): Promise<void> => {
    const targetId = user?.id || user?.uid;
    if (!targetId) return;
    roomRepo.updateStudentLevel(targetId, newClass);
    await updateStudentLevelSupabase(targetId, newClass).catch(console.warn);
    await refreshProfile(targetId);
  }, [user?.id, user?.uid, refreshProfile, roomRepo]);

  const logout = useCallback(async (): Promise<void> => {
    roomRepo.clearUserProfile();
    try {
      localStorage.removeItem("savoirplus_user_profile");
      localStorage.removeItem("savoir_user");
      sessionStorage.removeItem("savoirplus_user_profile");
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          localStorage.removeItem(key);
        }
        if (key.startsWith("savoir_last_") || key.startsWith("savoir_evaluations_")) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
    setUserState(null);
    if (onUserChanged) {
      onUserChanged(null);
    }
    if (logoutHandler) {
      await logoutHandler();
    } else {
      await signOutSupabase().catch(() => {});
    }
  }, [logoutHandler, onUserChanged, roomRepo]);

  useEffect(() => {
    if (initialUser) {
      setUserState(initialUser);
      try {
        localStorage.setItem("savoirplus_user_profile", JSON.stringify(initialUser));
        sessionStorage.setItem("savoirplus_user_profile", JSON.stringify(initialUser));
      } catch {}
    }
  }, [initialUser]);

  return (
    <ProfileContext.Provider
      value={{
        user,
        setUser,
        refreshProfile,
        updateProfile,
        updateClass,
        logout,
        isSyncing,
        setIsSyncing,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
export const useAuth = () => useContext(ProfileContext);
export const useAuthContext = () => useContext(ProfileContext);
