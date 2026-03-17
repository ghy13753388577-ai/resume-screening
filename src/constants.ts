export const JOB_RECOMMENDATIONS: Record<string, { required: string[], bonus: string[] }> = {
  'AI产品经理': {
    required: ['大模型', 'NLP', '产品设计', '数据分析', 'Python', '机器学习'],
    bonus: ['Prompt Engineering', 'RAG', '多模态', '计算机视觉', 'SQL']
  },
  '前端开发工程师': {
    required: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'JavaScript', '浏览器原理'],
    bonus: ['Node.js', '性能优化', 'Three.js', 'WebAssembly', '单元测试']
  },
  '后端开发工程师': {
    required: ['Java', 'Spring Boot', 'MySQL', 'Redis', '微服务', '分布式系统'],
    bonus: ['Go', 'Docker', 'Kubernetes', '消息队列', '高并发经验']
  },
  '数据分析师': {
    required: ['SQL', 'Python', 'Tableau', '统计学', 'Excel', '数据建模'],
    bonus: ['R', 'Hadoop', 'Spark', '商业洞察', '机器学习基础']
  },
  'HRBP': {
    required: ['招聘', '员工关系', '绩效管理', '组织发展', '沟通能力'],
    bonus: ['薪酬福利', '法律风险', '数据驱动', '人才盘点']
  }
};
