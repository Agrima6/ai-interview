import React, { Suspense, lazy } from 'react'
import { Route, Routes, Navigate, useLocation } from 'react-router-dom'
import { RequireOaAdmin } from './components/oa/OaAdminLayout'
import ErrorBoundary from './components/ErrorBoundary'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'
import RequireAuth from './components/RequireAuth'
import RedirectIfAuthenticated from './components/RedirectIfAuthenticated'
import RequireRole from './components/RequireRole'
import RequirePlatformAuth from './components/RequirePlatformAuth'
import RequireClientAuth from './components/RequireClientAuth'
import RequireCandidateAuth from './components/RequireCandidateAuth'
import { featurePermissions } from './permissions/featurePermissions'
import { ServerUrl } from './constants'

// Shown while a page's code is being fetched. Nothing at all for the first moments (a fast load then never flashes), then a quiet message.
function RouteFallback() {
  const [show, setShow] = useState(false)
  useEffect(() => { const id = setTimeout(() => setShow(true), 400); return () => clearTimeout(id) }, [])
  if (!show) return null
  return <div role='status' aria-label='Loading' style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background, #F8FAFC)', color: 'var(--color-text-secondary, #6B7280)', fontSize: 14 }}>Loading…</div>
}

// Every page is loaded when it is first visited, so opening one page no longer downloads all of them.
const OaAuthPage = lazy(() => import('./pages/oa/OaAuthPage'))
const OaExamEntryPage = lazy(() => import('./pages/oa/OaExamEntryPage'))
const OaExamPage = lazy(() => import('./pages/oa/OaExamPage'))
const OaDashboardPage = lazy(() => import('./pages/oa/OaDashboardPage'))
const OaDrivesPage = lazy(() => import('./pages/oa/OaDrivesPage'))
const OaDrivePage = lazy(() => import('./pages/oa/OaDrivePage'))
const OaJoinPage = lazy(() => import('./pages/oa/OaJoinPage'))
const BillingPage = lazy(() => import('./pages/billing/BillingPage'))
const AllDrivesPage = lazy(() => import('./pages/organization/AllDrivesPage'))
const HiringDrivePage = lazy(() => import('./pages/organization/HiringDrivePage'))
const OrganizationBillingPage = lazy(() => import('./pages/organization/OrganizationBillingPage'))
const OaLegacyRoundRedirect = lazy(() => import('./pages/oa/OaLegacyRoundRedirect'))
const WorkspaceChooserPage = lazy(() => import('./pages/WorkspaceChooserPage'))
const OaApprovalsPage = lazy(() => import('./pages/oa/OaApprovalsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const CollegeDashboard = lazy(() => import('./pages/college/CollegeDashboard'))
const ExamDrivesPage = lazy(() => import('./pages/college/ExamDrivesPage'))
const ExamDetailPage = lazy(() => import('./pages/college/ExamDetailPage'))
const CollegeResultsPage = lazy(() => import('./pages/college/CollegeResultsPage'))
const CollegeStudentsPage = lazy(() => import('./pages/college/CollegeStudentsPage'))
const AuthPage = lazy(() => import('./pages/auth/AuthPage'))
const Home = lazy(() => import('./pages/Home'))
const InterviewPage = lazy(() => import('./pages/InterviewPage'))
const InterviewHistory = lazy(() => import('./pages/InterviewHistory'))
const Pricing = lazy(() => import('./pages/Pricing'))
const InterviewReport = lazy(() => import('./pages/InterviewReport'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const SuperAdminPanel = lazy(() => import('./pages/SuperAdminPanel'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const QuestionBankManager = lazy(() => import('./pages/admin/QuestionBankManager'))
const TemplateBuilder = lazy(() => import('./pages/admin/TemplateBuilder'))
const InviteCandidates = lazy(() => import('./pages/admin/InviteCandidates'))
const InviteLanding = lazy(() => import('./pages/InviteLanding'))
const WHome = lazy(() => import('./pages/workmate/WHome'))
const LandingPage = lazy(() => import('./pages/landing/LandingPage'))
const PricingPage = lazy(() => import('./pages/landing/PricingPage'))
const HeroGsapExperiment = lazy(() => import('./pages/workmate/HeroGsapExperiment'))
const HeroDotsExperiment = lazy(() => import('./pages/workmate/HeroDotsExperiment'))
const HeroEcosystem = lazy(() => import('./pages/workmate/HeroEcosystem'))
const HeroFlow = lazy(() => import('./pages/workmate/HeroFlow'))
const HeroDepth = lazy(() => import('./pages/workmate/HeroDepth'))
const HeroExperiment = lazy(() => import('./pages/workmate/HeroExperiment'))
const HeroMinimalExperiment = lazy(() => import('./pages/workmate/HeroMinimalExperiment'))
const HeroHoverExperiment = lazy(() => import('./pages/workmate/HeroHoverExperiment'))
const WorkmateLayout = lazy(() => import('./pages/workmate/WorkmateLayout'))
const OnboardingFlow = lazy(() => import('./pages/onboarding/OnboardingFlow'))
const PlatformDashboard = lazy(() => import('./pages/dashboard/AdminDashboard'))
const OnboardingReviewList = lazy(() => import('./pages/onboarding-admin/OnboardingReviewList'))
const OnboardingReviewDetail = lazy(() => import('./pages/onboarding-admin/OnboardingReviewDetail'))
const ClientList = lazy(() => import('./pages/clients/ClientList'))
const EnquiryList = lazy(() => import('./pages/enquiries/EnquiryList'))
const VoiceProviderSettings = lazy(() => import('./pages/admin/VoiceProviderSettings'))
const FormBuilderPage = lazy(() => import('./pages/admin/FormBuilderPage'))
const ClientChangePassword = lazy(() => import('./pages/clientPortal/ChangePassword'))
const OrganizationDashboard = lazy(() => import('./pages/organization/OrganizationDashboard'))
const OrganizationComingSoon = lazy(() => import('./pages/organization/OrganizationComingSoon'))
const DrivesListPage = lazy(() => import('./pages/organization/DrivesListPage'))
const DriveDetailPage = lazy(() => import('./pages/organization/DriveDetailPage'))
const CandidatesListPage = lazy(() => import('./pages/organization/CandidatesListPage'))
const QuestionSetsPage = lazy(() => import('./pages/organization/QuestionSetsPage'))
const TeamPage = lazy(() => import('./pages/organization/TeamPage'))
const TemplatesPage = lazy(() => import('./pages/organization/TemplatesPage'))
const ReportsPage = lazy(() => import('./pages/organization/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/organization/SettingsPage'))
const ApplyPage = lazy(() => import('./pages/ApplyPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const CandidateChangePassword = lazy(() => import('./pages/candidate/CandidateChangePassword'))
const CandidateRoomPage = lazy(() => import('./pages/candidate/CandidateRoomPage'))
const InterviewRoomPage = lazy(() => import('./pages/candidate/InterviewRoomPage'))

export { ServerUrl }

function App() {

  const dispatch = useDispatch()
  const location = useLocation()
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
    <ErrorBoundary resetKey={location.pathname}>
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* The redesigned front page (pages/landing) is the real landing page. The previous design
          (WHome) is kept and reachable at /welcome-classic so the two can be compared. */}
      <Route path='/' element={<RedirectIfAuthenticated><LandingPage/></RedirectIfAuthenticated>}/>
      <Route path='/welcome' element={<LandingPage/>}/>
      <Route path='/welcome-classic' element={<WHome/>}/>
      {/* Public pricing page. /pricing (signed-in purchase flow) is unchanged. */}
      <Route path='/plans' element={<PricingPage/>}/>
      <Route path='/hero-minimal' element={<WorkmateLayout showCursorSpotlight={false}><HeroMinimalExperiment/></WorkmateLayout>}/>
      <Route path='/hero-hover' element={<WorkmateLayout showCursorSpotlight={false}><HeroHoverExperiment/></WorkmateLayout>}/>
      <Route path='/hero-experiment' element={<WorkmateLayout showCursorSpotlight={false}><HeroExperiment/></WorkmateLayout>}/>
      <Route path='/hero-gsap' element={<WorkmateLayout><HeroGsapExperiment/></WorkmateLayout>}/>
      <Route path='/hero-threads' element={<Navigate to='/?hero=threads' replace/>}/>
      <Route path='/hero-dots' element={<WorkmateLayout showCursorSpotlight={false}><HeroDotsExperiment/></WorkmateLayout>}/>
      <Route path='/hero-ecosystem' element={<WorkmateLayout showCursorSpotlight={false}><HeroEcosystem/></WorkmateLayout>}/>
      <Route path='/hero-flow' element={<WorkmateLayout showCursorSpotlight={false}><HeroFlow/></WorkmateLayout>}/>
      <Route path='/hero-depth' element={<WorkmateLayout showCursorSpotlight={false}><HeroDepth/></WorkmateLayout>}/>
      <Route path='/login' element={<RedirectIfAuthenticated><AuthPage/></RedirectIfAuthenticated>}/>
      <Route path='/platform/login' element={<Navigate to='/login' replace/>}/>
      <Route path='/platform/client/login' element={<Navigate to='/login' replace/>}/>
      <Route path='/platform/register' element={<Navigate to='/register' replace/>}/>
      <Route path='/platform/register/:type' element={<Navigate to='/register' replace/>}/>
      <Route path='/apply/:link' element={<ApplyPage/>}/>

      {/* Registration */}
      <Route path='/register' element={<AuthPage/>}/>
      <Route path='/register/:type' element={<AuthPage/>}/>
      <Route path='/reset-password' element={<ResetPasswordPage/>}/>
      {/* The emailed link points here (PASSWORD_RESET_URL on the server) - same page, either prefix works */}
      <Route path='/platform/reset-password' element={<ResetPasswordPage/>}/>
      <Route path='/platform/forgot-password' element={<Navigate to='/login' replace/>}/>
      <Route path='/platform/onboarding/:type/:token' element={<OnboardingFlow/>}/>
      <Route path='/platform/dashboard' element={<RequirePlatformAuth permission={featurePermissions.dashboard}><PlatformDashboard/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/forms' element={<RequirePlatformAuth permission={featurePermissions.formBuilder}><FormBuilderPage/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/onboarding' element={<RequirePlatformAuth permission={featurePermissions.onboarding}><OnboardingReviewList/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/onboarding/:id' element={<RequirePlatformAuth permission={featurePermissions.onboarding}><OnboardingReviewDetail/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/clients' element={<RequirePlatformAuth permission={featurePermissions.clients}><ClientList/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/billing' element={<RequirePlatformAuth permission={featurePermissions.settings}><BillingPage/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/settings' element={<RequirePlatformAuth permission={featurePermissions.settings}><VoiceProviderSettings/></RequirePlatformAuth>}/>
      {/* Online Assessment: a separate room with its own sign-in (organizers) and its own student entry. */}
      <Route path='/oa' element={<Navigate to='/oa/admin' replace/>}/>
      <Route path='/oa/login' element={<OaAuthPage mode='login'/>}/>
      <Route path='/oa/register' element={<OaAuthPage mode='register'/>}/>
      <Route path='/oa/admin' element={<RequireOaAdmin><OaDashboardPage/></RequireOaAdmin>}/>
      <Route path='/oa/admin/drives' element={<RequireOaAdmin><OaDrivesPage/></RequireOaAdmin>}/>
      <Route path='/oa/admin/drives/:id' element={<RequireOaAdmin><OaDrivePage/></RequireOaAdmin>}/>
      {/* Links from before rounds lived inside drives. */}
      <Route path='/oa/admin/assessments' element={<Navigate to='/oa/admin/drives' replace/>}/>
      <Route path='/oa/admin/assessments/:id' element={<RequireOaAdmin><OaLegacyRoundRedirect/></RequireOaAdmin>}/>
      <Route path='/workspace' element={<RequireClientAuth><WorkspaceChooserPage/></RequireClientAuth>}/>
      <Route path='/oa/join/:token' element={<OaJoinPage/>}/>
      <Route path='/oa/exam' element={<OaExamEntryPage/>}/>
      <Route path='/oa/exam/test' element={<OaExamPage/>}/>
      <Route path='/platform/admin/oa-approvals' element={<RequirePlatformAuth permission='CLIENT_APPROVE'><OaApprovalsPage/></RequirePlatformAuth>}/>
      <Route path='/platform/admin/enquiries' element={<RequirePlatformAuth permission={featurePermissions.enquiries}><EnquiryList/></RequirePlatformAuth>}/>

      {/* Client portal: for approved organizations/colleges/candidates */}
      <Route path='/platform/client/change-password' element={<RequireClientAuth allowPasswordChange><ClientChangePassword/></RequireClientAuth>}/>
      <Route path='/platform/client/dashboard' element={<RequireClientAuth><OrganizationDashboard/></RequireClientAuth>}/>
      <Route path='/platform/client/drives' element={<RequireClientAuth><AllDrivesPage/></RequireClientAuth>}/>
      <Route path='/platform/client/drives/rounds/:id' element={<RequireClientAuth><HiringDrivePage/></RequireClientAuth>}/>
      <Route path='/platform/client/interview-drives' element={<RequireClientAuth><DrivesListPage/></RequireClientAuth>}/>
      <Route path='/platform/client/drives/:id' element={<RequireClientAuth><DriveDetailPage/></RequireClientAuth>}/>
      <Route path='/platform/client/question-sets' element={<RequireClientAuth><QuestionSetsPage/></RequireClientAuth>}/>
      <Route path='/platform/client/candidates' element={<RequireClientAuth><CandidatesListPage/></RequireClientAuth>}/>
      <Route path='/platform/client/team' element={<RequireClientAuth><TeamPage/></RequireClientAuth>}/>
      <Route path='/platform/client/templates' element={<RequireClientAuth><TemplatesPage/></RequireClientAuth>}/>
      <Route path='/platform/client/reports' element={<RequireClientAuth><ReportsPage/></RequireClientAuth>}/>
      <Route path='/platform/client/billing' element={<RequireClientAuth><OrganizationBillingPage/></RequireClientAuth>}/>
      <Route path='/platform/client/settings' element={<RequireClientAuth><SettingsPage/></RequireClientAuth>}/>

      {/* Organization Portal Routes */}
      <Route path='/organization/dashboard' element={<RequireClientAuth><OrganizationDashboard/></RequireClientAuth>}/>
      <Route path='/organization/drives' element={<RequireClientAuth><AllDrivesPage/></RequireClientAuth>}/>
      <Route path='/organization/drives/rounds/:id' element={<RequireClientAuth><HiringDrivePage/></RequireClientAuth>}/>
      <Route path='/organization/interview-drives' element={<RequireClientAuth><DrivesListPage/></RequireClientAuth>}/>
      <Route path='/organization/drives/:id' element={<RequireClientAuth><DriveDetailPage/></RequireClientAuth>}/>
      <Route path='/organization/question-sets' element={<RequireClientAuth><QuestionSetsPage/></RequireClientAuth>}/>
      <Route path='/organization/candidates' element={<RequireClientAuth><CandidatesListPage/></RequireClientAuth>}/>
      <Route path='/organization/team' element={<RequireClientAuth><TeamPage/></RequireClientAuth>}/>
      <Route path='/organization/templates' element={<RequireClientAuth><TemplatesPage/></RequireClientAuth>}/>
      <Route path='/organization/reports' element={<RequireClientAuth><ReportsPage/></RequireClientAuth>}/>
      <Route path='/organization/billing' element={<RequireClientAuth><OrganizationBillingPage/></RequireClientAuth>}/>
      <Route path='/organization/settings' element={<RequireClientAuth><SettingsPage/></RequireClientAuth>}/>

      {/* College Portal Routes */}
      <Route path='/college/dashboard' element={<RequireClientAuth><CollegeDashboard/></RequireClientAuth>}/>
      <Route path='/college/drives' element={<RequireClientAuth><ExamDrivesPage/></RequireClientAuth>}/>
      <Route path='/college/drives/:id' element={<RequireClientAuth><ExamDetailPage/></RequireClientAuth>}/>
      <Route path='/college/question-sets' element={<RequireClientAuth><QuestionSetsPage/></RequireClientAuth>}/>
      <Route path='/college/candidates' element={<RequireClientAuth><CollegeStudentsPage/></RequireClientAuth>}/>
      <Route path='/college/team' element={<RequireClientAuth><TeamPage/></RequireClientAuth>}/>
      <Route path='/college/templates' element={<RequireClientAuth><TemplatesPage/></RequireClientAuth>}/>
      <Route path='/college/reports' element={<RequireClientAuth><CollegeResultsPage/></RequireClientAuth>}/>
      <Route path='/college/settings' element={<RequireClientAuth><SettingsPage/></RequireClientAuth>}/>

      {/* Candidate Portal Routes - self-service applicants (CANDIDATE role),
          a separate session/identity from the org/HR RequireClientAuth above
          even though both go through the same auth-service. */}
      <Route path='/candidate/login' element={<Navigate to='/login' replace />} />
      <Route path='/candidate/change-password' element={<CandidateChangePassword/>}/>
      <Route path='/candidate/room' element={<RequireCandidateAuth><CandidateRoomPage/></RequireCandidateAuth>}/>
      <Route path='/candidate/interview/:driveId/:roundNumber' element={<RequireCandidateAuth><InterviewRoomPage/></RequireCandidateAuth>}/>
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

      <Route path='*' element={<NotFoundPage/>}/>
    </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}

export default App
