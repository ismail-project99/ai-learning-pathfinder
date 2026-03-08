import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Roadmap } from '../types';

interface UserProgress {
  points: number;
  streak: number;
  completedResources: string[]; // IDs of completed resources
  completedNodes: string[]; // IDs of completed roadmap nodes
  currentRoadmap: Roadmap | null;
}

interface ProgressState extends UserProgress {
  addPoints: (amount: number) => void;
  completeResource: (resourceId: string) => void;
  toggleNodeCompletion: (nodeId: string) => void;
  setRoadmap: (roadmap: Roadmap | null) => void;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      points: 0,
      streak: 0,
      completedResources: [],
      completedNodes: [],
      currentRoadmap: null,
      addPoints: (amount) => set((state) => ({ points: state.points + amount })),
      completeResource: (resourceId) => set((state) => {
        if (state.completedResources.includes(resourceId)) return state;
        return { 
          completedResources: [...state.completedResources, resourceId],
          points: state.points + 10
        };
      }),
      toggleNodeCompletion: (nodeId) => set((state) => {
        const isCompleted = state.completedNodes.includes(nodeId);
        return {
          completedNodes: isCompleted 
            ? state.completedNodes.filter(id => id !== nodeId)
            : [...state.completedNodes, nodeId]
        };
      }),
      setRoadmap: (roadmap) => set({ 
        currentRoadmap: roadmap,
        completedNodes: [], // Reset progress for new roadmap
        completedResources: []
      }),
      resetProgress: () => set({ 
        points: 0, 
        streak: 0, 
        completedResources: [], 
        completedNodes: [],
        currentRoadmap: null
      }),
    }),
    {
      name: 'ai-learning-path-progress',
    }
  )
);
