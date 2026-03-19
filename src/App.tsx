import React, { useState, useCallback, useMemo, ChangeEvent, ReactNode, Component, ErrorInfo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';
import { 
  ClipboardList, 
  Upload, 
  Search, 
  Trash2, 
  Save, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  User,
  Star,
  Building2,
  GraduationCap,
  Briefcase,
  Sparkles,
  X,
  Settings,
  ChevronDown,
  ChevronUp,
  Sliders,
  LayoutDashboard,
  Check,
  Info,
  Plus,
  History,
  Copy,
  Layers,
  Pencil,
  Phone
} from 'lucide-react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { cn } from '@/src/lib/utils';
import { JobRequirements, ResumeData, JobPosition } from './types';
import { parseResume, evaluateResume } from './services/gemini';
import { TagInput } from './components/TagInput';
import { JOB_RECOMMENDATIONS, COMPANY_LIBRARIES, SCHOOL_LIBRARIES } from './constants';
import mammoth from 'mammoth';

export default function App() {
  const formatField = (field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (Array.isArray(field)) {
      return field.map(item => formatField(item)).join(', ');
    }
    if (typeof field === 'object') {
      const values = Object.values(field).filter(v => typeof v === 'string' || typeof v === 'number');
      if (values.length > 0) return values.join(' ');
      return JSON.stringify(field);
    }
    return String(field);
  };

  const defaultRequirements: JobRequirements = {
    jobTitle: 'AI产品经理',
    requiredSkills: [],
    preferredSkills: [],
    targetCompanies: [],
    targetPositions: [],
    targetSchools: [],
    minEducation: '',
    minExperience: '',
    bonusSkills: [],
    bonusCertificates: [],
    jobDescription: '',
    killSwitchEducation: false,
    killSwitchExperience: false,
    killSwitchCompany: false,
    killSwitchSchool: false,
    weights: {
      skills: 40,
      experience: 30,
      education: 15,
      company: 15,
    },
  };

  const [jobs, setJobs] = useState<JobPosition[]>([
    {
      id: '1',
      title: 'AI产品经理',
      requirements: defaultRequirements,
      resumes: [],
      createdAt: Date.now()
    }
  ]);
  const [activeJobId, setActiveJobId] = useState<string>('1');
  
  const activeJob = useMemo(() => {
    const job = jobs.find(j => j.id === activeJobId) || jobs[0] || { id: 'temp', title: '加载中...', requirements: defaultRequirements, resumes: [], createdAt: Date.now() };
    console.log('Active Job updated:', job.id, job.title, 'Resumes count:', job.resumes?.length);
    return job;
  }, [jobs, activeJobId, defaultRequirements]);

  const requirements = activeJob?.requirements || defaultRequirements;
  const resumes = activeJob?.resumes || [];

  console.log('Rendering App:', { 
    activeJobId, 
    jobsCount: jobs.length, 
    resumesCount: resumes.length,
    hasRequirements: !!requirements
  });

  const setResumes = useCallback((updater: (prev: ResumeData[]) => ResumeData[]) => {
    setJobs(prev => prev.map(job => 
      job.id === activeJobId ? { ...job, resumes: updater(job.resumes || []) } : job
    ));
  }, [activeJobId]);

  const setRequirements = useCallback((updater: (prev: JobRequirements) => JobRequirements) => {
    setJobs(prev => prev.map(job => 
      job.id === activeJobId ? { ...job, requirements: updater(job.requirements) } : job
    ));
  }, [activeJobId]);

  const [isSaving, setIsSaving] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showWeights, setShowWeights] = useState(false);
  const [editingResumeId, setEditingResumeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRequirements(prev => ({ ...prev, [name]: value }));
    
    // Sync job title with sidebar
    if (name === 'jobTitle') {
      setJobs(prev => prev.map(job => 
        job.id === activeJobId ? { ...job, title: value } : job
      ));
    }
  };

  const handleWeightChange = (category: keyof JobRequirements['weights'], value: number) => {
    setRequirements(prev => ({
      ...prev,
      weights: {
        ...prev.weights,
        [category]: value
      }
    }));
  };

  const handleToggleChange = (name: keyof JobRequirements) => {
    setRequirements(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleTagChange = (name: keyof JobRequirements, tags: string[]) => {
    setRequirements(prev => ({ ...prev, [name]: tags }));
  };

  const recommendations = useMemo(() => {
    if (!requirements?.jobTitle) return { required: [], bonus: [] };
    return JOB_RECOMMENDATIONS[requirements.jobTitle] || { required: [], bonus: [] };
  }, [requirements?.jobTitle]);

  const addNewJob = () => {
    const newId = Math.random().toString(36).substring(7);
    const newJob: JobPosition = {
      id: newId,
      title: `新岗位 ${jobs.length + 1}`,
      requirements: { ...defaultRequirements, jobTitle: `新岗位 ${jobs.length + 1}` },
      resumes: [],
      createdAt: Date.now()
    };
    setJobs(prev => [...prev, newJob]);
    setActiveJobId(newId);
  };

  const deleteJob = (id: string) => {
    if (jobs.length === 1) return;
    setJobs(prev => prev.filter(j => j.id !== id));
    if (activeJobId === id) {
      setActiveJobId(jobs.find(j => j.id !== id)?.id || '');
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newResumes: ResumeData[] = acceptedFiles.map(file => {
      const id = Math.random().toString(36).substring(7);
      
      // Smart Deduplication Logic - Check across ALL jobs
      let existingResume: ResumeData | undefined;
      for (const job of jobs) {
        const found = job.resumes.find(r => r.fileName === file.name);
        if (found) {
          existingResume = found;
          break;
        }
      }
      
      return {
        id,
        fileName: file.name,
        fileType: file.type,
        uploadDate: Date.now(),
        status: 'pending',
        isDuplicate: !!existingResume,
        duplicateInfo: existingResume ? {
          originalId: existingResume.id,
          prevDate: existingResume.uploadDate,
          prevStatus: existingResume.status
        } : undefined
      };
    });
    setResumes(prev => [...prev, ...newResumes]);

    // Process each file
    acceptedFiles.forEach((file, index) => {
      const resumeId = newResumes[index].id;

      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          setResumes(prev => prev.map(r => r.id === resumeId ? { ...r, base64 } : r));
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = () => {
          const textContent = reader.result as string;
          setResumes(prev => prev.map(r => r.id === resumeId ? { ...r, content: textContent } : r));
        };
        reader.readAsText(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const reader = new FileReader();
        reader.onload = async () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          try {
            const result = await mammoth.extractRawText({ arrayBuffer });
            setResumes(prev => prev.map(r => r.id === resumeId ? { ...r, content: result.value } : r));
          } catch (err) {
            console.error("Mammoth error:", err);
            setResumes(prev => prev.map(r => r.id === resumeId ? { ...r, status: 'error', errorMsg: 'DOCX解析失败' } : r));
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });
  }, [jobs, setResumes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']
    }
  } as any);

  const handleParseAll = async () => {
    const pendingResumes = resumes.filter(r => r.status === 'pending' && (r.base64 || r.content));
    if (pendingResumes.length === 0) return;

    setIsEvaluating(true);
    for (let i = 0; i < pendingResumes.length; i++) {
      const resume = pendingResumes[i];
      
      // 如果不是第一个，先等待 4 秒以避开 RPM 限制
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      setResumes(prev => prev.map(r => r.id === resume.id ? { ...r, status: 'parsing' } : r));
      try {
        // 1. 解析简历
        const parsed = await parseResume({
          name: resume.fileName,
          type: resume.fileType,
          base64: resume.base64,
          textContent: resume.content
        });
        
        // 2. 立即进行初筛评估
        setResumes(prev => prev.map(r => r.id === resume.id ? { ...r, status: 'evaluating', parsedData: parsed } : r));
        
        // 稍微延迟一下，模拟“思考”过程并避开瞬间并发
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const evaluation = await evaluateResume(parsed, requirements);
        const status = evaluation.rejected ? 'rejected' : 'completed';
        
        setResumes(prev => prev.map(r => r.id === resume.id ? { 
          ...r, 
          status, 
          parsedData: parsed, 
          evaluation 
        } : r));

      } catch (error: any) {
        const isQuotaError = error?.message?.includes('quota') || error?.message?.includes('429');
        const isAuthError = error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('not found') || error?.message?.includes('检测到');
        
        let errorDetail = '解析失败';
        if (isQuotaError) errorDetail = 'API 配额已耗尽';
        if (isAuthError) errorDetail = 'API Key 未配置';
        if (error?.message) errorDetail += `: ${error.message.substring(0, 30)}`;

        setResumes(prev => prev.map(r => r.id === resume.id ? { ...r, status: 'error', errorMsg: errorDetail } : r));
        console.error("Parse/Evaluate error:", error);
        if (isQuotaError) {
          console.warn('触发 API 频率限制，已自动暂停。请等待 1 分钟后继续。');
          break;
        }
      }
    }
    setIsEvaluating(false);
  };

  const handleEvaluateAll = async () => {
    const parsableResumes = (resumes || []).filter(r => r.status === 'completed' && r.parsedData && !r.evaluation);
    if (parsableResumes.length === 0) return;

    setIsEvaluating(true);
    for (let i = 0; i < parsableResumes.length; i++) {
      const resume = parsableResumes[i];

      // 强制延迟 4 秒，确保每分钟请求数 < 15
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      setResumes(prev => prev.map(r => r.id === resume.id ? { ...r, status: 'evaluating' } : r));
      try {
        const evaluation = await evaluateResume(resume.parsedData, requirements);
        const status = evaluation.rejected ? 'rejected' : 'completed';
        setResumes(prev => prev.map(r => r.id === resume.id ? { ...r, status, evaluation } : r));
      } catch (error: any) {
        const isQuotaError = error?.message?.includes('quota') || error?.message?.includes('429');
        const errorDetail = isQuotaError ? '配额超限' : `评估失败: ${error?.message?.substring(0, 20)}`;
        
        setResumes(prev => prev.map(r => r.id === resume.id ? { ...r, status: 'error', errorMsg: errorDetail } : r));
        console.error("Evaluation error:", error);
        if (isQuotaError) {
          console.warn('Gemini API 频率限制（15次/分钟）。请稍等片刻再继续。');
          break; 
        }
      }
    }
    setIsEvaluating(false);
  };

  const deleteResume = (id: string) => {
    setResumes(prev => prev.filter(r => r.id !== id));
  };

  const startEditing = (resume: ResumeData) => {
    setEditingResumeId(resume.id);
    setEditForm({
      name: formatField(resume.parsedData?.姓名 || resume.parsedData?.name),
      phone: formatField(resume.parsedData?.联系方式 || resume.parsedData?.phone),
      education: formatField(resume.parsedData?.教育背景 || resume.parsedData?.education)
    });
  };

  const saveEdit = () => {
    if (!editingResumeId) return;
    setResumes(prev => prev.map(r => {
      if (r.id === editingResumeId) {
        return {
          ...r,
          parsedData: {
            ...r.parsedData,
            姓名: editForm.name,
            联系方式: editForm.phone,
            教育背景: editForm.education
          }
        };
      }
      return r;
    }));
    setEditingResumeId(null);
    setEditForm(null);
  };

  const clearAll = () => {
    setResumes([]);
  };

  const saveRequirements = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="flex h-screen bg-[#8b8df8] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar: Job Management */}
      <div className="w-64 bg-white/10 backdrop-blur-xl border-r border-white/10 flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 text-white mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tight">岗位管理</h1>
          </div>
          
          <div className="space-y-2">
            {(jobs || []).map(job => (
              <div key={job.id} className="group relative">
                <button
                  onClick={() => setActiveJobId(job.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 text-left",
                    activeJobId === job.id 
                      ? "bg-white text-indigo-600 shadow-lg shadow-indigo-900/20 scale-[1.02]" 
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Briefcase size={16} className="shrink-0" />
                    <span className="font-bold truncate text-sm">{job.title}</span>
                  </div>
                  {activeJobId === job.id && (
                    <div className="w-1.5 h-1.5 bg-indigo-50 rounded-full" />
                  )}
                </button>
                {jobs.length > 1 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteJob(job.id); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto p-6">
          <button 
            onClick={addNewJob}
            className="w-full py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10"
          >
            <Plus size={18} />
            新增招聘岗位
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto py-12 px-8 space-y-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-white tracking-tight flex items-center justify-center gap-4">
              <span className="text-5xl">🎯</span> 智能简历筛选工具
            </h2>
          </div>

          {/* Card 1: Job Requirements */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-900/20 overflow-hidden"
          >
            <div className="p-10 space-y-10">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-6">
                <ClipboardList className="text-indigo-500" size={28} />
                <h3 className="text-2xl font-black text-gray-800">职位要求设置</h3>
              </div>

              <div className="space-y-8">
                <InputField 
                  label="职位名称" 
                  name="jobTitle" 
                  value={requirements.jobTitle} 
                  onChange={handleInputChange} 
                  placeholder="例如：数据分析师" 
                  icon={<Sparkles size={16} className="text-indigo-500" />}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <TagInput 
                    label="必需技能" 
                    tags={requirements.requiredSkills} 
                    onChange={(tags) => handleTagChange('requiredSkills', tags)} 
                    placeholder="输入技能并按回车" 
                    recommendations={recommendations.required}
                  />
                  <TagInput 
                    label="优先技能" 
                    tags={requirements.preferredSkills} 
                    onChange={(tags) => handleTagChange('preferredSkills', tags)} 
                    placeholder="输入技能并按回车" 
                    recommendations={recommendations.bonus}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <TagInput 
                    label="要求公司 (硬性指标)" 
                    tags={requirements.targetCompanies} 
                    onChange={(tags) => handleTagChange('targetCompanies', tags)} 
                    placeholder="输入公司并按回车" 
                    toggle={<Toggle enabled={requirements.killSwitchCompany} onChange={() => handleToggleChange('killSwitchCompany')} label="一键淘汰" />}
                    libraries={COMPANY_LIBRARIES}
                    isKillSwitchActive={requirements.killSwitchCompany}
                  />
                  <TagInput 
                    label="要求职位 (硬性指标)" 
                    tags={requirements.targetPositions} 
                    onChange={(tags) => handleTagChange('targetPositions', tags)} 
                    placeholder="输入职位并按回车" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <TagInput 
                    label="要求院校 (硬性指标)" 
                    tags={requirements.targetSchools} 
                    onChange={(tags) => handleTagChange('targetSchools', tags)} 
                    placeholder="输入学校并按回车" 
                    libraries={SCHOOL_LIBRARIES}
                    toggle={<Toggle enabled={requirements.killSwitchSchool} onChange={() => handleToggleChange('killSwitchSchool')} label="一键淘汰" />}
                    isKillSwitchActive={requirements.killSwitchSchool}
                  />
                  <InputField 
                    label="最低学历要求" 
                    name="minEducation" 
                    value={requirements.minEducation} 
                    onChange={handleInputChange} 
                    placeholder="例如：本科" 
                    toggle={<Toggle enabled={requirements.killSwitchEducation} onChange={() => handleToggleChange('killSwitchEducation')} label="一键淘汰" />}
                    isKillSwitchActive={requirements.killSwitchEducation}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputField 
                    label="最低工作年限" 
                    name="minExperience" 
                    value={requirements.minExperience} 
                    onChange={handleInputChange} 
                    placeholder="例如：3" 
                    toggle={<Toggle enabled={requirements.killSwitchExperience} onChange={() => handleToggleChange('killSwitchExperience')} label="一键淘汰" />}
                    isKillSwitchActive={requirements.killSwitchExperience}
                  />
                  <TagInput 
                    label="加分技能" 
                    tags={requirements.bonusSkills} 
                    onChange={(tags) => handleTagChange('bonusSkills', tags)} 
                    placeholder="输入技能并按回车" 
                  />
                </div>

                <TagInput 
                  label="加分证书" 
                  tags={requirements.bonusCertificates} 
                  onChange={(tags) => handleTagChange('bonusCertificates', tags)} 
                  placeholder="输入证书并按回车" 
                />

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">职位描述</label>
                  <textarea
                    name="jobDescription"
                    value={requirements.jobDescription}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-600 placeholder:text-gray-300 text-sm bg-gray-50/30"
                    placeholder="详细描述职位要求和职责..."
                  />
                </div>

                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setShowWeights(!showWeights)}
                    className="w-full px-6 py-4 bg-gray-50/50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-gray-700">
                      <Settings size={18} className="text-indigo-500" />
                      <span className="font-black text-sm uppercase tracking-wider">高级权重配置 <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded ml-2">BETA</span></span>
                    </div>
                    {showWeights ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </button>
                  
                  <AnimatePresence>
                    {showWeights && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 py-6 space-y-6 bg-white border-t border-gray-50"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <WeightSlider label="技能" icon={<Star size={14} />} value={requirements.weights.skills} onChange={(v) => handleWeightChange('skills', v)} />
                          <WeightSlider label="经验" icon={<Briefcase size={14} />} value={requirements.weights.experience} onChange={(v) => handleWeightChange('experience', v)} />
                          <WeightSlider label="学历" icon={<GraduationCap size={14} />} value={requirements.weights.education} onChange={(v) => handleWeightChange('education', v)} />
                          <WeightSlider label="公司" icon={<Building2 size={14} />} value={requirements.weights.company} onChange={(v) => handleWeightChange('company', v)} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button 
                  onClick={saveRequirements}
                  disabled={isSaving}
                  className="w-full md:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-indigo-200 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  保存职位要求
                </button>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Resume Upload */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-900/20 overflow-hidden"
          >
            <div className="p-10 space-y-8">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-6">
                <Upload className="text-indigo-500" size={28} />
                <h3 className="text-2xl font-black text-gray-800">简历上传</h3>
              </div>

              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-[2rem] p-12 transition-all cursor-pointer flex flex-col items-center justify-center gap-6 group relative overflow-hidden",
                  isDragActive ? "border-indigo-500 bg-indigo-50/50 scale-[0.99]" : "border-gray-200 hover:border-indigo-300 bg-gray-50/30"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                  <Upload className="text-indigo-500" size={32} />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xl font-black text-gray-800">点击或拖拽上传简历</p>
                  <p className="text-gray-400 font-medium text-sm">支持 PDF, DOCX, DOC, TXT, JPG, PNG, BMP, TIFF 格式</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button 
                  onClick={handleParseAll}
                  disabled={isEvaluating || resumes.filter(r => r.status === 'pending').length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-100"
                >
                  {isEvaluating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  上传并解析简历
                </button>
                <button 
                  onClick={handleEvaluateAll}
                  disabled={isEvaluating}
                  className="bg-[#10b981] hover:bg-[#059669] text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-100"
                >
                  {isEvaluating ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                  开始评估匹配
                </button>
                <button 
                  onClick={clearAll}
                  className="bg-slate-500 hover:bg-slate-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-slate-100"
                >
                  <Trash2 size={20} />
                  清空所有
                </button>
              </div>
            </div>
          </motion.div>

          {/* Results Dashboard */}
          {resumes.some(r => r.evaluation) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/20 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-10 grid grid-cols-1 sm:grid-cols-3 gap-10 shadow-2xl"
            >
              <div className="space-y-2">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">已评估人数</p>
                <p className="text-5xl font-black text-white">{resumes.filter(r => r.evaluation).length}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.2em]">高匹配人数 (≥80)</p>
                <p className="text-5xl font-black text-emerald-300">{resumes.filter(r => r.evaluation && r.evaluation.score >= 80).length}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-red-300 uppercase tracking-[0.2em]">已淘汰人数</p>
                <p className="text-5xl font-black text-red-300">{resumes.filter(r => r.status === 'rejected').length}</p>
              </div>
            </motion.div>
          )}

          {/* Resume List */}
          <div className="space-y-6">
            <AnimatePresence>
              {resumes.length > 0 && (
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <FileText size={20} /> 简历队列
                  </h3>
                  <button 
                    onClick={clearAll}
                    className="text-white/60 hover:text-white text-sm font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={14} />
                    清空列表
                  </button>
                </div>
              )}
              {(resumes || []).map((resume) => (
                <motion.div
                  key={resume.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-3xl p-6 shadow-xl border border-white/10 flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-inner">
                        <FileText className="text-indigo-500" size={28} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-lg font-black text-gray-800">{resume.fileName}</p>
                          {resume.parsedData && (
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-xl border border-gray-100">
                              <span className="text-xs font-black text-indigo-600">{formatField(resume.parsedData.姓名 || resume.parsedData.name) || '未识别'}</span>
                              <span className="w-px h-3 bg-gray-200" />
                              <span className="text-[10px] font-bold text-gray-500 uppercase">{formatField(resume.parsedData.教育背景 || resume.parsedData.education) || '学历未知'}</span>
                              <button 
                                onClick={() => startEditing(resume)}
                                className="p-1.5 text-gray-400 hover:text-indigo-500 transition-colors"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          )}
                          {resume.isDuplicate && (
                            <div className="group relative">
                              <span className="bg-amber-100 text-amber-600 text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-tighter flex items-center gap-1 cursor-help">
                                <History size={10} />
                                重复投递
                              </span>
                              <div className="absolute bottom-full left-0 mb-2 w-56 bg-gray-800 text-white text-[11px] p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                                <p className="font-black mb-1.5 text-amber-400">历史记录</p>
                                <p className="opacity-80">上次投递: {new Date(resume.duplicateInfo?.prevDate || 0).toLocaleDateString()}</p>
                                <p className="opacity-80">上次状态: <span className="text-amber-400 font-bold">{resume.duplicateInfo?.prevStatus}</span></p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <StatusBadge status={resume.status} errorMsg={resume.errorMsg} />
                          {resume.evaluation && (
                            <span className={cn(
                              "text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 uppercase tracking-wider",
                              resume.evaluation.rejected ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                              {resume.evaluation.rejected ? <X size={12} /> : <Check size={12} />}
                              {resume.evaluation.rejected ? '不符合硬性指标' : '符合硬性指标'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {resume.evaluation && (
                        <div className="text-right mr-4">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">匹配得分</p>
                          <p className={cn(
                            "text-4xl font-black",
                            resume.evaluation.score >= 80 ? "text-emerald-500" : 
                            resume.evaluation.score >= 60 ? "text-amber-500" : "text-red-500"
                          )}>
                            {resume.evaluation.score}
                          </p>
                        </div>
                      )}
                      <button 
                        onClick={() => deleteResume(resume.id)}
                        className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  {resume.evaluation && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-gray-50 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8"
                    >
                        <div className="lg:col-span-4 space-y-6">
                          <div className="bg-gray-50 rounded-3xl p-6 h-full flex flex-col justify-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">能力雷达图</p>
                            <div className="h-48 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={Array.isArray(resume.evaluation.radarData) ? resume.evaluation.radarData : []}>
                                  <PolarGrid stroke="#e5e7eb" />
                                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }} />
                                  <Radar
                                    name="Score"
                                    dataKey="value"
                                    stroke="#6366f1"
                                    fill="#6366f1"
                                    fillOpacity={0.5}
                                  />
                                </RadarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-8 space-y-6">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <ScoreItem icon={<Star size={12} />} label="技能匹配" score={resume.evaluation.matchDetails?.skills || 0} />
                            <ScoreItem icon={<Briefcase size={12} />} label="经验匹配" score={resume.evaluation.matchDetails?.experience || 0} />
                            <ScoreItem icon={<GraduationCap size={12} />} label="学历匹配" score={resume.evaluation.matchDetails?.education || 0} />
                            <ScoreItem icon={<Building2 size={12} />} label="公司匹配" score={resume.evaluation.matchDetails?.company || 0} />
                          </div>

                          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                            <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={16} className="text-indigo-300" />
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">AI 3秒速读</p>
                              </div>
                              <p className="text-lg font-bold leading-relaxed">{resume.evaluation.aiOverview || "暂无摘要"}</p>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-emerald-600">
                                <CheckCircle2 size={16} />
                                <span className="text-xs font-black uppercase tracking-widest">核心优势</span>
                              </div>
                              <ul className="space-y-2">
                                {(resume.evaluation.pros || []).map((pro, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                                    {pro}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-amber-600">
                                <AlertCircle size={16} />
                                <span className="text-xs font-black uppercase tracking-widest">潜在风险</span>
                              </div>
                              <ul className="space-y-2">
                                {(resume.evaluation.cons || []).map((con, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                                    {con}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingResumeId && editForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingResumeId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Pencil size={20} className="text-indigo-500" />
                  修正解析信息
                </h3>
                <button onClick={() => setEditingResumeId(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">姓名</label>
                  <input 
                    type="text" 
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">联系方式</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">教育背景 / 学历</label>
                  <input 
                    type="text" 
                    value={editForm.education}
                    onChange={(e) => setEditForm({ ...editForm, education: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setEditingResumeId(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-all"
                >
                  取消
                </button>
                <button 
                  onClick={saveEdit}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                  保存修改
                </button>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>
      </div>
  );
}

function Toggle({ enabled, onChange, label }: { enabled: boolean, onChange: () => void, label: string }) {
  return (
    <div className="flex items-center gap-2 cursor-pointer group" onClick={onChange}>
      <div className={cn(
        "relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner",
        enabled ? "bg-red-500 shadow-red-200" : "bg-gray-200"
      )}>
        <span className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm",
          enabled ? "translate-x-5.5" : "translate-x-1"
        )} />
      </div>
      <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", enabled ? "text-red-600" : "text-gray-400 group-hover:text-gray-600")}>
        {label}
      </span>
    </div>
  );
}

function InputField({ label, name, value, onChange, placeholder, icon, toggle, isKillSwitchActive }: { label: string, name: string, value: string, onChange: any, placeholder: string, icon?: ReactNode, toggle?: ReactNode, isKillSwitchActive?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{label}</label>
          {icon}
        </div>
        {toggle}
      </div>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className={cn(
          "w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-gray-700 font-bold placeholder:text-gray-300 placeholder:font-normal",
          isKillSwitchActive && "bg-red-50/50 border-red-100 focus:ring-red-500/10 focus:border-red-500 text-red-700"
        )}
        placeholder={placeholder}
      />
    </div>
  );
}

function StatusBadge({ status, errorMsg }: { status: ResumeData['status'], errorMsg?: string }) {
  const configs = {
    pending: { color: 'bg-gray-100 text-gray-500', label: '待处理', icon: null },
    parsing: { color: 'bg-blue-50 text-blue-600', label: '解析中...', icon: <Loader2 size={12} className="animate-spin" /> },
    evaluating: { color: 'bg-indigo-50 text-indigo-600', label: '评估中...', icon: <Loader2 size={12} className="animate-spin" /> },
    completed: { color: 'bg-emerald-50 text-emerald-600', label: '已完成', icon: <CheckCircle2 size={12} /> },
    rejected: { color: 'bg-red-50 text-red-600', label: '已淘汰', icon: <X size={12} /> },
    error: { color: 'bg-red-50 text-red-600', label: errorMsg || '处理失败', icon: <AlertCircle size={12} /> },
  };

  const config = configs[status] || { color: 'bg-gray-100 text-gray-400', label: '未知状态', icon: null };

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm", config.color)}>
      {config.icon}
      {config.label}
    </span>
  );
}

function WeightSlider({ label, icon, value, onChange }: { label: string, icon: ReactNode, value: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">
            {icon}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-sm font-black text-indigo-600">{value}%</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="100" 
        step="5"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-600 transition-all"
      />
    </div>
  );
}

function ScoreItem({ icon, label, score }: { icon: ReactNode, label: string, score: number }) {
  const safeScore = Math.max(0, Math.min(100, score || 0));
  return (
    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
      <div className="flex items-center gap-2 text-gray-400">
        <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">
          {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-black text-gray-800 leading-none">{safeScore}</span>
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1">
          <div 
            className={cn(
              "h-full transition-all duration-1000",
              safeScore >= 80 ? "bg-emerald-500" : safeScore >= 60 ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${safeScore}%` }}
          />
        </div>
      </div>
    </div>
  );
}
