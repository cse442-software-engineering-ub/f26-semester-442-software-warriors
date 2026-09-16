import type React from "react";

// src/types/index.ts
export interface RegisterFormData {
    firstName: string;
    lastName: string;
    email:  string;
    password: string
    phoneNumber: number;
}

export interface InputFieldProps {
    label: string
    type: string
    value: string | number
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    name?: string
    placeholder?: string
    required?: boolean
}

export interface ButtonProps {
    children?: React.ReactNode
    onClick?: () => void
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary'
    className?: string
}