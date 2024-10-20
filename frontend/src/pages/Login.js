import React, { useState } from 'react';
import { Card, Button, Container, Row, Col, Spinner, Alert, Form, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaSignInAlt, FaUserPlus } from 'react-icons/fa';
import './Login.css';

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [isLogin, setIsLogin] = useState(true);
    const navigate = useNavigate();
  
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  
    const handleLogin = async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/login`, { username, password });
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);  // Save refresh token
        window.dispatchEvent(new Event("storage")); // Trigger storage event to update login state
        navigate('/');
      } catch (error) {
        console.error('Error logging in:', error);
        setError('Invalid username or password');
      }
    };

    const handleSignup = async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/register`, { username, password });
        // After successful registration, log the user in
        await handleLogin();
      } catch (error) {
        console.error('Error signing up:', error);
        setError('Error creating account');
      }
    };
  
    return (
      <Container fluid className="login-container">
        <Row className="justify-content-center align-items-center vh-100">
          <Col md={6} lg={4}>
            <Card className="shadow-lg border-0 rounded-4">
              <Card.Body className="p-4">
                <Card.Title className="text-center mb-4" style={{ color: '#343a40', fontSize: '1.8rem' }}>
                  {isLogin ? 'Welcome Back!' : 'Create Your Account'}
                </Card.Title>
                <Form>
                  <Form.Group controlId="username">
                    <Form.Label>Username</Form.Label>
                    <InputGroup>
                      <InputGroup.Text><FaUser /></InputGroup.Text>
                      <Form.Control
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        className="rounded-end"
                      />
                    </InputGroup>
                  </Form.Group>
                  <Form.Group controlId="password" className="mt-3">
                    <Form.Label>Password</Form.Label>
                    <InputGroup>
                      <InputGroup.Text><FaLock /></InputGroup.Text>
                      <Form.Control
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="rounded-end"
                      />
                    </InputGroup>
                  </Form.Group>
                  {error && <Alert variant="danger" className="mt-3 rounded-3">{error}</Alert>}
                  <Button className="mt-4 w-100 rounded-pill" variant="success" size="lg" onClick={isLogin ? handleLogin : handleSignup}>
                    {isLogin ? <><FaSignInAlt style={{ marginRight: '5px' }} /> Login</> : <><FaUserPlus style={{ marginRight: '5px' }} /> Sign Up</>}
                  </Button>
                </Form>
                <div className="mt-4 text-center">
                  {isLogin ? (
                    <p>
                      Don't have an account?{' '}
                      <Button variant="link" className="text-decoration-none" onClick={() => { setIsLogin(false); setError(null); }}>Sign Up</Button>
                    </p>
                  ) : (
                    <p>
                      Already have an account?{' '}
                      <Button variant="link" className="text-decoration-none" onClick={() => { setIsLogin(true); setError(null); }}>Login</Button>
                    </p>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  };
  
  export default Login;
