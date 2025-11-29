import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getEquivalenceColor(equivalence) {
  const colors = {
    EQUIVALENT: '#6699cc', // Main Blue
    WIDER: '#4d80b3',      // Darker Blue
    NARROWER: '#88b3c8',   // Muted Blue
    INEXACT: '#b3d9ff',    // Light Blue
    UNMATCHED: '#9ca3af',  // Gray
  };
  return colors[equivalence] || '#6b7280';
}

export function getEquivalenceBadgeClass(equivalence) {
  const classes = {
    EQUIVALENT: 'bg-[#6699cc]/10 text-[#6699cc] border-[#6699cc]/20',
    WIDER: 'bg-[#4d80b3]/10 text-[#4d80b3] border-[#4d80b3]/20',
    NARROWER: 'bg-[#88b3c8]/10 text-[#88b3c8] border-[#88b3c8]/20',
    INEXACT: 'bg-[#b3d9ff]/10 text-[#6699cc] border-[#b3d9ff]/20',
    UNMATCHED: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return classes[equivalence] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getEquivalenceLabel(equivalence) {
  const labels = {
    EQUIVALENT: 'Exact Match',
    WIDER: 'Broader',
    NARROWER: 'Narrower',
    INEXACT: 'Related',
    UNMATCHED: 'No Match',
  };
  return labels[equivalence] || equivalence;
}

export function getSystemColor(system) {
  const colors = {
    ayurveda: '#6699cc',
    siddha: '#e58c8a',
    unani: '#88b3c8',
  };
  return colors[system?.toLowerCase()] || '#6b7280';
}

export function getSystemBadgeClass(system) {
  const classes = {
    ayurveda: 'bg-[#6699cc]/10 text-[#6699cc] border-[#6699cc]/20',
    siddha: 'bg-[#e58c8a]/10 text-[#e58c8a] border-[#e58c8a]/20',
    unani: 'bg-[#88b3c8]/10 text-[#88b3c8] border-[#88b3c8]/20',
  };
  return classes[system?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function formatConfidence(confidence) {
  return `${Math.round(confidence * 100)}%`;
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
