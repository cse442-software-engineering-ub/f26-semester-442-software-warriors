// src/pages/RegisterPage.tsx
import React, { useState } from 'react'
import SplitLayout from '../components/Layout'
import InputField from '../components/InputField'
import Button from '../components/Button'
import VitalLogo from '../assets/logo.png'
import RegisterIcon from '../assets/register_page_icon.png'
import type { RegisterFormData } from '../types'


const RegisterPage: React.FC = () => {
  //to make sets of data along with a boolean counterpart use the useState built in component/function
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  //const [showPassword, setShowPassword] = useState(false);
  //const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  //e is the event, the type is specified after the ':'
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    // Email Regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Phone Regex validation
    const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/
    if (!phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid email address'
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (formData.password != formData.confirmPassword) {
      newErrors.confirmPassword = 'Password do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // all these consts are javascript/typescript code being created within the page
  // handleSubmit deals with what happens with the data when a submit button is clicked
  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()
    if (validateForm()) {
      console.log('Form submitted', formData) //debug purposes
      alert('Registration successful')
    // need registration logic here (connect with backend)
    }
  }

  // the returns use HTML to return 
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
          <SplitLayout
            left_css="w-full lg:w-1/2 bg-blue-800 flex items-center justify-center p-45 lg:h-screen min-h-[300px]"
            right_css="w-full lg:w-1/2 bg-white flex items-center justify-center p-8 lg:h-screen min-h-[300px]"
            leftContent={
              <div className="flex items-center justify-center p-8">
                <div className="max-w-md w-full text-white">
                  <div className="text-center ">
                    <img 
                      src={VitalLogo}
                      alt="Vital Logo Illustration"
                      className="w-full h-auto rounded-lg mb-6"
                    />
                    <h1 className="text-3xl font-bold text-white mb-4">Track and Manage Your Health, Effortlessly.</h1>
                    <p className="text-gray-200">
                      Create an account to start logging your vitals, medications, and appointment schedules.
                      All in one place.
                    </p>
                    <img
                      src={RegisterIcon}
                      alt="Blood Pressure 120/80 updated today and Lisinopril (10mg): Taken at 8:00 AM"
                    />
                  </div>
                </div>
              </div>
            }
            rightContent={
              <div className="w-full max-w-md">
                <h2 className="text-3xl font-bold text-gray-800 text-center">Create Account</h2>
                <h3 className="text-m font-bold text-gray-400 mb-8 text-center">Ente your details to set up your new account.</h3>
                <form onSubmit={handleSubmit}>
                  <div className="flex space-x-4">
                    <InputField
                      label="First Name"
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      required
                    />
                    <InputField
                      label="Last Name"
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      required
                    />
                  </div>

                  <InputField
                      label="Phone Number"
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      placeholder="(123) 345-5678"
                      required
                      pattern="^\(\d{3}\) \d{3}-\d{4}$"
                  />

                  <InputField
                      label="Email Address"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john.doe@example.com"
                      required
                      pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                  />

                  <InputField
                      label="Password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                  />

                  <InputField
                      label="Confirm Password"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                  />

                  <Button type="submit" variant="primary">
                    Register
                  </Button>
                </form>

                {/* uncomment when login page and page routing is ready */}
                {/*<p className="text-center text-gray-600 mt-6">
                  Already have an account?{' '}
                  <a href="/login" className="text-blue-600 hover:underline">
                    Log in
                  </a>
                </p>*/} 
              </div>
            }
          />
          </div>
  )
}

export default RegisterPage;