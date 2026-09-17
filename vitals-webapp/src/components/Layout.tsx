// src/components/Layout.tsx
import React from 'react'

interface SplitLayoutProps {
    leftContent: React.ReactNode
    rightContent: React.ReactNode
    left_css?: string
    right_css?: string
}

const SplitLayout: React.FC<SplitLayoutProps> = ({ leftContent, rightContent, left_css, right_css }) => {
    return (
        <div className="max-h-screen flex flex-col lg:flex-row">
            { /* Left Side: Information plus image*/ }
            <div className={`${left_css}`}>
                <div>
                    {leftContent}
                </div>
            </div>

            <div className='p-10'/>
            { /* Right Side: For the Registration Form */ }
            <div className={`${right_css}`}>
                <div className="max-w-md w-full">
                    {rightContent}
                </div>
            </div>
        </div>
    )
}

export default SplitLayout;