// src/components/Layout.tsx
import React from 'react'

interface SplitLayoutProps {
    leftContent: React.ReactNode
    rightContent: React.ReactNode
    left_css?: string
    right_css?: string
    left_css_mobile?: string
    right_css_mobile?: string
    spacer_css?: string
}

const SplitLayout: React.FC<SplitLayoutProps> = ({ leftContent, rightContent, left_css='', right_css='', left_css_mobile='', right_css_mobile='', spacer_css='p-10' }) => {
    return (
        <div className="max-h-screen flex flex-col lg:flex-row">
            { /* Left Side: Information plus image*/ }
            <div className={`${left_css} ${left_css_mobile}`}>
                <div>
                    {leftContent}
                </div>
            </div>

            <div className={spacer_css}/>
            { /* Right Side: For the Registration Form */ }
            <div className={`${right_css} ${right_css_mobile}`}>
                <div className="max-w-md w-full">
                    {rightContent}
                </div>
            </div>
        </div>
    )
}

export default SplitLayout;