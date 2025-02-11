import { File, Download, Trash2 } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  size: number;
  url: string;
  path: string;
}

interface DocumentsTabProps {
  documents: Document[];
  onDownload: (document: Document) => Promise<void>;
  onDelete: (document: Document) => Promise<void>;
}

export function DocumentsTab({ documents, onDownload, onDelete }: DocumentsTabProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      {documents.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No documents in this folder
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {documents.map((document) => (
            <li
              key={document.id}
              className="p-4 hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <File className="w-5 h-5 text-gray-400" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {document.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {Math.round(document.size / 1024)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDownload(document)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDelete(document)}
                  className="p-2 text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 