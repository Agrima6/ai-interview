import React from 'react'
import { useState } from 'react'
import Step1SetUp from '../components/Step1SetUp'
import Step2Interview from '../components/Step2Interview'
import Step3Report from '../components/Step3Report'
import ThemeToggle from '../components/ThemeToggle'

function InterviewPage() {
    const [step,setStep] = useState(1)
    const [interviewData,setInterviewData] = useState(null)

  return (
    <div className='min-h-screen bg-bg relative'>
        {/* hidden during the proctored interview step (step 2) to keep that screen distraction-free */}
        {step !== 2 && <ThemeToggle className="!fixed top-5 right-5 z-40 !bg-card" />}

        {step===1 && (
            <Step1SetUp onStart={(data)=>{
                setInterviewData(data);
            setStep(2)}}/>
        )}

         {step===2 && (
            <Step2Interview interviewData={interviewData}
            onFinish={(report)=>{setInterviewData(report);
                setStep(3)
            }}
            />
        )}

          {step===3 && (
            <Step3Report report={interviewData}/>
        )}


    </div>
  )
}

export default InterviewPage
