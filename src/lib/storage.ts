import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized storage bucket configuration
 * All document storage operations should use these constants
 */
export const STORAGE_BUCKETS = {
  MEDICAL_DOCUMENTS: 'medical-documents',
} as const;

/**
 * Get a signed URL for a document
 * @param filePath - The file path in storage
 * @param expiresIn - URL expiry time in seconds (default 5 minutes)
 * @returns The signed URL string
 */
export async function getDocumentSignedUrl(filePath: string, expiresIn = 300): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.MEDICAL_DOCUMENTS)
    .createSignedUrl(filePath, expiresIn);
  
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Download a document from storage
 * @param filePath - The file path in storage
 * @returns Blob data of the document
 */
export async function downloadDocument(filePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.MEDICAL_DOCUMENTS)
    .download(filePath);
  
  if (error) throw error;
  return data;
}

/**
 * View a document by opening it in a new tab
 * @param filePath - The file path in storage
 */
export async function viewDocument(filePath: string): Promise<void> {
  const signedUrl = await getDocumentSignedUrl(filePath);
  window.open(signedUrl, '_blank');
}

/**
 * Download a document and trigger browser download
 * @param filePath - The file path in storage
 * @param filename - The filename to use for download
 */
export async function triggerDocumentDownload(filePath: string, filename: string): Promise<void> {
  const signedUrl = await getDocumentSignedUrl(filePath);
  const response = await fetch(signedUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
