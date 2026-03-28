import api from './client';

export type Profile = {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
};

export const profileService = {
  getProfile: () => api.get<Profile>('/profile').then((res) => res.data),
  updateProfile: (payload: { displayName: string; email: string }) =>
    api.put<Profile>('/profile', payload).then((res) => res.data),
};
