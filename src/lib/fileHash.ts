/**
 * @function generateFileHash
 * @description Generates a SHA-256 hash of a file.
 * @param {File} file - The file to hash.
 * @returns {Promise<string>} - A promise that resolves with the hex-encoded hash of the file.
 */
export async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * @interface FileHashInfo
 * @description Defines the structure of an object containing file hash information.
 * @property {string} hash - The SHA-256 hash of the file.
 * @property {string} filename - The name of the file.
 * @property {number} size - The size of the file in bytes.
 * @property {string} contentType - The MIME type of the file.
 */
export interface FileHashInfo {
  hash: string;
  filename: string;
  size: number;
  contentType: string;
}

/**
 * @function getFileHashInfo
 * @description Generates a SHA-256 hash of a file and returns it along with other file information.
 * @param {File} file - The file to hash.
 * @returns {Promise<FileHashInfo>} - A promise that resolves with an object containing the file's hash, name, size, and content type.
 */
export async function getFileHashInfo(file: File): Promise<FileHashInfo> {
  const hash = await generateFileHash(file);
  return {
    hash,
    filename: file.name,
    size: file.size,
    contentType: file.type,
  };
}