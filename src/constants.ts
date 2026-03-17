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

export const COMPANY_LIBRARIES = [
  { id: 'top50_internet', label: '互联网大厂 (TOP 50)', keywords: ['腾讯', '阿里巴巴', '字节跳动', '美团', '百度', '京东', '网易', '拼多多', '小米', '快手', '滴滴', '携程', '哔哩哔哩', '小红书', '蚂蚁金服', '华为'] },
  { id: 'top100_securities', label: '证券百强', keywords: ['中信证券', '海通证券', '国泰君安', '华泰证券', '广发证券', '招商证券', '申万宏源', '中信建投', '银河证券', '中金公司'] },
  { id: 'fortune_500', label: '世界500强', keywords: ['Apple', 'Google', 'Microsoft', 'Amazon', 'Meta', 'Tesla', 'Walmart', 'Toyota', 'Samsung', 'Intel'] },
  { id: 'tier1_consulting', label: '顶级咨询 (MBB)', keywords: ['McKinsey', 'BCG', 'Bain', '麦肯锡', '波士顿咨询', '贝恩'] },
  { id: 'big4_accounting', label: '四大财会', keywords: ['PwC', 'Deloitte', 'EY', 'KPMG', '普华永道', '德勤', '安永', '毕马威'] }
];

export const SCHOOL_LIBRARIES = [
  { id: '985_211', label: '985/211 高校', keywords: ['清华大学', '北京大学', '复旦大学', '上海交通大学', '浙江大学', '南京大学', '武汉大学', '中山大学', '西安交通大学', '哈尔滨工业大学', '中国科学技术大学', '北京航空航天大学', '同济大学', '南开大学'] },
  { id: 'ivy_league', label: '常春藤盟校', keywords: ['Harvard', 'Yale', 'Princeton', 'Columbia', 'UPenn', 'Brown', 'Dartmouth', 'Cornell'] },
  { id: 'qs_top100', label: 'QS 世界前100', keywords: ['Oxford', 'Cambridge', 'Stanford', 'MIT', 'ETH Zurich', 'UCL', 'Imperial College'] }
];
