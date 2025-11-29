'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Search,
  Database,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/mapping', label: 'AI Mapping', icon: ArrowRightLeft },
  { href: '/browse', label: 'Browse Codes', icon: Database },
  { href: '/search', label: 'Search', icon: Search },
];

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    }
  },
};

export function Navbar({ rounded = false }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { scrollY } = useScroll();

  // Transform values based on scroll - start with margins, shrink on scroll
  const navWidth = useTransform(scrollY, [0, 150], ['95%', '85%']);
  const navMarginTop = useTransform(scrollY, [0, 150], [16, 12]);
  const navBorderRadius = useTransform(scrollY, [0, 150], [20, 24]);
  const navScale = useTransform(scrollY, [0, 150], [1, 0.98]);
  const navShadow = useTransform(
    scrollY,
    [0, 150],
    ['0 4px 20px rgba(102, 153, 204, 0.1)', '0 8px 32px rgba(102, 153, 204, 0.15)']
  );

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4"
      style={{ paddingTop: navMarginTop }}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.nav
        className="bg-white/70 backdrop-blur-xl border border-white/40 max-w-7xl"
        style={{
          width: navWidth,
          borderRadius: navBorderRadius,
          boxShadow: navShadow,
          scale: navScale,
        }}
      >
        <div className="px-4 sm:px-6 lg:px-8">
          <motion.div
            className="flex justify-between h-16"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Logo */}
            <motion.div className="flex items-center" variants={itemVariants}>
              <Link href="/" className="flex items-center gap-3 group">
                <motion.div
                  className="block"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h1 className="text-2xl font-black font-fraunces text-gray-800 group-hover:text-[#6699cc] transition-colors tracking-tight">NAMASTE-ICD</h1>
                  <p className="text-xs text-[#6699cc] font-medium tracking-wide hidden sm:block">Intelligent Mapping Engine</p>
                </motion.div>
              </Link>
            </motion.div>

            {/* Desktop Nav */}
            <div className="hidden xl:flex items-center gap-1">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    variants={itemVariants}
                    custom={index}
                  >
                    <Link href={item.href}>
                      <motion.div
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                          isActive
                            ? 'bg-[#6699cc]/10 text-[#6699cc]'
                            : 'text-gray-600 hover:bg-[#6699cc]/5 hover:text-[#6699cc]'
                        )}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* API Status */}
            <motion.div
              className="hidden xl:flex items-center gap-3"
              variants={itemVariants}
            >
              <motion.div
                className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-lg border border-[#6699cc]/20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4 text-[#e58c8a]" />
                </motion.div>
                <span className="text-sm text-[#6699cc] font-medium">API Online</span>
              </motion.div>
            </motion.div>

            {/* Mobile Menu Button */}
            <motion.div
              className="xl:hidden flex items-center"
              variants={itemVariants}
            >
              <motion.button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 rounded-lg text-gray-600 hover:bg-[#6699cc]/10 hover:text-[#6699cc]"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <AnimatePresence mode="wait">
                  {mobileOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="w-6 h-6" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="w-6 h-6" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="xl:hidden border-t border-gray-100 bg-white/90 backdrop-blur-xl rounded-b-2xl overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="px-4 py-3 space-y-1">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium',
                          isActive
                            ? 'bg-[#6699cc]/10 text-[#6699cc]'
                            : 'text-gray-600 hover:bg-[#6699cc]/5 hover:text-[#6699cc]'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}

                {/* Mobile API Status */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="pt-2 mt-2 border-t border-gray-100"
                >
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#6699cc]/5 border border-[#6699cc]/10">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-4 h-4 text-[#e58c8a]" />
                    </motion.div>
                    <span className="text-sm text-[#6699cc] font-medium">API Online</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </motion.div>
  );
}
