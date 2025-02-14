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
import { useStudyPlan } from '@/lib/contexts/StudyPlanContext';

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
  const { studyPlan, setStudyPlan, fetchStudyPlan } = useStudyPlan();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'fetching' | 'generating' | 'processing' | 'storing'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;
  const GENERATION_TIMEOUT = 60000;
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});
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

  // Update the useEffect to use the context's fetchStudyPlan
  useEffect(() => {
    let mounted = true;
    const loadStudyPlan = async () => {
      if (!user?.id) return;
      const plan = await fetchStudyPlan(folderId, user.id);
      if (mounted && plan) {
        setStudyPlan(plan);
      }
    };
    loadStudyPlan();

    return () => {
      mounted = false;
    };
  }, [folderId, user?.id, fetchStudyPlan]);

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

  // Update the generateStudyPlan function to use setStudyPlan from context
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
    setRetryCount(0);

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

    tryGenerate(0);
  }, [documents, user, folderId, isGenerating, GENERATION_TIMEOUT, setStudyPlan]);

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
                    expandedLessons
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
                      Are you sure you want to regenerate the study plan?
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