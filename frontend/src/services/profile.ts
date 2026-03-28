import api from '../api/client';

export type Profile = {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
};

export const profileService = {
  getProfile: () => api.get<Profile>('/profile').then((response) => response.data),
  updateProfile: (payload: { displayName: string; email: string }) =>
    api.put<Profile>('/profile', payload).then((response) => response.data),
};
