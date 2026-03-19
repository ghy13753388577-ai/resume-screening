import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

function checkApiKey() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("未检测到 GEMINI_API_KEY。请在 Vercel 环境变量中配置它并重新部署。");
  }
}

export async function parseResume(file: { name: string, type: string, base64?: string, textContent?: string }) {
  checkApiKey();
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    你是一个专业的HR简历解析助手。请解析以下简历内容，并以JSON格式返回。
    需要提取的信息包括：姓名、联系方式、教育背景、工作经历、技能列表、自我评价。
    
    返回格式必须是合法的JSON。
  `;

  const parts: any[] = [{ text: prompt }];

  if (file.textContent) {
    parts.push({ text: `简历文本内容：\n${file.textContent}` });
  } else if (file.base64) {
    parts.push({
      inlineData: {
        mimeType: file.type,
        data: file.base64.split(',')[1] || file.base64
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json"
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error parsing resume:", error);
    throw error;
  }
}

export async function evaluateResume(resumeParsed: any, requirements: any) {
  // 切换到 Flash 模型以获得更高的免费配额
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    你是一个资深的HR专家。请根据提供的“职位要求”和“简历解析数据”，对该候选人进行匹配度评估。
    
    职位要求：
    ${JSON.stringify(requirements, null, 2)}
    
    【公司/学校库说明】
    如果 targetCompanies 或 targetSchools 中包含以下标签，请按对应规则匹配：
    - "互联网大厂 (TOP 50)": 匹配腾讯、阿里、字节、美团、百度、华为等知名互联网企业。
    - "证券百强": 匹配中信、海通、国泰君安等头部券商。
    - "世界500强": 匹配 Apple, Google, Microsoft 等全球顶尖企业。
    - "顶级咨询 (MBB)": 匹配麦肯锡、波士顿、贝恩。
    - "四大财会": 匹配普华运道、德勤、安永、毕马威。
    - "985/211 高校": 匹配清华、北大、复旦等国内顶尖高校。
    - "常春藤盟校": 匹配 Harvard, Yale, Princeton 等。
    - "QS 世界前100": 匹配 Oxford, Cambridge, Stanford 等。
    
    简历数据：
    ${JSON.stringify(resumeParsed, null, 2)}
    
    【重要：权重配置】
    请根据以下权重分配计算最终匹配分（score）：
    - 技能匹配 (skills): ${requirements.weights.skills}%
    - 经验匹配 (experience): ${requirements.weights.experience}%
    - 学历/院校 (education): ${requirements.weights.education}%
    - 公司背景 (company): ${requirements.weights.company}%
    最终分数 = (技能分 * ${requirements.weights.skills} + 经验分 * ${requirements.weights.experience} + 学历院校分 * ${requirements.weights.education} + 公司分 * ${requirements.weights.company}) / 100
    
    【重要：硬性指标一键否定（Kill-Switch）逻辑】
    如果职位要求中开启了以下开关，且候选人未满足要求，请务必在返回的JSON中将 "rejected" 设置为 true：
    1. killSwitchEducation 为 true 时：如果候选人学历低于 minEducation（例如要求本科，候选人是大专），则拒绝。
    2. killSwitchExperience 为 true 时：如果候选人工作年限少于 minExperience，则拒绝。
    3. killSwitchCompany 为 true 时：如果候选人没有 targetCompanies 中的任何一家公司背景（或不属于所选公司库），则拒绝。
    4. killSwitchSchool 为 true 时：如果候选人没有 targetSchools 中的任何一家学校背景（或不属于所选学校库），则拒绝。
    
    请输出以下JSON格式的评估结果：
    {
      "score": 0-100的匹配分 (如果被拒绝，分数应为0),
      "summary": "一句话核心评价",
      "aiOverview": "3秒概览摘要，总结优劣势及面试建议",
      "pros": ["优点1", "优点2"],
      "cons": ["不足1", "不足2"],
      "skillMatches": [
        { "skill": "技能名称", "matched": boolean }
      ],
      "radarData": [
        { "subject": "技术能力", "value": 0-100 },
        { "subject": "学历背景", "value": 0-100 },
        { "subject": "稳定性", "value": 0-100 },
        { "subject": "行业契合度", "value": 0-100 }
      ],
      "matchDetails": {
        "skills": 0-100分,
        "experience": 0-100分,
        "education": 0-100分,
        "company": 0-100分
      },
      "rejected": boolean (是否触发硬性指标淘汰)
    }
    
    注意：radarData 的 fullMark 统一为 100。skillMatches 应包含职位要求中的核心技能。
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const result = JSON.parse(response.text || "{}");
    
    // 确保返回结构完整，防止前端崩溃
    return {
      score: result.score ?? 0,
      summary: result.summary ?? "评估完成",
      aiOverview: result.aiOverview ?? "暂无摘要",
      pros: Array.isArray(result.pros) ? result.pros : [],
      cons: Array.isArray(result.cons) ? result.cons : [],
      skillMatches: Array.isArray(result.skillMatches) ? result.skillMatches : [],
      radarData: Array.isArray(result.radarData) ? result.radarData : [
        { subject: "技术能力", value: 0 },
        { subject: "学历背景", value: 0 },
        { subject: "稳定性", value: 0 },
        { subject: "行业契合度", value: 0 }
      ],
      matchDetails: {
        skills: result.matchDetails?.skills ?? 0,
        experience: result.matchDetails?.experience ?? 0,
        education: result.matchDetails?.education ?? 0,
        company: result.matchDetails?.company ?? 0
      },
      rejected: !!result.rejected
    };
  } catch (error: any) {
    // 如果是配额错误，尝试等待 2 秒后重试一次
    if (error?.message?.includes('quota') || error?.message?.includes('429')) {
      console.warn("Quota hit, retrying in 2 seconds...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      const retryResponse = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: "application/json" }
      });
      const retryResult = JSON.parse(retryResponse.text || "{}");
      return {
        score: retryResult.score ?? 0,
        summary: retryResult.summary ?? "评估完成",
        aiOverview: retryResult.aiOverview ?? "暂无摘要",
        pros: Array.isArray(retryResult.pros) ? retryResult.pros : [],
        cons: Array.isArray(retryResult.cons) ? retryResult.cons : [],
        skillMatches: Array.isArray(retryResult.skillMatches) ? retryResult.skillMatches : [],
        radarData: Array.isArray(retryResult.radarData) ? retryResult.radarData : [
          { subject: "技术能力", value: 0 },
          { subject: "学历背景", value: 0 },
          { subject: "稳定性", value: 0 },
          { subject: "行业契合度", value: 0 }
        ],
        matchDetails: {
          skills: retryResult.matchDetails?.skills ?? 0,
          experience: retryResult.matchDetails?.experience ?? 0,
          education: retryResult.matchDetails?.education ?? 0,
          company: retryResult.matchDetails?.company ?? 0
        },
        rejected: !!retryResult.rejected
      };
    }
    console.error("Error evaluating resume:", error);
    throw error;
  }
}
