export interface PatientSummary {
  patientId: string;
  patientInfo?: {
    name?: string;
    dob?: string;
    gender?: string;
  };
  generatedAt: string;
  version: number;
  sources: {
    documentCount: number;
    lastDocumentId?: string;
    documents: { id: string; type?: string; uploadedAt: string }[];
  };
  diagnoses: Diagnosis[];
  medications: Medication[];
  labs: Labs;
  visits: Visit[];
  alerts: Alert[];
  aiSummary?: AISummary;
  manualCorrections?: Correction[];
  meta?: any;
}

export interface Diagnosis {
  id: string;
  name: string;
  severity: string;
  status: 'active' | 'inactive' | 'resolved';
  firstSeen: string;
  lastSeen: string;
  sourceDocs: { docId: string; confidence: number }[];
  hiddenByUser?: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  status: 'active' | 'inactive' | 'stopped';
  startDate: string;
  sourceDocs: { docId: string; confidence: number }[];
  hiddenByUser?: boolean;
}

export interface Labs {
    latest: { test: string; value: string; date: string, sourceDoc: string }[];
    trends: Record<string, { date: string; value: number }[]>;
}

export interface Visit {
    visitId: string;
    date: string;
    doctor: string;
    reason: string;
    documents: string[];
    lastCheckup?: string;
}

export interface Alert {
    id:string;
    level: 'critical' | 'warning' | 'info';
    message: string;
}

export interface AISummary {
    oneLine: string;
    paragraph: string;
    confidence: number;
}

export interface Correction {
    field: string;
    userId: string;
    action: 'edited' | 'hidden';
    valueBefore: any;
    valueAfter: any;
    timestamp: string;
}