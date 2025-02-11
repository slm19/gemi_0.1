// src/components/features/tabs/ChapterDisplay.tsx
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { LessonDisplay } from './LessonDisplay'; // Import LessonDisplay

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
}
export function ChapterDisplay({ chapter, expanded, onToggle, expandedLessons, onToggleLesson, navigateToLesson }: ChapterDisplayProps) {
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
      </div>

      {expanded && (
        <div className="ml-6 mt-2 space-y-4">
          <p className="text-gray-600">{chapter.description}</p>
          {chapter.lessons.map((lesson, lessonIndex) => (
            <LessonDisplay
              key={lessonIndex}
              lesson={lesson}
              chapterTitle={chapter.title}
              expanded={expandedLessons[`${chapter.title}-${lesson.title}`] || false}
              onToggle={() => onToggleLesson(`${chapter.title}-${lesson.title}`)}
              navigateToLesson={navigateToLesson}
            />
          ))}
        </div>
      )}
    </div>
  );
} 