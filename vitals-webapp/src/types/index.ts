import type React from "react";

// src/types/index.ts
export interface RegisterFormData {
    firstName: string;
    lastName: string;
    email:  string;
    password: string
    phoneNumber: string;
    confirmPassword: string;
}

export interface InputFieldProps {
  label: string;
  type: string;
  name: string; // Make this required
  value: string; // Keep this as string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  pattern?: string;
  className?: string;
  isPhone?: boolean;
  error?: string;
}

export interface ButtonProps {
    children?: React.ReactNode
    onClick?: () => void
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary'
    className?: string
}