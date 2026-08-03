"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

interface UseOptimisticMutationOptions<TState, TArgs> {
  currentState: TState;
  onApplyState: (newState: TState) => void;
  getOptimisticState: (prevState: TState, args: TArgs) => TState;
  asyncMutation: (args: TArgs) => Promise<unknown>;
  errorMessage?: string;
  onSuccess?: () => void;
}

/**
 * Reusable custom hook for modularizing Optimistic UI updates across components.
 * 1. Instantly applies getOptimisticState to local state (0ms delay).
 * 2. Runs asyncMutation in background.
 * 3. Automatically rolls back to previous state if asyncMutation fails.
 */
/** React Query mutation wrapper: applies an optimistic update with rollback on error. */
export function useOptimisticMutation<TState, TArgs>({
  currentState,
  onApplyState,
  getOptimisticState,
  asyncMutation,
  errorMessage = "Action failed. Reverting changes...",
  onSuccess,
}: UseOptimisticMutationOptions<TState, TArgs>) {
  const [isPending, setIsPending] = useState(false);

  const executeOptimistic = useCallback(
    async (args: TArgs) => {
      const previousState = currentState;
      const optimisticState = getOptimisticState(previousState, args);

      // 1. Optimistic Update (0ms delay)
      onApplyState(optimisticState);
      setIsPending(true);

      try {
        await asyncMutation(args);
        onSuccess?.();
      } catch (err) {
        // 2. Automatic Rollback on failure
        onApplyState(previousState);
        toast.error((err as Error)?.message || errorMessage);
      } finally {
        setIsPending(false);
      }
    },
    [currentState, onApplyState, getOptimisticState, asyncMutation, errorMessage, onSuccess]
  );

  return {
    executeOptimistic,
    isPending,
  };
}
