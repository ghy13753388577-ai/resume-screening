import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  User,
  Star,
  Building2,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/src/lib/utils';
import { JobRequirements, ResumeData } from './types';
import { parseResume, evaluateResume } from './services/gemini';
import mammoth from 'mammoth';

export default function App() {
  const [requirements, setRequirements] = useState<JobRequirements>({
    jobTitle: 'AI产品经理',
    requiredSkills: '',
    preferredSkills: '',
    targetCompanies: '',
    targetPositions: '',
    minEducation: '',
    minExperience: '',
    bonusSkills: '',
    bonusCertificates: '',
    jobDescription: '',
  });

  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRequirements(prev => ({ ...prev, [name]: value }));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newResumes: ResumeData[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      fileName: file.name,
      fileType: file.type,
      status: 'pending'
    }));
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
            setResumes(prev => prev.map(r => r.id === resumeId ? { ...r, status: 'error' } : r));
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']
    }
  });

  const handleParseAll = async () => {
    const pendingResumes = resumes.filter(r => r.status === 'pending' && (r.base64 || r.content));
    if (pendingResumes.length === 0) return;

    for (let i = 0; i < pendingResumes.length; i++) {
      const resume = pendingResumes[i];
      
      // 如果不是第一个，先等待 4 秒以避开 RPM 限制
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      setResumes(prev => prev.map(r => r.id === resume.id ? { ...r, status: 'parsing' } : r));
      try {
        const parsed = await parseResume({
          name: resume.fileName,
          type: resume.fileType,
          base64: resume.base64,
          textContent: resume.content
        });
        setResumes(prev => prev.map(r => r.id === resume.id ? { ...r, status: 'completed', parsedData: parsed } : r));
      } catch (error: any) {
        const isQuotaError = error?.message?.includes('quota') || error?.message?.includes('429');
        setResumes(prev => prev.map(r => r.id === resume.id ? { ...r, status: 'error' } : r));
        console.error("Parse error:", error);
        if (isQuotaError) {
          alert('触发 API 频率限制，已自动暂停。请等待 1 分钟后继续。');
          break;
        }
      }
    }
  };

  const handleEvaluateAll = async () => {
    const parsableResumes = resumes.filter(r => r.status === 'completed' && r.parsedData && !r.evaluation);
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
        setResumes(prev => prev.map(r => r.id === resume.id ? { ...r, status: 'completed', evaluation } : r));
      } catch (error: any) {
        const isQuotaError = error?.message?.includes('quota') || error?.message?.includes('429');
        setResumes(prev => prev.map(r => r.id === resume.id ? { ...r, status: 'error' } : r));
        console.error("Evaluation error:", error);
        if (isQuotaError) {
          alert('Gemini API 频率限制（15次/分钟）。请稍等片刻再继续。');
          break; 
        }
      }
    }
    setIsEvaluating(false);
  };

  const clearAll = () => {
    setResumes([]);
  };

  const saveRequirements = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="min-h-screen bg-[#6366f1] bg-gradient-to-br from-[#6366f1] to-[#a855f7] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white flex items-center justify-center gap-3"
          >
            <span role="img" aria-label="target">🎯</span> 智能简历筛选工具
          </motion.h1>
        </div>

        {/* Job Requirements Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 space-y-6"
        >
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <ClipboardList className="text-gray-400" size={24} />
            <h2 className="text-xl font-bold text-gray-800">职位要求设置</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="职位名称" name="jobTitle" value={requirements.jobTitle} onChange={handleInputChange} placeholder="例如：AI产品经理" />
            <InputField label="必需技能（用逗号分隔）" name="requiredSkills" value={requirements.requiredSkills} onChange={handleInputChange} placeholder="例如：Python, Django, MySQL" />
            <InputField label="优先技能（用逗号分隔）" name="preferredSkills" value={requirements.preferredSkills} onChange={handleInputChange} placeholder="例如：Docker, Kubernetes, Redis" />
            <InputField label="要求公司（用逗号分隔，硬性指标）" name="targetCompanies" value={requirements.targetCompanies} onChange={handleInputChange} placeholder="例如：腾讯, 阿里, 字节" />
            <InputField label="要求职位（用逗号分隔，硬性指标）" name="targetPositions" value={requirements.targetPositions} onChange={handleInputChange} placeholder="例如：后端开发, 全栈工程师" />
            <InputField label="最低学历要求" name="minEducation" value={requirements.minEducation} onChange={handleInputChange} placeholder="例如：本科" />
            <InputField label="最低工作年限" name="minExperience" value={requirements.minExperience} onChange={handleInputChange} placeholder="例如：3" />
            <InputField label="加分技能（用逗号分隔）" name="bonusSkills" value={requirements.bonusSkills} onChange={handleInputChange} placeholder="例如：AI, 大数据, 分布式系统" />
            <InputField label="加分证书（用逗号分隔）" name="bonusCertificates" value={requirements.bonusCertificates} onChange={handleInputChange} placeholder="例如：PMP, AWS, CKA" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">职位描述</label>
            <textarea
              name="jobDescription"
              value={requirements.jobDescription}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-600 placeholder:text-gray-300"
              placeholder="详细描述职位要求和职责..."
            />
          </div>

          <button 
            onClick={saveRequirements}
            disabled={isSaving}
            className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            保存职位要求
          </button>
        </motion.div>

        {/* Resume Upload Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 space-y-6"
        >
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <FileText className="text-gray-400" size={24} />
            <h2 className="text-xl font-bold text-gray-800">简历上传</h2>
          </div>

          <div 
            {...getRootProps()} 
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer group",
              isDragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-400"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="text-gray-400 group-hover:text-indigo-500" size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-gray-700">点击或拖拽上传简历</p>
                <p className="text-sm text-gray-400">支持 PDF, DOCX, DOC, TXT, JPG, PNG, BMP, TIFF 格式</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleParseAll}
              className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              <Upload size={20} />
              上传并解析简历
            </button>
            <button 
              onClick={handleEvaluateAll}
              disabled={isEvaluating}
              className="bg-[#10b981] hover:bg-[#059669] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isEvaluating ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              开始评估匹配
            </button>
            <button 
              onClick={clearAll}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              <Trash2 size={20} />
              清空所有
            </button>
          </div>

          {/* Resume List */}
          <div className="space-y-4">
            <AnimatePresence>
              {resumes.map((resume) => (
                <motion.div
                  key={resume.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-4 bg-gray-50/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <FileText className="text-indigo-500" size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{resume.fileName}</p>
                        <StatusBadge status={resume.status} />
                      </div>
                    </div>
                    {resume.evaluation && (
                      <div className="text-right">
                        <p className="text-2xl font-black text-indigo-600">{resume.evaluation.score}%</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">匹配度</p>
                      </div>
                    )}
                  </div>

                  {resume.evaluation && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-4 pt-4 border-t border-gray-100"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <ScoreItem icon={<Star size={14} />} label="技能" score={resume.evaluation.matchDetails.skills} />
                        <ScoreItem icon={<Briefcase size={14} />} label="经验" score={resume.evaluation.matchDetails.experience} />
                        <ScoreItem icon={<GraduationCap size={14} />} label="学历" score={resume.evaluation.matchDetails.education} />
                        <ScoreItem icon={<Building2 size={14} />} label="公司" score={resume.evaluation.matchDetails.company} />
                      </div>
                      
                      <div className="bg-white rounded-xl p-4 space-y-2 shadow-sm">
                        <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <User size={16} className="text-indigo-500" />
                          核心评价
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">{resume.evaluation.summary}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-green-600 uppercase tracking-widest">优势</p>
                          <ul className="space-y-1">
                            {resume.evaluation.pros.map((pro, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">不足</p>
                          <ul className="space-y-1">
                            {resume.evaluation.cons.map((con, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function InputField({ label, name, value, onChange, placeholder }: { label: string, name: string, value: string, onChange: any, placeholder: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-600 placeholder:text-gray-300"
        placeholder={placeholder}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: ResumeData['status'] }) {
  const configs = {
    pending: { color: 'bg-gray-100 text-gray-500', label: '待处理', icon: null },
    parsing: { color: 'bg-blue-100 text-blue-600', label: '解析中...', icon: <Loader2 size={12} className="animate-spin" /> },
    evaluating: { color: 'bg-indigo-100 text-indigo-600', label: '评估中...', icon: <Loader2 size={12} className="animate-spin" /> },
    completed: { color: 'bg-green-100 text-green-600', label: '已完成', icon: <CheckCircle2 size={12} /> },
    error: { color: 'bg-red-100 text-red-600', label: '处理失败', icon: <AlertCircle size={12} /> },
  };

  const config = configs[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", config.color)}>
      {config.icon}
      {config.label}
    </span>
  );
}

function ScoreItem({ icon, label, score }: { icon: React.ReactNode, label: string, score: number }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-50 space-y-1">
      <div className="flex items-center gap-1.5 text-gray-400">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-lg font-black text-gray-800">{score}</span>
        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden mb-1.5">
          <div 
            className="h-full bg-indigo-500 transition-all duration-1000" 
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}
