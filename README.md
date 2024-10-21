# Grocify: Your Personal Grocery Assistant

Grocify is an all-in-one food tracking, grocery management, and cooking assistant platform designed to help users efficiently manage their kitchen inventory. It provides features such as barcode scanning, personalized recipe suggestions, dietary-specific custom recipe generation, and more, making it easier to manage ingredients, minimize food waste, and explore new recipes.

## Built for Cal Hacks 11.0

Grocify was created as part of Cal Hacks 11.0 in San Francisco. We wanted to challenge ourselves to solve a real-world problem within the hackathon's time constraints, and food waste felt like an issue that resonated with many of us. Over an intense weekend of brainstorming, coding, and testing, we brought Grocify to life, aiming to make grocery management smarter, more sustainable, and accessible to everyone.

Demo Video: https://www.youtube.com/watch?v=3mnrfpyawdU

## Tech Stack

- **Frontend**: React.js with Bootstrap for styling.
- **Backend**: Flask (Python) for API and backend functionality.
- **Database**: MongoDB Atlas for storing inventory items and user information.
- **Web Server**: Nginx used for serving frontend and acting as a reverse proxy for the backend.
- **Deployment**: DigitalOcean Droplet.

## Description
### Inspiration
The idea for Grocify came from a small but frustrating moment in our busy college lives. We bought a perfect avocado, full of possibilities. But in the loop of classes and assignments, it sat there, forgotten. By the time we remembered, it was too late—a sad, mushy reminder of how hard it can be to keep track of fresh groceries and how much food we waste.

That moment made us wonder—how many others face the same problem? Wasting food isn’t just annoying; it’s wasteful and bad for the environment. We wanted a way to avoid these moments, save money, and make our busy lives a bit more organized. That’s how Grocify was born: a simple, intuitive tool to help manage groceries, track expiry dates, and reduce food waste, all while making it easier to use what we buy.

### What It Does
Grocify is like having a personal grocery assistant in your pocket, making food management easy. From keeping track of what’s in your pantry to ensuring nothing goes to waste, Grocify helps you stay on top of your groceries without the hassle.

Using barcode and image scanning, adding items is quick and painless—just scan the barcode or click the photo. Once items are in the inventory, Grocify takes care of tracking expiry dates and helping you avoid the mess.

Grocify can suggest recipes based on what you have, prioritizing ingredients nearing expiration. It even considers your dietary preferences, so the recipes are not just convenient but fit your needs. And if you get stuck while cooking, our helpful assistant is just a tap away to guide you through the steps.

### How We Built It
Building Grocify was an iterative process that began with understanding how to simplify grocery management for users. We started by prototyping a user journey that made adding items effortless—leading us to integrate barcode scanning using an API and advanced image recognition powered by Llama. Once core features were established, we added an inventory page to track product statuses in real time. Next, we introduced a Recipes page that curates personalized recipes tailored to the ingredients users already have, utilizing the mixtral and gemma models through Groq to deliver optimal suggestions.

To enhance the experience, we integrated a chatbot that offers step-by-step cooking guidance, understanding that many college students may need extra support in the kitchen. We also included options for specifying dietary preferences and special requests, allowing the app to generate customized recipes that fit users' needs. Overall, Grocify aims to take the hassle out of grocery management and make cooking approachable and enjoyable.

### Challenges We Ran Into
As with any ambitious project, building Grocify came with its fair share of challenges—some of which were quite unexpected! One of the first major hurdles was getting the barcode scanner to correctly identify individual products, especially when they were originally part of a larger package. We had a particularly amusing incident where we scanned a single granola bar, and it read as a 24-pack—likely because it was originally part of a larger box.

Another challenge was integrating the expiry date feature. We thought it would be simple enough to estimate how long items would stay fresh—until we realized our initial model displayed expiry dates for ripe bananas as being three weeks later. After plenty of trial and error, we fine-tuned the system to provide realistic expiry estimates, even for tricky produce.

The chatbot also posed an interesting problem. Initially, it answered simple cooking questions, but we quickly found users asking wild inquiries—like substituting pancake mix for flour in every recipe. The chatbot ended up giving overly confident (and wrong) advice, so we had to add extra checks to prevent it from turning into a rogue chef.

Through all these challenges, we learned to stay adaptable. Every hurdle helped us refine Grocify, ensuring users would have an intuitive and reliable experience.

