export interface Diagnosis {
  crop: string;
  issue_detected: string;
  confidence_level: number;
  severity: "Low" | "Medium" | "High";
}

export interface Intervention {
  immediate_action: string;
  organic_remedy: string;
  prevention_plan: string[];
}

export interface Localization {
  english_summary: string;
  phonetic_dialect_script: string;
  target_dialect: string;
}

export interface CreditMetadata {
  compliance_weight: number;
  economic_impact_score: number;
}

export interface AgriSynqResponse {
  diagnosis: Diagnosis;
  intervention: Intervention;
  localization: Localization;
  credit_metadata: CreditMetadata;
  climate_schedule: string[];
}

export interface DiagnosisRecord extends AgriSynqResponse {
  id?: string;
  userId: string;
  timestamp: any; // Firestore Timestamp
  imageUrl?: string;
  description?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  preferredDialect: "Twi" | "Ga" | "Ewe" | "Yoruba" | "Hausa" | "Fante";
  location?: string;
  creditScore?: number;
}
