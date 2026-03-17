export interface JobRequirements {
  jobTitle: string;
  requiredSkills: string[];
  preferredSkills: string[];
  targetCompanies: string[];
  targetPositions: string[];
  minEducation: string;
  minExperience: string;
  bonusSkills: string[];
  bonusCertificates: string[];
  jobDescription: string;
}

export interface ResumeData {
  id: string;
  fileName: string;
  fileType: string;
  content?: string;
  base64?: string;
  parsedData?: any;
  evaluation?: EvaluationResult;
  status: 'pending' | 'parsing' | 'evaluating' | 'completed' | 'error';
  errorMsg?: string;
}

export interface EvaluationResult {
  score: number;
  summary: string;
  pros: string[];
  cons: string[];
  matchDetails: {
    skills: number;
    experience: number;
    education: number;
    company: number;
  };
}
