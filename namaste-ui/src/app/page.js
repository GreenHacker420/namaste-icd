'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import Lenis from 'lenis';
import { Navbar } from '@/components/layout/Navbar';
import {
  Database,
  ArrowRightLeft,
  Search,
  ChevronRight,
  Syringe,
  Stethoscope,
  Pill,
  HeartPulse,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Users,
  Activity,
  Globe
} from 'lucide-react';
import { getDashboard } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Initialize Lenis for smooth scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    getDashboard()
      .then(data => setStats(data))
      .catch(() => { });

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-white text-[#1a1a1a] selection:bg-[#6699cc] selection:text-white">
      {/* Sticky Navbar */}
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-32 pb-32 lg:pt-40 lg:pb-48 bg-gradient-to-b from-[#6699cc] to-[#99c2ff]">
        {/* Background medical icons - High Density */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {/* Large Syringes */}
          <motion.div
            className="absolute -left-10 top-40 text-white/10"
            animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Syringe className="w-32 h-32" />
          </motion.div>
          <motion.div
            className="absolute right-1/4 top-20 text-white/10"
            animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <Syringe className="w-48 h-48" />
          </motion.div>

          {/* Scattered Small Icons - Dense Pattern */}
          {/* Top Left Cluster */}
          <motion.div className="absolute left-10 top-20 text-white/20" animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity }}>
            <Pill className="w-8 h-8" />
          </motion.div>
          <motion.div className="absolute left-32 top-10 text-white/20" animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 0.5 }}>
            <HeartPulse className="w-6 h-6" />
          </motion.div>
          <motion.div className="absolute left-20 top-40 text-white/10" animate={{ rotate: [0, 10, 0] }} transition={{ duration: 7, repeat: Infinity }}>
            <Stethoscope className="w-10 h-10" />
          </motion.div>

          {/* Center/Random Cluster */}
          <motion.div className="absolute left-1/2 top-32 text-white/15" animate={{ y: [0, -12, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 1 }}>
            <Syringe className="w-12 h-12" />
          </motion.div>
          <motion.div className="absolute left-[40%] top-10 text-white/15" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 5, repeat: Infinity }}>
            <Pill className="w-8 h-8" />
          </motion.div>

          {/* Right Side Cluster */}
          <motion.div className="absolute right-20 top-40 text-white/10" animate={{ y: [0, 15, 0] }} transition={{ duration: 9, repeat: Infinity }}>
            <HeartPulse className="w-16 h-16" />
          </motion.div>
          <motion.div className="absolute right-40 top-10 text-white/20" animate={{ rotate: [0, -5, 0] }} transition={{ duration: 7, repeat: Infinity, delay: 0.5 }}>
            <Stethoscope className="w-12 h-12" />
          </motion.div>
          <motion.div className="absolute right-10 top-1/3 text-white/20" animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity }}>
            <Pill className="w-10 h-10" />
          </motion.div>

          {/* Bottom Area Cluster */}
          <motion.div className="absolute left-1/4 bottom-40 text-white/10" animate={{ y: [0, 10, 0] }} transition={{ duration: 10, repeat: Infinity }}>
            <Syringe className="w-20 h-20" />
          </motion.div>
          <motion.div className="absolute right-1/3 bottom-32 text-white/15" animate={{ rotate: [0, 15, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 1 }}>
            <Pill className="w-14 h-14" />
          </motion.div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              className="relative z-30 order-1 lg:order-1"
              style={{ isolation: 'isolate' }}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-bold tracking-wide mb-8 border border-white/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                READY TO GROW? WE'RE READY TO GO →
              </div>

              <motion.h1
                className="text-5xl md:text-6xl lg:text-[4.5rem] font-black font-outfit text-white leading-[1.1] tracking-tight uppercase mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                NAMASTE CODES<br />
                ICD-11 MAPPING<br />
                FOR DOCTORS
              </motion.h1>

              <motion.p
                className="text-xl text-blue-50 max-w-lg mb-10 leading-relaxed font-medium"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                Streamline Patient Data & Enhance Diagnosis with Intelligent Solutions
              </motion.p>

              <motion.div
                className="flex flex-wrap gap-4 relative z-40"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Link href="/mapping" className="relative z-50">
                  <motion.div
                    className="px-8 py-4 bg-white text-[#6699cc] font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl text-lg cursor-pointer text-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Get Started
                  </motion.div>
                </Link>
                <Link href="/contact" className="relative z-50">
                  <motion.div
                    className="px-8 py-4 bg-transparent text-white font-bold rounded-xl hover:bg-white/10 transition-colors text-lg border border-white/30 cursor-pointer text-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Contact us
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right - Robot Illustration */}
            <motion.div
              className="flex justify-center lg:justify-center pointer-events-none order-2 lg:order-2 relative z-10"
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="relative"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Robot Image */}
                <Image
                  src="/robot.png"
                  alt="NAMASTE Robot"
                  width={1200}
                  height={1350}
                  className="w-full max-w-[160%] -ml-[30%] lg:-ml-[10%] lg:max-w-[140%] drop-shadow-2xl"
                  priority
                />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Gradient Overlay for Blending */}
        {/* <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#F7F9EA] to-transparent z-10"></div>  */}

        {/* Round Gradient Shape at Bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 lg:h-48 overflow-hidden z-20">
          <div className="absolute -bottom-[50%] left-1/2 -translate-x-1/2 w-[150%] h-full bg-white rounded-[100%]"></div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative z-30 -mt-20 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {[
              { label: 'NAMASTE Codes', value: stats?.overview?.totalNamasteCodes?.toLocaleString() || '7,000+', icon: Database, color: 'text-[#6699cc]' },
              { label: 'TM2 Codes', value: stats?.overview?.totalTm2Codes?.toLocaleString() || '700+', icon: Activity, color: 'text-[#e58c8a]' },
              { label: 'Medical Systems', value: '3', icon: Globe, color: 'text-[#6699cc]' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50 hover:shadow-2xl transition-all"
                whileHover={{ y: -10 }}
              >
                <div className={`w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 ${stat.color}`}>
                  <stat.icon className="w-8 h-8" />
                </div>
                <h3 className="text-4xl font-black text-gray-900 mb-2">{stat.value}</h3>
                <p className="text-gray-600 font-medium text-lg">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-white/50 backdrop-blur-sm relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-sm font-bold text-[#6699cc] tracking-widest uppercase mb-3">Process</h2>
            <h3 className="text-4xl md:text-5xl font-black text-[#1a1a1a]">How It Works</h3>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#6699cc]/20 to-transparent -translate-y-1/2 z-0"></div>

            {[
              { title: 'Search', desc: 'Enter symptoms or diagnosis in standard terms', icon: Search },
              { title: 'Map', desc: 'AI automatically finds matching NAMASTE codes', icon: ArrowRightLeft },
              { title: 'Standardize', desc: 'Get compliant ICD-11 TM2 codes instantly', icon: CheckCircle2 },
            ].map((step, index) => (
              <motion.div
                key={index}
                className="relative z-10 bg-white rounded-2xl p-8 text-center border border-[#6699cc]/10 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center text-[#6699cc] mb-6 shadow-lg border border-[#6699cc]/20">
                  <step.icon className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-[#1a1a1a] mb-3">{step.title}</h4>
                <p className="text-gray-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-sm font-bold text-[#6699cc] tracking-widest uppercase mb-3">Benefits</h2>
              <h3 className="text-4xl md:text-5xl font-black text-[#1a1a1a] mb-8">Why Choose NAMASTE-ICD?</h3>

              <div className="space-y-8">
                {[
                  { title: 'AI-Powered Accuracy', desc: 'Advanced algorithms ensure precise code mapping with 99% accuracy.', icon: TrendingUp, color: 'bg-[#6699cc]' },
                  { title: 'Universal Compliance', desc: 'Fully compliant with WHO ICD-11 standards for global interoperability.', icon: ShieldCheck, color: 'bg-[#e58c8a]' },
                  { title: 'Doctor-Centric Design', desc: 'Built specifically for AYUSH practitioners to streamline workflow.', icon: Users, color: 'bg-[#6699cc]' },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex gap-6"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center text-white shrink-0 shadow-lg`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-[#1a1a1a] mb-2">{feature.title}</h4>
                      <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#6699cc]/20 to-[#e58c8a]/20 rounded-3xl transform rotate-3"></div>
              <div className="bg-white rounded-3xl p-8 shadow-2xl relative border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-sm text-gray-400 font-mono">mapping_engine.exe</div>
                </div>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex gap-4">
                    <span className="text-[#6699cc]">$</span>
                    <span className="text-gray-800">initiate_mapping --symptom="Jwara"</span>
                  </div>
                  <div className="text-gray-400 pl-6">Analyzing input...</div>
                  <div className="text-[#6699cc] pl-6">Found match: NAMASTE-1234</div>
                  <div className="text-[#e58c8a] pl-6">Mapping to ICD-11...</div>
                  <div className="flex gap-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-700 font-bold">Success: TM2 Code Generated</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7aa6d6] to-[#5588bb]">
          <div className="absolute inset-0 opacity-10 pattern-grid-lg"></div>
          {/* Background Icon */}
          <motion.div
            className="absolute -right-20 -top-20 text-white/10 rotate-12"
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          >
            <Syringe className="w-96 h-96" />
          </motion.div>
          <motion.div
            className="absolute -left-20 -bottom-20 text-white/5 -rotate-12"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          >
            <Stethoscope className="w-80 h-80" />
          </motion.div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.h2
            className="text-4xl md:text-5xl font-black text-white mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Ready to Modernize Your Practice?
          </motion.h2>
          <motion.p
            className="text-xl text-white/90 mb-12 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Join thousands of doctors using NAMASTE-ICD to streamline their diagnosis and reporting.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/mapping">
              <motion.div
                className="px-10 py-5 bg-white text-[#6699cc] font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl text-xl cursor-pointer inline-block"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started Now
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white text-[#1a1a1a] py-12 rounded-t-[3rem] mt-[-2rem] relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#6699cc] to-[#e58c8a] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <div>
                <span className="block font-bold text-lg text-[#1a1a1a]">NAMASTE-ICD</span>
                <span className="text-gray-500 text-xs">Intelligent Mapping Engine</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm">
              © 2025 NAMASTE-ICD. Built for AYUSH.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-500 hover:text-[#6699cc] transition-colors">Privacy</a>
              <a href="#" className="text-gray-500 hover:text-[#6699cc] transition-colors">Terms</a>
              <a href="/contact" className="text-gray-500 hover:text-[#6699cc] transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
