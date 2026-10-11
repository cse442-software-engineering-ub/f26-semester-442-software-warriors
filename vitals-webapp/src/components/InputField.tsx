// src/components/InputField.tsx
import React from 'react'
import type { InputFieldProps } from '../types'

export const FieldErrorMessage = ({ id, message }: { id?: string; message: string }) => (
    <p className="field-error-message" id={id} role="alert">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <span>{message}</span>
    </p>
)

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
            <label htmlFor={name} className="auth-field-label">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                id={name}
                type={type}
                value={value}
                onChange={onChange}
                onKeyDown={isPhone && type === 'tel' ? handleKeyDown : undefined}
                name={name}
                placeholder={placeholder}
                required={required}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${name}-error` : undefined}
                className={`auth-field-input${error ? ' auth-field-input-error' : ''}`}
            />
            {error && <FieldErrorMessage id={`${name}-error`} message={error} />}
        </div>
    )
}

export default InputField;