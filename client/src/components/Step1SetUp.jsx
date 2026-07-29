import React from 'react'
import { motion } from "motion/react"
import {
    User,
    Briefcase,
    UploadCloud,
    Mic,
    LineChart,
    Sparkles,
    Languages,
    AudioLines,
} from "lucide-react";
import { useState } from 'react';
import axios from "axios"
import { ServerUrl } from '../App';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import Button from './Button';
import Dropdown from './Dropdown';
import RoleCombobox from './RoleCombobox';

// Each preset role declares which interview types make sense for it - a
// "Sales Executive" interview offering a "Technical Interview" mode wouldn't
// make sense, for instance. The first entry in `modes` is the default.
// Roles are suggestions for the combobox, not a restriction - typing any
// other exact title is always allowed too (falls back to ALL_MODES below).
const ROLE_OPTIONS = [
    { value: "Frontend Developer", modes: ["Technical", "System Design", "Behavioral", "HR"] },
    { value: "Backend Developer", modes: ["Technical", "System Design", "Behavioral", "HR"] },
    { value: "Full Stack Developer", modes: ["Technical", "System Design", "Behavioral", "HR"] },
    { value: "Mobile App Developer", modes: ["Technical", "System Design", "Behavioral", "HR"] },
    { value: "Data Scientist / ML Engineer", modes: ["Technical", "Case Study", "Behavioral", "HR"] },
    { value: "DevOps Engineer", modes: ["Technical", "System Design", "Behavioral", "HR"] },
    { value: "QA / Test Engineer", modes: ["Technical", "Behavioral", "HR"] },
    { value: "UI/UX Designer", modes: ["Behavioral", "Case Study", "HR", "Technical"] },
    { value: "Product Manager", modes: ["Case Study", "Behavioral", "Managerial Round", "HR"] },
    { value: "Business Analyst", modes: ["Case Study", "Behavioral", "HR"] },
    { value: "HR Executive", modes: ["HR", "Behavioral", "Group Discussion"] },
    { value: "Sales Executive", modes: ["HR", "Behavioral", "Group Discussion"] },
    { value: "Marketing Executive", modes: ["HR", "Case Study", "Group Discussion"] },
    { value: "Customer Support Executive", modes: ["HR", "Behavioral", "Group Discussion"] },
]
const ROLE_SUGGESTIONS = ROLE_OPTIONS.map((r) => r.value)
const ALL_MODES = ["Technical", "HR", "Behavioral", "System Design", "Case Study", "Group Discussion", "Managerial Round"]
const MODE_LABELS = {
    Technical: "Technical Interview",
    HR: "HR Interview",
    Behavioral: "Behavioral Interview",
    "System Design": "System Design Interview",
    "Case Study": "Case Study Interview",
    "Group Discussion": "Group Discussion",
    "Managerial Round": "Managerial Round",
}
const LANGUAGE_OPTIONS = [
    { value: "English", label: "English" },
    { value: "Hinglish", label: "Hinglish" },
]
const VOICE_OPTIONS = [
    { value: "auto", label: "Interviewer Voice: Auto" },
    { value: "female", label: "Interviewer Voice: Female" },
    { value: "male", label: "Interviewer Voice: Male" },
]

// Finds the preset matching a role string (e.g. from resume analysis or
// manual typing), so the interview-type dropdown can narrow to what's
// relevant. Unmatched/custom roles fall back to the full list of types.
const findRoleOption = (roleStr) =>
    ROLE_OPTIONS.find((r) => r.value.toLowerCase() === (roleStr || "").trim().toLowerCase())

