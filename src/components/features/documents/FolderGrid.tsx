'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CreateFolderModal from './CreateFolderModal';
import FolderItem from './FolderItem';

type ErrorType =
  | 'FETCH_ERROR'
  | 'CREATE_ERROR'
  | 'VALIDATION_ERROR';

interface AppError {
  type: ErrorType;
  message: string;
  details?: unknown;
}

const getUserFriendlyErrorMessage = (error: AppError): string => {
  switch (error.type) {
    case 'FETCH_ERROR':
      return 'Unable to load your folders. Please try again later.';
    case 'CREATE_ERROR':
      return 'Unable to create the folder. Please try again.';
    case 'VALIDATION_ERROR':
      return error.message;
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
};

interface FolderItem {
  id: string;
  name: string;
  created_at: Date;
  documents: Document[] | { count: number }[];
  documentCount?: number;
}

interface Document {
  id: string;
  name: string;
  size: number;
  url: string;
  path: string;
  folder_id: string;
}

export default function FolderGrid() {
  const router = useRouter();
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchFolders() {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        const { data: foldersData, error: foldersError } = await supabase
          .from('folders')
          .select(`
            id,
            name,
            created_at,
            documents:documents(count)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (foldersError) throw foldersError;

        if (isMounted && foldersData) {
          const processedFolders: FolderItem[] = foldersData.map((folder) => ({
            id: folder.id,
            name: folder.name,
            created_at: new Date(folder.created_at),
            documents: [],
            documentCount: (folder.documents as any)?.[0]?.count || 0
          }));

          setFolders(processedFolders);
        }
      } catch (error: any) {
        console.error('Error fetching folders:', error);
        if (isMounted) {
          setError({
            type: 'FETCH_ERROR',
            message: 'Failed to load folders',
            details: error,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchFolders();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleFolderClick = useCallback((folder: FolderItem) => {
    router.push(`/features/${folder.id}`);
  }, [router]);

  const handleFolderCreated = useCallback((newFolder: FolderItem) => {
    setFolders(prev => [newFolder, ...prev]);
    router.push(`/features/${newFolder.id}`);
  }, [router]);

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading folders...</div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-6xl mx-auto p-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getUserFriendlyErrorMessage(error)}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Create Folder Button */}
          <button
            onClick={() => setIsCreating(true)}
            className="h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <FolderPlus className="w-12 h-12 text-gray-400" />
            <span className="text-gray-600">Create New Folder</span>
          </button>

          {/* Existing Folders */}
          {folders.map((folder) => (
            <FolderItem key={folder.id} folder={folder} onClick={handleFolderClick} />
          ))}
        </div>
      </div>

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onFolderCreated={handleFolderCreated}
      />
    </>
  );
} 