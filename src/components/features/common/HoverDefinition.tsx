import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface HoverDefinitionProps {
  term: string;
  definition: string;
}

export function HoverDefinition({ term, definition }: HoverDefinitionProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="underline decoration-dotted cursor-help">{term}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 