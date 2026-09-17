// src/components/InputField.tsx
import React from 'react'
import type { InputFieldProps } from '../types'

const InputField: React.FC<InputFieldProps> = ({ label, type, value, onChange, placeholder, name, required, error, isPhone = false }) => {
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (isPhone && type == 'tel') {
            //Allowing keys
            if (["Backspace","Delete","Tab","Escape","Enter"].includes(e.key) || 
            (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") || 
            ((e.ctrlKey || e.metaKey) && ["A","C","V","X"].includes(e.key))) {
                return
            }
            if ((e.shiftKey || (e.key < "0" || e.key > "9")) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        }
    }
    
    return (
        <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2"> {/* this uses the tailwindcss CSS rules so we don't have to make separate styles */}
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                onKeyDown={isPhone && type === 'tel' ? handleKeyDown : undefined}
                name={name}
                placeholder={placeholder}
                required={required}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    error
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                    }`}
            />
            { /* Display error message */ }
            {error && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    )
}

export default InputField;