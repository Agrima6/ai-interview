import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
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
import PlatformLogin from './pages/auth/Login'
import RegisterTypeSelect from './pages/public/RegisterTypeSelect'
import RegisterForm from './pages/public/RegisterForm'
import OnboardingFlow from './pages/onboarding/OnboardingFlow'
import RequirePlatformAuth from './components/RequirePlatformAuth'
import PlatformDashboard from './pages/dashboard/AdminDashboard'
import OnboardingReviewList from './pages/onboarding-admin/OnboardingReviewList'
import OnboardingReviewDetail from './pages/onboarding-admin/OnboardingReviewDetail'
import ClientList from './pages/clients/ClientList'
import EnquiryList from './pages/enquiries/EnquiryList'
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
      {/* Workmate.IQ marketing page is now the real landing page. The old
          Home.jsx design still exists in the codebase but is no longer
          routed anywhere. */}
      <Route path='/' element={<WHome/>}/>
      <Route path='/welcome' element={<WHome/>}/>
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
