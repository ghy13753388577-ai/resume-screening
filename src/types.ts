export interface JobPosition {
  id: string;
  title: string;
  requirements: JobRequirements;
  resumes: ResumeData[];
  createdAt: number;
}

export interface JobRequirements {
  jobTitle: string;
  requiredSkills: string[];
  preferredSkills: string[];
  targetCompanies: string[];
  targetPositions: string[];
  targetSchools: string[];
  minEducation: string;
  minExperience: string;
  bonusSkills: string[];
  bonusCertificates: string[];
  jobDescription: string;
  // Kill-switches
  killSwitchEducation: boolean;
  killSwitchExperience: boolean;
  killSwitchCompany: boolean;
  killSwitchSchool: boolean;
  // Weights (total should be 100)
  weights: {
    skills: number;
    experience: number;
    education: number;
    company: number;
  };
}

export interface ResumeData {
  id: string;
  fileName: string;
  fileType: string;
  uploadDate: number;
  content?: string;
  base64?: string;
  parsedData?: any;
  evaluation?: EvaluationResult;
  status: 'pending' | 'parsing' | 'evaluating' | 'completed' | 'error' | 'rejected';
  errorMsg?: string;
  isDuplicate?: boolean;
  duplicateInfo?: {
    originalId: string;
    prevDate: number;
    prevStatus: string;
  };
}

export interface EvaluationResult {
  score: number;
  summary: string;
  aiOverview: string; // 3-second summary
  pros: string[];
  cons: string[];
  skillMatches: {
    skill: string;
    matched: boolean;
  }[];
  radarData: {
    subject: string;
    value: number;
  }[];
  matchDetails: {
    skills: number;
    experience: number;
    education: number;
    company: number;
  };
  rejected: boolean;
}
