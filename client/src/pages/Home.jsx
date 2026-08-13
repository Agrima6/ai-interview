import React from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Button from '../components/Button'
import HeroMockup from '../components/HeroMockup'
import StepsTimeline from '../components/StepsTimeline'
import FeatureShowcase from '../components/FeatureShowcase'
import InterviewModesSection from '../components/InterviewModesSection'
import { motion } from "motion/react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';

import evalImg from "../assets/ai-ans.png";
import resumeImg from "../assets/resume.png";
import pdfImg from "../assets/pdf.png";
import analyticsImg from "../assets/history.png";

const featureImages = { evalImg, resumeImg, pdfImg, analyticsImg }

function Section({ id, eyebrow, title, desc, children, className = "" }) {
  return (
    <section id={id} className={`max-w-[1280px] mx-auto px-6 py-[100px] lg:py-[140px] ${className}`}>
      {(eyebrow || title) && (
        <div className='max-w-2xl mx-auto text-center mb-16'>
          {eyebrow && (
            <p className='text-[13px] font-semibold text-accent tracking-wide uppercase mb-4'>{eyebrow}</p>
          )}
          {title && (
            <h2 className='text-[34px] sm:text-[42px] font-semibold text-ink leading-[1.15] text-balance mb-4'>{title}</h2>
          )}
          {desc && <p className='text-[17px] text-text-secondary leading-relaxed'>{desc}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

function Home() {
  const navigate = useNavigate()
  return (
    <div className='min-h-screen bg-bg flex flex-col'>
      <Navbar />

      {/* HERO */}
      <div className='relative bg-noise overflow-hidden'>
        <div className='absolute top-[-120px] right-[-120px] w-[480px] h-[480px] rounded-full bg-[radial-gradient(closest-side,rgba(196,22,31,0.14),transparent)] blur-2xl -z-10' />
        <div className='absolute top-[200px] left-[-160px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(closest-side,rgba(17,17,17,0.05),transparent)] blur-2xl -z-10 dark:bg-[radial-gradient(closest-side,rgba(255,255,255,0.05),transparent)]' />

        <div className='max-w-[1280px] mx-auto px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 grid lg:grid-cols-2 gap-16 items-center'>
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className='inline-flex items-center gap-2 bg-card border border-line text-[13px] text-text-secondary px-4 py-2 rounded-full mb-7 shadow-[var(--shadow-soft)]'
            >
              <span className='w-1.5 h-1.5 rounded-full bg-accent' />
              AI-Powered Interview Coaching
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className='text-[44px] sm:text-[56px] lg:text-[64px] font-bold text-ink leading-[1.05] tracking-tight text-balance mb-6'
            >
              Interview Like You're<br className='hidden sm:block' /> Already Hired.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className='text-[18px] text-text-secondary leading-relaxed max-w-lg mb-9'
            >
              Role-based mock interviews with adaptive difficulty, real voice conversation and honest, real-time AI evaluation.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className='flex flex-wrap items-center gap-4'
            >
              <Button size="lg" onClick={() => navigate('/interview')}>
                Start Interview <ArrowRight size={17} />
              </Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('/history')}>
                <PlayCircle size={17} /> View History
              </Button>
            </motion.div>
          </div>

          <HeroMockup />
        </div>
      </div>

      {/* STEPS */}
      <Section
        id="features"
        eyebrow="How it works"
        title="From resume to report in five steps"
        desc="A complete interview simulation — start to finish — powered end-to-end by AI."
      >
        <StepsTimeline />
      </Section>

      {/* FEATURE SHOWCASE */}
      <Section
        eyebrow="Capabilities"
        title="Built to feel like a real interview"
        desc="Every feature exists to make practice feel closer to the real thing — and the feedback more useful."
        className="!pb-0"
      >
        <FeatureShowcase images={featureImages} />
      </Section>

      {/* INTERVIEW MODES */}
      <Section
        id="modes"
        eyebrow="Interview Modes"
        title="Choose the interview that matches your goal"
        desc="Two focused tracks, each with adaptive difficulty and AI-graded feedback."
      >
        <InterviewModesSection />
      </Section>

      {/* CTA BANNER — intentionally always-dark, like Footer, regardless of theme */}
      <section className='max-w-[1280px] mx-auto px-6 pb-[100px] lg:pb-[140px]'>
        <div className='relative overflow-hidden bg-[#120f10] rounded-[32px] px-8 py-16 sm:py-20 text-center bg-noise'>
          <div className='absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-[radial-gradient(closest-side,rgba(196,22,31,0.35),transparent)] blur-2xl' />
          <h2 className='relative text-[32px] sm:text-[42px] font-semibold text-white leading-tight mb-4 text-balance'>
            Ready to walk in already prepared?
          </h2>
          <p className='relative text-white/60 text-[16px] mb-9 max-w-lg mx-auto'>
            Start your first AI interview in under a minute. No setup, no scheduling.
          </p>
          <div className='relative'>
            <Button variant="accent" size="lg" onClick={() => navigate('/interview')}>
              Start Interview <ArrowRight size={17} />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Home
