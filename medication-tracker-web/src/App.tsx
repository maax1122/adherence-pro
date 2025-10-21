import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';

// Pages (to be created)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import MedicationsPage from './pages/MedicationsPage';
import FamilyPage from './pages/FamilyPage';
import CaregiverDashboard from './pages/CaregiverDashboard';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/Layout';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

const LayoutWrapper = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ProfileProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <LayoutWrapper>
                    <HomePage />
                  </LayoutWrapper>
                }
              />
              <Route
                path="/medications"
                element={
                  <LayoutWrapper>
                    <MedicationsPage />
                  </LayoutWrapper>
                }
              />
              <Route
                path="/family"
                element={
                  <LayoutWrapper>
                    <FamilyPage />
                  </LayoutWrapper>
                }
              />
              <Route
                path="/caregiver"
                element={
                  <LayoutWrapper>
                    <CaregiverDashboard />
                  </LayoutWrapper>
                }
              />

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
