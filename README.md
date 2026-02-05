# JWT Authentication Implementation

This project has been successfully updated with JWT (JSON Web Token) authentication. The implementation includes both frontend and backend components for secure user authentication and authorization.

## Features Implemented

### 🔐 Authentication System
- **JWT Token Generation**: Secure token creation with configurable expiration
- **Token Verification**: Robust token validation and payload extraction
- **Token Storage**: Secure client-side token management using localStorage
- **Auto-Authentication**: Automatic token validation on app startup

### 🛡️ Security Features
- **Protected Routes**: All authenticated routes require valid JWT tokens
- **Token Expiration**: Automatic handling of expired tokens
- **Secure Headers**: Authorization headers automatically added to API requests
- **Logout Functionality**: Proper token cleanup and session termination

### 📱 Frontend Components
- **AuthForm Component**: Complete login/registration interface
- **Updated useAuth Hook**: JWT-aware authentication management
- **Protected App Routes**: Conditional rendering based on authentication status
- **Demo Credentials**: Pre-configured demo account for testing

### 🔧 Backend Integration
- **Mock API Server**: JWT-authenticated mock API endpoints
- **API Client**: HTTP client with automatic token injection
- **Auth Service**: Centralized authentication business logic

## Files Modified/Created

### New Files
- `src/lib/jwt.ts` - JWT utilities (generate, verify, decode, storage)
- `src/lib/auth.ts` - Authentication service with JWT integration
- `src/lib/api.ts` - HTTP client with JWT authorization
- `src/lib/mockApi.ts` - Mock API server with JWT authentication
- `src/components/AuthForm.tsx` - Authentication form component

### Modified Files
- `src/hooks/useAuth.ts` - Updated to use JWT authentication
- `src/App.tsx` - Added authentication flow and protected routes

## Installation

The required dependencies have been automatically installed:

```bash
npm install jsonwebtoken bcryptjs @types/jsonwebtoken
```

## Usage

### Demo Credentials
- **Email**: `demo@example.com`
- **Password**: `password`

### Authentication Flow

1. **Login/Register**: Users can authenticate using the AuthForm
2. **Token Storage**: JWT tokens are automatically stored in localStorage
3. **Protected Access**: All app features require valid authentication
4. **Auto-Login**: Users remain authenticated across browser sessions
5. **Logout**: Proper token cleanup and session termination

### API Integration

The `apiClient` automatically includes JWT tokens in all requests:

```typescript
// Automatic token injection
const response = await apiClient.get('/protected-endpoint');

// Auth-specific methods
const loginResponse = await apiClient.login({ email, password });
const registerResponse = await apiClient.register({ email, password, name });
```

## Security Considerations

### Token Security
- Tokens are stored securely in localStorage
- Automatic token expiration handling
- Secure token verification with proper error handling
- Protected routes prevent unauthorized access

### Best Practices Implemented
- JWT secret key configuration via environment variables
- Proper token expiration times (24 hours default)
- Secure token generation with user payload
- Comprehensive error handling for authentication failures

## Testing the Implementation

1. **Start the Development Server**:
   ```bash
   npm run dev
   ```

2. **Access the Application**: The app will redirect to the authentication form

3. **Login with Demo Credentials**:
   - Email: `demo@example.com`
   - Password: `password`

4. **Explore Protected Features**: All dashboard and receipt management features are now protected

5. **Test Authentication Flow**:
   - Try accessing the app without logging in (should redirect to auth form)
   - Test logout functionality
   - Verify token persistence across browser sessions

## JWT Token Structure

The JWT tokens include the following payload:
```typescript
interface JWTPayload {
  userId: string;    // User identifier
  email: string;     // User email
  name?: string;     // Optional user name
  exp?: number;      // Token expiration timestamp
}
```

## Environment Configuration

For production use, configure your JWT secret:

```bash
VITE_JWT_SECRET=your-super-secret-jwt-key
VITE_API_URL=https://your-api-server.com/api
```

## Future Enhancements

This JWT implementation provides a solid foundation for:
- Integration with real backend APIs
- Additional security features (refresh tokens, 2FA)
- Role-based access control
- Social authentication providers
- Password reset functionality

## Troubleshooting

### Common Issues
- **Token Expiration**: Users are automatically logged out when tokens expire
- **Invalid Tokens**: Corrupted or invalid tokens are automatically cleared
- **Network Errors**: Graceful handling of API connectivity issues

### Debug Mode
Enable debug logging by checking the browser console for authentication events and token status.