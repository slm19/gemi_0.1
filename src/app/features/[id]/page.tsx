'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, File, Download, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverviewTab } from '@/components/features/tabs/OverviewTab';
import { LearnTab } from '@/components/features/tabs/LearnTab';
import { DocumentsTab } from '@/components/features/tabs/DocumentsTab';
import { use } from 'react';

interface Document {
  id: string;
  name: string;
  size: number;
  url: string;
  path: string;
}

interface Folder {
  id: string;
  name: string;
  created_at: Date;
  documents: Document[];
}

export default function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFolder() {
      try {
        if (!user) return;

        // Fetch folder
        const { data: folderData, error: folderError } = await supabase
          .from('folders')
          .select('*')
          .eq('id', resolvedParams.id)
          .eq('user_id', user.id)
          .single();

        if (folderError) throw folderError;
        if (!folderData) {
          setError('Folder not found');
          return;
        }

        // Fetch documents
        const { data: documents, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .eq('folder_id', resolvedParams.id)
          .eq('user_id', user.id);

        if (docsError) throw docsError;

        setFolder({
          ...folderData,
          created_at: new Date(folderData.created_at),
          documents: documents || []
        });
      } catch (error) {
        console.error('Error fetching folder:', error);
        setError('Failed to load folder');
      } finally {
        setIsLoading(false);
      }
    }

    fetchFolder();
  }, [resolvedParams.id, user]);

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.path);

      if (error) throw error;

      // Create a download link
      const url = window.URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  const handleDelete = async (document: Document) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      // Update state
      setFolder(prev => prev ? {
        ...prev,
        documents: prev.documents.filter(d => d.id !== document.id)
      } : null);
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Loading folder...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !folder) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error || 'Folder not found'}
            </h1>
            <button
              onClick={() => router.push('/')}
              className="text-indigo-600 hover:text-indigo-500 flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Folders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Folders
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{folder.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Created on {folder.created_at.toLocaleDateString()}
          </p>
        </div>

        {/* Tabs Interface */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="learn">Learn</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          <div className="mt-6">
            <TabsContent value="overview">
              <OverviewTab />
            </TabsContent>
            <TabsContent value="learn">
              <LearnTab documents={folder.documents} folderId={folder.id} />
            </TabsContent>
            <TabsContent value="documents">
              <DocumentsTab
                documents={folder.documents}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
} 