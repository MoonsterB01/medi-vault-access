/**
 * File hashing utilities for tracking and blocking files
 */

export async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export interface FileHashInfo {
  hash: string;
  filename: string;
  size: number;
  contentType: string;
}

export async function getFileHashInfo(file: File): Promise<FileHashInfo> {
  const hash = await generateFileHash(file);
  return {
    hash,
    filename: file.name,
    size: file.size,
    contentType: file.type,
  };
}