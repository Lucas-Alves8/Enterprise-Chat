import React from 'react';
import { Link } from 'react-router-dom';
import { BsFillPersonFill } from 'react-icons/bs';
import { redirectToKeycloakPKCE } from '../pages/Auth';

const NavBar = () => {
  const handleLoginClick = (e) => {
    e.preventDefault();
    redirectToKeycloakPKCE();
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">Zero Cloud</Link>
      </div>
      
      <div className="navbar-links">
        <a href="#login" onClick={handleLoginClick} className="profile-icon" title="Entrar com Keycloak">
          <BsFillPersonFill size={24} />
        </a>
      </div>
    </nav>
  );
};

export default NavBar;