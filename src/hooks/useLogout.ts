import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { mayLeave } from '@/utils/leaveGuards';

// Use this hook in any page component instead of calling logout() directly.
// Example:
//   const handleLogout = useLogout();
//   <button onClick={handleLogout}>Log Out</button>
//
// Batch 758: when a screen has registered something that would be left behind (slides on the Microtome bench not yet
// in a staining rack, utils/leaveGuards.ts), the user is asked first, and staying cancels the sign-out.

export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return () => {
    if (!mayLeave(message => window.confirm(message))) return;
    logout();
    navigate('/');
  };
}
