import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'
import InterviewPage from './pages/InterviewPage'
import InterviewHistory from './pages/InterviewHistory'
import Pricing from './pages/Pricing'
import InterviewReport from './pages/InterviewReport'
import AdminPanel from './pages/AdminPanel'
import SuperAdminPanel from './pages/SuperAdminPanel'
import AdminDashboard from './pages/admin/AdminDashboard'
import QuestionBankManager from './pages/admin/QuestionBankManager'
import TemplateBuilder from './pages/admin/TemplateBuilder'
import InviteCandidates from './pages/admin/InviteCandidates'
import RequireAuth from './components/RequireAuth'
import RequireRole from './components/RequireRole'
import InviteLanding from './pages/InviteLanding'
import WHome from './pages/workmate/WHome'
import HeroGsapExperiment from './pages/workmate/HeroGsapExperiment'
import HeroDotsExperiment from './pages/workmate/HeroDotsExperiment'
import HeroEcosystem from './pages/workmate/HeroEcosystem'
import HeroFlow from './pages/workmate/HeroFlow'
import HeroDepth from './pages/workmate/HeroDepth'
import HeroExperiment from './pages/workmate/HeroExperiment'
import HeroMinimalExperiment from './pages/workmate/HeroMinimalExperiment'
import HeroHoverExperiment from './pages/workmate/HeroHoverExperiment'
import WorkmateLayout from './pages/workmate/WorkmateLayout'
import PlatformLogin from './pages/auth/Login'
import RegisterTypeSelect from './pages/public/RegisterTypeSelect'
import RegisterForm from './pages/public/RegisterForm'
import OnboardingFlow from './pages/onboarding/OnboardingFlow'
import RequirePlatformAuth from './components/RequirePlatformAuth'
import RequireClientAuth from './components/RequireClientAuth'
import PlatformDashboard from './pages/dashboard/AdminDashboard'
import OnboardingReviewList from './pages/onboarding-admin/OnboardingReviewList'
import OnboardingReviewDetail from './pages/onboarding-admin/OnboardingReviewDetail'
import ClientList from './pages/clients/ClientList'
import EnquiryList from './pages/enquiries/EnquiryList'
import ClientChangePassword from './pages/clientPortal/ChangePassword'
import ClientDashboard from './pages/clientPortal/ClientDashboard'
import { ServerUrl } from './constants'

export { ServerUrl }

function App() {

  const dispatch = useDispatch()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      try {
        const result = await axios.get(ServerUrl + "/api/user/current-user", { withCredentials: true })
        dispatch(setUserData(result.data))
      } catch (error) {
        dispatch(setUserData(null))
      } finally {
        setAuthChecked(true)
      }
    }
    getUser()

  }, [dispatch])

  if (!authChecked) {
    return <div className='min-h-screen flex items-center justify-center text-[13px] text-[#6B7280]'>Loading...</div>
  }

  return (
    <Routes>
      {/* WorkmateIQ marketing page is now the real landing page. The old
          Home.jsx design still exists in the codebase but is no longer
          routed anywhere. */}
      <Route path='/' element={<WHome/>}/>
      <Route path='/welcome' element={<WHome/>}/>
      <Route path='/hero-minimal' element={<WorkmateLayout showCursorSpotlight={false}><HeroMinimalExperiment/></WorkmateLayout>}/>
      <Route path='/hero-hover' element={<WorkmateLayout showCursorSpotlight={false}><HeroHoverExperiment/></WorkmateLayout>}/>
      <Route path='/hero-experiment' element={<WorkmateLayout showCursorSpotlight={false}><HeroExperiment/></WorkmateLayout>}/>
      <Route path='/hero-gsap' element={<WorkmateLayout><HeroGsapExperiment/></WorkmateLayout>}/>
      <Route path='/hero-threads' element={<Navigate to='/?hero=threads' replace/>}/>
      <Route path='/hero-dots' element={<WorkmateLayout showCursorSpotlight={false}><HeroDotsExperiment/></WorkmateLayout>}/>
      <Route path='/hero-ecosystem' element={<WorkmateLayout showCursorSpotlight={false}><HeroEcosystem/></WorkmateLayout>}/>
      <Route path='/hero-flow' element={<WorkmateLayout showCursorSpotlight={false}><HeroFlow/></WorkmateLayout>}/>
      <Route path='/hero-depth' element={<WorkmateLayout showCursorSpotlight={false}><HeroDepth/></WorkmateLayout>}/>
      <Route path='/login' element={<Login/>}/>

      {/* New microservices-backed registration/onboarding platform (auth,
          registration, onboarding services behind the API gateway). Namespaced
          under /platform to avoid colliding with the existing Firebase-based
          candidate login at /login. */}
      <Route path='/platform/login' element={<PlatformLogin/>}/>
      <Route path='/platform/register' element={<RegisterTypeSelect/>}/>
      <Route path='/platform/register/:type' element={<RegisterForm/>}/>
      <Route path='/platform/onboarding/:type/:token' element={<OnboardingFlow/>}/>
      <Route path='/platform/dashboard' element={<RequirePlatformAuth><PlatformDashboard/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/onboarding' element={<RequirePlatformAuth><OnboardingReviewList/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/onboarding/:id' element={<RequirePlatformAuth><OnboardingReviewDetail/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/clients' element={<RequirePlatformAuth><ClientList/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/enquiries' element={<RequirePlatformAuth><EnquiryList/></RequirePlatformAuth>}/>

      {/* Client portal: for approved organizations/colleges, separate from
          both the staff admin login above and the candidate login at /login. */}
      <Route path='/platform/client/login' element={<Navigate to='/platform/login' replace/>}/>
      <Route path='/platform/client/change-password' element={<RequireClientAuth><ClientChangePassword/></RequireClientAuth>}/>
      <Route path='/platform/client/dashboard' element={<RequireClientAuth><ClientDashboard/></RequireClientAuth>}/>
      <Route path='/dashboard' element={<RequireAuth><Home/></RequireAuth>}/>
      <Route path='/interview' element={<RequireAuth><InterviewPage/></RequireAuth>}/>
      <Route path='/history' element={<RequireAuth><InterviewHistory/></RequireAuth>}/>
      <Route path='/pricing' element={<RequireAuth><Pricing/></RequireAuth>}/>
      <Route path='/report/:id' element={<RequireAuth><InterviewReport/></RequireAuth>}/>
      <Route path='/interview/invite/:token' element={<InviteLanding/>}/>
      {/* Conduct-Interview area: any signed-in user can access it now - each
          user gets their own auto-provisioned workspace server-side. */}
      <Route path='/admin' element={<RequireAuth><AdminDashboard/></RequireAuth>}/>
      <Route path='/admin/question-banks' element={<RequireAuth><QuestionBankManager/></RequireAuth>}/>
      <Route path='/admin/templates' element={<RequireAuth><TemplateBuilder/></RequireAuth>}/>
      <Route path='/admin/invites' element={<RequireAuth><InviteCandidates/></RequireAuth>}/>
      {/* Org/employee management stays role-gated - separate concern from conducting interviews. */}
      <Route path='/admin/employees' element={<RequireAuth><RequireRole roles={["admin","superadmin"]}><AdminPanel/></RequireRole></RequireAuth>}/>
      <Route path='/superadmin' element={<RequireAuth><RequireRole roles={["superadmin"]}><SuperAdminPanel/></RequireRole></RequireAuth>}/>

    </Routes>
  )
}

export default App
