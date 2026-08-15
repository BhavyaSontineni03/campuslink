import { useMutation } from 'react-query';
import { funnelApi, interactionApi } from '../services/api';
import { FunnelStageKey, InteractionType } from '../types';

// Fire-and-forget funnel stage logging; the API layer already swallows errors
// so this never blocks or interrupts the surrounding user flow.
export const useLogFunnelEvent = () => {
  return useMutation((data: { session_id: number; stage: FunnelStageKey }) => funnelApi.logEvent(data));
};

export const useLogInteraction = () => {
  return useMutation((data: { session_id: number; interaction_type: InteractionType }) =>
    interactionApi.logInteraction(data)
  );
};
