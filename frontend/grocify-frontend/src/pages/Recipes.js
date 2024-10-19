import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { FaRedo, FaPlusCircle } from 'react-icons/fa';
import './Recipes.css';
import { useNavigate } from 'react-router-dom';

const Recipes = () => {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

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

      // Call GPT-4o-mini API to generate a recipe
      const recipeResponse = await axios.post(`${API_BASE_URL}/api/generate-recipe`, {
        ingredients
      }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      setRecipe(recipeResponse.data);
    } catch (err) {
      console.error('Error fetching recipe:', err);
      if (err.response && err.response.status === 400) {
        setError('No ingredients found. Please add items to your inventory first.');
      } else {
        setError('Error fetching recipe. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="recipe-container">
      <Row className="justify-content-center mt-4">
        <Col md={10}>
          <h2 className="text-center mb-4">Recipe Created from Your Inventory</h2>
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
                <Card.Title className="text-center recipe-title">{recipe.recipe_name}</Card.Title>
                <Card.Text className="text-center recipe-summary">{recipe.description}</Card.Text>
                <h5 className="ingredients-heading">Ingredients:</h5>
                <ul className="ingredients-list">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index}>
                      {ingredient.quantity} {ingredient.unit} of {ingredient.item_name}
                    </li>
                  ))}
                </ul>
                <h5 className="steps-heading">Steps:</h5>
                <ol className="steps-list">
                  {recipe.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
                {recipe.missing_ingredients.length > 0 && (
                  <div className="missing-ingredients mt-4">
                    <h5 className="missing-heading">Missing Ingredients:</h5>
                    <ul>
                      {recipe.missing_ingredients.map((missing, index) => (
                        <li key={index}>
                          {missing.quantity} {missing.unit} of {missing.item_name}
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
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Recipes;
