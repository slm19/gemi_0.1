// src/components/features/documents/DocumentUploadLogic.tsx
import { useState, useRef, useCallback } from 'react';
import { Upload, X, File } from 'lucide-react';
import { supabase } from '@/lib/supabase/supabaseClient';

// Constants (consider moving these to a shared constants file)
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif'
] as const;

export const RETRY_CONFIG = {
    maxRetries: 2,
    initialDelay: 1000, // 1 second
    maxDelay: 5000, // 5 seconds
} as const;

export interface Document {
    id: string;
    name: string;
    size: number;
    url: string;
    path: string;
    folder_id: string;
}

interface DocumentUploadLogicProps {
  onUploadComplete?: (files: File[]) => void;
}

export function useDocumentUpload(props?: DocumentUploadLogicProps) {
  const [dragActive, setDragActive] = useState(false);
  const [tempFiles, setTempFiles] = useState<File[]>([]); // Use tempFiles
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to validate files
  const validateFiles = useCallback((files: File[]): File[] => {
    return files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`File ${file.name} is too large. Maximum size is 50MB.`);
        return false;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
        console.warn(`File ${file.name} has an unsupported file type.`);
        return false;
      }
      return true;
    });
  }, []);

  // Helper function for exponential backoff
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Sequential fetch helper
  const fetchWithRetry = async <T,>(
    operation: () => Promise<T>,
    retryCount = RETRY_CONFIG.maxRetries
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (retryCount > 0) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelay * Math.pow(2, RETRY_CONFIG.maxRetries - retryCount),
          RETRY_CONFIG.maxDelay
        );
        await wait(delay);
        return fetchWithRetry(operation, retryCount - 1);
      }
      throw error;
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = validateFiles(files);
    if(validFiles.length > 0){
        setTempFiles(validFiles);
    }
    if (props?.onUploadComplete && validFiles.length > 0) {
        props.onUploadComplete(validFiles);
    }
  }, [props, validateFiles]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
          setTempFiles(validFiles);
      }
      if (props?.onUploadComplete && validFiles.length > 0) {
          props.onUploadComplete(validFiles);
      }
    }
  }, [props, validateFiles]);

  const uploadFiles = async (files: File[], folderId: string, user: any): Promise<Document[]> => {
    const uploadedDocs: Document[] = [];

    for (const file of files) {
      const filePath = `${user?.id}/${folderId}/${file.name}`;

      try {
        const { data: docData } = await fetchWithRetry(async () => {
          // Upload file to storage
          const { data: storageData, error: storageError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (storageError) throw storageError;

          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

          // Create document record in the database
          const { data, error: docError } = await supabase
            .from('documents')
            .insert({
              name: file.name,
              size: file.size,
              url: publicUrl,
              path: filePath,
              folder_id: folderId,
              user_id: user?.id
            })
            .select()
            .single();

          if (docError) throw docError;
          return data;
        });

        if (docData) {
          uploadedDocs.push(docData as Document);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    return uploadedDocs;
  };

  const renderContent = () => {
    return (
      <>
        {tempFiles.length === 0 ? (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-12 h-12 text-gray-400" />
            <p className="text-gray-600">
              Drag and drop your files here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-600"
              >
                browse
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tempFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Upload className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  return {
    tempFiles,
    setTempFiles,
    dragActive,
    handleDrag,
    handleDrop,
    handleFileChange,
    validateFiles,
    fileInputRef,
    uploadFiles,
    renderContent
  };
} 