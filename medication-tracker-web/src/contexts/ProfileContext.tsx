import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PatientDocument } from '@/types/fhir';
import { useAuth } from './AuthContext';
import {
  CreatePatientData,
  UpdatePatientData,
  createPatient,
  deletePatient,
  getUserPatients,
  updatePatient,
} from '@/services/firestore/patientService';

interface ProfileContextValue {
  profiles: PatientDocument[];
  activeProfileId: string | null;
  activeProfile: PatientDocument | null;
  isLoading: boolean;
  error: string | null;
  isCreating: boolean;
  pendingProfileIds: Record<string, 'updating' | 'deleting'>;
  refreshProfiles: () => Promise<PatientDocument[]>;
  selectProfile: (profileId: string | null) => void;
  createProfile: (input: CreatePatientData) => Promise<PatientDocument>;
  updateProfile: (profileId: string, updates: UpdatePatientData) => Promise<PatientDocument>;
  deleteProfile: (profileId: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

const LOCAL_STORAGE_KEY_PREFIX = 'adherence-pro:last-profile:';

const getStorageKey = (userId: string) => `${LOCAL_STORAGE_KEY_PREFIX}${userId}`;

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [profiles, setProfiles] = useState<PatientDocument[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingProfileIds, setPendingProfileIds] = useState<
    Record<string, 'updating' | 'deleting'>
  >({});
  const mountedRef = useRef(true);

  const setProfileStatus = useCallback(
    (profileId: string, status: 'updating' | 'deleting' | null) => {
      setPendingProfileIds((prev) => {
        if (status === null) {
          if (!(profileId in prev)) {
            return prev;
          }
          const { [profileId]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [profileId]: status };
      });
    },
    []
  );

  const loadProfiles = useCallback(async (): Promise<PatientDocument[]> => {
    if (!currentUser) {
      if (mountedRef.current) {
        setProfiles([]);
        setActiveProfileId(null);
        setError(null);
      }
      return [];
    }

    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const fetchedProfiles = await getUserPatients(currentUser.uid);
      if (mountedRef.current) {
        setProfiles(fetchedProfiles);

        setActiveProfileId((previous) => {
          const persisted = (() => {
            if (typeof window === 'undefined') {
              return null;
            }
            const key = getStorageKey(currentUser.uid);
            try {
              return window.localStorage.getItem(key);
            } catch {
              return null;
            }
          })();

          const desiredId = previous ?? persisted ?? undefined;
          if (desiredId && fetchedProfiles.some((profile) => profile.id === desiredId)) {
            return desiredId;
          }

          return fetchedProfiles[0]?.id ?? null;
        });
      }
      return fetchedProfiles;
    } catch (loadError) {
      if (mountedRef.current) {
        console.error('Failed to load patient profiles', loadError);
        setProfiles([]);
        setActiveProfileId(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load profiles. Please try again.'
        );
      }
      throw loadError;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    if (typeof window !== 'undefined') {
      const key = getStorageKey(currentUser.uid);
      try {
        if (activeProfileId) {
          window.localStorage.setItem(key, activeProfileId);
        } else {
          window.localStorage.removeItem(key);
        }
      } catch {
        // Ignore storage errors (private mode, quota, etc.)
      }
    }
  }, [activeProfileId, currentUser]);

  const selectProfile = useCallback((profileId: string | null) => {
    setActiveProfileId((previous) => {
      if (profileId && profiles.some((profile) => profile.id === profileId)) {
        return profileId;
      }
      if (profileId === null) {
        return null;
      }
      return previous;
    });
  }, [profiles]);

  const handleCreateProfile = useCallback(
    async (input: CreatePatientData) => {
      setIsCreating(true);
      setError(null);
      try {
        const created = await createPatient(input);
        if (mountedRef.current) {
          setProfiles((prev) => [created, ...prev]);
          setActiveProfileId(created.id);
        }
        return created;
      } catch (createError) {
        if (mountedRef.current) {
          console.error('Failed to create profile', createError);
          setError(
            createError instanceof Error
              ? createError.message
              : 'Unable to create profile. Please try again.'
          );
        }
        throw createError;
      } finally {
        if (mountedRef.current) {
          setIsCreating(false);
        }
      }
    },
    []
  );

  const handleUpdateProfile = useCallback(
    async (profileId: string, updates: UpdatePatientData) => {
      setProfileStatus(profileId, 'updating');
      setError(null);
      try {
        const updated = await updatePatient(profileId, updates);
        if (mountedRef.current) {
          setProfiles((prev) =>
            prev.map((profile) => (profile.id === updated.id ? updated : profile))
          );
        }
        return updated;
      } catch (updateError) {
        if (mountedRef.current) {
          console.error('Failed to update profile', updateError);
          setError(
            updateError instanceof Error
              ? updateError.message
              : 'Unable to update this profile. Please try again.'
          );
        }
        throw updateError;
      } finally {
        if (mountedRef.current) {
          setProfileStatus(profileId, null);
        }
      }
    },
    [setProfileStatus]
  );

  const handleDeleteProfile = useCallback(
    async (profileId: string) => {
      setProfileStatus(profileId, 'deleting');
      setError(null);
      try {
        await deletePatient(profileId);
        if (mountedRef.current) {
          setProfiles((prev) => {
            const updated = prev.filter((profile) => profile.id !== profileId);
            setActiveProfileId((previous) => {
              if (previous === profileId) {
                return updated[0]?.id ?? null;
              }
              return previous;
            });
            return updated;
          });
        }
      } catch (deleteError) {
        if (mountedRef.current) {
          console.error('Failed to delete profile', deleteError);
          setError(
            deleteError instanceof Error
              ? deleteError.message
              : 'Unable to remove this profile. Please try again.'
          );
        }
        throw deleteError;
      } finally {
        if (mountedRef.current) {
          setProfileStatus(profileId, null);
        }
      }
    },
    [setProfileStatus]
  );

  useEffect(() => {
    if (!currentUser) {
      setProfiles([]);
      setActiveProfileId(null);
      setError(null);
      return;
    }
  }, [currentUser]);

  const activeProfile = useMemo(() => {
    if (!activeProfileId) {
      return null;
    }
    return profiles.find((profile) => profile.id === activeProfileId) ?? null;
  }, [profiles, activeProfileId]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profiles,
      activeProfileId,
      activeProfile,
      isLoading,
      error,
      isCreating,
      pendingProfileIds,
      refreshProfiles: loadProfiles,
      selectProfile,
      createProfile: handleCreateProfile,
      updateProfile: handleUpdateProfile,
      deleteProfile: handleDeleteProfile,
    }),
    [
      profiles,
      activeProfileId,
      activeProfile,
      isLoading,
      error,
      isCreating,
      pendingProfileIds,
      loadProfiles,
      selectProfile,
      handleCreateProfile,
      handleUpdateProfile,
      handleDeleteProfile,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfileContext = (): ProfileContextValue => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
};
