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
    mobileBrand?: boolean
}

const SplitLayout: React.FC<SplitLayoutProps> = ({ leftContent, rightContent, left_css='', right_css='', left_css_mobile='', right_css_mobile='', spacer_css='p-10', mobileBrand = false }) => {
    return (
        <div className={`split-layout${mobileBrand ? ' auth-split-layout' : ''}`}>
            {mobileBrand && (
                <div className="auth-mobile-brand" role="img" aria-label="Vitals" />
            )}
            <div className={`split-layout-left ${left_css} ${left_css_mobile}`}>
                <div>
                    {leftContent}
                </div>
            </div>

            <div className={`split-layout-spacer ${spacer_css}`}/>
            <div className={`split-layout-right ${right_css} ${right_css_mobile}`}>
                <div className="max-w-md w-full">
                    {rightContent}
                </div>
            </div>
        </div>
    )
}

export default SplitLayout;