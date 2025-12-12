/**
 * IST (Indian Standard Time) utility functions
 * All time operations should use these utilities for consistency
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30

/**
 * Get current date and time in IST
 */
export function getCurrentIST(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + IST_OFFSET_MS);
}

/**
 * Get current date string in IST (YYYY-MM-DD format)
 */
export function getISTDateString(): string {
  const ist = getCurrentIST();
  return formatDateToString(ist);
}

/**
 * Get current time string in IST (HH:MM:SS format)
 */
export function getISTTimeString(): string {
  const ist = getCurrentIST();
  return ist.toTimeString().slice(0, 8);
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a given date is today in IST
 */
export function isTodayIST(date: Date): boolean {
  const todayIST = getISTDateString();
  const dateString = formatDateToString(date);
  return dateString === todayIST;
}

/**
 * Check if a time slot is in the past (for today's date)
 * @param slotDate - The date of the slot (YYYY-MM-DD or Date object)
 * @param slotTime - The time of the slot (HH:MM:SS or HH:MM format)
 * @returns true if the slot is in the past
 */
export function isSlotInPast(slotDate: string | Date, slotTime: string): boolean {
  const currentIST = getCurrentIST();
  const currentDateStr = getISTDateString();
  const currentTimeStr = getISTTimeString();
  
  const slotDateStr = typeof slotDate === 'string' 
    ? slotDate 
    : formatDateToString(slotDate);
  
  // If slot date is before today, it's in the past
  if (slotDateStr < currentDateStr) {
    return true;
  }
  
  // If slot date is after today, it's not in the past
  if (slotDateStr > currentDateStr) {
    return false;
  }
  
  // Same day - compare times
  // Normalize time format to HH:MM:SS for comparison
  const normalizedSlotTime = slotTime.length === 5 ? `${slotTime}:00` : slotTime;
  return normalizedSlotTime <= currentTimeStr;
}

/**
 * Check if a slot is closing soon (within specified minutes)
 * @param slotDate - The date of the slot
 * @param slotTime - The time of the slot (HH:MM:SS or HH:MM format)
 * @param withinMinutes - Minutes threshold (default 30)
 * @returns true if the slot is within the threshold
 */
export function isSlotClosingSoon(
  slotDate: string | Date, 
  slotTime: string, 
  withinMinutes: number = 30
): boolean {
  const currentIST = getCurrentIST();
  const currentDateStr = getISTDateString();
  
  const slotDateStr = typeof slotDate === 'string' 
    ? slotDate 
    : formatDateToString(slotDate);
  
  // Only relevant for today's slots
  if (slotDateStr !== currentDateStr) {
    return false;
  }
  
  // Parse slot time
  const [hours, minutes] = slotTime.split(':').map(Number);
  const slotDateTime = new Date(currentIST);
  slotDateTime.setHours(hours, minutes, 0, 0);
  
  // Calculate difference in minutes
  const diffMs = slotDateTime.getTime() - currentIST.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  return diffMinutes > 0 && diffMinutes <= withinMinutes;
}

/**
 * Check if a date should be disabled in the calendar (past dates in IST)
 */
export function isDateDisabledIST(date: Date): boolean {
  const todayIST = getCurrentIST();
  todayIST.setHours(0, 0, 0, 0);
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate < todayIST;
}

/**
 * Get confirmation deadline for an appointment
 * The deadline is the appointment datetime itself
 */
export function getConfirmationDeadline(appointmentDate: string, appointmentTime: string): string {
  // Create ISO timestamp in IST, then convert to UTC for storage
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const dateTime = new Date(`${appointmentDate}T${appointmentTime}`);
  
  // Adjust for IST offset (subtract 5:30 to get UTC)
  dateTime.setTime(dateTime.getTime() - IST_OFFSET_MS);
  
  return dateTime.toISOString();
}
