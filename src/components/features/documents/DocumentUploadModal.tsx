import React from 'react';
import { X } from 'lucide-react';
import { useDocumentUpload, ALLOWED_FILE_TYPES } from './DocumentUploadLogic';

interface DocumentUploadModalProps {
    onClose: () => void;
    onUploadComplete: (files: File[]) => void;
}

export default function DocumentUploadModal({ onClose, onUploadComplete }: DocumentUploadModalProps) {
  const {
    tempFiles,
    dragActive,
    handleDrag,
    handleDrop,
    handleFileChange,
    fileInputRef,
    renderContent
  } = useDocumentUpload({ onUploadComplete });

  const handleSubmit = () => {
    if (tempFiles.length > 0) {
      onUploadComplete(tempFiles);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 w-[32rem] max-w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Upload Documents</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
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
                {renderContent()}
            </div>
            <div className="flex justify-end gap-2">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={tempFiles.length === 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Upload
                </button>
            </div>
        </div>
    </div>
  )
} 