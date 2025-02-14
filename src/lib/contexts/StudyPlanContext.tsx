'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient';

interface StudyPlan {
  chapters: Array<{
    title: string;
    description: string;
    lessons: Array<{
      title: string;
      description: string;
      keyPoints: string[];
      estimatedDuration: string;
    }>;
  }>;
}

interface StudyPlanContextType {
  studyPlan: StudyPlan | null;
  setStudyPlan: (plan: StudyPlan | null) => void;
  fetchStudyPlan: (folderId: string, userId: string) => Promise<StudyPlan | null>;
  clearStudyPlan: () => void;
}

const StudyPlanContext = createContext<StudyPlanContextType | undefined>(undefined);

export function StudyPlanProvider({ children }: { children: ReactNode }) {
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const fetchStudyPlan = useCallback(async (folderId: string, userId: string) => {
    try {
      if (!folderId || !userId) {
        return null;
      }
      setCurrentFolderId(folderId);
      return studyPlan;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  }, [currentFolderId, studyPlan]);

  const clearStudyPlan = useCallback(() => {
    setStudyPlan(null);
    setCurrentFolderId(null);
  }, []);

  return (
    <StudyPlanContext.Provider value={{ studyPlan, setStudyPlan, fetchStudyPlan, clearStudyPlan }}>
      {children}
    </StudyPlanContext.Provider>
  );
}

export function useStudyPlan() {
  const context = useContext(StudyPlanContext);
  if (context === undefined) {
    throw new Error('useStudyPlan must be used within a StudyPlanProvider');
  }
  return context;
} 