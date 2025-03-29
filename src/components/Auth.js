import React from 'react';
import { signInWithGoogle, signOutUser, auth } from '../services/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

const Auth = () => {
  const [user, loading, error] = useAuthState(auth);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="auth-container">
      {user ? (
        <div className="user-info">
          <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
          <div className="user-details">
            <p className="user-name">{user.displayName}</p>
            <p className="user-email">{user.email}</p>
          </div>
          <button onClick={handleSignOut} className="sign-out-button">Sign Out</button>
        </div>
      ) : (
        <button onClick={handleSignIn} className="sign-in-button">
          Sign in with Google
        </button>
      )}
    </div>
  );
};

export default Auth;
