import React from 'react';
import {
  Avatar,
  Divider,
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  Check as CheckIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useProfileContext } from '@/contexts/ProfileContext';
import type { PatientDocument } from '@/types/fhir';

const ADD_PROFILE_VALUE = '__add_profile__';
const NO_PROFILE_VALUE = '__no_profile__';

const getProfileLabel = (profile: PatientDocument): string => {
  const name = profile.name?.[0];
  if (name?.text) {
    return name.text;
  }
  if (name?.given?.length) {
    return name.given.join(' ');
  }
  return 'Unnamed Profile';
};

const getProfileInitial = (profile: PatientDocument): string => {
  const label = getProfileLabel(profile);
  return label.trim().charAt(0).toUpperCase() || '?';
};

export interface ProfileSwitcherProps {
  label?: string;
  onAddProfile?: () => void;
  disabled?: boolean;
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
  label = 'Profile',
  onAddProfile,
  disabled = false,
}) => {
  const { profiles, activeProfileId, selectProfile, isLoading } = useProfileContext();

  const hasProfiles = profiles.length > 0;
  const currentValue = hasProfiles ? activeProfileId ?? profiles[0].id : NO_PROFILE_VALUE;

  const handleChange = (event: SelectChangeEvent<string>) => {
    const { value } = event.target;
    if (!value) {
      return;
    }
    if (value === ADD_PROFILE_VALUE) {
      onAddProfile?.();
      return;
    }
    if (value === NO_PROFILE_VALUE) {
      return;
    }
    selectProfile(value);
  };

  return (
    <FormControl size="small" variant="outlined" sx={{ minWidth: 180 }} disabled={disabled || isLoading}>
      <InputLabel id="profile-switcher-label">{label}</InputLabel>
      <Select
        labelId="profile-switcher-label"
        id="profile-switcher"
        label={label}
        value={currentValue}
        onChange={handleChange}
        renderValue={(selected) => {
          if (!hasProfiles || selected === NO_PROFILE_VALUE) {
            return <Typography color="text.secondary">No profiles yet</Typography>;
          }

          const profile = profiles.find((item) => item.id === selected);
          if (!profile) {
            return label;
          }

          return (
            <Typography component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                src={profile.photo?.[0]?.url}
                sx={{ width: 28, height: 28, fontSize: '0.85rem' }}
              >
                {getProfileInitial(profile)}
              </Avatar>
              {getProfileLabel(profile)}
            </Typography>
          );
        }}
      >
        {hasProfiles ? (
          profiles.map((profile) => (
            <MenuItem key={profile.id} value={profile.id}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Avatar
                  src={profile.photo?.[0]?.url}
                  sx={{ width: 32, height: 32 }}
                  alt={getProfileLabel(profile)}
                >
                  {getProfileInitial(profile)}
                </Avatar>
              </ListItemIcon>
              <ListItemText primary={getProfileLabel(profile)} />
              {profile.id === activeProfileId && <CheckIcon fontSize="small" color="primary" />}
            </MenuItem>
          ))
        ) : (
          <MenuItem value={NO_PROFILE_VALUE} disabled>
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="No profiles yet" />
          </MenuItem>
        )}
        <Divider />
        <MenuItem value={ADD_PROFILE_VALUE}>
          <ListItemIcon>
            <AddCircleOutlineIcon />
          </ListItemIcon>
          <ListItemText primary="Add profile" />
        </MenuItem>
      </Select>
    </FormControl>
  );
};

export default ProfileSwitcher;
