// src/components/Layout.tsx
import React from 'react'

interface SplitLayoutProps {
    leftContent: React.ReactNode
    rightContent: React.ReactNode
}

const SplitLayout: React.FC<SplitLayoutProps> = ({ leftContent, rightContent }) => {
    return (
        <div className="min-h-screen flex flex-row">
            { /* Left Side: Information plus image*/ }
            <div className="w-1/2 bg-gray-50 flex items-center justify-center p-7">
                <div className="max-w-md w-full">
                    {leftContent}
                </div>
            </div>

            { /* Right Side: For the Registration Form */ }
            <div className="w-1/2 bg-white flex items-center justify-center p-8">
                <div className="max-w-md w-full">
                    {rightContent}
                </div>
            </div>
        </div>
    )
}

export default SplitLayout;