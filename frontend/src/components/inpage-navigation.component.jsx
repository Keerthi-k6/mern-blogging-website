import React, { Children, useEffect, useRef, useState } from 'react'

export let activeTabLineRef,activeTabRef
const InPageNavigation = ({routes,defaultHidden=[],defaultActiveIndex=0,children}) => {
     activeTabLineRef = useRef();
     activeTabRef = useRef();
    let [ inPageNav, setinPageNav ] = useState(defaultActiveIndex);
    const changePageState=(btn,i)=>
    {
        let {offsetWidth,offsetLeft} = btn;
        activeTabLineRef.current.style.width = offsetWidth+ "px";
        activeTabLineRef.current.style.left = offsetLeft+ "px";
         setinPageNav(i)
         
    }

    useEffect(() => {
        changePageState(activeTabRef.current,defaultActiveIndex)
    },[])
  return (
    <>
    <div className="relative mb-8 bg-white border-b border-grey flex flex-nowrap overflow-x-auto">
      
      {
        routes.map((routes,i)=>{
            return (
                
                <button 
                ref= {i==defaultActiveIndex ?activeTabRef : null }
                key = {i}
                className={'p-4 px-5 capitalize ' + (inPageNav==i ? 'text-black ':'text-dark-grey ')+ (defaultHidden.includes(routes) ? 'md:hidden':'') }
                onClick={(e)=> {changePageState(e.target,i)}}>
                 {routes}
                 
                </button>
            )
        })
      }
      <hr ref={activeTabLineRef} className='absolute bottom-0 duration-300'/>
    </div>
    {
    Array.isArray(children) ? children[inPageNav] : children
    }
    </>
  )
}

export default InPageNavigation
