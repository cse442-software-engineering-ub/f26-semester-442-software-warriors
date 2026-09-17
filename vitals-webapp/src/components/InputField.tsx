// src/components/InputField.tsx
import React from 'react'
import type { InputFieldProps } from '../types'

const InputField: React.FC<InputFieldProps> = ({ label, type, value, onChange, placeholder, name, required, pattern }) => {
    return (
        <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2"> {/* this uses the tailwindcss CSS rules so we don't have to make separate styles */}
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                name={name}
                placeholder={placeholder}
                required={required}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                pattern={pattern}
            />
        </div>
    )
}

export default InputField;