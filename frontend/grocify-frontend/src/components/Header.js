import React, { useEffect, useState } from 'react';
import { Navbar, Nav, Button, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
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

    const fetchUserInfo = (token) => {
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/user-info`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
        })
        .then(response => {
            setUsername(response.data.username);
            setIsLoggedIn(true);
        })
        .catch(error => {
            console.error('Error fetching user information:', error);
            localStorage.removeItem('access_token');
            setIsLoggedIn(false);
        });
    };

    const handleLogout = () => {
        axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/logout`, {}, {
            withCredentials: true,
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        })
        .then(() => {
            localStorage.removeItem('access_token');
            setIsLoggedIn(false);
            setUsername(null);
            navigate('/');
        })
        .catch(error => {
            console.error('Error logging out:', error);
        });
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
        <Navbar bg="dark" variant="dark" expand="lg">
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
                    <Nav.Link as={Link} to="/">Home</Nav.Link>
                    <Nav.Link as={Link} to="/inventory">Inventory</Nav.Link>
                    <Nav.Link as={Link} to="/recipes">Recipes</Nav.Link>
                    <Nav.Link as={Link} to="/add-item">Add Item</Nav.Link>
                </Nav>
                {isLoggedIn && username ? (
                    <div className="d-flex align-items-center ml-auto" style={{ position: 'absolute', right: '20px' }}>
                        <FaUserCircle style={{ color: 'white', marginRight: '10px', fontSize: '1.5rem' }} />
                        <span style={{ color: 'white', marginRight: '15px', fontWeight: 'bold' }}>{username}</span>
                        <Button variant="outline-light" onClick={handleLogout} className="d-flex align-items-center">
                            <FaSignOutAlt style={{ marginRight: '5px' }} /> Logout
                        </Button>
                    </div>
                ) : (
                    <Button as={Link} to="/login" variant="outline-light" className="d-flex align-items-center ml-auto" style={{ position: 'absolute', right: '20px' }} onClick={() => navigate('/login')}>
                        <FaSignInAlt style={{ marginRight: '5px' }} /> Login
                    </Button>
                )}
            </Navbar.Collapse>
        </Navbar>
    );
}

export default Header;