function Step1SetUp({ onStart }) {
    const { userData } = useSelector((state) => state.user)
    const dispatch = useDispatch()
    // An Admin can pre-assign an employee's next interview (role/experience/mode/
    // context) - when set, this employee doesn't pick freely, they just confirm it.
    const isAssigned = Boolean(userData?.assignedRole)
    const [role, setRole] = useState(userData?.assignedRole || "");
    const [experience, setExperience] = useState(userData?.assignedExperience || "");
    const [mode, setMode] = useState(userData?.assignedMode || "Technical");
    const [language, setLanguage] = useState("English");
    const [voicePreference, setVoicePreference] = useState("auto");
    const [resumeFile, setResumeFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [skills, setSkills] = useState([]);
    const [resumeText, setResumeText] = useState("");
    const [analysisDone, setAnalysisDone] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    const availableModes = findRoleOption(role)?.modes || ALL_MODES
    const modeOptions = availableModes.map((m) => ({ value: m, label: MODE_LABELS[m] }))

    const handleRoleChange = (value) => {
        setRole(value)
        const preset = findRoleOption(value)
        if (preset && !preset.modes.includes(mode)) {
            setMode(preset.modes[0])
        }
    }

    const handleUploadResume = async () => {
        if (!resumeFile || analyzing) return;
        setAnalyzing(true)

        const formdata = new FormData()
        formdata.append("resume", resumeFile)

        try {
            const result = await axios.post(ServerUrl + "/api/interview/resume", formdata, { withCredentials: true })

            console.log(result.data)

            const extractedRole = result.data.role || "";
            setRole(extractedRole)
            const preset = findRoleOption(extractedRole)
            if (preset && !preset.modes.includes(mode)) setMode(preset.modes[0])
            setExperience(result.data.experience || "");
            setProjects(result.data.projects || []);
            setSkills(result.data.skills || []);
            setResumeText(result.data.resumeText || "");
            setAnalysisDone(true);

            setAnalyzing(false);

        } catch (error) {
            console.log(error)
            alert(error.response?.data?.message || "Failed to analyze resume.")
            setAnalyzing(false);
        }
    }

    const handleStart = async () => {
        setLoading(true)
        try {
           const result = await axios.post(ServerUrl + "/api/interview/generate-questions" , {role, experience, mode, language, resumeText, projects, skills } , {withCredentials:true})
           // Note: if this account has an admin-assigned role/experience/mode, the
           // server enforces those regardless of what's sent here - see interview.controller.js.
           console.log(result.data)
           if(userData){
            dispatch(setUserData({...userData , credits:result.data.creditsLeft}))
           }
           setLoading(false)
           onStart({ ...result.data, voicePreference })

        } catch (error) {
            console.log(error)
            alert(error.response?.data?.message || "Failed to start interview.")
            setLoading(false)
        }
    }
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className='min-h-screen flex items-center justify-center bg-bg bg-noise px-4 py-10'>

            <div className='w-full max-w-[1080px] bg-card rounded-3xl border border-line shadow-[var(--shadow-lift)] grid md:grid-cols-2 overflow-hidden'>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className='relative bg-[#120f10] p-10 md:p-12 flex flex-col justify-center text-white bg-noise'>

                    <div className='absolute top-[-80px] right-[-80px] w-[280px] h-[280px] rounded-full bg-[radial-gradient(closest-side,rgba(224,39,27,0.3),transparent)] blur-2xl' />

                    <div className='relative inline-flex items-center gap-2 bg-white/10 text-[12.5px] px-3.5 py-1.5 rounded-full mb-7 w-fit'>
                        <Sparkles size={12} className='text-accent' />
                        AI-Powered Setup
                    </div>

                    <h2 className="text-[30px] sm:text-[34px] font-semibold mb-5 leading-[1.15] text-balance">
                        Start Your AI Interview
                    </h2>

                    <p className="text-white/60 mb-10 text-[15px] leading-relaxed">
                        Practice real interview scenarios powered by AI.
                        Improve communication, technical skills, and confidence.
                    </p>

                    <div className='relative space-y-3'>
                        {
                            [
                                { icon: User, text: "Choose Role & Experience" },
                                { icon: Mic, text: "Smart Voice Interview" },
                                { icon: LineChart, text: "Performance Analytics" },
                            ].map((item, index) => (
                                <motion.div key={index}
                                    initial={{ y: 16, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                    className='flex items-center gap-3.5 bg-white/[0.06] border border-white/10 p-3.5 rounded-2xl'>
                                    <div className='w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0'>
                                        <item.icon size={16} strokeWidth={1.75} className='text-accent' />
                                    </div>
                                    <span className='text-[14px] font-medium text-white/90'>{item.text}</span>
                                </motion.div>
                            ))
                        }
                    </div>

                </motion.div>



                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className="p-10 md:p-12 bg-card">

                    <h2 className='text-[22px] font-semibold text-ink mb-8'>
                        Interview Setup
                    </h2>


                    <div className='space-y-4'>

                        {isAssigned ? (
                            <div className='bg-accent/[0.06] border border-accent/20 rounded-2xl p-5 space-y-2.5'>
                                <p className='text-[12px] font-semibold text-accent uppercase tracking-wide'>Interview assigned by your admin</p>
                                <p className='text-[15px] font-semibold text-ink'>{role}</p>
                                <p className='text-[13px] text-text-secondary'>
                                    {experience} &bull; {MODE_LABELS[mode] || mode}
                                    {userData?.department ? ` • ${userData.department}` : ""}
                                </p>
                                {userData?.assignedContext && (
                                    <p className='text-[12.5px] text-text-secondary leading-relaxed pt-2 border-t border-accent/15'>
                                        {userData.assignedContext}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <>
                                <RoleCombobox
                                    value={role}
                                    onChange={handleRoleChange}
                                    options={ROLE_SUGGESTIONS}
                                />

                                <div className='relative'>
                                    <Briefcase size={16} className='absolute top-1/2 -translate-y-1/2 left-4 text-text-secondary' />

                                    <input type='text' placeholder='Experience (e.g. 2 years)'
                                        className='w-full pl-11 pr-4 py-3 text-[14.5px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors'
                                        onChange={(e) => setExperience(e.target.value)} value={experience} />
                                </div>

                                <Dropdown
                                    icon={Sparkles}
                                    value={mode}
                                    onChange={setMode}
                                    options={modeOptions}
                                />
                            </>
                        )}

                        <Dropdown
                            icon={Languages}
                            value={language}
                            onChange={setLanguage}
                            options={LANGUAGE_OPTIONS}
                        />

                        <Dropdown
                            icon={AudioLines}
                            value={voicePreference}
                            onChange={setVoicePreference}
                            options={VOICE_OPTIONS}
                        />

                        {!isAssigned && !analysisDone && (
                            <motion.div
                                whileHover={{ scale: 1.01 }}
                                onClick={() => document.getElementById("resumeUpload").click()}
                                className='border-2 border-dashed border-line rounded-2xl p-7 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/[0.03] transition-colors'>

                                <UploadCloud size={28} strokeWidth={1.5} className='mx-auto text-accent mb-3' />

                                <input type="file"
                                    accept="application/pdf"
                                    id="resumeUpload"
                                    className='hidden'
                                    onChange={(e) => setResumeFile(e.target.files[0])} />

                                <p className='text-text-secondary font-medium text-[14px]'>
                                    {resumeFile ? resumeFile.name : "Click to upload resume (Optional)"}
                                </p>

                                {resumeFile && (
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUploadResume()
                                        }}
                                        className='mt-4 !px-5 !py-2 !text-[13.5px]'>
                                        {analyzing ? "Analyzing..." : "Analyze Resume"}
                                    </Button>)}

                            </motion.div>


                        )}

                        {analysisDone && (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                className='bg-black/[0.02] dark:bg-white/[0.04] border border-line rounded-2xl p-5 space-y-4'>
                                <h3 className='text-[14px] font-semibold text-ink'>
                                    Resume Analysis Result</h3>

                                {projects.length > 0 && (
                                    <div>
                                        <p className='text-[13px] font-medium text-text-secondary mb-1.5'>
                                            Projects:</p>

                                        <ul className='list-disc list-inside text-text-secondary text-[13px] space-y-1'>
                                            {projects.map((p, i) => (
                                                <li key={i}>{p}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {skills.length > 0 && (
                                    <div>
                                        <p className='text-[13px] font-medium text-text-secondary mb-1.5'>
                                            Skills:</p>

                                        <div className='flex flex-wrap gap-2'>
                                            {skills.map((s, i) => (
                                                <span key={i} className='bg-accent/10 text-accent px-2.5 py-1 rounded-full text-[12px] font-medium'>{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </motion.div>
                        )}


                        <Button
                            onClick={handleStart}
                            disabled={!role || !experience || loading}
                            size="lg"
                            className='w-full !rounded-xl'>
                            {loading ? "Starting..." : "Start Interview"}
                        </Button>
                    </div>

                </motion.div>
            </div>

        </motion.div>
    )
}

export default Step1SetUp
