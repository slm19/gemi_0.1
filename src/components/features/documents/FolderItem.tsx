import React from 'react';
import { Folder } from 'lucide-react';

interface FolderItemProps {
    folder: {
      id: string;
      name: string;
      documents: any[];
      documentCount?: number;
    };
    onClick: (folder: any) => void;
}
  
export default function FolderItem({ folder, onClick }: FolderItemProps) {
    const documentCount = folder.documentCount ?? folder.documents.length;
    
    return (
      <div
        onClick={() => onClick(folder)}
        className="h-48 border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="h-full flex flex-col items-center justify-center gap-2">
          <Folder className="w-12 h-12 text-blue-500" />
          <h3 className="text-lg font-medium text-center">{folder.name}</h3>
          <p className="text-sm text-gray-500">
            {documentCount} document{documentCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    );
} 