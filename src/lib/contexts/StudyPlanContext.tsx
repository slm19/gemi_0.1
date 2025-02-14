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
    // If we already have the study plan for this folder, return it
    if (currentFolderId === folderId && studyPlan) {
      console.log('Returning cached study plan for folder:', folderId);
      return studyPlan;
    }

    console.log('Fetching study plan for folder:', folderId);
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('folder_id', folderId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching study plan:', error);
        return null;
      }

      if (data) {
        try {
          const parsedContent = JSON.parse(data.content);
          setStudyPlan(parsedContent);
          setCurrentFolderId(folderId);
          return parsedContent;
        } catch (parseError) {
          console.error('Error parsing study plan content:', parseError);
          return null;
        }
      }
      
      // If no data found, clear the current state
      setStudyPlan(null);
      setCurrentFolderId(null);
      return null;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  }, [currentFolderId]); // Remove studyPlan from dependencies

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