import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from "axios"
import { ServerUrl } from '../App'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function InterviewHistory() {
    const [interviews, setInterviews] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        const getMyInterviews = async () => {
            try {
                const result = await axios.get(ServerUrl + "/api/interview/get-interview", { withCredentials: true })

                setInterviews(result.data)

            } catch (error) {
                console.log(error)
            }

        }

        getMyInterviews()

    }, [])


    return (
        <div className='min-h-screen bg-bg flex flex-col'>
            <Navbar />

            <div className='flex-1 bg-noise'>
                <div className='max-w-[1000px] mx-auto px-6 py-16'>

                    <div className='mb-12 flex items-start gap-4'>
                        <button
                            onClick={() => navigate("/")}
                            className='mt-1.5 w-11 h-11 shrink-0 rounded-full bg-card border border-line shadow-[var(--shadow-soft)] flex items-center justify-center hover:border-black/20 dark:hover:border-white/20 transition-colors'>
                            <ArrowLeft size={16} className='text-text-secondary' />
                        </button>

                        <div>
                            <p className='text-[13px] font-semibold text-accent tracking-wide uppercase mb-2'>History</p>
                            <h1 className='text-[32px] font-semibold text-ink leading-tight'>
                                Interview History
                            </h1>
                            <p className='text-text-secondary mt-2 text-[15px]'>
                                Track your past interviews and performance reports
                            </p>
                        </div>
                    </div>

                    {interviews.length === 0 ?
                        <div className='bg-card p-14 rounded-3xl border border-line text-center'>
                            <p className='text-text-secondary text-[15px]'>
                                No interviews found. Start your first interview.
                            </p>
                        </div>

                        :

                        <div className='grid gap-4'>
                            {interviews.map((item, index) => (
                                <motion.div key={index}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35, delay: index * 0.05 }}
                                    onClick={() => navigate(`/report/${item._id}`)}
                                    className='bg-card p-6 rounded-2xl border border-line hover:border-black/20 dark:hover:border-white/20 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] transition-all duration-300 cursor-pointer'>
                                    <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                                        <div>
                                            <h3 className="text-[16px] font-semibold text-ink">
                                                {item.role}
                                            </h3>

                                            <p className="text-text-secondary text-[13.5px] mt-1">
                                                {item.experience} • {item.mode}
                                            </p>

                                            <p className="text-[12px] text-text-secondary/70 mt-2">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <div className='flex items-center gap-6'>

                                            <div className="text-right">
                                                <p className="text-[20px] font-bold text-ink">
                                                    {item.finalScore || 0}<span className='text-[13px] font-medium text-text-secondary'>/10</span>
                                                </p>
                                                <p className="text-[11.5px] text-text-secondary">
                                                    Overall Score
                                                </p>
                                            </div>

                                            <span
                                                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium ${item.status === "completed"
                                                        ? "bg-success/10 text-success"
                                                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                                                    }`}
                                            >
                                                {item.status}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                            }
                        </div>
                    }
                </div>
            </div>

            <Footer />
        </div>
    )
}

export default InterviewHistory
