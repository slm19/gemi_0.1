// src/components/features/tabs/ChapterDisplay.tsx
import React, { useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { LessonDisplay } from './LessonDisplay'; // Import LessonDisplay
import { motion } from 'framer-motion';
import { Progress } from "@/components/ui/progress"

interface Chapter {
  title: string;
  description: string;
  lessons: any[];
}

interface ChapterDisplayProps {
  chapter: Chapter;
  expanded: boolean;
  onToggle: () => void;
  expandedLessons: Record<string, boolean>;
  onToggleLesson: (lessonId: string) => void;
  navigateToLesson: (lessonTitle: string) => void;
  userProgress?: Record<string, boolean>;
  onToggleComplete?: (chapterTitle: string, lessonTitle: string) => void;
}

export function ChapterDisplay({ 
  chapter, 
  expanded, 
  onToggle, 
  expandedLessons, 
  onToggleLesson, 
  navigateToLesson, 
  userProgress = {}, // Provide default empty object
  onToggleComplete 
}: ChapterDisplayProps) {

  const chapterProgress = useMemo(() => {
    if (!chapter.lessons || chapter.lessons.length === 0) {
      return 0;
    }

    let completedCount = 0;
    chapter.lessons.forEach(lesson => {
      const lessonId = `${chapter.title}-${lesson.title}`;
      if (userProgress && userProgress[lessonId]) {
        completedCount++;
      }
    });

    return Math.round((completedCount / chapter.lessons.length) * 100);
  }, [chapter.lessons, userProgress, chapter.title]);

  const chapterVariants = {
    open: { opacity: 1, height: "auto" },
    closed: { opacity: 0, height: 0 }
  };

  return (
    <div className="mb-4 border rounded-lg p-4">
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <h3 className="text-lg font-semibold">{chapter.title}</h3>
        <div className="ml-auto">
          <Progress value={chapterProgress} className='h-2 w-32'/>
        </div>
      </div>

      <motion.div
        variants={chapterVariants}
        animate={expanded ? "open" : "closed"}
        initial="closed"
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {expanded && (
          <div className="mt-2 space-y-4">
            <p className="text-gray-600">{chapter.description}</p>
            {chapter.lessons.map((lesson, lessonIndex) => (
              <LessonDisplay
                key={lessonIndex}
                lesson={lesson}
                chapterTitle={chapter.title}
                expanded={expandedLessons[`${chapter.title}-${lesson.title}`] || false}
                onToggle={() => onToggleLesson(`${chapter.title}-${lesson.title}`)}
                navigateToLesson={navigateToLesson}
                isComplete={userProgress[`${chapter.title}-${lesson.title}`] || false}
                onToggleComplete={onToggleComplete || (() => {})}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
} 