export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export class BiometricAuth {
  async isAvailable(): Promise<boolean> {
    try {
      if (!window.PublicKeyCredential) {
        return false;
      }
      
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  async register(username: string): Promise<BiometricAuthResult> {
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: "Brain Bucket",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(username),
            name: username,
            displayName: username,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: "direct",
        },
      }) as PublicKeyCredential;

      if (credential) {
        // Store credential ID for later use
        localStorage.setItem('biometric_credential_id', credential.id);
        return { success: true };
      }

      return { success: false, error: 'Failed to create credential' };
    } catch (error) {
      console.error('Biometric registration error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async authenticate(): Promise<BiometricAuthResult> {
    try {
      const credentialId = localStorage.getItem('biometric_credential_id');
      if (!credentialId) {
        return { success: false, error: 'No registered credential found' };
      }

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            type: "public-key",
            id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
          }],
          userVerification: "required",
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (credential) {
        return { success: true };
      }

      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  async isRegistered(): Promise<boolean> {
    const credentialId = localStorage.getItem('biometric_credential_id');
    return !!credentialId;
  }

  clearRegistration() {
    localStorage.removeItem('biometric_credential_id');
  }
}

export const biometricAuth = new BiometricAuth();
