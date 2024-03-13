import { initializeApp } from "firebase/app";
import {GoogleAuthProvider,getAuth, signInWithPopup} from 'firebase/auth'
const firebaseConfig = {
  apiKey: "AIzaSyDissuZQ2AQrnNuGJMVhIJqKJaslWzJrPM",
  authDomain: "mern-blogapp.firebaseapp.com",
  projectId: "mern-blogapp",
  storageBucket: "mern-blogapp.appspot.com",
  messagingSenderId: "712414712920",
  appId: "1:712414712920:web:9782d702a8222a27e2262d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// google auth 
const provider = new GoogleAuthProvider();

const auth = getAuth()

export const authWithGoogle = async ()=>{
    
    let user = null;
    await signInWithPopup(auth,provider)
    .then((result)=>{
        user = result.user
        
    })
    .catch((err)=>
    {
        console.log(err)
    })

    return user 

}
