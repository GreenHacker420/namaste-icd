'use client';

import { Navbar } from '@/components/layout/Navbar';
import { MappingDemo } from '@/components/mapping/MappingDemo';

export default function MappingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-black font-fraunces text-[#1a1a1a]">AI Mapping</h1>
          <p className="text-gray-500 mt-2 font-medium">
            Map NAMASTE codes to ICD-11 TM2 using AI-powered semantic analysis
          </p>
        </div>

        <MappingDemo />
      </div>
    </div>
  );
}
