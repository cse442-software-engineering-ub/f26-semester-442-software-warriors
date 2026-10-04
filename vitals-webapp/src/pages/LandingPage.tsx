import React from "react";
//if you have some type of error here for router-dom run "npm install" in terminal in the vitals-webapp folder and it should fix it
//if not you need to run "npm install react-router-dom" but its been done already so it shouldnt be needed normally
import {useNavigate} from "react-router-dom";
import VitalsLogo from "../assets/logo.png";

//overall landing page component that is displayed when the user first opens the app
const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    
    //handles button click to navigate to the register page
    const handleCreateAccount = () => {
        navigate("/register");
    };
    //handles button click to navigate to the login page
    const handleExistingUser = () => {
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-blue-800 text-white flex flex-col">
            <div className="text-center pt-2 text-[16px] md:text-[24px] text-[#9EACCD]">    
                © Vitals Health, Inc.
            </div>   

            {/*main content*/}
            <div className="flex-1 flex flex-col items-center justify-center px-6">

                {/*logo and tagline*/}
                <img 
                    src={VitalsLogo} 
                    alt="Vitals Logo" 
                    className="w-[400px] h-auto md:w-[500px] md:h-[100px] mb-6 md:mb-4"
                    />
                <h1 className="text-[20px] md:text-[28px] font-bold text-center mb-10"> 
                    Track and Manage Your Health Easier
                </h1>

                {/*button area to put buttons*/}
                <div className="w-full max-w-[629px] flex flex-col gap-4">

                    {/*button to create an account*/}
                    <button 
                        type="button"
                        onClick={handleCreateAccount}
                        className="w-full h-[45px] md:h-[60px] md:w-[550px] mx-auto bg-white text-blue-800 text-[16px] md:text-[26px] font-bold rounded-lg"
                        >
                        Create Account
                    </button>

                    {/*button to login*/}
                    <button 
                        type="button"
                        onClick={handleExistingUser}
                        className="w-full h-[45px] md:h-[60px] md:w-[550px] mx-auto bg-transparent text-white text-[16px] md:text-[26px] font-bold rounded-lg border-2 border-white"
                        >
                            Existing User
                    </button>
                </div>
            </div>

            {/*disclaimer at the bottom of the page*/}
            <div className="text-center text-[16px] md:text-[20px] text-[#9EACCD] px-6 pb-2"> 
                *This app is a tracker and reminder tool, not a source of medical advice. 
                <br className="hidden md:block " />
                 {" "}Please consult a health professional with any questions or concerns.*
            </div>

        </div>
    );
};

export default LandingPage;