import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
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
      <Route path='/' element={<Home/>}/>
      <Route path='/login' element={<Login/>}/>
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
