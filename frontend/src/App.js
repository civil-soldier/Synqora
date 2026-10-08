import logo from './logo.svg';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/Authentication';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/Home';

function App() {
  return (
    <div className="App">
    <Router>
      <AuthProvider>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/auth' element={<Authentication />} />
        <Route path='/home' element={<HomeComponent />} />
        <Route path='/:url' element={<VideoMeetComponent />} />
      </Routes>
      </AuthProvider>
    </Router>
    </div>
  );
}

export default App;
