import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landingPageContainer">
      <nav>
        <img src="/logo1.png" alt="logo" className="navLogo" />

        <div className="navlist">
          <div onClick={() => navigate("/home")}>Join as Guest</div>
          <div onClick={() => navigate("/auth", { state: { tab: "signup" } })}>
            Register
          </div>
          <div onClick={() => navigate("/auth", { state: { tab: "login" } })}>
            Login
          </div>
        </div>
      </nav>

      <div className="landingMainContainer">
        <div>
          <div>
            <h1>
              <span style={{ color: "#ffa116" }}>Connect</span> with your loved
              ones
            </h1>

            <p>Cover a distance with Synqora</p>
          </div>

          <div role="button">
            <Link to="/home">Get Started</Link>
          </div>
        </div>

        <div>
          <img src="/mobile.png" alt="landingImage" />
        </div>
      </div>
    </div>
  );
}
