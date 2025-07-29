// Biometric Authentication Utility
// Uses Web Authentication API for biometric authentication on mobile devices

// Check if the device supports biometric authentication
export const isBiometricSupported = async () => {
    // Check if we're on a mobile device or have touch capabilities
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // For development/testing, allow on any device with touch capabilities
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isMobile && !hasTouch && !isLocalhost) {
        return false;
    }

    // Check if Web Authentication API is supported
    if (!window.PublicKeyCredential) {
        console.log('Web Authentication API not supported');
        return false;
    }

    // Check if we're on HTTPS (required for WebAuthn in production)
    // For development, allow HTTP on localhost and local network
    const isSecure = window.location.protocol === 'https:' || isLocalhost;
    const isLocalNetwork = window.location.hostname.startsWith('192.168.') || 
                          window.location.hostname.startsWith('10.0.') || 
                          window.location.hostname.startsWith('172.');
    
    if (!isSecure && !isLocalhost && !isLocalNetwork) {
        console.log('HTTPS required for biometric authentication (except on localhost/local network)');
        return false;
    }

    // Check if biometric authentication is available
    try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        console.log('Biometric authenticator available:', available);
        return available;
    } catch (error) {
        console.log('Biometric authentication not available:', error);
        return false;
    }
};

// Generate a challenge for biometric authentication
const generateChallenge = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return array;
};

// Create biometric credentials for a user
export const createBiometricCredentials = async (userId, userEmail) => {
    try {
        const challenge = generateChallenge();
        
        const publicKeyOptions = {
            challenge: challenge,
            rp: {
                name: "StarTracker",
                id: window.location.hostname,
            },
            user: {
                id: new Uint8Array(userId.split('').map(c => c.charCodeAt(0))),
                name: userEmail,
                displayName: userEmail,
            },
            pubKeyCredParams: [
                {
                    type: "public-key",
                    alg: -7, // ES256
                },
            ],
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
            },
            timeout: 60000,
        };

        const credential = await navigator.credentials.create({
            publicKey: publicKeyOptions,
        });

        // Store the credential ID and user data for later verification
        const userData = {
            userId: userId,
            email: userEmail,
            credentialId: credential.id,
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('biometricUserData', JSON.stringify(userData));
        
        return {
            success: true,
            credentialId: credential.id,
        };
    } catch (error) {
        console.error('Error creating biometric credentials:', error);
        return {
            success: false,
            error: error.message,
        };
    }
};

// Authenticate using biometric credentials
export const authenticateWithBiometric = async () => {
    try {
        const userDataString = localStorage.getItem('biometricUserData');
        
        if (!userDataString) {
            throw new Error('No biometric credentials found');
        }

        const userData = JSON.parse(userDataString);
        const challenge = generateChallenge();
        
        const assertionOptions = {
            challenge: challenge,
            rpId: window.location.hostname,
            allowCredentials: [
                {
                    type: "public-key",
                    id: Uint8Array.from(atob(userData.credentialId), c => c.charCodeAt(0)),
                    transports: ["internal"],
                },
            ],
            userVerification: "required",
            timeout: 60000,
        };

        const assertion = await navigator.credentials.get({
            publicKey: assertionOptions,
        });

        return {
            success: true,
            userData: userData,
            assertion: assertion,
        };
    } catch (error) {
        console.error('Biometric authentication failed:', error);
        return {
            success: false,
            error: error.message,
        };
    }
};

// Check if user has biometric credentials stored
export const hasBiometricCredentials = () => {
    const userDataString = localStorage.getItem('biometricUserData');
    if (!userDataString) return false;
    
    try {
        const userData = JSON.parse(userDataString);
        return !!(userData.userId && userData.email && userData.credentialId);
    } catch {
        return false;
    }
};

// Get stored user data
export const getStoredUserData = () => {
    const userDataString = localStorage.getItem('biometricUserData');
    if (!userDataString) return null;
    
    try {
        return JSON.parse(userDataString);
    } catch {
        return null;
    }
};

// Remove biometric credentials
export const removeBiometricCredentials = () => {
    localStorage.removeItem('biometricUserData');
};

// Detect if user is on a mobile device
export const isMobileDevice = () => {
    const userAgent = navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return mobileRegex.test(userAgent) || hasTouch;
};

// Get detailed device information for debugging
export const getDeviceInfo = () => {
    return {
        userAgent: navigator.userAgent,
        isMobile: isMobileDevice(),
        hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        maxTouchPoints: navigator.maxTouchPoints,
        platform: navigator.platform,
        vendor: navigator.vendor,
        hasWebAuthn: !!window.PublicKeyCredential,
        isSecure: window.location.protocol === 'https:',
        isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
        isLocalNetwork: window.location.hostname.startsWith('192.168.') || 
                       window.location.hostname.startsWith('10.0.') || 
                       window.location.hostname.startsWith('172.')
    };
}; 