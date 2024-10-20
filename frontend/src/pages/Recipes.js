import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, Modal, Form, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import { FaRedo, FaPlusCircle, FaPenFancy, FaCheckCircle, FaPaperPlane } from 'react-icons/fa';
import './Recipes.css';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const Recipes = () => {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCustomRecipeModal, setShowCustomRecipeModal] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [customCuisine, setCustomCuisine] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [customCuisineOther, setCustomCuisineOther] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    }
  }, []);

  useEffect(() => {
    fetchRecipe();
  }, []);

  const fetchRecipe = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Unauthorized: Please log in again.');
      }
      // Fetch inventory items
      const inventoryResponse = await axios.get(`${API_BASE_URL}/api/inventory`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const ingredients = inventoryResponse.data;

      // Call LLM API to generate a recipe
      const recipeResponse = await axios.post(`${API_BASE_URL}/api/generate-recipe`, {
        ingredients
      }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      setRecipe(recipeResponse.data);
      setChatMessages([{ role: 'system', content: 'Ask me anything about the recipe!' }]);
    } catch (err) {
      console.error('Error fetching recipe:', err);
      if (err.response && err.response.status === 400) {
        setError('No ingredients found. Please add items to your inventory first.');
      } else {
        setError('Could not craft a recipe with the current ingredients. Please try adding more!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckChange = (e, label) => {
    setDietaryRestrictions(prev =>
      e.target.checked ? [...prev, label] : prev.filter(item => item !== label)
    );
  };

  const handleCustomRecipeSubmit = async () => {
    setLoading(true);
    setShowCustomRecipeModal(false);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Unauthorized: Please log in again.');
      }
      // Fetch inventory items
      const inventoryResponse = await axios.get(`${API_BASE_URL}/api/inventory`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const ingredients = inventoryResponse.data;

      // Custom recipe parameters
      const customRecipeData = {
        ingredients,
        dietary_restrictions: dietaryRestrictions,
        cuisine: customCuisine === 'Other' ? customCuisineOther : customCuisine,
        special_requests: specialRequests
      };

      // Call LLM API to generate a custom recipe
      const recipeResponse = await axios.post(`${API_BASE_URL}/api/generate-custom-recipe`, customRecipeData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      setRecipe(recipeResponse.data);
    } catch (err) {
      console.error('Error fetching custom recipe:', err);
      setError('Error fetching custom recipe. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!userMessage.trim()) return;
  
    const newMessage = { role: 'user', content: userMessage };
    setChatMessages([...chatMessages, newMessage]);
    setUserMessage('');
  
    const token = localStorage.getItem('access_token');
  
    try {
      // Send the chat messages along with the recipe data to the backend
      const response = await axios.post(`${API_BASE_URL}/api/chat-recipe`, {
        messages: [...chatMessages, newMessage],
        recipe_name: recipe.recipe_name,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      const assistantMessage = response.data;
      setChatMessages([...chatMessages, newMessage, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Error during chat:', error);
      setChatMessages([...chatMessages, newMessage, { role: 'assistant', content: 'Sorry, I couldn\'t process that. Please try again.' }]);
    }
  };

  return (
    <Container fluid className="recipe-container">
      <Row className="justify-content-center mt-4">
        <Col md={10}>
          <h2 className="text-center mb-4 recipe-title">Recipe Created from Your Inventory</h2>
          <p className="text-center mb-5 recipe-description">
            This recipe has been specially crafted using the ingredients available in your inventory, prioritizing items that are close to their expiry date.
          </p>
          {loading ? (
            <div className="text-center mt-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Generating your recipe...</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <Alert variant="danger" className="text-center">
                {error}
              </Alert>
              {error.includes('No ingredients found') && (
                <Button variant="primary" onClick={() => navigate('/add-item')} className="mt-3 add-item-button">
                  <FaPlusCircle className="mr-2" /> Add Ingredients
                </Button>
              )}
            </div>
          ) : (
            <Card className="shadow-lg recipe-card">
              <Card.Body>
                <Card.Title className="text-center recipe-title">
                  <span className="recipe-name">{recipe.recipe_name}</span>
                </Card.Title>
                <Card.Text className="text-center recipe-summary">
                  <em>{recipe.description}</em>
                </Card.Text>
                <div className="recipe-section">
                  <h5 className="ingredients-heading">Ingredients:</h5>
                  <ul className="ingredients-list">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index}>
                        {ingredient.quantity} {ingredient.unit} of <span className="ingredient-name">{ingredient.item_name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="recipe-section">
                  <h5 className="steps-heading">Steps:</h5>
                  <ol className="steps-list">
                    {recipe.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
                {recipe.missing_ingredients.length > 0 && (
                  <div className="recipe-section missing-ingredients mt-4">
                    <h5 className="missing-heading">Missing Ingredients:</h5>
                    <ul>
                      {recipe.missing_ingredients.map((missing, index) => (
                        <li key={index}>
                          {missing.quantity} {missing.unit} of <span className="ingredient-name">{missing.item_name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="text-center mt-5">
                  <Button variant="primary" onClick={fetchRecipe} className="generate-again-button">
                    <FaRedo className="mr-2" /> Generate New Recipe
                  </Button>
                </div>
                <div className="text-center mt-3">
                  <Button variant="success" onClick={() => setShowCustomRecipeModal(true)} className="custom-recipe-button">
                    <FaPenFancy className="mr-2" /> Craft Your Own Recipe
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* Live Chat Section */}
      {recipe && (
        <Row className="justify-content-center mt-5">
          <Col md={10}>
            <Card className="shadow-lg chat-card">
              <Card.Body>
                <Card.Title className="text-center chat-title">Chat with the Head Chef <span role="img" aria-label="chef">👨‍🍳</span></Card.Title>
                <div className="chat-box">
                  {chatMessages.map((message, index) => (
                    <div key={index} className={`chat-message ${message.role}`}>
                      <strong>{message.role === 'user' ? 'You' : 'Assistant'}:</strong> <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ))}
                </div>
                <InputGroup className="chat-input-group mt-3">
                  <Form.Control
                    type="text"
                    placeholder="Ask a question about the recipe..."
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                    className="chat-input"
                  />
                  <Button variant="primary" onClick={handleChatSubmit} className="send-button">
                    <FaPaperPlane />
                  </Button>
                </InputGroup>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Custom Recipe Modal */}
      <Modal show={showCustomRecipeModal} onHide={() => setShowCustomRecipeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Craft Your Own Recipe</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="dietaryRestrictions">
              <Form.Label>Dietary Restrictions</Form.Label>
              <Form.Check type="checkbox" label="Vegetarian" onChange={(e) => handleCheckChange(e, 'Vegetarian')} id="vegetarian" />
              <Form.Check type="checkbox" label="Vegan" onChange={(e) => handleCheckChange(e, 'Vegan')} id="vegan" />
              <Form.Check type="checkbox" label="Gluten-Free" onChange={(e) => handleCheckChange(e, 'Gluten-Free')} id="glutenFree" />
              <Form.Check type="checkbox" label="Dairy-Free" onChange={(e) => handleCheckChange(e, 'Dairy-Free')} id="dairyFree" />
              <Form.Check type="checkbox" label="Nut-Free" onChange={(e) => handleCheckChange(e, 'Nut-Free')} id="nutFree" />
              <Form.Control
                type="text"
                placeholder="Other dietary restrictions"
                className="mt-2"
                onChange={(e) => setDietaryRestrictions([...dietaryRestrictions, e.target.value])}
              />
            </Form.Group>
            <Form.Group controlId="cuisine">
              <Form.Label>Preferred Cuisine</Form.Label>
              <Form.Control as="select" value={customCuisine} onChange={(e) => setCustomCuisine(e.target.value)}>
                <option>Any</option>
                <option>Italian</option>
                <option>Mexican</option>
                <option>Indian</option>
                <option>Chinese</option>
                <option>American</option>
                <option>Other</option>
              </Form.Control>
              {customCuisine === 'Other' && (
                <Form.Control
                  type="text"
                  placeholder="Specify other cuisine"
                  className="mt-2"
                  onChange={(e) => setCustomCuisineOther(e.target.value)}
                />
              )}
            </Form.Group>
            <Form.Group controlId="specialRequests">
              <Form.Label>Special Requests</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Any special requests or preferences?"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCustomRecipeModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleCustomRecipeSubmit}>
            <FaCheckCircle className="mr-2" /> Generate Custom Recipe
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Recipes;