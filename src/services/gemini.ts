import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function parseResume(file: { name: string, type: string, base64?: string, textContent?: string }) {
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
    
    简历数据：
    ${JSON.stringify(resumeParsed, null, 2)}
    
    请输出以下JSON格式的评估结果：
    {
      "score": 0-100的匹配分,
      "summary": "一句话核心评价",
      "pros": ["优点1", "优点2"],
      "cons": ["不足1", "不足2"],
      "matchDetails": {
        "skills": 0-100分,
        "experience": 0-100分,
        "education": 0-100分,
        "company": 0-100分
      }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    // 如果是配额错误，尝试等待 2 秒后重试一次
    if (error?.message?.includes('quota') || error?.message?.includes('429')) {
      console.warn("Quota hit, retrying in 2 seconds...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      const retryResponse = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(retryResponse.text || "{}");
    }
    console.error("Error evaluating resume:", error);
    throw error;
  }
}
