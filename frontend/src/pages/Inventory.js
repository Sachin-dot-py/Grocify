import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Container, Row, Col, ProgressBar, Spinner, Alert, Button, Badge, Toast } from 'react-bootstrap';
import { FaTrashAlt, FaEdit, FaClock, FaCheckCircle, FaPlus, FaMinus, FaThumbsUp, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import './Inventory.css';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");
  const [toastIcon, setToastIcon] = useState(<FaThumbsUp />);
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

  const handleQuantityChange = async (itemId, change) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const updatedItems = items.map((item) => {
        if (item._id === itemId) {
          return { ...item, quantity: item.quantity + change };
        }
        return item;
      });
      setItems(updatedItems);
      if (change > 0) {
        setToastMessage('Quantity increased successfully');
        setToastVariant('success');
        setToastIcon(<FaThumbsUp />);
      } else {
        setToastMessage('Quantity decreased successfully');
        setToastVariant('danger');
        setToastIcon(<FaTrash />);
      }
      setShowToast(true);
    } catch (error) {
      console.error('Error updating quantity:', error);
      setError('Error updating quantity');
    }
  };

  const handleDelete = async (itemId) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('Token is missing. User may not be authenticated.');
      setToastMessage('Authentication error. Please log in again.');
      setToastVariant('danger');
      setToastIcon(<FaTrash />);
      setShowToast(true);
      return;
    }

    let retries = 3;
    while (retries > 0) {
      try {
        console.log('Attempting to delete item with ID:', itemId);
        console.log('Authorization token:', token);

        const response = await axios.delete(`${API_BASE_URL}/api/inventory/${itemId}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        console.log('Delete response status:', response.status);

        if (response.status === 200 || response.status === 204) {
          // Filter out the deleted item from the local state
          setItems((prevItems) => prevItems.filter((item) => item._id !== itemId));
          setToastMessage('Item deleted successfully');
          setToastVariant('success');
          setToastIcon(<FaTrash />);
          setShowToast(true);
          return; // Exit the function if successful
        } else {
          throw new Error('Unexpected response status: ' + response.status);
        }
      } catch (error) {
        retries -= 1;
        console.error('Error deleting item:', error.response ? error.response.data : error.message);
        if (retries === 0) {
          setToastMessage('Failed to delete item. Please try again.');
          setToastVariant('danger');
          setToastIcon(<FaTrash />);
          setShowToast(true);
        }
      }
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
                <p className="text-center w-100">Your inventory is empty. Add items to get started!</p>
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
                          <div className="quantity-controls d-flex justify-content-between mb-3">
                            <Button variant="outline-secondary" size="sm" onClick={() => handleQuantityChange(item._id, -1)} disabled={item.quantity <= 1}>
                              <FaMinus />
                            </Button>
                            <Button variant="outline-secondary" size="sm" onClick={() => handleQuantityChange(item._id, 1)}>
                              <FaPlus />
                            </Button>
                          </div>
                          <ProgressBar className="mb-3" variant={variant} now={percentage} label={`${Math.round(percentage)}%`} />
                          <div className="mt-auto d-flex justify-content-between">
                            <Button variant="outline-info" size="sm" className="edit-button">
                              <FaEdit className="mr-1" /> Edit
                            </Button>
                            <Button variant="outline-danger" size="sm" className="delete-button" onClick={() => handleDelete(item._id)}>
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

      <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide style={{ position: 'fixed', bottom: 20, right: 20, backgroundColor: toastVariant === 'success' ? '#d4edda' : '#f8d7da' }}>
        <Toast.Header>
          {toastIcon}
          <strong className="ml-2 mr-auto">Notification</strong>
        </Toast.Header>
        <Toast.Body>{toastMessage}</Toast.Body>
      </Toast>
    </Container>
  );
};

export default Inventory;
