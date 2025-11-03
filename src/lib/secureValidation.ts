import { z } from "zod";

/**
 * Secure validation schemas for user inputs
 * These prevent injection attacks and ensure data integrity
 */

// Common validation patterns
const SAFE_TEXT_REGEX = /^[a-zA-Z0-9\s\-_.,!?()'"]*$/;
const PHONE_REGEX = /^\+?[\d\s\-()]{10,15}$/;
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

/**
 * @constant {z.ZodObject} patientSchema
 * @description A Zod schema for validating patient information.
 */
export const patientSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" })
    .regex(NAME_REGEX, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" }),
  
  dob: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" })
    .refine((date) => {
      const parsedDate = new Date(date);
      const now = new Date();
      const minAge = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
      return parsedDate <= now && parsedDate >= minAge;
    }, { message: "Please enter a valid birth date" }),
    
  gender: z.union([
    z.literal("Male"),
    z.literal("Female"), 
    z.literal("Other"),
    z.literal("Unknown")
  ]).refine((value) => ["Male", "Female", "Other", "Unknown"].includes(value), {
    message: "Please select a valid gender"
  }),
  
  primary_contact: z.string()
    .trim()
    .refine((value) => {
      // Either email or phone
      return z.string().email().safeParse(value).success || 
             PHONE_REGEX.test(value);
    }, { message: "Please enter a valid email or phone number" }),
});

/**
 * Extended schema for editing patient information with optional fields
 */
export const editPatientSchema = patientSchema.extend({
  blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', '']).optional(),
  allergies: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  emergency_contact: z.object({
    name: z.string().trim().min(2).max(100).regex(NAME_REGEX, "Name can only contain letters, spaces, hyphens, and apostrophes"),
    phone: z.string().regex(PHONE_REGEX, "Invalid phone number format")
  }).optional(),
  medical_notes: z.string().trim().max(2000, "Medical notes must be less than 2000 characters").optional()
});

/**
 * @constant {z.ZodObject} documentSchema
 * @description A Zod schema for validating document upload information.
 */
export const documentSchema = z.object({
  filename: z.string()
    .trim()
    .min(1, { message: "Filename is required" })
    .max(255, { message: "Filename must be less than 255 characters" })
    .regex(/^[a-zA-Z0-9\s\-_().\[\]]+$/, { message: "Filename contains invalid characters" }),
    
  description: z.string()
    .trim()
    .max(1000, { message: "Description must be less than 1000 characters" })
    .regex(SAFE_TEXT_REGEX, { message: "Description contains invalid characters" })
    .optional(),
    
  tags: z.array(z.string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9\s\-_]+$/, { message: "Tags can only contain alphanumeric characters, spaces, hyphens, and underscores" })
  ).max(10, { message: "Maximum 10 tags allowed" }).optional(),
  
  document_type: z.string()
    .regex(/^[a-zA-Z0-9\s\-_]+$/, { message: "Document type contains invalid characters" })
    .optional(),
});

/**
 * @constant {z.ZodObject} appointmentSchema
 * @description A Zod schema for validating appointment booking information.
 */
export const appointmentSchema = z.object({
  appointment_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" })
    .refine((date) => {
      const appointmentDate = new Date(date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return appointmentDate >= now;
    }, { message: "Appointment date cannot be in the past" }),
    
  appointment_time: z.string()
    .regex(/^\d{2}:\d{2}$/, { message: "Time must be in HH:MM format" }),
    
  chief_complaint: z.string()
    .trim()
    .min(5, { message: "Chief complaint must be at least 5 characters" })
    .max(500, { message: "Chief complaint must be less than 500 characters" })
    .regex(SAFE_TEXT_REGEX, { message: "Chief complaint contains invalid characters" }),
    
  patient_notes: z.string()
    .trim()
    .max(1000, { message: "Notes must be less than 1000 characters" })
    .regex(SAFE_TEXT_REGEX, { message: "Notes contain invalid characters" })
    .optional(),
});

/**
 * @constant {z.ZodObject} searchSchema
 * @description A Zod schema for validating search query information.
 */
export const searchSchema = z.object({
  query: z.string()
    .trim()
    .min(1, { message: "Search query is required" })
    .max(200, { message: "Search query must be less than 200 characters" })
    .regex(SAFE_TEXT_REGEX, { message: "Search query contains invalid characters" }),
    
  document_type: z.string()
    .regex(/^[a-zA-Z0-9\s\-_]*$/, { message: "Document type contains invalid characters" })
    .optional(),
    
  tags: z.array(z.string()
    .regex(/^[a-zA-Z0-9\s\-_]+$/)
  ).max(5).optional(),
});

/**
 * @function sanitizeInput
 * @description Sanitizes user input by removing potentially dangerous characters. Use this as a last resort - prefer validation schemas.
 * @param {string} input - The input string to sanitize.
 * @returns {string} - The sanitized string.
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
}

/**
 * @constant {z.ZodObject} fileUploadSchema
 * @description A Zod schema for validating file uploads.
 */
export const fileUploadSchema = z.object({
  file: z.object({
    name: z.string()
      .regex(/^[a-zA-Z0-9\s\-_().\[\]]+$/, { message: "Filename contains invalid characters" }),
    size: z.number()
      .max(50 * 1024 * 1024, { message: "File size must be less than 50MB" }),
    type: z.string()
      .refine((type) => {
        const allowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/tiff',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        return allowedTypes.includes(type);
      }, { message: "File type not allowed" })
  })
});