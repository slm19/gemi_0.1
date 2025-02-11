-- Create a table for folders
CREATE TABLE folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create a table for documents
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    url TEXT NOT NULL,
    path TEXT NOT NULL,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create a table for study plans
CREATE TABLE study_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT study_plans_folder_id_user_id_key UNIQUE (folder_id, user_id)
);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true);

-- Set up Row Level Security (RLS)
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

-- Policies for folders table
CREATE POLICY "Users can view their own folders" 
ON folders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders" 
ON folders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
ON folders FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
ON folders FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for documents table
CREATE POLICY "Users can view their own documents" 
ON documents FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" 
ON documents FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
ON documents FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
ON documents FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for study_plans table
CREATE POLICY "Users can view their own study plans"
ON study_plans FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study plans"
ON study_plans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plans"
ON study_plans FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plans"
ON study_plans FOR DELETE 
USING (auth.uid() = user_id);

-- Storage policies
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow authenticated users to read their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow authenticated users to delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create indexes for better performance
CREATE INDEX folders_user_id_idx ON folders(user_id);
CREATE INDEX documents_folder_id_idx ON documents(folder_id);
CREATE INDEX documents_user_id_idx ON documents(user_id);
CREATE INDEX study_plans_folder_id_idx ON study_plans(folder_id);
CREATE INDEX study_plans_user_id_idx ON study_plans(user_id);

-- Comments explaining the structure
COMMENT ON TABLE folders IS 'Stores folder information for each user';
COMMENT ON TABLE documents IS 'Stores document metadata and references to storage';
COMMENT ON TABLE study_plans IS 'Stores study plans generated from documents in folders';
COMMENT ON COLUMN folders.user_id IS 'References auth.users to link folders to users';
COMMENT ON COLUMN documents.folder_id IS 'References folders to organize documents';
COMMENT ON COLUMN documents.path IS 'Storage path in format: user_id/folder_id/filename';
COMMENT ON COLUMN documents.url IS 'Public URL for accessing the file';
COMMENT ON COLUMN study_plans.folder_id IS 'References folders to link study plans to folders';
COMMENT ON COLUMN study_plans.user_id IS 'References auth.users to link study plans to users';
COMMENT ON COLUMN study_plans.content IS 'The AI-generated study plan content based on folder documents';
COMMENT ON COLUMN study_plans.created_at IS 'Timestamp when the study plan was first created';
COMMENT ON COLUMN study_plans.updated_at IS 'Timestamp when the study plan was last updated';

-- Configuration Summary:
/*
This configuration sets up:

1. Tables:
   - folders: Stores folder metadata
   - documents: Stores document metadata
   - study_plans: Stores AI-generated study plans

2. Storage:
   - Bucket: 'documents' for storing files
   - Path format: {user_id}/{folder_id}/{filename}

3. Security:
   - Row Level Security (RLS) enabled on all tables
   - Policies ensure users can only access their own data
   - Storage policies restrict access to user's own files

4. Performance:
   - Indexes on frequently queried columns
   - Cascading deletes for cleanup
   - Unique constraint on study plans per folder/user

5. File Structure:
   - Files are stored in user-specific paths
   - Metadata and storage are linked through the path field
   - Study plans are linked to folders and users
*/ 