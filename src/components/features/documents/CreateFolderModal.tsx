import { useState, useRef, useCallback } from 'react';
import { Upload, X, File, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDocumentUpload, Document, ALLOWED_FILE_TYPES } from './DocumentUploadLogic';
import { useRouter } from 'next/navigation';

// Error types for better error handling (duplicated for now - consider a shared types file)
type ErrorType =
  | 'FETCH_ERROR'
  | 'UPLOAD_ERROR'
  | 'CREATE_ERROR'
  | 'VALIDATION_ERROR'
  | 'STORAGE_ERROR';

interface AppError {
  type: ErrorType;
  message: string;
  details?: unknown;
}

const getUserFriendlyErrorMessage = (error: AppError): string => {
    switch (error.type) {
      case 'FETCH_ERROR':
        return 'Unable to load your folders. Please try again later.';
      case 'UPLOAD_ERROR':
        return 'There was an error uploading your files. Please try again.';
      case 'CREATE_ERROR':
        return 'Unable to create the folder. Please try again.';
      case 'VALIDATION_ERROR':
        return error.message; // Use the specific validation message
      case 'STORAGE_ERROR':
        return 'Unable to store your files. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  };


interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated: (folder: any) => void; // Adjust type as needed
}

export default function CreateFolderModal({ isOpen, onClose, onFolderCreated }: CreateFolderModalProps) {
    const { user } = useAuth();
    const [newFolderName, setNewFolderName] = useState('');
    const [error, setError] = useState<AppError | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { tempFiles, setTempFiles, dragActive, handleDrag, handleDrop, handleFileChange, validateFiles, fileInputRef, uploadFiles } = useDocumentUpload();
    const router = useRouter();

    const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim() || !user) {
      setError({
        type: 'VALIDATION_ERROR',
        message: 'Please enter a folder name'
      });
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
        // Create folder in database
        const { data: folder, error: folderError } = await supabase
          .from('folders')
          .insert({
            name: newFolderName.trim(),
            user_id: user.id
          })
          .select()
          .single();

        if (folderError) throw folderError;

        // Upload files and create document records (using shared logic)
        const uploadedDocs = await uploadFiles(tempFiles, folder.id, user);
        onFolderCreated({
          ...folder, 
          created_at: new Date(folder.created_at), 
          documents: uploadedDocs,
          documentCount: uploadedDocs.length
        });
        
        // Reset states
        setNewFolderName('');
        setTempFiles([]);
        setError(null);
        onClose();
        router.refresh();

    } catch (error) {
      console.error('Error creating folder:', error);
      setError({
        type: 'CREATE_ERROR',
        message: 'Failed to create folder',
        details: error
      });
    } finally {
      setIsUploading(false);
    }
  }, [newFolderName, tempFiles, user, setTempFiles, onFolderCreated, onClose, router, uploadFiles]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[32rem] max-w-[95vw]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Create New Folder</h2>
          <button
            onClick={() => {
              onClose();
              setTempFiles([]);
              setNewFolderName('');
              setError(null);
            }}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
            <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                {getUserFriendlyErrorMessage(error)}
                </AlertDescription>
            </Alert>
        )}

        {/* Folder Name Input */}
        <div className="mb-6">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name"
            className="w-full p-2 border rounded-md"
            autoFocus
            maxLength={50}
          />
        </div>

        {/* Document Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 mb-6 text-center
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_FILE_TYPES.join(',')}
            className="hidden"
            onChange={handleFileChange}
          />

          {tempFiles.length === 0 ? (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-12 h-12 text-gray-400" />
              <p className="text-gray-600">
                Drag and drop your files here, or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-500 hover:text-blue-600"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Supported files: PDF, Word, Text, Images (max 50MB)
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tempFiles.map((file: File, index: number) => (
                <div key={`${file.name}-${index}`} className="flex items-center gap-2">
                  <File className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{file.name}</span>
                  <span className="text-xs text-gray-400">
                    ({Math.round(file.size / 1024)} KB)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              onClose();
              setTempFiles([]);
              setNewFolderName('');
              setError(null);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim() || isUploading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Creating...' : 'Create Folder'}
          </button>
        </div>
      </div>
    </div>
  );
} 