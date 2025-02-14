'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowLeftCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface LessonContent {
  title: string;
  content: string;
  objectives: string[];
  examples: Array<{
    title: string;
    code?: string;
    explanation: string;
  }>;
  exercises: Array<{
    question: string;
    hint?: string;
  }>;
  summary: string;
}

interface AnswerAnalysis {
  isCorrect: boolean;
  score: number;
  feedback: string;
  suggestions: string[];
  conceptsToReview: string[];
}

interface ExerciseState {
  answer: string;
  isSubmitting: boolean;
  analysis: AnswerAnalysis | null;
}

type PageType = 'content' | 'questions';

export default function LessonPage({ 
  params 
}: { 
  params: { id: string; lessonId: string } 
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('content');
  const [exerciseStates, setExerciseStates] = useState<Record<number, ExerciseState>>({});
  const [studyPlan, setStudyPlan] = useState<any>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<{ chapterIndex: number, lessonIndex: number }>({ chapterIndex: -1, lessonIndex: -1 });

  useEffect(() => {
    async function fetchLessonContent() {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // First get the study plan to find the lesson
        const { data: studyPlanData, error: studyPlanError } = await supabase
          .from('study_plans')
          .select('*')
          .eq('folder_id', params.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (studyPlanError) {
          throw studyPlanError;
        }

        if (!studyPlanData) {
          setError('Study plan not found');
          return;
        }

        const parsedStudyPlan = JSON.parse(studyPlanData.content);
        setStudyPlan(parsedStudyPlan); // Store the entire study plan
        let lessonInfo = null;
        let foundChapterIndex = -1;
        let foundLessonIndex = -1;

        // Find the lesson in the study plan
        for (let i = 0; i < parsedStudyPlan.chapters.length; i++) {
          const chapter = parsedStudyPlan.chapters[i];
          const lessonIndex = chapter.lessons.findIndex((l: { title: string }) => 
            l.title.toLowerCase().replace(/\s+/g, '-') === params.lessonId
          );
          if (lessonIndex !== -1) {
            lessonInfo = chapter.lessons[lessonIndex];
            foundChapterIndex = i;
            foundLessonIndex = lessonIndex;
            break;
          }
        }
        setCurrentLessonIndex({ chapterIndex: foundChapterIndex, lessonIndex: foundLessonIndex });

        if (!lessonInfo) {
          setError('Lesson not found');
          return;
        }

        // Check if lesson content already exists in the database
        const { data: existingLesson, error: lessonError } = await supabase
          .from('lesson_contents')
          .select('*')
          .eq('folder_id', params.id)
          .eq('lesson_id', params.lessonId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (lessonError) {
          throw lessonError;
        }

        if (existingLesson?.content) {
          // Use existing lesson content
          try {
            const parsedContent = JSON.parse(existingLesson.content);
            setLessonContent(parsedContent);
            setIsLoading(false);
            return;
          } catch (parseError) {
            console.error('Error parsing existing lesson content:', parseError);
            // Continue to generate new content if parsing fails
          }
        }

        // If no existing content or parsing failed, generate new content
        console.log('Calling Edge Function with:', {
          lessonTitle: lessonInfo.title,
          lessonDescription: lessonInfo.description,
          keyPoints: lessonInfo.keyPoints,
        });

        const { data: generatedContent, error: functionError } = await supabase.functions.invoke(
          'generate-lesson-content',
          {
            body: {
              lessonTitle: lessonInfo.title,
              lessonDescription: lessonInfo.description,
              keyPoints: lessonInfo.keyPoints,
            },
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
          }
        );

        console.log('Edge Function response:', { generatedContent, functionError });

        if (functionError) {
          console.error('Edge Function error:', functionError);
          throw new Error(functionError.message || 'Failed to generate lesson content');
        }

        if (!generatedContent?.lessonContent) {
          console.error('Invalid Edge Function response:', generatedContent);
          throw new Error('Invalid response format - missing lesson content');
        }

        // Store the generated content in the database using upsert
        const { error: upsertError } = await supabase
          .from('lesson_contents')
          .upsert(
            {
              folder_id: params.id,
              lesson_id: params.lessonId,
              user_id: user.id,
              content: JSON.stringify(generatedContent.lessonContent),
              created_at: new Date().toISOString()
            },
            {
              onConflict: 'folder_id,lesson_id,user_id',
              ignoreDuplicates: false
            }
          );

        if (upsertError) {
          throw upsertError;
        }

        setLessonContent(generatedContent.lessonContent);
      } catch (err) {
        console.error('Error fetching lesson:', err);
        setError('Failed to load lesson content');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLessonContent();
  }, [params.id, params.lessonId, user]);

  const renderContentPage = () => (
    <div className="prose prose-indigo max-w-none">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Learning Objectives</h2>
        <ul className="list-disc pl-6 space-y-2">
          {lessonContent?.objectives.map((objective, index) => (
            <li key={index} className="text-gray-700">{objective}</li>
          ))}
        </ul>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Content</h2>
        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
          {lessonContent?.content}
        </div>
      </div>

      {lessonContent?.examples && lessonContent.examples.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Examples</h2>
          <div className="space-y-6">
            {lessonContent.examples.map((example, index) => (
              <div key={index} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-medium text-lg mb-3 text-gray-900">{example.title}</h3>
                {example.code && (
                  <div className="mb-4">
                    <SyntaxHighlighter 
                      language="javascript" 
                      style={atomDark}
                      className="rounded-md"
                    >
                      {example.code}
                    </SyntaxHighlighter>
                  </div>
                )}
                <p className="text-gray-700">{example.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-3">Summary</h2>
        <p className="text-gray-700 leading-relaxed">{lessonContent?.summary}</p>
      </div>
    </div>
  );

  const handleAnswerChange = (exerciseIndex: number, answer: string) => {
    setExerciseStates(prev => ({
      ...prev,
      [exerciseIndex]: {
        ...prev[exerciseIndex],
        answer
      }
    }));
  };

  const handleSubmitAnswer = async (exerciseIndex: number) => {
    if (!lessonContent) return;

    const exercise = lessonContent.exercises[exerciseIndex];
    const answer = exerciseStates[exerciseIndex]?.answer;

    if (!answer?.trim()) return;

    setExerciseStates(prev => ({
      ...prev,
      [exerciseIndex]: {
        ...prev[exerciseIndex],
        isSubmitting: true
      }
    }));

    try {
      const { data, error: functionError } = await supabase.functions.invoke('answer-analysis', {
        body: {
          question: exercise.question,
          answer: answer,
          lessonContext: lessonContent.content
        },
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to analyze answer');
      }

      if (!data?.analysis) {
        throw new Error('Invalid response format - missing analysis');
      }

      setExerciseStates(prev => ({
        ...prev,
        [exerciseIndex]: {
          ...prev[exerciseIndex],
          isSubmitting: false,
          analysis: data.analysis
        }
      }));
    } catch (error) {
      console.error('Error submitting answer:', error);
      setExerciseStates(prev => ({
        ...prev,
        [exerciseIndex]: {
          ...prev[exerciseIndex],
          isSubmitting: false
        }
      }));
    }
  };

  const renderAnalysis = (analysis: AnswerAnalysis) => (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2">
        {analysis.isCorrect ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Correct Answer!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Needs Improvement</span>
          </div>
        )}
      </div>

      <Alert variant={analysis.isCorrect ? "default" : "destructive"}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Feedback</AlertTitle>
        <AlertDescription className="mt-2">{analysis.feedback}</AlertDescription>
      </Alert>

      {analysis.suggestions.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Suggestions for Improvement:</h4>
          <ul className="list-disc pl-5 space-y-2">
            {analysis.suggestions.map((suggestion, index) => (
              <li key={index} className="text-gray-700">{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.conceptsToReview.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Concepts to Review:</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.conceptsToReview.map((concept, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderQuestionsPage = () => (
    <div className="prose prose-indigo max-w-none">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Practice Exercises</h2>
        <p className="text-gray-600 mt-2">
          Complete these exercises to test your understanding of the lesson content.
        </p>
      </div>

      <div className="space-y-12">
        {lessonContent?.exercises.map((exercise, index) => (
          <div key={index} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                Exercise {index + 1}
              </div>
              {exerciseStates[index]?.analysis && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  exerciseStates[index]?.analysis?.isCorrect 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  Score: {exerciseStates[index]?.analysis?.score}/100
                </div>
              )}
            </div>
            
            <p className="text-gray-800 text-lg mb-6">{exercise.question}</p>
            
            <div className="space-y-4">
              <Textarea
                placeholder="Type your answer here..."
                value={exerciseStates[index]?.answer || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                className="min-h-[120px] w-full"
              />

              {exercise.hint && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-blue-800 font-medium mb-1">💡 Hint:</p>
                  <p className="text-blue-700">{exercise.hint}</p>
                </div>
              )}

              <Button
                onClick={() => handleSubmitAnswer(index)}
                disabled={exerciseStates[index]?.isSubmitting || !exerciseStates[index]?.answer?.trim()}
                className="w-full sm:w-auto"
              >
                {exerciseStates[index]?.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Submit Answer'
                )}
              </Button>

              {exerciseStates[index]?.analysis && renderAnalysis(exerciseStates[index]!.analysis)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const navigateToNextLesson = () => {
    if (!studyPlan) return;

    const { chapterIndex, lessonIndex } = currentLessonIndex;
    if (chapterIndex === -1 || lessonIndex === -1) return;

    const currentChapter = studyPlan.chapters[chapterIndex];

    // Check if there's a next lesson in the current chapter
    if (lessonIndex < currentChapter.lessons.length - 1) {
      const nextLesson = currentChapter.lessons[lessonIndex + 1];
      router.push(`/features/${params.id}/lessons/${nextLesson.title.toLowerCase().replace(/\s+/g, '-')}`);
    } else if (chapterIndex < studyPlan.chapters.length - 1) {
      // If it's the last lesson of the chapter, go to the first lesson of the next chapter
      const nextChapter = studyPlan.chapters[chapterIndex + 1];
      if (nextChapter.lessons.length > 0) {
        const nextLesson = nextChapter.lessons[0];
        router.push(`/features/${params.id}/lessons/${nextLesson.title.toLowerCase().replace(/\s+/g, '-')}`);
      }
    }
  };

  const navigateToPreviousLesson = () => {
    if (!studyPlan) return;

    const { chapterIndex, lessonIndex } = currentLessonIndex;
    if (chapterIndex === -1 || lessonIndex === -1) return;

    // Check if there is a previous lesson within the current chapter
    if (lessonIndex > 0) {
      const previousLesson = studyPlan.chapters[chapterIndex].lessons[lessonIndex - 1];
      router.push(`/features/${params.id}/lessons/${previousLesson.title.toLowerCase().replace(/\s+/g, '-')}`);
    } else if (chapterIndex > 0) {
      // If it's the first lesson of the chapter, go to the last lesson of the previous chapter
      const previousChapter = studyPlan.chapters[chapterIndex - 1];
      const previousLesson = previousChapter.lessons[previousChapter.lessons.length - 1];
      router.push(`/features/${params.id}/lessons/${previousLesson.title.toLowerCase().replace(/\s+/g, '-')}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Loading lesson...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !lessonContent) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error || 'Lesson not found'}
            </h1>
            <button
              onClick={() => router.back()}
              className="text-indigo-600 hover:text-indigo-500 flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Learning Path
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <ArrowLeftCircle className="w-5 h-5" />
            Back to Learning Path
          </button>
          <div className="flex items-center gap-4">
            <Button
              variant={currentPage === 'content' ? 'default' : 'outline'}
              onClick={() => setCurrentPage('content')}
              className="flex items-center gap-2"
            >
              Content
            </Button>
            <Button
              variant={currentPage === 'questions' ? 'default' : 'outline'}
              onClick={() => setCurrentPage('questions')}
              className="flex items-center gap-2"
            >
              Practice
            </Button>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl">{lessonContent?.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {currentPage === 'content' ? renderContentPage() : renderQuestionsPage()}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mt-8">
          <Button
            onClick={navigateToPreviousLesson}
            disabled={currentLessonIndex.chapterIndex === 0 && currentLessonIndex.lessonIndex === 0}
            className="flex items-center gap-2"
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Lesson
          </Button>
          
          <Button
            onClick={navigateToNextLesson}
            disabled={
              currentLessonIndex.chapterIndex === (studyPlan?.chapters.length ?? 0) - 1 &&
              currentLessonIndex.lessonIndex === (studyPlan?.chapters[currentLessonIndex.chapterIndex]?.lessons.length ?? 0) - 1
            }
            className="flex items-center gap-2"
          >
            Next Lesson
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 