TPM Group Project - MERN Stack Application
Project Overview
This is a comprehensive MERN (MongoDB, Express.js, React, Node.js) stack application developed for our IT Project Management course. The application combines several powerful features including an AI agent, stock management, shopping cart functionality, expense tracking, and budget planning tools.

Features
1. AI Agent Integration
Intelligent chatbot assistant for user queries

Natural language processing for financial advice

Product recommendations based on user behavior

Automated budget suggestions

2. Stock Management System
Real-time inventory tracking

Product categorization and organization

Low stock alerts and notifications

Supplier management

Barcode/QR code scanning support

3. Shopping Cart
User-friendly product browsing

Add/remove items from cart

Save for later functionality

Multiple payment gateway integration

Order history and tracking

4. Expense Tracking
Categorize expenses (food, transportation, utilities, etc.)

Visualize spending with charts and graphs

Receipt scanning and image upload

Recurring expense tracking

Customizable expense tags

5. Budget Planning
Create monthly/annual budgets

Track progress against budget goals

Savings goal calculator

Financial forecasting

Alert system for overspending

Technologies Used
Frontend
React.js

Redux (State management)

Material-UI (UI components)

Chart.js (Data visualization)

Axios (HTTP requests)

Backend
Node.js

Express.js

MongoDB (Database)

Mongoose (ODM)

JWT (Authentication)

AI Components
OpenAI API

Natural Language Processing

Custom-trained recommendation models

Additional Tools
Git/GitHub (Version control)

Postman (API testing)

Jest (Testing framework)

Docker (Containerization)

Installation
Prerequisites
Node.js (v14 or higher)

MongoDB (v4.4 or higher)

npm or yarn

Setup Instructions
Clone the repository:

bash
git clone https://github.com/your-username/itpm-project.git
cd itpm-project
Install backend dependencies:

bash
cd server
npm install
Install frontend dependencies:

bash
cd ../client
npm install
Set up environment variables:

Create a .env file in the server directory with the following variables:

MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
PORT=5000
Start the application:

In one terminal (for backend):

bash
cd server
npm start
In another terminal (for frontend):

bash
cd client
npm start
