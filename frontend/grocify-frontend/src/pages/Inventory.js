import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Container, Row, Col, ProgressBar, Spinner, Alert, Button, Badge } from 'react-bootstrap';
import { FaTrashAlt, FaEdit, FaClock, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import './Inventory.css';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // Authentication required
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    } else {
      fetchInventoryItems(token);
    }
  }, []);

  const fetchInventoryItems = async (token) => {
    try {
      setError(null); // Clear previous error messages
      const response = await axios.get(`${API_BASE_URL}/api/inventory`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.status === 200) {
        setItems(response.data);
      } else {
        setError('Failed to fetch inventory items');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      setError('Error fetching inventory items');
      setLoading(false);
    }
  };

  const calculateExpiryStatus = (expiryDate) => {
    const currentDate = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry - currentDate;
    const daysToExpiry = timeDiff / (1000 * 60 * 60 * 24);

    if (daysToExpiry <= 0) {
      return { variant: 'danger', percentage: 100, label: 'Expired' };
    } else if (daysToExpiry <= 3) {
      return { variant: 'warning', percentage: 75, label: 'Expiring Soon' };
    } else if (daysToExpiry <= 7) {
      return { variant: 'info', percentage: 50, label: 'Fresh' };
    } else {
      return { variant: 'success', percentage: 25, label: 'Fresh' };
    }
  };

  return (
    <Container fluid className="inventory-container">
      <Row className="justify-content-center mt-4">
        <Col md={10}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="text-center inventory-title">Your Inventory</h2>
            <Button variant="primary" className="add-item-button" onClick={() => navigate('/add-item')}>
              <FaCheckCircle className="mr-2" /> Add New Item
            </Button>
          </div>
          {loading ? (
            <div className="text-center mt-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Loading your inventory...</p>
            </div>
          ) : error ? (
            <Alert variant="danger" className="text-center">
              {error}
            </Alert>
          ) : (
            <Row>
              {items.length === 0 ? (
                <p className="text-center w-100">No items in inventory.</p>
              ) : (
                items.map((item) => {
                  const { variant, percentage, label } = calculateExpiryStatus(item.expiry_date);
                  return (
                    <Col md={4} key={item._id} className="mb-4">
                      <Card className={`shadow-lg border-${variant} inventory-card`}>
                        <Card.Img variant="top" src={item.image} alt={item.item_name} className="inventory-image rounded-top" />
                        <Card.Body className="d-flex flex-column">
                          <Card.Title className="d-flex justify-content-between align-items-center">
                            {item.item_name} <Badge variant={variant}>{label}</Badge>
                          </Card.Title>
                          <Card.Text className="text-muted mb-2">
                            <FaClock className="mr-1" /> Expiry Date: {new Date(item.expiry_date).toLocaleDateString()}
                          </Card.Text>
                          <Card.Text className="text-muted">
                            Quantity: {item.quantity} {item.unit}
                          </Card.Text>
                          <ProgressBar className="mb-3" variant={variant} now={percentage} label={`${Math.round(percentage)}%`} />
                          <div className="mt-auto d-flex justify-content-between">
                            <Button variant="outline-info" size="sm" className="edit-button">
                              <FaEdit className="mr-1" /> Edit
                            </Button>
                            <Button variant="outline-danger" size="sm" className="delete-button">
                              <FaTrashAlt className="mr-1" /> Delete
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })
              )}
            </Row>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Inventory;
