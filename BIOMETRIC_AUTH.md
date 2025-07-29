# Biometric Authentication for StarTracker

## Overview

StarTracker now supports biometric authentication (fingerprint and face recognition) for mobile users. This feature allows users to log in quickly and securely using their device's built-in biometric sensors.

## Features

### Mobile Detection
- Automatically detects if the user is on a mobile device
- Only shows biometric options on supported mobile devices
- Gracefully degrades on desktop devices

### Biometric Setup
- Users can enable biometric authentication through the Settings page
- Requires one-time password verification to set up biometric credentials
- Stores credentials securely using the Web Authentication API

### Secure Authentication
- Uses platform authenticators (fingerprint/face recognition)
- Implements proper challenge-response authentication
- Session management with automatic expiration (24 hours)

## How It Works

### 1. Device Support Check
The system checks for:
- Mobile device detection via user agent
- Web Authentication API support
- Platform authenticator availability

### 2. Credential Creation
When a user enables biometric authentication:
1. User logs in with email/password
2. System creates biometric credentials using WebAuthn
3. Credentials are stored locally with user data
4. User can now use biometric authentication

### 3. Authentication Flow
When using biometric login:
1. User taps "Log in with biometric"
2. Device prompts for fingerprint/face recognition
3. System verifies the biometric authentication
4. User is logged in with a secure session

## User Experience

### Login Page
- Shows biometric login option for mobile users
- Provides clear setup instructions
- Handles errors gracefully with helpful messages

### Settings Page
- Dedicated biometric settings section
- Easy enable/disable functionality
- Clear status indicators

### Security Features
- Session expiration after 24 hours
- Secure credential storage
- Proper error handling and user feedback

## Technical Implementation

### Files Added/Modified

#### New Files:
- `src/utils/biometricAuth.js` - Core biometric authentication utilities
- `src/components/BiometricLogin.jsx` - Login component for biometric authentication
- `src/components/BiometricSettings.jsx` - Settings component for managing biometric auth
- `src/pages/UserSettings.jsx` - User settings page with biometric options

#### Modified Files:
- `src/contexts/AuthContext.jsx` - Added biometric session management
- `src/pages/Login.jsx` - Integrated biometric login component
- `src/components/Layout.jsx` - Added settings navigation
- `src/App.jsx` - Added user settings route

### Key Functions

#### `isBiometricSupported()`
- Checks device compatibility
- Returns boolean indicating support

#### `createBiometricCredentials(userId, userEmail)`
- Creates WebAuthn credentials
- Stores user data securely

#### `authenticateWithBiometric()`
- Handles biometric authentication
- Returns authentication result

#### `hasBiometricCredentials()`
- Checks if user has stored credentials
- Returns boolean

## Browser Support

### Supported Browsers
- Chrome (Android)
- Safari (iOS)
- Firefox (Android)
- Edge (Android)

### Requirements
- HTTPS connection (required for WebAuthn)
- Mobile device with biometric sensors
- Modern browser with Web Authentication API support

## Security Considerations

### Data Storage
- Credentials stored locally using localStorage
- User data encrypted and secured
- Session tokens with expiration

### Authentication Flow
- Challenge-response authentication
- Platform authenticator verification
- Secure session management

### Privacy
- No biometric data leaves the device
- Only credential IDs are stored
- User consent required for setup

## Usage Instructions

### For Users

1. **Enable Biometric Authentication:**
   - Go to Settings → Security
   - Tap "Activate biometric login"
   - Enter your email and password
   - Follow device prompts to set up fingerprint/face recognition

2. **Using Biometric Login:**
   - On the login page, tap "Log in with biometric"
   - Use your fingerprint or face recognition
   - You'll be logged in automatically

3. **Disable Biometric Authentication:**
   - Go to Settings → Security
   - Tap "Disable" next to biometric authentication
   - Confirm the action

### For Developers

The biometric authentication system is modular and can be easily extended:

```javascript
// Check if biometric is supported
const supported = await isBiometricSupported();

// Create credentials
const result = await createBiometricCredentials(userId, email);

// Authenticate
const authResult = await authenticateWithBiometric();
```

## Troubleshooting

### Common Issues

1. **"Biometric authentication not available"**
   - **HTTPS Required**: WebAuthn requires HTTPS in production. Use `https://your-ip:5173` instead of `http://`
   - **Mobile Device**: Ensure you're on a mobile device with biometric sensors
   - **Browser Support**: Update to latest Chrome, Safari, or Firefox
   - **Local Development**: HTTPS is enabled by default in development

2. **"Setup failed"**
   - Verify your email and password are correct
   - Ensure you have a stable internet connection
   - Check that your device's biometric sensor is working
   - Try again after a few minutes

3. **"Authentication failed"**
   - Make sure your fingerprint/face is properly registered on your device
   - Clean your device's biometric sensor
   - Try using password login as fallback
   - Restart your browser and try again

### Development Testing

For testing biometric authentication on your local network:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Access via HTTPS:**
   - Use `https://your-ip:5173` (not `http://`)
   - Accept the self-signed certificate warning
   - The server is configured with HTTPS enabled

3. **Device Requirements:**
   - Mobile device with fingerprint/face sensor
   - Modern browser (Chrome, Safari, Firefox)
   - Biometric authentication enabled on device

4. **Debug Information:**
   - On localhost, detailed device compatibility info is shown
   - Check browser console for additional debugging
   - Verify all requirements are met before setup

### Network Access Setup

1. **Find your IP address:**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. **Access from mobile device:**
   - Connect both devices to same WiFi network
   - Navigate to `https://your-ip:5173`
   - Accept certificate warning
   - Test biometric authentication

### Error Messages

- Clear, user-friendly error messages
- Norwegian language support
- Helpful troubleshooting tips

## Future Enhancements

### Planned Features
- Multiple biometric methods support
- Backup authentication methods
- Enhanced security options
- Cross-device synchronization

### Potential Improvements
- Biometric strength indicators
- Advanced security settings
- Integration with device security policies
- Enhanced error recovery

## Support

For technical support or questions about biometric authentication:
- Check the troubleshooting section above
- Contact system administrators
- Review browser compatibility requirements 