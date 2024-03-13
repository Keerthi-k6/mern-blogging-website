import  express  from "express";
import mongoose from  "mongoose";
import 'dotenv/config'
import bcrypt from "bcrypt"
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import cors from 'cors'
import admin from "firebase-admin";
import {getAuth} from "firebase-admin/auth";
import serviceAccountKey from './mern-blogapp-firebase-adminsdk-zagdz-8e3a4e5109.json' assert { type: "json" };
import aws from 'aws-sdk'

// schema below 
import User from "./Schema/User.js"
import Blog from "./Schema/Blog.js"
const server = express()
let PORT = 3000;

admin.initializeApp({
   credential : admin.credential.cert(serviceAccountKey)
})

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

server.use(express.json()) //  helps in reciveing json data from frontend by express
server.use(cors())
mongoose.connect(process.env.DB_LOCATION ,
    {
        autoIndex:true
    })

// s3 bucket 
const s3  = new aws.S3(
    {
        region:"ap-south-1",
        accessKeyId:process.env.AWS_ACCESS_KEY,
        secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY
    }
)

const generateUploadURL = async()=>
{
    const date = new Date();
    const imageName = `${nanoid()}-${date.getTime()}.jpeg`;
    // generate url from aws s3 getsignedurlpromise gets resolved when url is created
   return await  s3.getSignedUrlPromise('putObject',{
        Bucket:'blogbuck',
        Key:imageName,
        Expires:1000,
        ContentType:"image/jpeg"
    })
}

const verifyJWT = (req,res,next)=>
{
   const authHeader =  req.headers['authorization']
   const token =  authHeader && authHeader.split(' ')[1] 
   if(token==null)
   {
       return res.status(401).json({"error":"token not found"})
   }
   jwt.verify(token,process.env.SECRET_ACCESS_KEY,(err,user)=>
   {
       if(err)
       {
           return res.status(403).json({"error":"invalid token"})
       }
       req.user = user.id
       next()
   })
}
const formatDatatoSend = (user) =>
{
    const access_token = jwt.sign({id:user._id},process.env.SECRET_ACCESS_KEY)
    return {
        access_token,
        profile_img : user.personal_info.profile_img,
        username : user.personal_info.username,
        fullname: user.personal_info.fullname
    };
}
const generateUsername = async(email)=>
{
    let username=email.split('@')[0] // as@gmail.com ->[as,gmail][0] = as
    let isUsernameNotUnique= await User.exists({"personal_info.username":username}).then((result)=>result)
    
    isUsernameNotUnique ? username += nanoid().substring(0,5) : "";

    return username
}

// upload image url route 

server.get('/get-upload-url',(req,res)=>
{
    generateUploadURL().then(url=> res.status(200).json({uploadURL:url}))
    .catch(err=>
        {
            console.log(err.message)
            return res.status(500).json({"error":err.message})
        })
})

    server.post("/signup",(req,res)=>
    {
        let {fullname,email,password} = req.body;

        // validating the data
        if(fullname.length <3)
        {
            return res.status(403).json({"error" :"Full name must be atleast 3 letters long"})
            
        }
        if(!email.length)
        {
            return res.status(403).json({"error" :"Enter mail "})

        }
        if(emailRegex.test(email) == false)
        {
            return res.status(403).json({"error" :"Enter valid mail "})
        }
        if(!passwordRegex.test(password))
        {
            return res.status(403).json({"error" :" Password should be 6 to 20 characters long with a numeric 1 lowercase and 1 uppercase letters"})
        }
        bcrypt.hash(password,10,async(err,hashed_password)=>
        {
            let username = await generateUsername(email);
            let user = new User({
                personal_info :{fullname,email,password:hashed_password,username},
            })
            user.save().then((u)=>
            {
                return res.status(200).json(formatDatatoSend(u))
            })
            .catch((err)=>
            {
                if(err.code == 11000)
                {
                    return res.status(403).json({"error":"Email already exists"})
                }
               return res.status(500).json({"error":err})
            })
        })

    })

