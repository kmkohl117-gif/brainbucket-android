import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { biometricAuth } from '@/lib/auth';
import { useStore } from '@/store/useStore';
import { Fingerprint, Brain, Loader2 } from 'lucide-react';

export function BiometricAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  
  const { setAuthenticated, setCurrentScreen } = useStore();

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const available = await biometricAuth.isAvailable();
    const registered = await biometricAuth.isRegistered();
    setIsAvailable(available);
    setIsRegistered(registered);
  };

  const handleAuthenticate = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (!isRegistered) {
        // Register first
        const registerResult = await biometricAuth.register('brain-bucket-user');
        if (!registerResult.success) {
          setError(registerResult.error || 'Failed to register biometric');
          setIsLoading(false);
          return;
        }
        setIsRegistered(true);
      }

      // Authenticate
      const authResult = await biometricAuth.authenticate();
      if (authResult.success) {
        setAuthenticated(true);
        setCurrentScreen('quick-capture');
      } else {
        setError(authResult.error || 'Authentication failed');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Authentication error:', error);
    }

    setIsLoading(false);
  };

  const handleSkip = () => {
    setAuthenticated(true);
    setCurrentScreen('quick-capture');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 space-y-8 text-center">
          <div className="space-y-4">
            <div className="w-24 h-24 mx-auto bg-card rounded-full flex items-center justify-center shadow-lg">
              <Brain className="w-12 h-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Brain Bucket</h1>
              <p className="text-muted-foreground">Your ADHD-friendly productivity companion</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              {isLoading ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <Fingerprint className="w-8 h-8 text-primary animate-pulse" />
              )}
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                {isAvailable 
                  ? (isRegistered ? 'Unlock with biometrics' : 'Set up biometric authentication')
                  : 'Welcome to Brain Bucket'
                }
              </h2>
              <p className="text-sm text-muted-foreground">
                {isAvailable 
                  ? 'Touch the fingerprint sensor or use face recognition'
                  : 'Biometric authentication not available on this device'
                }
              </p>
            </div>
            
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </p>
            )}
            
            <div className="space-y-3">
              {isAvailable && (
                <Button 
                  onClick={handleAuthenticate} 
                  disabled={isLoading}
                  className="w-full"
                  data-testid="button-authenticate"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isRegistered ? 'Authenticating...' : 'Setting up...'}
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 mr-2" />
                      {isRegistered ? 'Authenticate' : 'Set up biometrics'}
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={handleSkip}
                className="w-full"
                data-testid="button-skip"
              >
                {isAvailable ? 'Skip for now' : 'Continue'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
