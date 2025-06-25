import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  UserCredential,
  signOut as firebaseSignOut
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Check for redirect result on page load
export const checkRedirectResult = async (): Promise<UserCredential | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log("Redirect result success:", result.user.email);
      return result;
    }
    return null;
  } catch (error) {
    console.error("Erro ao verificar resultado do redirecionamento:", error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    // Adiciona escopo para o email
    googleProvider.addScope('email');
    // Configura para selecionar conta
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Tenta primeiro com popup
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (popupError) {
      console.log("Fallback to redirect method due to:", popupError);
      // Se falhar, usa redirecionamento como fallback
      await signInWithRedirect(auth, googleProvider);
      // Esta linha só será executada se o redirecionamento falhar
      throw new Error("Redirecionamento falhado");
    }
  } catch (error) {
    console.error("Erro ao fazer login com Google:", error);
    throw error;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    throw error;
  }
};

export { auth };