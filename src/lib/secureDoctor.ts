import { supabase } from "@/integrations/supabase/client";

/**
 * @interface PublicDoctorInfo
 * @description Defines the structure of a public-facing doctor information object.
 */
export interface PublicDoctorInfo {
  id: string;
  doctor_id: string;
  specialization: string;
  is_available: boolean;
  working_hours: any;
  hospital_affiliations: string[];
  qualifications: string[];
  profile_image_url?: string;
}

/**
 * @interface FullDoctorInfo
 * @description Defines the structure of a full doctor information object, including sensitive data.
 * @extends PublicDoctorInfo
 */
export interface FullDoctorInfo extends PublicDoctorInfo {
  bio?: string;
  years_experience: number;
  consultation_fee: number;
  user_id: string;
  users?: {
    name: string;
    email: string;
  };
}

/**
 * @function getSecureDoctorInfo
 * @description Fetches doctor information with appropriate filtering based on authentication status. Anonymous users only see basic professional information, while authenticated users see full profiles including sensitive data.
 * @param {string} [doctorId] - The ID of the doctor to fetch. If not provided, fetches all doctors.
 * @returns {Promise<{data: PublicDoctorInfo[] | FullDoctorInfo[] | null; error: any;}>} - A promise that resolves with an object containing the doctor data and any error that occurred.
 */
export async function getSecureDoctorInfo(doctorId?: string): Promise<{
  data: PublicDoctorInfo[] | FullDoctorInfo[] | null;
  error: any;
}> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    const isAuthenticated = !!user;

    if (isAuthenticated) {
      // Authenticated users get full doctor information
      let query = supabase
        .from('doctors')
        .select(`
          id,
          doctor_id,
          specialization,
          is_available,
          working_hours,
          hospital_affiliations,
          qualifications,
          profile_image_url,
          bio,
          years_experience,
          consultation_fee,
          user_id,
          users!inner(name, email)
        `);

      if (doctorId) {
        query = query.eq('id', doctorId);
      }

      const { data, error } = await query;
      return { data: data as FullDoctorInfo[], error };
    } else {
      // Anonymous users get only basic information
      let query = supabase
        .from('doctors')
        .select(`
          id,
          doctor_id,
          specialization,
          is_available,
          working_hours,
          hospital_affiliations,
          qualifications,
          profile_image_url
        `);

      if (doctorId) {
        query = query.eq('id', doctorId);
      }

      const { data, error } = await query;
      return { data: data as PublicDoctorInfo[], error };
    }
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * @function isFullDoctorInfo
 * @description A type guard to check if a doctor information object includes sensitive data.
 * @param {PublicDoctorInfo | FullDoctorInfo} doctor - The doctor information object to check.
 * @returns {doctor is FullDoctorInfo} - `true` if the object is of type `FullDoctorInfo`, `false` otherwise.
 */
export function isFullDoctorInfo(doctor: PublicDoctorInfo | FullDoctorInfo): doctor is FullDoctorInfo {
  return 'consultation_fee' in doctor;
}