### Accomplishments That We're Proud Of
We are especially proud of how Grocify makes sustainable living effortless. It’s not just about managing groceries—it’s about reducing food waste, saving money, and making it all incredibly easy. The convenience is unmatched: you can check what’s in your pantry on your way home, plan a recipe, and know exactly what to cook before stepping through the door.

One of our biggest wins is making sustainability accessible. As a vegetarian, I love how easy it is to see if a product fits my dietary restrictions just by scanning it. Grocify takes the guesswork out of managing groceries, ensuring everyone can make choices that are good for them and for the planet. Although working with personalized dietary restrictions added complexity, there were moments where we were surprised by how aware the system was about common allergens in products. For example, we learned through the app's warning that Cheetos contain milk and aren't vegan—a detail we would never have guessed. Seeing the system catch these details made us incredibly proud.

Another highlight was realizing our image recognition feature could distinguish even the most visually similar produce items. During testing, we saw the app correctly identify subtle differences between items like mandarins and oranges, which felt like a major leap forward. We're also proud of how Grocify estimates expiry dates. Though we initially had some hiccups, refining that system into something accurate and reliable took a lot of work, and the payoff was worth it.

### What We Learned
Building Grocify taught us the importance of empathy and thoughtful design. Small features like barcode scanning and personalized recipes can make managing groceries easier and reduce waste. The vision of integrating with stores for automatic syncing showed us how to reach a broader audience, making things effortless for users. Sustainability doesn't have to be complicated with the right tools, and these insights will guide us as we continue improving Grocify.

We also learned how to effectively leverage generative AI and LLM (Large Language Model) APIs. Integrating these technologies allowed us to build features far more sophisticated than we imagined. The chatbot, powered by an LLM, evolved into an intelligent assistant capable of answering complex cooking questions, generating custom recipes, and offering helpful substitutions. Working with generative AI taught us about prompt engineering—how to structure inputs to get useful outputs, and how to refine responses for user-friendliness.

### What's Next for Grocify
Moving forward, we want Grocify to empower users even more when it comes to choosing what they bring into their homes. By expanding our barcode scanning feature, we aim to give users the ability to quickly evaluate products based on their ingredient lists, helping them avoid items with excessive chemicals or preservatives and make healthier choices.

We also plan to enhance our recipe generator by incorporating even more personalization, so users can discover meals that align perfectly with their health goals and preferences. Our mission is to make grocery management smarter and healthier for everyone—while keeping it simple, intuitive, and focused on sustainability.

Additionally, we want to integrate Grocify with popular stores like Trader Joe's, allowing users to sync purchases directly with the app. This means items bought in-store can be automatically added to their inventory, making the process seamless. By leveraging our barcode scanning feature, users will also be able to access detailed nutritional facts, enabling more informed dietary decisions.

## Installation and Setup

### Prerequisites

- Ubuntu-based server (e.g., DigitalOcean Droplet)
- Node.js and npm
- Python 3 and pip
- MongoDB Atlas account

### Step 1: Clone the Repository

### Step 2: Backend Setup

### Step 3: Frontend Setup

### Step 4: Configure Nginx

### Step 5: Set Up Gunicorn Service

### Step 6: Obtain and Configure SSL Certificate

### Step 7: Update and Redeploy

To update and redeploy your application after making changes, run the provided update script

This script pulls the latest code from the repository, rebuilds the frontend, and restarts Nginx and Gunicorn services.

## Screenshots from App

![Turkey Popup](https://github.com/user-attachments/assets/a9e8cd21-dd07-4703-84c4-dfbb89d854a0)
![Recipe](https://github.com/user-attachments/assets/2044dc25-7aab-4bac-8ae5-2cff3799600d)
![Recipe Chat](https://github.com/user-attachments/assets/8e0a344a-70e1-44ae-8d8d-7d8534e3d0a3)
![Inventory](https://github.com/user-attachments/assets/fe4b6037-97e9-455e-b9ea-32128a8c49de)
![Home Page](https://github.com/user-attachments/assets/e9a205d4-b2b1-40b1-9295-520bea20f9d8)
![Dietary Restrictions](https://github.com/user-attachments/assets/4c22fa94-c39c-4f9b-bac3-3df62a7d1fa8)
![Add Item Scanning Popup](https://github.com/user-attachments/assets/595cbd69-8756-4008-899d-79621ad83e05)
![Add Item Barcode Popup](https://github.com/user-attachments/assets/6700934b-9e08-4419-9b26-54523099c07e)