server.post("/signin" ,(req,res)=>
{
    let {email,password} = req.body;
    User.findOne({"personal_info.email":email})
    .then((user)=>
    {
        if(!user)
        {
            return res.status(403).json({"error":"email not found "})
            
        }
        if(!user.google_auth)
        {
        bcrypt.compare(password,user.personal_info.password,(err,result)=>
        {
            if(err)
            {
                return res.status(403).json({"error":"password not matched "})
            }

            if(!result)
            {
                return res.status(403).json({"error":"password not matched "})
            }
            else
            {
                return res.status(200).json(formatDatatoSend(user))
            }
        })
    }
    else
    {
        return res.status(403).json({"error" : "Account was created using google. Try logging in with google"})
    }
    })
    .catch((err)=>{
        console.log(err.message);
        return res.status(500).json({"error":err.message})
    })
})

server.post("/google-auth" , async(req,res)=>
{
    let {access_token} = req.body;
    getAuth()
    .verifyIdToken(access_token)
    .then(async(decodedUser)=>
    {
       let {email,name,picture } =decodedUser
       picture = picture.replace("s96-c","s384-c") // for changing the resolution of picture from google from low to high 
       let user = await User.findOne({"personal_info.email":email}).select("personal_info.fullname personal_info.username personal_info.profile_img personal_info.google_auth").then((u)=>
       {
         return u || null
       })
       .catch(err=>
        {
           return res.status(500).json({"error":err}) 
        })

       if(user)
       { // sign in 
         if(!user.google_auth)
         {
            return res.status(403).json({"error": "This mail is not signed up with google.Please log in with password to access the account "})
         }
       }
       else
       { // sign up
        let username = await generateUsername(email)
        user = new User({
            personal_info:{fullname:name,email,username},
            google_auth:true
        })
        await user.save().then((u)=>
        {
            user= u ;    
        })
        .catch(err =>
            {
                return res.status(500).json({"error":err.message})
            })
       }

       return res.status(200).json(formatDatatoSend(user))
    })
    .catch(err=>
        {
            return res.status(500).json({"error":"Failed to authenticate you with google .Try with some other google account"})
        })
    
})
server.post('/latest-blogs',async(req,res)=>
{
    let {page} = req.body;
    let maxLimit = 5
     Blog.find({draft:false})
     .populate("author","personal_info.profile_img personal_info.username personal_info.fullname -_id")
     .sort({"publishedAt": -1}) 
     .select("blog_id title des banner activity tags publishedAt -_id")
     .skip((page-1) * maxLimit)
     .limit(maxLimit)
     .then((blogs)=>
     {
         return res.status(200).json({blogs})
     })
     .catch((err)=>
     {
         return res.status(500).json({"error":err.message})
     })
})

