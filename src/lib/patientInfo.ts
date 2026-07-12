const STORAGE_KEY = "dentaloria_patient_contact";

export interface PatientContactInfo {
  name: string;
  email: string;
  phone: string;
}

export const savePatientContactInfo = (info: PatientContactInfo): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {
    // Ignore storage errors (e.g. private mode)
  }
};

export const loadPatientContactInfo = (): PatientContactInfo | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.name === "string" &&
      typeof parsed.email === "string" &&
      typeof parsed.phone === "string"
    ) {
      return parsed;
    }
  } catch {
    // Ignore parse/storage errors
  }
  return null;
};

export const clearPatientContactInfo = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
};
