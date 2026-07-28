import React, { useState } from 'react'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from "motion/react";
import axios from 'axios';
import { ServerUrl } from '../App';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';

function Pricing() {
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const dispatch = useDispatch()

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "₹0",
      credits: 100,
      description: "Perfect for beginners starting interview preparation.",
      features: [
        "100 AI Interview Credits",
        "Basic Performance Report",
        "Voice Interview Access",
        "Limited History Tracking",
      ],
      default: true,
    },
    {
      id: "basic",
      name: "Starter Pack",
      price: "₹100",
      credits: 150,
      description: "Great for focused practice and skill improvement.",
      features: [
        "150 AI Interview Credits",
        "Detailed Feedback",
        "Performance Analytics",
        "Full Interview History",
      ],
    },
    {
      id: "pro",
      name: "Pro Pack",
      price: "₹500",
      credits: 650,
      description: "Best value for serious job preparation.",
      features: [
        "650 AI Interview Credits",
        "Advanced AI Feedback",
        "Skill Trend Analysis",
        "Priority AI Processing",
      ],
      badge: "Best Value",
    },
  ];



  const handlePayment = async (plan) => {
    try {
      setLoadingPlan(plan.id)

      const amount =
      plan.id === "basic" ? 100 :
      plan.id === "pro" ? 500 : 0;

      const result = await axios.post(ServerUrl + "/api/payment/order" , {
        planId: plan.id,
        amount: amount,
        credits: plan.credits,
      },{withCredentials:true})


      const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: result.data.amount,
      currency: "INR",
      name: "ATS Pro",
      description: `${plan.name} - ${plan.credits} Credits`,
      order_id: result.data.id,

      handler:async function (response) {
        const verifypay = await axios.post(ServerUrl + "/api/payment/verify" ,response , {withCredentials:true})
        dispatch(setUserData(verifypay.data.user))

          alert("Payment Successful 🎉 Credits Added!");
          navigate("/")

      },
      theme:{
        color: "#E0271B",
      },

      }

      const rzp = new window.Razorpay(options)
      rzp.open()

      setLoadingPlan(null);
    } catch (error) {
     console.log(error)
     setLoadingPlan(null);
    }
  }



  return (
    <div className='min-h-screen bg-bg flex flex-col'>
      <Navbar />

      <div className='flex-1 bg-noise'>
        <div className='max-w-[1280px] mx-auto px-6 pt-16 pb-[120px]'>

          <div className='flex items-start gap-4 mb-16'>
            <button onClick={() => navigate("/")} className='mt-1.5 w-11 h-11 shrink-0 rounded-full bg-card border border-line shadow-[var(--shadow-soft)] flex items-center justify-center hover:border-black/20 dark:hover:border-white/20 transition-colors'>
              <ArrowLeft size={16} className='text-text-secondary' />
            </button>

            <div className="text-center w-full">
              <p className='text-[13px] font-semibold text-accent tracking-wide uppercase mb-4'>Pricing</p>
              <h1 className="text-[36px] sm:text-[42px] font-semibold text-ink leading-tight">
                Choose Your Plan
              </h1>
              <p className="text-text-secondary mt-3 text-[17px]">
                Flexible pricing to match your interview preparation goals.
              </p>
            </div>
          </div>


          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto'>

            {plans.map((plan, i) => {
              const isSelected = selectedPlan === plan.id

              return (
                <motion.div key={plan.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  whileHover={!plan.default ? { y: -4 } : {}}
                  onClick={() => !plan.default && setSelectedPlan(plan.id)}

                  className={`relative rounded-3xl p-8 transition-all duration-300 border bg-card
                    ${isSelected
                      ? "border-accent/60 shadow-[var(--shadow-lift)]"
                      : "border-line shadow-[var(--shadow-soft)] hover:border-black/20 dark:hover:border-white/20"
                    }
                    ${plan.default ? "cursor-default" : "cursor-pointer"}
                  `}
                >

                  {plan.badge && (
                    <div className="absolute -top-3 right-6 bg-accent text-white text-[11.5px] font-medium px-3.5 py-1.5 rounded-full shadow-[0_8px_20px_-8px_rgba(224,39,27,0.6)] inline-flex items-center gap-1">
                      <Sparkles size={11} /> {plan.badge}
                    </div>
                  )}

                  {plan.default && (
                    <div className="absolute top-6 right-6 bg-black/[0.05] dark:bg-white/[0.08] text-text-secondary text-[11.5px] font-medium px-3 py-1 rounded-full">
                      Default
                    </div>
                  )}

                  <h3 className="text-[17px] font-semibold text-ink">
                    {plan.name}
                  </h3>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-[36px] font-bold text-ink tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-text-secondary text-[13.5px]">/ {plan.credits} credits</span>
                  </div>

                  <p className="text-text-secondary mt-4 text-[14px] leading-relaxed min-h-[42px]">
                    {plan.description}
                  </p>

                  <div className="mt-6 space-y-3 text-left border-t border-line pt-6">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <div className='w-4.5 h-4.5 rounded-full bg-accent/10 flex items-center justify-center shrink-0'>
                          <Check size={11} strokeWidth={3} className="text-accent" />
                        </div>
                        <span className="text-text-secondary text-[13.5px]">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {!plan.default &&
                    <Button
                      disabled={loadingPlan === plan.id}
                      variant={isSelected ? "primary" : "secondary"}
                      className="w-full mt-8 !py-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isSelected) {
                          setSelectedPlan(plan.id)
                        } else {
                          handlePayment(plan)
                        }
                      }}>
                      {loadingPlan === plan.id
                        ? "Processing..."
                        : isSelected
                          ? "Proceed to Pay"
                          : "Select Plan"}
                    </Button>
                  }
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default Pricing
