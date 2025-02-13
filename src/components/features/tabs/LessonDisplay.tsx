// src/components/features/tabs/LessonDisplay.tsx
import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

interface Lesson {
  title: string;
  description: string;
  keyPoints: string[];
  estimatedDuration: string;
}

interface LessonDisplayProps {
  lesson: Lesson;
  chapterTitle: string;
  expanded: boolean;
  onToggle: () => void;
  navigateToLesson: (lessonTitle: string) => void;
  isComplete: boolean;
  onToggleComplete: (chapterTitle: string, lessonTitle:string) => void;
}

export function LessonDisplay({ lesson, chapterTitle, expanded, onToggle, navigateToLesson, isComplete, onToggleComplete }: LessonDisplayProps) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm ml-8">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4
            className="font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
            onClick={() => navigateToLesson(lesson.title)}
          >
            {lesson.title}
          </h4>
          <div
            className="cursor-pointer mt-1"
            onClick={onToggle}
          >
            <p className="text-sm text-gray-600">{lesson.description}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
              <Clock className="w-4 h-4" />
              <span>{lesson.estimatedDuration}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 