import { useDocumentUpload, ALLOWED_FILE_TYPES } from './DocumentUploadLogic';

interface InlineDocumentUploadProps {
  onUploadComplete: (files: File[]) => void;
}

export default function InlineDocumentUpload({ onUploadComplete }: InlineDocumentUploadProps) {
  const {
    tempFiles,
    dragActive,
    handleDrag,
    handleDrop,
    handleFileChange,
    fileInputRef,
    renderContent
  } = useDocumentUpload({ onUploadComplete });

  return (
    <>
      <div
        className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${tempFiles.length > 0 ? 'bg-gray-50' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept={ALLOWED_FILE_TYPES.join(',')}
        />
        {renderContent()}
      </div>
    </>
  );
} 