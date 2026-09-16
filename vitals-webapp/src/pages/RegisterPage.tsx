// src/pages/RegisterPage.tsx
import React, { useState } from 'react'
import SplitLayout from '../components/Layout'
import InputField from '../components/InputField'
import Button from '../components/Button'
import VitalLogo from '../assets/hero.png'
import type { RegisterFormData } from '../types'


const RegisterPage: React.FC = () => {
  //to make sets of data along with a boolean counterpart use the useState built in component/function
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    phoneNumber: 0,
    email: '',
    password: ''
  })
  //e is the event, the type is specified after the ':'
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // all these consts are javascript/typescript code being created within the page
  // handleSubmit deals with what happens with the data when a submit button is clicked
  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()
    console.log('Form submitted', formData) //debug purposes
    // need registration logic here (connect with backend)
  }

  // the returns use HTML to return 
  return (
    <div className="bg-sky-50">
    <SplitLayout
      leftContent={
        <div className="text-center">
          <img 
            src={VitalLogo}
            alt="Vital Logo Illustration"
            className="w-full h-auto rounded-lg shadow-lg mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Track and Manage Your Health, Effortlessly.</h1>
          <p className="text-gray-600">
            Create an account to start logging your vitals, medications, and appointment schedules.
            All in one place.
          </p>
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
                type="number"
                name="phone number"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="123 345 5678"
                required
            />

            <InputField
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@example.com"
                required
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
                name="confirm password"
                value={formData.password}
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