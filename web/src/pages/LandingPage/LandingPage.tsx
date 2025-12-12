import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Zap,
  BarChart3,
  Users,
  Shield,
  Globe,
  Rocket,
  Code,
  Database,
  Cloud,
  ArrowRight,
  Play,
  CheckCircle,
  Star,
  TrendingUp
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI驱动生成",
      description: "基于大语言模型的两阶段生成架构，先生成测试点，再转换为完整测试用例"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "29种TSP业务类型",
      description: "支持RCC、RFD、ZAB等29种汽车远程控制业务类型全覆盖"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "实时WebSocket通信",
      description: "实时进度监控和批量操作体验，支持大规模测试用例生成"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "知识图谱可视化",
      description: "测试覆盖率分析和关联关系展示，提供直观的质量评估"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "企业级可靠性",
      description: "事务性数据一致性保证，完善的错误恢复机制和权限管理"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "团队协作支持",
      description: "多用户并发操作，项目级权限控制，支持大型团队协作"
    }
  ];

  const techStack = [
    { name: "React 19", icon: <Code className="w-6 h-6" />, description: "现代化前端框架" },
    { name: "TypeScript", icon: <Code className="w-6 h-6" />, description: "类型安全保障" },
    { name: "FastAPI", icon: <Zap className="w-6 h-6" />, description: "高性能后端API" },
    { name: "MySQL", icon: <Database className="w-6 h-6" />, description: "企业级数据库" },
    { name: "WebSocket", icon: <Cloud className="w-6 h-6" />, description: "实时通信" }
  ];

  const useCases = [
    {
      title: "汽车TSP测试",
      description: "专为汽车远程控制服务设计的测试用例生成系统",
      metrics: ["29种业务类型", "AI智能生成", "实时监控"]
    },
    {
      title: "企业质量管理",
      description: "支持大型团队的测试管理，提供完整的质量追溯体系",
      metrics: ["多用户协作", "权限管理", "数据审计"]
    },
    {
      title: "效率提升",
      description: "相比传统手动编写测试用例，效率提升10倍以上",
      metrics: ["10倍效率提升", "质量保证", "成本降低"]
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [features.length]);

  return (
    <div className="landing-page">
      {/* Inline CSS styles */}
      <style>{`
        .landing-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #faf5ff 100%);
        }

        .hero-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 2rem;
        }

        .grid-background {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(37 99 235 / 0.03)'%3e%3cpath d='m0 .5h32m-32 32v-32'/%3e%3c/svg%3e");
        }

        .floating-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          animation: float 6s ease-in-out infinite;
        }

        .orb-1 {
          top: 10%;
          left: 25%;
          width: 180px;
          height: 180px;
          background: rgba(37, 99, 235, 0.1);
        }

        .orb-2 {
          bottom: 10%;
          right: 25%;
          width: 240px;
          height: 240px;
          background: rgba(124, 58, 237, 0.1);
          animation-delay: 2s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .hero-content {
          position: relative;
          z-index: 10;
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }

        .hero-title {
          font-size: 4rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
        }

        .hero-subtitle {
          font-size: 1.5rem;
          color: #6b7280;
          margin-bottom: 2rem;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 3rem;
          flex-wrap: wrap;
        }

        .btn {
          padding: 1rem 2rem;
          border-radius: 0.5rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          color: white;
          box-shadow: 0 4px 6px rgba(37, 99, 235, 0.1);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.2);
        }

        .btn-secondary {
          background: white;
          color: #1f2937;
          border: 1px solid #e5e7eb;
        }

        .btn-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          color: #6b7280;
        }

        .section {
          padding: 4rem 2rem;
        }

        .section-title {
          text-align: center;
          margin-bottom: 3rem;
        }

        .section-title h2 {
          font-size: 2.5rem;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .section-subtitle {
          font-size: 1.25rem;
          color: #6b7280;
          max-width: 600px;
          margin: 0 auto;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .feature-card {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          border: 1px solid #f3f4f6;
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          border-color: rgba(37, 99, 235, 0.2);
        }

        .feature-icon {
          width: 4rem;
          height: 4rem;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-bottom: 1.5rem;
        }

        .feature-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .feature-description {
          color: #6b7280;
          line-height: 1.6;
        }

        .tech-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.5rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .tech-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          transition: box-shadow 0.3s ease;
        }

        .tech-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .tech-icon {
          width: 3rem;
          height: 3rem;
          background: rgba(37, 99, 235, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          margin: 0 auto 1rem;
        }

        .use-cases-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .use-case-card {
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          border: 1px solid #f3f4f6;
        }

        .use-case-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .use-case-description {
          color: #6b7280;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .metric-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .metric-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #374151;
        }

        .cta-section {
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          color: white;
          text-align: center;
        }

        .cta-title {
          font-size: 2.5rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
        }

        .cta-subtitle {
          font-size: 1.25rem;
          opacity: 0.9;
          margin-bottom: 2rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .btn-white {
          background: white;
          color: #2563eb;
        }

        .btn-white:hover {
          background: #f9fafb;
        }

        .btn-outline {
          background: transparent;
          color: white;
          border: 2px solid white;
        }

        .btn-outline:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 3rem;
          }

          .hero-subtitle {
            font-size: 1.25rem;
          }

          .section-title h2 {
            font-size: 2rem;
          }

          .cta-title {
            font-size: 2rem;
          }
        }
      `}</style>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="grid-background" />
        <div className="floating-orb orb-1" />
        <div className="floating-orb orb-2" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hero-content"
        >
          <h1 className="hero-title">
            TSP测试用例生成系统
          </h1>
          <p className="hero-subtitle">
            企业级AI驱动的汽车TSP远程控制服务测试用例自动化生成平台
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hero-buttons"
          >
            <button
              className="btn btn-primary"
              onClick={() => window.location.href = '/dashboard'}
            >
              <Rocket className="w-5 h-5" />
              立即开始使用
            </button>
            {/* <button
              className="btn btn-secondary"
              onClick={() => window.location.href = '/test-management/generate'}
            >
              <Play className="w-5 h-5" />
              批量生成演示
            </button> */}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="stats-grid"
          >
            {[
              { value: "29", label: "业务类型", suffix: "种" },
              { value: "10x", label: "效率提升", suffix: "" },
              { value: "99.9%", label: "可用性", suffix: "" }
            ].map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-value">
                  {stat.value}{stat.suffix}
                </div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="section">
        <div className="section-title">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2>核心功能特性</h2>
            <p className="section-subtitle">
              集成AI技术与企业级架构，为汽车TSP测试提供全面的解决方案
            </p>
          </motion.div>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="feature-card"
            >
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h3 className="feature-title">
                {feature.title}
              </h3>
              <p className="feature-description">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Architecture Section */}
      <section className="section" style={{ background: '#f9fafb' }}>
        <div className="section-title">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2>现代化技术架构</h2>
            <p className="section-subtitle">
              基于最新技术栈构建，确保高性能和可扩展性
            </p>
          </motion.div>
        </div>

        <div className="tech-grid">
          {techStack.map((tech, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="tech-card"
            >
              <div className="tech-icon">
                {tech.icon}
              </div>
              <h4 style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
                {tech.name}
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {tech.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="section">
        <div className="section-title">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2>应用场景</h2>
            <p className="section-subtitle">
              适用于各种汽车TSP测试场景，满足不同规模团队的需求
            </p>
          </motion.div>
        </div>

        <div className="use-cases-grid">
          {useCases.map((useCase, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="use-case-card"
            >
              <h3 className="use-case-title">
                {useCase.title}
              </h3>
              <p className="use-case-description">
                {useCase.description}
              </p>
              <div className="metric-list">
                {useCase.metrics.map((metric, metricIndex) => (
                  <div key={metricIndex} className="metric-item">
                    <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />
                    <span>{metric}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="section cta-section">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ maxWidth: '800px', margin: '0 auto' }}
        >
          <h2 className="cta-title">
            开始使用TSP测试用例生成系统
          </h2>
          <p className="cta-subtitle">
            立即体验AI驱动的测试用例生成，提升您的测试效率
          </p>
          <div className="hero-buttons">
            <button
              className="btn btn-white"
              onClick={() => window.location.href = '/dashboard'}
            >
              立即开始
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="btn btn-outline">
              联系我们
            </button>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default LandingPage;