// context/UserContext.tsx
import React, { createContext, ReactNode, useContext, useState } from 'react';

interface UserContextType {
  user: any;
  setUser: (user: any) => void;
}

const UserContext = createContext<UserContextType | null>(null);

interface Props {
  children: ReactNode; // ✅ must be ReactNode
}

export const UserProvider = ({ children }: Props) => {
  const [user, setUser] = useState<any>(null);

  // Make sure nothing outside JSX, nothing like "" or spaces
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used inside UserProvider');
  }
  return context;
};