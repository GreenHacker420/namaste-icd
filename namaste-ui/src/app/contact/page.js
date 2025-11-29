'use client';

import { Navbar } from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-white text-[#1a1a1a]">
            <Navbar />

            <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-5xl font-black font-fraunces text-[#1a1a1a] mb-6">Get in Touch</h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Have questions about NAMASTE-ICD mapping? We're here to help you modernize your practice.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-8"
                    >
                        <div className="bg-white p-8 rounded-2xl shadow-lg border border-[#6699cc]/10">
                            <h3 className="text-2xl font-bold font-fraunces mb-6 text-[#6699cc]">Contact Information</h3>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#6699cc]/10 rounded-xl flex items-center justify-center shrink-0">
                                        <Mail className="w-6 h-6 text-[#6699cc]" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">Email Us</p>
                                        <p className="text-gray-600">support@namaste-icd.org</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#e58c8a]/10 rounded-xl flex items-center justify-center shrink-0">
                                        <Phone className="w-6 h-6 text-[#e58c8a]" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">Call Us</p>
                                        <p className="text-gray-600">+91 11 2345 6789</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#6699cc]/10 rounded-xl flex items-center justify-center shrink-0">
                                        <MapPin className="w-6 h-6 text-[#6699cc]" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">Visit Us</p>
                                        <p className="text-gray-600">AYUSH Bhawan, B Block, GPO Complex,<br />INA, New Delhi - 110023</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white p-8 rounded-2xl shadow-lg border border-[#6699cc]/10"
                    >
                        <h3 className="text-2xl font-bold font-fraunces mb-6 text-[#1a1a1a]">Send a Message</h3>
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">First Name</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#6699cc] focus:ring-2 focus:ring-[#6699cc]/20 outline-none transition-all" placeholder="John" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Last Name</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#6699cc] focus:ring-2 focus:ring-[#6699cc]/20 outline-none transition-all" placeholder="Doe" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                <input type="email" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#6699cc] focus:ring-2 focus:ring-[#6699cc]/20 outline-none transition-all" placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                                <textarea rows="4" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#6699cc] focus:ring-2 focus:ring-[#6699cc]/20 outline-none transition-all" placeholder="How can we help you?"></textarea>
                            </div>
                            <button className="w-full py-4 bg-[#6699cc] text-white font-bold rounded-xl hover:bg-[#5588bb] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                                <Send className="w-5 h-5" />
                                Send Message
                            </button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
