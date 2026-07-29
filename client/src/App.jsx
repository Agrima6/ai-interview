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
import RequireAuth from './components/RequireAuth'
import RequireRole from './components/RequireRole'
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
      <Route path='/admin' element={<RequireAuth><RequireRole roles={["admin","superadmin"]}><AdminPanel/></RequireRole></RequireAuth>}/>
      <Route path='/superadmin' element={<RequireAuth><RequireRole roles={["superadmin"]}><SuperAdminPanel/></RequireRole></RequireAuth>}/>

    </Routes>
  )
}

export default App