server.post('/all-latest-blogs-count',async(req,res)=>
{
   Blog.countDocuments({draft:false})
   .then(count=>
   {
    return res.status(200).json({totalDocs:count})
   })
   .catch(err=>
    {
        console.log(err.message)
        return res.status(500).json({"error":err.message})

    })
})
server.get('/trending-blogs',async(req,res)=>
{
   Blog.find({draft:false})
   .populate("author","personal_info.profile_img personal_info.username personal_info.fullname -_id")
   .sort({"activity.total_read": -1,"activity.total_likes": -1,"publishedAt": -1})
   .select("blog_id title publishedAt -_id")
   .limit(5)
   .then((blogs)=>
   {
     return res.status(200).json({blogs})
   })
   .catch((err)=>
   {
    return res.status(500).json({"error":err.message})
   })
})
// verify jwt is a middle ware that authenticates if user is logged in or not by accesstoke, it authenticated and then we are rediced tio the call back code 
server.post("/create-blog",verifyJWT,async(req,res)=>
{
   let authorId =  req.user
   let {title,des,banner,tags,content,draft} = req.body
   if(!title.length)
   {
    return res.status(403).json({"error":"title is required"})
   }
   if(!draft)
   {
    if(!des.length || des.length > 200)
    {
        return res.status(403).json({"error":"desription is required and should be less than 200 characters"})
    }
    if(!banner.length)
    {
      return res.status(403).json({"error":"banner image is required to publish the blog"})
    }
    if(!content.blocks.length) 
    {
       return res.status(403).json({"error":"content is required to publish the blog "})
    }
    if(!tags.length || tags.length >10)
    {
       return res.status(403).json({"error":"tags are required and should be less than 10 to publish blog"})
    }
   }
 


   tags = tags.map(tag=> tag.toLowerCase());
   let blog_id = title.replace(/[^a-zA-Z0-9]/g," ").replace(/\s+/g,"-").trim()+nanoid();
   let blog = new Blog({
       title,des,banner,content,tags,author:authorId,blog_id,draft:Boolean(draft)
   })
   blog.save().then(blog=>
    {
        let incrementVal = draft ? 0:1;
         User.findOneAndUpdate({"_id":authorId},{$inc:{"account_info.total_posts":incrementVal}, $push:{"blogs":blog._id}})
         .then(user=>
            {
                return res.status(200).json({id:blog.blog_id})
            })
            .catch(err=>
                {
                    return res.status(500).json({"error":"failed to update total pposts number"})
                })
    })
    .catch(err=>
        {
            return res.status(500).json({"error":err.message})
        })

})
server.post('/search-blogs',async(req,res)=>
{
    let {tag,page,query,author} = req.body
    let findQuery;
    if(tag)
    {
     findQuery = {tags:tag,draft:false};
        
    }
    else if(query)
    {
        findQuery = {title:new RegExp(query,'i'),draft:false}
    }
    else if(author)
    {
        findQuery = {author, draft:false}
    }
    else
    {
        findQuery = {draft:false}
    }
    let maxLimit = 2;

    Blog.find(findQuery)
    .populate("author","personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page-1)*maxLimit)
    .limit(maxLimit)
    .then((blogs)=>
    {
        return res.status(200).json({blogs})
    })
    .catch((err)=>
    {
        return res.status(500).json({"error":err.message})
    })
})

server.post('/search-blogs-count',async(req,res)=>
{
    let {tag,query,author} = req.body;
    let findQuery;
    if(tag)
    {
     findQuery = {tags:tag,draft:false};
        
    }
    else if(query)
    {
        findQuery = {title:new RegExp(query,'i'),draft:false}
    }
    else if(author)
    {
        findQuery = {author, draft:false}
    }
    else
    {
        findQuery = {draft:false}
    }
    Blog.countDocuments(findQuery)
    .then(count=>
        {
            return res.status(200).json({totalDocs:count})
        })
        .catch(err=>
            {
                console.log(err.message)
                return res.status(500).json({"error":err.message})
            })
})

server.post('/search-users',(req,res)=>
{
    let {query} = req.body
    User.find({"personal_info.username" : new RegExp(query,'i')})
    .limit(50)
    .select("personal_info.fullname personal_info.username personal_info.profile_img -_id")
    .then(users=>
        {
            return res.status(200).json({users})
        })
    .catch(err=>
        {
            return res.status(500).json({"error":err.message})
        })
} )

server.post('/get-profile',(req,res)=>
{
    let {username} = req.body
    User.findOne({"personal_info.username":username})
    .select("-personal_info.password -google_auth -upadatedAt -blogs")
    .then(user=>
        {
            return res.status(200).json(user)
        })
    .catch(err=>
        {
            return res.status(500).json({"error":err.message})
        })
})

server.post("/get-blog",(req,res)=>
{
    let {blog_id} = req.body;

    let incrementVal = 1;

    Blog.findOneAndUpdate({blog_id},{$inc : {"activity.total_reads":incrementVal}})
    .populate("author","personal_info.fullname personal_info.username personal_info.profile_img")
    .select("title des content banner activity publishedAt blog_id tags")
    .then(blog=>
        {
            User.findOneAndUpdate({"personal_info.username":blog.author.personal_info.username},{$inc:{"account_info.total_reads":incrementVal}
        })    
        .catch(err=>
            {
                return res.status(500).json({"error":err.message})
            }) 
            return res.status(200).json({blog})
        }) 
    .catch(err=>
        {
            return res.status(500).json({"error":err.message})
        })
})
server.listen(PORT,()=>
{
    console.log("listening on port " + PORT)
})