import React, { createContext, useState } from 'react'
import { UserContext } from '../App'
import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import BlogEditor from '../components/blog-editor.component';
import PublishForm from '../components/publish-form.component';

const blogStructure = {
  title:'',
  banner:'',
  content:[],
  tags:[],
  des:'',
  author:{personal_info:{}}
}

export const EditorContext = createContext({})
const Editor = () => {
  const [blog,setBlog] = useState(blogStructure);
    const [editorState,setEditorState] = useState("editor");
    // isReady is a key present in editor js whic showa that editor is ready to edit 
    const [textEditor,setTextEditor] = useState({isReady: false});
    let {userAuth:{access_token}} = useContext(UserContext);
  return (
    <EditorContext.Provider value={{blog,setBlog,editorState,setEditorState,textEditor,setTextEditor}}>
      {
        access_token===null ? <Navigate to ='/signin'/> : editorState =="editor" ? <BlogEditor/> : <PublishForm/>

      }
    </EditorContext.Provider>
     
  )
}

export default Editor
