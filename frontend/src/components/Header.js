import React, { useEffect, useState } from 'react';
import { Navbar, Nav, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaUserCircle, FaSignOutAlt, FaHome, FaBoxOpen, FaBook, FaPlusCircle } from 'react-icons/fa';
import axios from 'axios';

function Header() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            fetchUserInfo(token);
        } else {
            setIsLoggedIn(false);
        }
    }, []);

    const fetchUserInfo = async (token) => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/user-info`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsername(response.data.username);
            setIsLoggedIn(true);
        } catch (error) {
            console.error('Error fetching user information:', error);
            if (error.response && error.response.status === 401) {
                handleRefreshToken();
            } else {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                setIsLoggedIn(false);
            }
        }
    };

    const handleRefreshToken = async () => {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/refresh`, {}, {
                    headers: { Authorization: `Bearer ${refreshToken}` }
                });
                const newAccessToken = response.data.access_token;
                localStorage.setItem('access_token', newAccessToken);
                fetchUserInfo(newAccessToken);
            } else {
                handleLogout();
            }
        } catch (error) {
            console.error('Refresh token expired or invalid', error);
            handleLogout();
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsLoggedIn(false);
        setUsername(null);
        navigate('/');
    };

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            setIsLoggedIn(true);
        }
    }, [username]);

    const handleLoginState = () => {
        const token = localStorage.getItem('access_token');
        if (token) {
            fetchUserInfo(token);
        }
    };

    useEffect(() => {
        window.addEventListener('storage', handleLoginState);

        return () => {
            window.removeEventListener('storage', handleLoginState);
        };
    }, []);

    return (
        <Navbar bg="dark" variant="dark" expand="lg" className="px-3">
            <Navbar.Brand href="/" className="d-flex align-items-center">
                <img
                    src={`${process.env.PUBLIC_URL}/logo.png`}
                    alt="Grocify Logo"
                    width="30"
                    height="30"
                    className="d-inline-block align-top"
                    style={{ marginRight: '10px' }}
                />
                Grocify
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="mr-auto">
                    <Nav.Link as={Link} to="/" className="d-flex align-items-center">
                        <FaHome style={{ marginRight: '8px' }} /> Home
                    </Nav.Link>
                    <Nav.Link as={Link} to="/inventory" className="d-flex align-items-center">
                        <FaBoxOpen style={{ marginRight: '8px' }} /> Inventory
                    </Nav.Link>
                    <Nav.Link as={Link} to="/recipes" className="d-flex align-items-center">
                        <FaBook style={{ marginRight: '8px' }} /> Recipes
                    </Nav.Link>
                    <Nav.Link as={Link} to="/add-item" className="d-flex align-items-center">
                        <FaPlusCircle style={{ marginRight: '8px' }} /> Add Groceries
                    </Nav.Link>
                </Nav>
                {isLoggedIn && username ? (
                    <div className="d-flex align-items-center ml-lg-auto mt-3 mt-lg-0">
                        <FaUserCircle style={{ color: 'white', marginRight: '10px', fontSize: '1.5rem' }} />
                        <span style={{ color: 'white', marginRight: '15px', fontWeight: 'bold' }}>{username}</span>
                        <Button variant="outline-light" onClick={handleLogout} className="d-flex align-items-center">
                            <FaSignOutAlt style={{ marginRight: '5px' }} /> Logout
                        </Button>
                    </div>
                ) : (
                    <Button as={Link} to="/login" variant="outline-light" className="d-flex align-items-center ml-lg-auto mt-3 mt-lg-0" onClick={() => navigate('/login')}>
                        <FaSignInAlt style={{ marginRight: '5px' }} /> Login
                    </Button>
                )}
            </Navbar.Collapse>
        </Navbar>
    );
}

export default Header;
