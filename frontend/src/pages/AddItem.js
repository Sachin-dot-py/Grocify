import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Container, Row, Col, Spinner, Alert, Modal, Form, Toast } from 'react-bootstrap';
import Webcam from 'react-webcam';
import Quagga from 'quagga'; // Barcode scanning library
import axios from 'axios';
import { FaCamera, FaBarcode, FaTimes, FaCheckCircle, FaPlus } from 'react-icons/fa';
import './AddItem.css';

const AddItem = () => {
  const [barcodeDetected, setBarcodeDetected] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const webcamRef = useRef(null);
  const [error, setError] = useState(null);
  const [productName, setProductName] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // Authentication required
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    }
  }, []);

  // Start scanning for barcode
  const startBarcodeScanner = () => {
    setError(null); // Clear previous error messages
    setButtonsDisabled(true);
    setLoading(true);
    Quagga.init({
      inputStream: {
        type: 'LiveStream',
        target: webcamRef.current.video,
        constraints: {
          facingMode: 'environment' // Rear camera
        },
      },
      decoder: {
        readers: ['ean_reader'], // EAN Barcode format
      }
    }, (err) => {
      if (err) {
        console.error(err);
        setError('Error initializing barcode scanner');
        setLoading(false);
        setButtonsDisabled(false);
        return;
      }
      Quagga.start();
      setLoading(false);
    });

    Quagga.onDetected((data) => {
      if (data && data.codeResult && data.codeResult.code) {
        setBarcodeValue(data.codeResult.code);
        setBarcodeDetected(true);
        Quagga.stop(); // Stop scanner after successful scan
        fetchBarcodeData(data.codeResult.code);
      }
    });
  };

  // Call backend with barcode details
  const fetchBarcodeData = async (barcode) => {
    try {
      setError(null); // Clear previous error messages
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/api/barcode/${barcode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Barcode data:', response.data);
      setProductName(response.data.name);
      setProductImage(response.data.image);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching barcode data:', error);
      setError('Error fetching barcode details');
    } finally {
      setButtonsDisabled(false);
    }
  };

  // Handle adding item
  const handleAddItem = async () => {
    try {
      setError(null); // Clear previous error messages
      if (!expiryDate) {
        setError('Please enter an expiry date');
        return;
      }
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API_BASE_URL}/api/add-item`, {
        barcode: barcodeValue,
        name: productName,
        image: productImage,
        expiry_date: expiryDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Add item response:', response.data);
      setShowModal(false);
      setShowToast(true); // Show success toast
    } catch (error) {
      console.error('Error adding item:', error);
      setError('Error adding item to inventory');
    }
  };

  // Handle image capture and send to backend
  const handleImageCapture = async () => {
    setError(null); // Clear previous error messages
    setButtonsDisabled(true);
    const imageSrc = webcamRef.current.getScreenshot();
    try {
      if (!imageSrc) {
        throw new Error('Unable to capture image');
      }
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API_BASE_URL}/api/extract-info`, {
        image: imageSrc
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Image extraction data:', response.data);
      setProductName(response.data.item_name);
      setExpiryDate(response.data.expiry_date);
      setProductImage(imageSrc);
      setShowModal(true);
    } catch (error) {
      console.error('Error extracting item info from image:', error);
      setError('Error extracting item details');
    } finally {
      setButtonsDisabled(false);
    }
  };

  return (
    <Container>
      <Row className="justify-content-center mt-4">
        <Col md={8}>
          <Card className="shadow-lg">
            <Card.Body>
              <Card.Title className="text-center" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>Add New Grocery Item</Card.Title>
              <Card.Text className="text-center mb-4">
                Scan a barcode or capture an image to automatically input an item.
              </Card.Text>

              <div className="text-center mb-4 button-group">
                <Button onClick={startBarcodeScanner} variant="primary" className="d-flex align-items-center mr-3" disabled={buttonsDisabled} style={{ marginRight: '10px', padding: '10px 20px', opacity: buttonsDisabled ? 0.6 : 1 }}>
                  <FaBarcode style={{ marginRight: '8px' }} /> Scan Barcode
                </Button>
                <Button onClick={handleImageCapture} variant="info" className="d-flex align-items-center" disabled={buttonsDisabled} style={{ padding: '10px 20px', opacity: buttonsDisabled ? 0.6 : 1 }}>
                  <FaCamera style={{ marginRight: '8px' }} /> Identify Image
                </Button>
              </div>

              <div className="text-center">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="webcam-view"
                />
              </div>

              {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal to display product details and add expiry date */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Item Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {productImage && <img src={productImage} alt={productName} className="img-fluid mb-3 rounded modal-image" />}
          <h5 className="text-center" style={{ fontWeight: 'bold' }}>{productName}</h5>
          <Form>
            <Form.Group controlId="expiryDate">
              <Form.Label>Expiry Date</Form.Label>
              <Form.Control
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={() => setShowModal(false)} className="d-flex align-items-center">
            <FaTimes style={{ marginRight: '5px' }} /> Cancel
          </Button>
          <Button variant="success" onClick={handleAddItem} className="d-flex align-items-center">
          <FaPlus style={{ marginRight: '5px' }} /> Add Item
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast for successful addition */}
      <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide style={{ position: 'fixed', bottom: 20, right: 20 }}>
        <Toast.Header>
          <FaCheckCircle style={{ marginRight: '8px', color: 'green' }} />
          <strong className="mr-auto">Success</strong>
        </Toast.Header>
        <Toast.Body>Item added successfully!</Toast.Body>
      </Toast>
    </Container>
  );
};

export default AddItem;
