import React from 'react';
import './Home.css'; // Assuming you have a CSS file for styling

const Home = () => {
  return (
    <div className="home-container">
      <h1>Welcome to Grocify!</h1>
      <p>
        Grocify is your all-in-one food tracking, grocery management, and cooking assistant platform.
        We help you keep track of your kitchen inventory, create grocery lists, and find personalized recipe suggestions.
        With Grocify, managing your groceries and cooking meals becomes simple and efficient.
      </p>
      <div className="animated-image-container">
        {/* <img src={animatedImage} alt="Grocify Features Animation" className="animated-image" /> */}
        <p className="animated-image-text">Discover how Grocify makes your kitchen experience smarter and more enjoyable!</p>
      </div>
      <div className="features-grid">
        <div className="feature-item">
          <h2>Track Your Inventory</h2>
          <p>Keep an up-to-date list of everything in your kitchen so you never run out of essentials.</p>
        </div>
        <div className="feature-item">
          <h2>Create Grocery Lists</h2>
          <p>Easily generate grocery lists based on your inventory and meal plans.</p>
        </div>
        <div className="feature-item">
          <h2>Personalized Recipes</h2>
          <p>Get recipe suggestions based on what you have in stock and your dietary preferences.</p>
        </div>
        <div className="feature-item">
          <h2>Expiration Date Tracking</h2>
          <p>Stay informed about upcoming expiration dates to minimize food waste.</p>
        </div>
        <div className="feature-item">
          <h2>Cooking Assistant</h2>
          <p>Use our GPT-powered assistant for real-time cooking help and tips.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
