'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, BookOpen, Clock, ChevronDown, ChevronRight, CheckCircle2, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabase/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";
import { useRouter } from 'next/navigation';
import { generateStudyPlan as generateStudyPlanEdge } from '@/lib/supabase/edgeFunctions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChapterDisplay } from './ChapterDisplay';
import { LessonDisplay } from './LessonDisplay';
import { Checkbox } from "@/components/ui/checkbox"
import { motion } from 'framer-motion';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface Document {
  id: string;
  name: string;
  size: number;
  url: string;
  path: string;
}

interface Lesson {
  title: string;
  description: string;
  keyPoints: string[];
  estimatedDuration: string;
}

interface Chapter {
  title: string;
  description: string;
  lessons: Lesson[];
}

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

interface Props {
  documents?: Document[];
  folderId: string;
}

// Error types for better error handling
type ErrorType = 'FETCH_ERROR' | 'GENERATION_ERROR' | 'STORAGE_ERROR' | 'VALIDATION_ERROR' | 'TIMEOUT_ERROR';

interface AppError {
  type: ErrorType;
  message: string;
  details?: unknown;
}

const getUserFriendlyErrorMessage = (error: AppError): string => {
  switch (error.type) {
    case 'FETCH_ERROR':
      return 'Unable to load your study plan. Please try again later.';
    case 'GENERATION_ERROR':
      return 'There was an error generating your study plan. Please try again.';
    case 'STORAGE_ERROR':
      return 'Unable to save your study plan. Please try again later.';
    case 'VALIDATION_ERROR':
      return 'The generated study plan was invalid. Please try again.';
    case 'TIMEOUT_ERROR':
      return 'Study plan generation timed out. Please try with fewer or smaller documents.';
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
};

export function LearnTab({ documents = [], folderId }: Props) {
  const { user } = useAuth();
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'fetching' | 'generating' | 'processing' | 'storing'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  const GENERATION_TIMEOUT = 60000; // 60 seconds timeout
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});
  const [userProgress, setUserProgress] = useState<Record<string, boolean>>({}); // lessonId: completed
  const [overallProgress, setOverallProgress] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const router = useRouter();

  // Debug state changes
  useEffect(() => {
    console.log('Study plan state updated:', {
      studyPlan,
      loading,
      error,
      isGenerating,
      generationStatus
    });
  }, [studyPlan, loading, error, isGenerating, generationStatus]);

  const toggleChapter = useCallback((chapterTitle: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterTitle]: !prev[chapterTitle]
    }));
  }, []);

  const toggleLesson = useCallback((lessonId: string) => {
    setExpandedLessons(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  }, []);

  const navigateToLesson = useCallback((lessonTitle: string) => {
    const lessonId = lessonTitle.toLowerCase().replace(/\s+/g, '-');
    router.push(`/features/${folderId}/lessons/${lessonId}`);
  }, [folderId, router]);

  const fetchStudyPlan = useCallback(async () => {
    if (!user || !folderId) {
      setGenerationStatus('idle');
      return false;
    }

    try {
      setGenerationStatus('fetching');
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('folder_id', folderId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching study plan:', error);
        setError({
          type: 'FETCH_ERROR',
          message: 'Failed to fetch study plan',
          details: error
        });
        setGenerationStatus('idle');
        return false;
      }

      if (data) {
        try {
          const parsedContent = JSON.parse(data.content);
          setStudyPlan(parsedContent);
          if (parsedContent.chapters?.[0]?.title) {
            setExpandedChapters(prev => ({
              ...prev,
              [parsedContent.chapters[0].title]: true
            }));
          }
          setGenerationStatus('idle');
          setError(null);
          return true;
        } catch (parseError) {
          console.error('Error parsing study plan content:', parseError);
          setError({
            type: 'VALIDATION_ERROR',
            message: 'Invalid study plan format',
            details: parseError
          });
          setGenerationStatus('idle');
          return false;
        }
      }
      setGenerationStatus('idle');
      return false;
    } catch (err) {
      console.error('Error:', err);
      setError({
        type: 'FETCH_ERROR',
        message: 'Failed to fetch study plan',
        details: err
      });
      setGenerationStatus('idle');
      return false;
    }
  }, [folderId, user]);

  const fetchUserProgress = useCallback(async () => {
    if (!user || !folderId) return;

    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id)
        .eq('folder_id', folderId);

      if (error) throw error;
      if(data){
        const progress: Record<string, boolean> = {};
        data.forEach(item => {
          progress[item.lesson_id] = item.completed;
        });
        setUserProgress(progress);
      }

    } catch (error) {
      console.error('Error fetching user progress:', error);
      // Don't set an error here, just log it. We don't want to prevent
      // the study plan from loading if progress fetching fails.
    }
  }, [user, folderId]);

  const handleToggleComplete = useCallback(async (chapterTitle: string, lessonTitle: string) => {
    if (!user || !folderId) return;

    const lessonId = `${chapterTitle}-${lessonTitle}`;
    const newCompletedStatus = !userProgress[lessonId];

    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          folder_id: folderId,
          lesson_id: lessonId,
          completed: newCompletedStatus,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,folder_id,lesson_id' });

      if (error) throw error;

      // Optimistically update the local state
      setUserProgress(prev => ({
        ...prev,
        [lessonId]: newCompletedStatus
      }));
    } catch (error) {
      console.error('Error updating lesson completion status:', error);
      // Optionally, revert the optimistic update on error
    }
  }, [user, folderId, userProgress]);

  // Add useEffect to fetch study plan and user progress on mount
  useEffect(() => {
    if (folderId && user) {
      setLoading(true);
      fetchStudyPlan()
        .then(() => fetchUserProgress())
        .finally(() => setLoading(false));
    }
  }, [folderId, user, fetchStudyPlan, fetchUserProgress]);

  const retryWithDelay = async (operation: () => Promise<void>) => {
    try {
      await operation();
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Operation failed:', error);
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying operation (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => retryWithDelay(operation), RETRY_DELAY * Math.pow(2, retryCount));
      } else {
        throw error; // Re-throw if max retries exceeded
      }
    }
  };

  const generateStudyPlan = useCallback(async () => {
    if (!documents || documents.length === 0 || !user || !folderId || isGenerating) {
      console.log('Skipping generation due to:', {
        hasDocuments: !!documents && documents.length > 0,
        hasUser: !!user,
        folderId,
        isGenerating
      });
      setGenerationStatus('idle');
      return;
    }

    const startTime = Date.now();
    setIsGenerating(true);
    setError(null);
    setGenerationStatus('generating');
    setRetryCount(0); // Reset retry count at the start

    const tryGenerate = async (attempt: number) => {
      try {
        // Fetch document content with retry logic
        const documentsWithContent = await Promise.all(
          documents.map(async (doc) => {
            try {
              const { data, error } = await supabase.storage
                .from('documents')
                .download(doc.path);

              if (error) {
                throw error;
              }
              const content = await data.text();
              return { ...doc, content };
            } catch (error) {
              console.error(`Error downloading document ${doc.name}:`, error);
              throw new Error(`Failed to download document ${doc.name}`);
            }
          })
        );

        setGenerationStatus('processing');

        // Prepare the documents content for the Edge Function
        const documentsData = documentsWithContent.map(doc => ({
          name: doc.name,
          content: doc.content
        }));

        // Set up a timeout for the generation
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Study plan generation timed out')), GENERATION_TIMEOUT)
        );

        // Use our new edge function handler, racing it with the timeout
        const generatedPlan = await Promise.race([
          generateStudyPlanEdge(documentsData),
          timeoutPromise
        ]);

        // Store the generated plan
        setGenerationStatus('storing');
        const { error: storageError } = await supabase
          .from('study_plans')
          .upsert({
            user_id: user.id,
            folder_id: folderId,
            content: JSON.stringify(generatedPlan),
            created_at: new Date().toISOString()
          });

        if (storageError) {
          throw new Error(`Failed to store study plan: ${storageError.message}`);
        }

        setStudyPlan(generatedPlan);
        if (generatedPlan.chapters?.[0]?.title) {
          setExpandedChapters(prev => ({
            ...prev,
            [generatedPlan.chapters[0].title]: true
          }));
        }
        setGenerationTime(Date.now() - startTime);
        setError(null);
        setIsGenerating(false);
        setGenerationStatus('idle');

      } catch (error: any) {
        if (attempt < MAX_RETRIES) {
          console.log(`Attempt ${attempt} failed, retrying in ${RETRY_DELAY * Math.pow(2, attempt)}ms`);
          setRetryCount(attempt + 1); // Update retry count
          setTimeout(() => tryGenerate(attempt + 1), RETRY_DELAY * Math.pow(2, attempt));
        } else {
          console.error('Study plan generation failed:', error);
          setError({
            type: error.message.includes('timed out') ? 'TIMEOUT_ERROR' : 'GENERATION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to generate study plan',
            details: error
          });
          setIsGenerating(false);
          setGenerationStatus('idle');
        }
      }
    };

    tryGenerate(0); // Start the generation process

  }, [documents, user, folderId, isGenerating, GENERATION_TIMEOUT]);

  // Helper function to format time
  const formatGenerationTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const calculateOverallProgress = useCallback(() => {
    if (!studyPlan?.chapters) {
      return 0;
    }

    let totalLessons = 0;
    let completedLessons = 0;

    studyPlan.chapters.forEach(chapter => {
      chapter.lessons.forEach(lesson => {
        totalLessons++;
        const lessonId = `${chapter.title}-${lesson.title}`;
        if (userProgress[lessonId]) {
          completedLessons++;
        }
      });
    });

    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  }, [studyPlan, userProgress]);

  useEffect(() => {
    setOverallProgress(calculateOverallProgress());
  }, [calculateOverallProgress]);

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Brain className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600">Upload documents to get a personalized study plan</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Your Learning Path
            </CardTitle>
            {overallProgress > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <Progress value={overallProgress} className="h-2 w-32" />
                <span className="text-xs text-muted-foreground">{overallProgress}% Complete</span>
              </div>
            )}
            {generationTime && !loading && !isGenerating && (
              <p className="text-xs text-muted-foreground mt-1">
                Generated in {formatGenerationTime(generationTime)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {process.env.NODE_ENV === 'development' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('Current state:', {
                    studyPlan,
                    loading,
                    error,
                    isGenerating,
                    generationStatus,
                    expandedChapters,
                    expandedLessons,
                    userProgress
                  });
                }}
              >
                Debug State
              </Button>
            )}
            {!loading && !isGenerating && (
              <Dialog open={isRegenerating} onOpenChange={setIsRegenerating}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRegenerating(true)}
                    disabled={loading || isGenerating}
                  >
                    Regenerate Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Regenerate Study Plan?</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to regenerate the study plan? This will overwrite the existing plan, but your completion progress will be preserved.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRegenerating(false)}>Cancel</Button>
                    <Button onClick={() => {
                      setIsRegenerating(false);
                      generateStudyPlan();
                    }}>Confirm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {(loading || isGenerating) ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center h-32">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    <div className="text-sm text-muted-foreground">
                      {generationStatus === 'fetching' && 'Fetching existing study plan...'}
                      {generationStatus === 'generating' && 'Generating your personalized study plan...'}
                      {generationStatus === 'processing' && 'Analyzing your documents...'}
                      {generationStatus === 'storing' && 'Saving your study plan...'}
                    </div>
                    {retryCount > 0 && (
                      <div className="text-xs text-yellow-600">
                        Retrying... (attempt {retryCount}/{MAX_RETRIES})
                      </div>
                    )}
                  </div>
                </div>
                <Progress value={
                  generationStatus === 'fetching' ? 25 :
                  generationStatus === 'generating' ? 50 :
                  generationStatus === 'processing' ? 75:
                  generationStatus === 'storing' ? 90 :
                  100
                } />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <Brain className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {getUserFriendlyErrorMessage(error)}
                </AlertDescription>
              </Alert>
            ) : studyPlan?.chapters && studyPlan.chapters.length > 0 ? (
              <div className="space-y-6">
                {studyPlan.chapters.map((chapter, chapterIndex) => (
                  <ChapterDisplay
                    key={chapterIndex}
                    chapter={chapter}
                    expanded={expandedChapters[chapter.title] || false}
                    onToggle={() => toggleChapter(chapter.title)}
                    expandedLessons={expandedLessons}
                    onToggleLesson={toggleLesson}
                    navigateToLesson={navigateToLesson}
                    userProgress={userProgress}
                    onToggleComplete={handleToggleComplete}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center p-4 text-gray-500">
                <p>No study plan generated yet. Click "Regenerate Plan" to create one.</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 