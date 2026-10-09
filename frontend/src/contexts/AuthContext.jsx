import axios from "axios";
import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import httpStatus from "http-status";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: "http://localhost:8000/api/v1/users",
});

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

// Check if the stored session is still valid
const getStoredSession = () => {
  try {
    const token = localStorage.getItem("token");
    const loginTime = localStorage.getItem("loginTime");
    const name = localStorage.getItem("userName");
    const username = localStorage.getItem("userUsername");

    if (!token || !loginTime) return null;

    const elapsed = Date.now() - Number(loginTime);
    if (elapsed > SESSION_DURATION) {
      // Session expired — clear everything
      localStorage.removeItem("token");
      localStorage.removeItem("loginTime");
      localStorage.removeItem("userName");
      localStorage.removeItem("userUsername");
      return null;
    }

    return { token, name: name || "", username: username || "" };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const router = useNavigate();

  const stored = getStoredSession();
  const [userData, setUserData] = useState(stored);

  // Periodically check session expiry (every 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      const session = getStoredSession();
      if (!session && userData) {
        setUserData(null);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [userData]);

  const isAuthenticated = () => {
    return getStoredSession() !== null;
  };

  const handleRegister = async (name, username, password) => {
    try {
      const request = await client.post("/register", {
        name: name,
        username: username,
        password: password,
      });

      if (request.status === httpStatus.CREATED) {
        return request.data.message;
      }
    } catch (error) {
      throw error;
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const request = await client.post("/login", {
        username: username,
        password: password,
      });

      if (request.status === httpStatus.OK) {
        const { token, name, username: uname } = request.data;

        localStorage.setItem("token", token);
        localStorage.setItem("loginTime", String(Date.now()));
        localStorage.setItem("userName", name || "");
        localStorage.setItem("userUsername", uname || "");

        setUserData({ token, name: name || "", username: uname || "" });

        setTimeout(() => {
          router("/home");
        }, 1200);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("loginTime");
    localStorage.removeItem("userName");
    localStorage.removeItem("userUsername");
    setUserData(null);
    router("/");
  };

  const getHistoryOfUser = async () => {
    try {
      let request = await client.get("/get_all_activity", {
        params: {
          token: localStorage.getItem("token"),
        },
      });
      return request.data;
    }
    catch (error) {
      throw error;
    }
  }

  const addToUserHistory = async (meetingCode) => {
    try {
      let request = await client.post("/add_to_activity", {
          token: localStorage.getItem("token"),
          meeting_code: meetingCode,
      });
      return request.status;
    }
    catch (error) {
      throw error;
    }
  };

  const data = {
    userData,
    setUserData,
    isAuthenticated,
    handleRegister,
    handleLogin,
    handleLogout,
    getHistoryOfUser,
    addToUserHistory,
  };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};
