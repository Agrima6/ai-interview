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
import OnboardingFlow from './pages/onboarding/OnboardingFlow'
import RequirePlatformAuth from './components/RequirePlatformAuth'
import RequireClientAuth from './components/RequireClientAuth'
import PlatformDashboard from './pages/dashboard/AdminDashboard'
import OnboardingReviewList from './pages/onboarding-admin/OnboardingReviewList'
import OnboardingReviewDetail from './pages/onboarding-admin/OnboardingReviewDetail'
import ClientList from './pages/clients/ClientList'
import EnquiryList from './pages/enquiries/EnquiryList'
import FormBuilderPage from './pages/admin/FormBuilderPage'
import ClientChangePassword from './pages/clientPortal/ChangePassword'
import OrganizationDashboard from './pages/organization/OrganizationDashboard'
import OrganizationComingSoon from './pages/organization/OrganizationComingSoon'
import DrivesListPage from './pages/organization/DrivesListPage'
import DriveDetailPage from './pages/organization/DriveDetailPage'
import CandidatesListPage from './pages/organization/CandidatesListPage'
import QuestionSetsPage from './pages/organization/QuestionSetsPage'
import TeamPage from './pages/organization/TeamPage'
import TemplatesPage from './pages/organization/TemplatesPage'
import SettingsPage from './pages/organization/SettingsPage'
import AuthPage from './pages/auth/AuthPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import { featurePermissions } from './permissions/featurePermissions'
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
      <Route path='/platform/login' element={<AuthPage/>}/>
      <Route path='/platform/register' element={<AuthPage/>}/>
      <Route path='/platform/register/:type' element={<AuthPage/>}/>
      <Route path='/platform/reset-password' element={<ResetPasswordPage/>}/>
      <Route path='/platform/onboarding/:type/:token' element={<OnboardingFlow/>}/>
      <Route path='/platform/dashboard' element={<RequirePlatformAuth permission={featurePermissions.dashboard}><PlatformDashboard/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/forms' element={<RequirePlatformAuth permission={featurePermissions.formBuilder}><FormBuilderPage/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/onboarding' element={<RequirePlatformAuth permission={featurePermissions.onboarding}><OnboardingReviewList/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/onboarding/:id' element={<RequirePlatformAuth permission={featurePermissions.onboarding}><OnboardingReviewDetail/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/clients' element={<RequirePlatformAuth permission={featurePermissions.clients}><ClientList/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/enquiries' element={<RequirePlatformAuth permission={featurePermissions.enquiries}><EnquiryList/></RequirePlatformAuth>}/>

      {/* Client portal: for approved organizations/colleges/candidates */}
      <Route path='/platform/client/login' element={<Navigate to='/platform/login' replace/>}/>
      <Route path='/platform/client/change-password' element={<RequireClientAuth><ClientChangePassword/></RequireClientAuth>}/>
      <Route path='/platform/client/dashboard' element={<RequireClientAuth><OrganizationDashboard/></RequireClientAuth>}/>
      <Route path='/platform/client/drives' element={<RequireClientAuth><DrivesListPage/></RequireClientAuth>}/>
      <Route path='/platform/client/drives/:id' element={<RequireClientAuth><DriveDetailPage/></RequireClientAuth>}/>
      <Route path='/platform/client/question-sets' element={<RequireClientAuth><QuestionSetsPage/></RequireClientAuth>}/>
      <Route path='/platform/client/candidates' element={<RequireClientAuth><CandidatesListPage/></RequireClientAuth>}/>
      <Route path='/platform/client/team' element={<RequireClientAuth><TeamPage/></RequireClientAuth>}/>
      <Route path='/platform/client/templates' element={<RequireClientAuth><TemplatesPage/></RequireClientAuth>}/>
      <Route path='/platform/client/settings' element={<RequireClientAuth><SettingsPage/></RequireClientAuth>}/>

      {/* Organization Portal Routes */}
      <Route path='/organization/dashboard' element={<RequireClientAuth><OrganizationDashboard/></RequireClientAuth>}/>
      <Route path='/organization/drives' element={<RequireClientAuth><DrivesListPage/></RequireClientAuth>}/>
      <Route path='/organization/drives/:id' element={<RequireClientAuth><DriveDetailPage/></RequireClientAuth>}/>
      <Route path='/organization/question-sets' element={<RequireClientAuth><QuestionSetsPage/></RequireClientAuth>}/>
      <Route path='/organization/candidates' element={<RequireClientAuth><CandidatesListPage/></RequireClientAuth>}/>
      <Route path='/organization/team' element={<RequireClientAuth><TeamPage/></RequireClientAuth>}/>
      <Route path='/organization/templates' element={<RequireClientAuth><TemplatesPage/></RequireClientAuth>}/>
      <Route path='/organization/settings' element={<RequireClientAuth><SettingsPage/></RequireClientAuth>}/>

      {/* College Portal Routes */}
      <Route path='/college/dashboard' element={<RequireClientAuth><OrganizationDashboard/></RequireClientAuth>}/>
      <Route path='/college/drives' element={<RequireClientAuth><DrivesListPage/></RequireClientAuth>}/>
      <Route path='/college/drives/:id' element={<RequireClientAuth><DriveDetailPage/></RequireClientAuth>}/>
      <Route path='/college/question-sets' element={<RequireClientAuth><QuestionSetsPage/></RequireClientAuth>}/>
      <Route path='/college/candidates' element={<RequireClientAuth><CandidatesListPage/></RequireClientAuth>}/>
      <Route path='/college/team' element={<RequireClientAuth><TeamPage/></RequireClientAuth>}/>
      <Route path='/college/templates' element={<RequireClientAuth><TemplatesPage/></RequireClientAuth>}/>
      <Route path='/college/settings' element={<RequireClientAuth><SettingsPage/></RequireClientAuth>}/>

      {/* Candidate Portal Routes */}
      <Route path='/candidate/dashboard' element={<RequireClientAuth><OrganizationDashboard/></RequireClientAuth>}/>
      <Route path='/candidate/drives' element={<RequireClientAuth><DrivesListPage/></RequireClientAuth>}/>
      <Route path='/candidate/drives/:id' element={<RequireClientAuth><DriveDetailPage/></RequireClientAuth>}/>
      <Route path='/candidate/question-sets' element={<RequireClientAuth><QuestionSetsPage/></RequireClientAuth>}/>
      <Route path='/candidate/candidates' element={<RequireClientAuth><CandidatesListPage/></RequireClientAuth>}/>
      <Route path='/candidate/team' element={<RequireClientAuth><TeamPage/></RequireClientAuth>}/>
      <Route path='/candidate/templates' element={<RequireClientAuth><TemplatesPage/></RequireClientAuth>}/>
      <Route path='/candidate/settings' element={<RequireClientAuth><SettingsPage/></RequireClientAuth>}/>
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
