# Authentication Setup Guide

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/weekly-planner
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/weekly-planner

# JWT Secret (generate a strong secret key)
JWT_SECRET=your-super-secret-jwt-key-here

# Gemini AI API Key (for schedule generation)
GEMINI_API_KEY=your-gemini-api-key-here
```

## Features Implemented

### ✅ User Authentication
- **Registration**: Users can create accounts with name, email, and password
- **Login**: Secure login with email and password
- **JWT Tokens**: Secure authentication using JSON Web Tokens
- **Password Hashing**: Passwords are securely hashed using bcryptjs
- **Session Management**: Automatic token validation and user session handling

### ✅ User Interface
- **Login Form**: Clean, responsive login interface
- **Registration Form**: User-friendly registration with password confirmation
- **User Info Display**: Shows logged-in user's name in the header
- **Logout Functionality**: Secure logout with token cleanup
- **Loading States**: Proper loading indicators during authentication

### ✅ API Security
- **Protected Routes**: All API endpoints require authentication
- **User Isolation**: Users can only access their own data
- **Token Validation**: JWT tokens are validated on every request
- **Error Handling**: Proper error messages for authentication failures

### ✅ Database Integration
- **User Model**: Complete user schema with authentication fields
- **Data Isolation**: All user data is properly isolated by user ID
- **Secure Storage**: User passwords are never stored in plain text

## Usage

1. **First Time Setup**:
   - Set up your environment variables
   - Run the database reset script: `npm run reset-db`
   - Start the development server: `npm run dev`

2. **User Registration**:
   - Navigate to the app
   - Click "Sign up" on the login form
   - Fill in your details and create an account

3. **User Login**:
   - Enter your email and password
   - Click "Sign in" to access your personalized planner

4. **Using the App**:
   - All your tasks and schedules are now private to your account
   - Your data persists across sessions
   - You can logout and login anytime

## Security Features

- **Password Requirements**: Minimum 6 characters
- **Password Confirmation**: Registration requires password confirmation
- **Secure Tokens**: JWT tokens expire after 7 days
- **Input Validation**: All inputs are validated on both client and server
- **Error Handling**: Secure error messages that don't leak sensitive information

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Protected Endpoints (require authentication)
- `GET /api/tasks` - Get user's tasks
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/[id]` - Update a task
- `DELETE /api/tasks/[id]` - Delete a task
- `GET /api/time-slots` - Get user's time slots
- `POST /api/time-slots` - Create a time slot
- `PUT /api/time-slots/[id]` - Update a time slot
- `DELETE /api/time-slots/[id]` - Delete a time slot
- `POST /api/generate-schedule` - Generate AI schedule

All protected endpoints require the `Authorization: Bearer <token>` header.



