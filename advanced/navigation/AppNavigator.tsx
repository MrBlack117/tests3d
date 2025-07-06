import React, { createContext, useContext, useState, ReactNode } from 'react';

// Типы для навигации
export interface NavigationProp {
  navigate: (screenName: string) => void;
  goBack: () => void;
  currentScreen: string;
}

interface NavigationContextType {
  currentScreen: string;
  navigate: (screenName: string) => void;
  goBack: () => void;
  screenHistory: string[];
}

// Контекст навигации
const NavigationContext = createContext<NavigationContextType | null>(null);

// Провайдер навигации
export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [screenHistory, setScreenHistory] = useState<string[]>(['Home']);

  const navigate = (screenName: string) => {
    setCurrentScreen(screenName);
    setScreenHistory(prev => [...prev, screenName]);
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = screenHistory.slice(0, -1);
      setScreenHistory(newHistory);
      setCurrentScreen(newHistory[newHistory.length - 1]);
    }
  };

  return (
    <NavigationContext.Provider value={{
      currentScreen,
      navigate,
      goBack,
      screenHistory
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

// Хук для использования навигации
export const useNavigation = (): NavigationProp => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }

  return {
    navigate: context.navigate,
    goBack: context.goBack,
    currentScreen: context.currentScreen
  };
};
