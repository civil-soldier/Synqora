import React from "react";
import { Link } from "react-router-dom";

export default function landing() {
  return (
    <div className="landingPageContainer">
      <nav>
        <img src="/logo1.png" alt="logo" className="navLogo" />

        <div className="navlist">
          <div>Join as guest</div>
          <div>Register</div>
          <div>Login</div>
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
