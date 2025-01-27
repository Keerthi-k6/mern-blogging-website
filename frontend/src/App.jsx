import { Route, Routes } from "react-router-dom";
import Navbar from "./components/navbar.component";
import UserAuthForm from "./pages/userAuthForm.page";
import { createContext, useEffect, useState } from "react";
import { lookInSession } from "./common/session";
import Editor from "./pages/editor.pages";
import HomePage from "./pages/home.page";
import SearchPage from "./pages/search.page";
import PageNotFound from "./pages/404.page";
import ProfilePage from "./pages/profile.page";
import BlogPage from "./pages/blog.page";
// in nested routes we use outlet component from react router dom , in navbar which has nested sign in  and sign up ,when we rote to sign in page we can automatically render navbar also ,outer provides the nested parent compeonent present in child comeponent its basically like importing navbar componenet in signup and sign in page 

export const UserContext = createContext({})
const App = () => {
    const [userAuth,setUserAuth] = useState({}) 
     
    useEffect(()=>{
        let userInSession = lookInSession("user")
        userInSession ? setUserAuth(JSON.parse(userInSession)) : setUserAuth({ access_token:null})

    },[])

    return (
    <UserContext.Provider value={{userAuth,setUserAuth}}>
       <Routes>
        <Route path="/editor" element={<Editor/>}/>
        <Route path="/" element={<Navbar/>}>
            <Route index element={<HomePage/>}/>
            <Route path="signin" element={<UserAuthForm type="Sign-In"/>}/>
            <Route path="signup" element={<UserAuthForm type="Sign-Up"/>}/>
            <Route path = "search/:query"element={<SearchPage/>}/>
            <Route path = "user/:id" element={<ProfilePage/>}/>
            <Route path = "blog/:blog_id" element={<BlogPage/>}/>
            <Route path="*" element={<PageNotFound/>} />
        </Route>
       </Routes>
    </UserContext.Provider>
    )
}

export default App;