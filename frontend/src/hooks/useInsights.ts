import { useQuery } from '@tanstack/react-query';
import { insightsApi } from '../services/insights';

export const useInsights = () =>
  useQuery({
    queryKey: ['insights', 'summary'],
    queryFn: insightsApi.getInsights,
    staleTime: 1000 * 60 * 5,
  });
