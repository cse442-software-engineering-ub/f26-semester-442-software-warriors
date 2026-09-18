// src/components/Button.tsx
import React from 'react'
import type { ButtonProps } from '../types/index.ts' //MUST IMPORT TYPES WITH 'import type'

//all the properties from the type are now set with a default value (type='button' and variant='primary')
const Button: React.FC<ButtonProps> = ({ children, onClick, type='button', variant='primary', className=''}) => {
    const baseStyles = "px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"

    const variants = { // these variants are the ui schemes for the buttons we can add more but first add to the types/index.ts file to add additional ones
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
        secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500" 
    }

    return ( //this gives our component structure for when we import it on a page. We have to have the properties listed when placing in this component
        <button
            type={type}
            onClick={onClick}
            className={`${baseStyles} ${variants[variant]} ${className}`}
            >
                {children}
            </button>
    )
}

export default Button; //always export tsx