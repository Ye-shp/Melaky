import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

export default function Landing() {
  const { authUser } = useAuth();
  const isLoggedIn = !!authUser && !authUser.isAnonymous;
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-950 text-white overflow-hidden">
      <motion.header 
        style={{ opacity, scale }}
        className="relative mx-auto max-w-6xl px-6 pt-32 pb-20 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-6xl md:text-8xl font-bold leading-tight tracking-tight">
            Win at life by{' '}
            <span className="text-gradient-blue">playing within</span>
            <br />
            your rules.
          </h1>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 text-gray-400 max-w-3xl mx-auto text-xl leading-relaxed"
        >
          Our app doesn't hand you generic goals. We use your real-life constraints — who you are, where you live, and what resources you have — to design challenges that naturally guide you to grow.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 flex items-center justify-center gap-4 flex-wrap"
        >
          <Link to="/onboarding">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(102, 126, 234, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-lg shadow-xl"
            >
              Start My Challenge
            </motion.button>
          </Link>
          <Link to="/login" state={{ redirectTo: '/app' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-2xl glass-strong font-semibold text-lg hover:bg-white/15 transition-colors"
            >
              Go to Dashboard
            </motion.button>
          </Link>
        </motion.div>
      </motion.header>

      <FeatureSection 
        title="Why Constraints?"
        description="Most apps give you outcomes. We give you rules. By shaping constraints, you discover solutions that stick. That's called the Constraints-Led Approach (CLA) — a coaching method proven in sports and skill development. Instead of rigid instructions, you get tailored rules, environments, and goals that make progress feel inevitable."
      />

      <HowItWorks />

      <FinalSection />

      <footer className="mx-auto max-w-6xl px-6 py-20 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="text-gray-500 text-lg"
        >
          Your growth, your constraints, your challenge. Start today.
        </motion.p>
      </footer>
    </div>
  );
}

function FeatureSection({ title, description }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section 
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-5xl px-6 py-20"
    >
      <h2 className="text-4xl md:text-5xl font-bold mb-6">{title}</h2>
      <p className="text-gray-400 text-lg leading-relaxed">
        {description}
      </p>
    </motion.section>
  );
}

function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const steps = [
    {
      title: "Tell us about yourself.",
      description: "Answer a short questionnaire about your habits, environment, and goals.",
      icon: "1"
    },
    {
      title: "Get AI-designed challenges.",
      description: "We turn your constraints into personalized challenge options.",
      icon: "2"
    },
    {
      title: "Commit & level up.",
      description: "Put money down, invite friends, or go solo — your growth, your way.",
      icon: "3"
    },
    {
      title: "Show progress.",
      description: "Upload proof or share to Instagram/TikTok as part of your journey.",
      icon: "4"
    }
  ];

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-6 py-20">
      <motion.h2 
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-4xl md:text-5xl font-bold mb-16 text-center"
      >
        How It Works
      </motion.h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="relative group"
          >
            <div className="glass rounded-3xl p-8 h-full hover:glass-strong transition-all duration-300">
              <div className="absolute top-6 right-6 text-6xl font-bold text-white/5 group-hover:text-white/10 transition-colors">
                {step.icon}
              </div>
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 text-xl font-bold">
                  {step.icon}
                </div>
                <h3 className="font-semibold text-xl mb-3">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="mt-12 text-center"
      >
        <Link to="/onboarding">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(102, 126, 234, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-lg shadow-xl inline-flex items-center gap-2"
          >
            Take the Questionnaire
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.button>
        </Link>
      </motion.div>
    </section>
  );
}

function FinalSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section 
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-5xl px-6 py-20"
    >
      <div className="glass-strong rounded-3xl p-12 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">What makes us different</h2>
        <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto">
          Other platforms push one-size-fits-all goals. We turn your life into the playing field. Every challenge is designed from your unique performer, environment, and task constraints.
        </p>
      </div>
    </motion.section>
  );
}
